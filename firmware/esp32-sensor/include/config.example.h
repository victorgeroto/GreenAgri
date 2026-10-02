// Copie para config.h e preencha. config.h fica fora do Git (contém a chave do dispositivo).
#pragma once

#define GA_WIFI_SSID      "rede-da-fazenda"
#define GA_WIFI_SENHA     "senha-do-wifi"

// URL da API (use https em produção) e credenciais geradas no provisionamento:
// POST /api/iot/dispositivos devolve a apiKey uma única vez.
#define GA_API_URL        "http://192.168.0.10:8080/api/iot/telemetria"
#define GA_CODIGO         "SOLO-T02"
#define GA_API_KEY        "dev-key-solo-t02"

// Intervalo normal entre leituras e intervalo reduzido quando há condição de alerta.
#define GA_INTERVALO_MIN          30
#define GA_INTERVALO_ALERTA_MIN   10

// Envia a cada N leituras (economia de bateria). Sem Wi-Fi, acumula até o buffer encher.
#define GA_LEITURAS_POR_ENVIO     2

// Calibração do sensor capacitivo de umidade do solo (leitura ADC no ar e na água).
#define GA_SOLO_ADC_SECO   3300
#define GA_SOLO_ADC_UMIDO  1350

// Silo: distância (cm) do sensor ultrassônico ao fundo e ao nível cheio.
#define GA_SILO_DIST_VAZIO_CM  1800
#define GA_SILO_DIST_CHEIO_CM  60
