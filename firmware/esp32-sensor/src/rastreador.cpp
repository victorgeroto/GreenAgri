/*
 * GreenAgri — rastreador de máquina (ESP32 + GNSS)
 *
 * Instalado na colheitadeira, alimentado pelos 12 V da máquina (regulador buck
 * para 5 V). Lê posição/velocidade de um receptor NEO-6M/NEO-M8N e o estado da
 * plataforma de corte por uma entrada digital (sensor indutivo no eixo da
 * plataforma ou saída do controlador da máquina, via optoacoplador).
 *
 * O backend cruza cada posição com os polígonos dos talhões (geofence): ao
 * detectar a máquina operando dentro de um talhão, a colheita daquele talhão
 * passa para "em colheita" automaticamente.
 *
 * Taxa adaptativa: a cada 15 s operando, 60 s em deslocamento e 5 min parada.
 * Sem Wi-Fi/4G, as posições ficam no buffer (store-and-forward) e seguem em lote;
 * o servidor usa o horário do GNSS de cada ponto, então o histórico fica correto.
 */
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>

#include "config.h"

constexpr const char *FIRMWARE_VERSAO = "1.0.0";
constexpr int PINO_GPS_RX = 16;          // TX do módulo GNSS
constexpr int PINO_GPS_TX = 17;
constexpr int PINO_PLATAFORMA = 27;      // nível baixo = plataforma ligada (optoacoplador)
constexpr float VELOCIDADE_PARADA_KMH = 1.5;
constexpr uint32_t INTERVALO_OPERANDO_MS = 15000;
constexpr uint32_t INTERVALO_DESLOCAMENTO_MS = 60000;
constexpr uint32_t INTERVALO_PARADA_MS = 300000;
constexpr int BUFFER_MAX = 400;          // ~1h40 operando sem conexão
constexpr int LOTE_MAX = 50;             // pontos por requisição

struct Ponto {
  uint32_t ts;
  double lat, lon;
  float vel;
  bool op;
};

TinyGPSPlus gps;
HardwareSerial serialGps(2);
Ponto buffer[BUFFER_MAX];
int qtdBuffer = 0;
uint32_t ultimaAmostra = 0;
uint32_t ultimoEnvio = 0;
bool ultimoOperando = false;

/** Epoch a partir da data/hora do GNSS (UTC), sem depender de NTP no campo. */
uint32_t epochGps() {
  if (!gps.date.isValid() || !gps.time.isValid()) return 0;
  struct tm t {};
  t.tm_year = gps.date.year() - 1900;
  t.tm_mon = gps.date.month() - 1;
  t.tm_mday = gps.date.day();
  t.tm_hour = gps.time.hour();
  t.tm_min = gps.time.minute();
  t.tm_sec = gps.time.second();
  setenv("TZ", "UTC0", 1);
  tzset();
  return mktime(&t);
}

bool plataformaLigada() {
  // Debounce simples: maioria em 5 leituras.
  int ligada = 0;
  for (int i = 0; i < 5; i++) {
    ligada += digitalRead(PINO_PLATAFORMA) == LOW;
    delay(2);
  }
  return ligada >= 3;
}

void guardar(const Ponto &p) {
  if (qtdBuffer == BUFFER_MAX) {
    memmove(buffer, buffer + 1, sizeof(Ponto) * (BUFFER_MAX - 1));
    qtdBuffer--;
  }
  buffer[qtdBuffer++] = p;
}

bool garantirWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.begin(GA_WIFI_SSID, GA_WIFI_SENHA);
  uint32_t inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 5000) delay(100);
  return WiFi.status() == WL_CONNECTED;
}

/** Envia até LOTE_MAX pontos; em caso de sucesso, remove-os do buffer. */
bool enviarLote() {
  int n = min(qtdBuffer, LOTE_MAX);
  JsonDocument doc;
  doc["codigo"] = GA_CODIGO;
  doc["firmware"] = FIRMWARE_VERSAO;
  JsonArray arr = doc["leituras"].to<JsonArray>();
  for (int i = 0; i < n; i++) {
    JsonObject o = arr.add<JsonObject>();
    if (buffer[i].ts) o["ts"] = buffer[i].ts;
    o["lat"] = serialized(String(buffer[i].lat, 6));
    o["lon"] = serialized(String(buffer[i].lon, 6));
    o["vel"] = roundf(buffer[i].vel * 10) / 10;
    o["op"] = buffer[i].op;
    o["rssi"] = WiFi.RSSI();
  }
  String corpo;
  serializeJson(doc, corpo);

  HTTPClient http;
  http.begin(GA_API_URL);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", GA_API_KEY);
  int status = http.POST(corpo);
  http.end();
  if (status != 202) return false;
  memmove(buffer, buffer + n, sizeof(Ponto) * (qtdBuffer - n));
  qtdBuffer -= n;
  return true;
}

void setup() {
  Serial.begin(115200);
  serialGps.begin(9600, SERIAL_8N1, PINO_GPS_RX, PINO_GPS_TX);
  pinMode(PINO_PLATAFORMA, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
}

void loop() {
  while (serialGps.available()) gps.encode(serialGps.read());

  bool operando = plataformaLigada();
  float vel = gps.speed.isValid() ? gps.speed.kmph() : 0;
  uint32_t intervalo = operando ? INTERVALO_OPERANDO_MS
                       : vel > VELOCIDADE_PARADA_KMH ? INTERVALO_DESLOCAMENTO_MS
                                                     : INTERVALO_PARADA_MS;

  // Ligar/desligar a plataforma gera um ponto imediato: é o evento que o geofence procura.
  bool mudouEstado = operando != ultimoOperando;
  bool registrouMudanca = false;
  if (gps.location.isValid() && gps.location.age() < 3000 && (mudouEstado || millis() - ultimaAmostra >= intervalo)) {
    guardar({epochGps(), gps.location.lat(), gps.location.lng(), vel, operando});
    ultimaAmostra = millis();
    registrouMudanca = mudouEstado;
    ultimoOperando = operando;
  }

  // Envia logo após a mudança de estado ou a cada minuto; esvazia o buffer em lotes se ficou sem sinal.
  if (qtdBuffer > 0 && (registrouMudanca || millis() - ultimoEnvio >= 60000)) {
    ultimoEnvio = millis();
    if (garantirWifi()) {
      while (qtdBuffer > 0 && enviarLote()) {
      }
    }
    Serial.printf("buffer: %d pontos\n", qtdBuffer);
  }
  delay(50);
}
