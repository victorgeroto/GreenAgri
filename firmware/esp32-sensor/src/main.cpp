/*
 * GreenAgri — nó de campo ESP32
 *
 * Ciclo: acorda -> lê sensores -> guarda no buffer da RTC -> (a cada N leituras)
 * tenta Wi-Fi e envia o lote -> volta ao deep sleep.
 *
 * Store-and-forward: a memória RTC sobrevive ao deep sleep, então leituras feitas
 * sem sinal ficam guardadas e seguem no próximo envio bem-sucedido. O servidor
 * descarta duplicadas pelo instante da medição, então reenviar é seguro.
 *
 * Amostragem adaptativa: se a leitura indica condição de alerta (solo seco, geada,
 * grão aquecendo), o intervalo cai para GA_INTERVALO_ALERTA_MIN.
 */
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"

#if defined(GA_TIPO_ESTACAO)
#include <DHT.h>
#elif defined(GA_TIPO_SILO)
#include <DallasTemperature.h>
#include <OneWire.h>
#endif

// ---------- Pinagem ----------
constexpr int PINO_BATERIA = 35;      // divisor resistivo 100k/100k (LiPo 4,2 V -> 2,1 V)
constexpr int PINO_SOLO = 34;         // sensor capacitivo v1.2
constexpr int PINO_DHT = 4;           // DHT22
constexpr int PINO_ONEWIRE = 4;       // cabo termométrico DS18B20
constexpr int PINO_TRIG = 5;          // JSN-SR04T (ultrassom à prova d'água)
constexpr int PINO_ECHO = 18;
constexpr int PINO_ALIM_SENSORES = 25; // MOSFET que corta a alimentação dos sensores no sleep

constexpr const char *FIRMWARE_VERSAO = "2.0.1";
constexpr uint32_t WIFI_TIMEOUT_MS = 12000;
constexpr int BUFFER_MAX = 96;        // 48 h a cada 30 min

// ---------- Buffer persistente entre deep sleeps ----------
struct Leitura {
  uint32_t ts;      // epoch (s); 0 = relógio ainda não sincronizado
  float t;          // temperatura (ar, solo ou massa de grãos)
  float ur;         // umidade relativa do ar
  float us;         // umidade do solo (%)
  float nivel;      // nível do silo (%)
  float bat;        // bateria (%)
  int8_t rssi;
};

RTC_DATA_ATTR Leitura buffer[BUFFER_MAX];
RTC_DATA_ATTR int qtdBuffer = 0;
RTC_DATA_ATTR int leiturasDesdeEnvio = 0;
RTC_DATA_ATTR bool relogioSincronizado = false;

// ---------- Sensores ----------
float lerBateria() {
  // 4,2 V = 100%, 3,3 V = 0% (aproximação linear suficiente para alerta de troca)
  float v = analogReadMilliVolts(PINO_BATERIA) * 2 / 1000.0f;
  return constrain((v - 3.3f) / (4.2f - 3.3f) * 100.0f, 0.0f, 100.0f);
}

float mediana(float *v, int n) {
  for (int i = 1; i < n; i++)
    for (int j = i; j > 0 && v[j - 1] > v[j]; j--) std::swap(v[j], v[j - 1]);
  return v[n / 2];
}

#if defined(GA_TIPO_SOLO)
float lerUmidadeSolo() {
  float amostras[7];
  for (float &a : amostras) {
    a = analogRead(PINO_SOLO);
    delay(20);
  }
  float adc = mediana(amostras, 7);
  return constrain(map(adc, GA_SOLO_ADC_SECO, GA_SOLO_ADC_UMIDO, 0, 100), 0, 100);
}
#endif

#if defined(GA_TIPO_SILO)
float lerNivelSilo() {
  float amostras[5];
  for (float &a : amostras) {
    digitalWrite(PINO_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(PINO_TRIG, HIGH);
    delayMicroseconds(20);
    digitalWrite(PINO_TRIG, LOW);
    a = pulseIn(PINO_ECHO, HIGH, 30000) * 0.0343f / 2; // cm
    delay(60);
  }
  float dist = mediana(amostras, 5);
  float pct = (GA_SILO_DIST_VAZIO_CM - dist) / float(GA_SILO_DIST_VAZIO_CM - GA_SILO_DIST_CHEIO_CM) * 100;
  return constrain(pct, 0.0f, 100.0f);
}
#endif

Leitura medir() {
  Leitura l{};
  l.ts = relogioSincronizado ? time(nullptr) : 0;
  l.t = l.ur = l.us = l.nivel = NAN;
  l.bat = lerBateria();

  digitalWrite(PINO_ALIM_SENSORES, HIGH);
  delay(300); // estabilização após energizar

#if defined(GA_TIPO_ESTACAO)
  DHT dht(PINO_DHT, DHT22);
  dht.begin();
  delay(2000);
  l.t = dht.readTemperature();
  l.ur = dht.readHumidity();
#elif defined(GA_TIPO_SOLO)
  l.us = lerUmidadeSolo();
#elif defined(GA_TIPO_SILO)
  OneWire ow(PINO_ONEWIRE);
  DallasTemperature termometria(&ow);
  termometria.begin();
  termometria.requestTemperatures();
  // Cabo com vários sensores ao longo da altura: vale o ponto mais quente (foco de fermentação).
  float maisQuente = -127;
  for (int i = 0; i < termometria.getDeviceCount(); i++) maisQuente = max(maisQuente, termometria.getTempCByIndex(i));
  l.t = maisQuente > -100 ? maisQuente : NAN;
  l.nivel = lerNivelSilo();
#endif

  digitalWrite(PINO_ALIM_SENSORES, LOW);
  return l;
}

/** Mesmas regras do backend (RegrasAlerta.java), avaliadas na borda para decidir a amostragem. */
bool condicaoDeAlerta(const Leitura &l) {
#if defined(GA_TIPO_SOLO)
  return l.us < 25;
#elif defined(GA_TIPO_ESTACAO)
  return l.t <= 3 || l.t >= 38;
#else
  return l.t >= 30;
#endif
}

void guardar(const Leitura &l) {
  if (qtdBuffer == BUFFER_MAX) { // buffer cheio: descarta a mais antiga
    memmove(buffer, buffer + 1, sizeof(Leitura) * (BUFFER_MAX - 1));
    qtdBuffer--;
  }
  buffer[qtdBuffer++] = l;
}

// ---------- Rede ----------
bool conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(GA_WIFI_SSID, GA_WIFI_SENHA);
  uint32_t inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < WIFI_TIMEOUT_MS) delay(200);
  return WiFi.status() == WL_CONNECTED;
}

void sincronizarRelogio() {
  configTime(0, 0, "pool.ntp.org", "a.ntp.br");
  struct tm info;
  if (getLocalTime(&info, 5000)) relogioSincronizado = true;
}

void adicionar(JsonObject o, const char *chave, float v) {
  if (!isnan(v)) o[chave] = roundf(v * 10) / 10;
}

bool enviarLote() {
  JsonDocument doc;
  doc["codigo"] = GA_CODIGO;
  doc["firmware"] = FIRMWARE_VERSAO;
  JsonArray arr = doc["leituras"].to<JsonArray>();
  int8_t rssi = WiFi.RSSI();
  for (int i = 0; i < qtdBuffer; i++) {
    JsonObject o = arr.add<JsonObject>();
    if (buffer[i].ts) o["ts"] = buffer[i].ts; // sem ts o servidor usa o horário de recebimento
    adicionar(o, "t", buffer[i].t);
    adicionar(o, "ur", buffer[i].ur);
    adicionar(o, "us", buffer[i].us);
    adicionar(o, "nivel", buffer[i].nivel);
    adicionar(o, "bat", buffer[i].bat);
    o["rssi"] = rssi;
  }
  String corpo;
  serializeJson(doc, corpo);

  HTTPClient http;
  http.begin(GA_API_URL);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", GA_API_KEY);
  int status = http.POST(corpo);
  Serial.printf("POST %d leituras -> HTTP %d\n", qtdBuffer, status);
  http.end();
  return status == 202;
}

// ---------- Ciclo ----------
void setup() {
  Serial.begin(115200);
  pinMode(PINO_ALIM_SENSORES, OUTPUT);
#if defined(GA_TIPO_SILO)
  pinMode(PINO_TRIG, OUTPUT);
  pinMode(PINO_ECHO, INPUT);
#endif

  Leitura l = medir();
  guardar(l);
  leiturasDesdeEnvio++;
  bool alerta = condicaoDeAlerta(l);

  // Em alerta envia na hora; senão espera juntar GA_LEITURAS_POR_ENVIO para poupar bateria.
  if (alerta || leiturasDesdeEnvio >= GA_LEITURAS_POR_ENVIO) {
    if (conectarWifi()) {
      if (!relogioSincronizado) sincronizarRelogio();
      if (enviarLote()) {
        qtdBuffer = 0;
        leiturasDesdeEnvio = 0;
      }
    } else {
      Serial.printf("Sem Wi-Fi; %d leituras no buffer\n", qtdBuffer);
    }
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
  }

  uint64_t minutos = alerta ? GA_INTERVALO_ALERTA_MIN : GA_INTERVALO_MIN;
  esp_sleep_enable_timer_wakeup(minutos * 60ULL * 1000000ULL);
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {} // nunca alcançado: o ESP32 reinicia ao acordar do deep sleep
