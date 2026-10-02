# Firmware e simulador

| Pasta | Conteúdo |
|---|---|
| `esp32-sensor/` | Firmware PlatformIO para ESP32 (estação, sensor de solo e sensor de silo) |
| `simulador/` | Script Node que emula os dispositivos usando o mesmo protocolo, sem hardware |

## Simulador

Requer Node 18+ e o backend rodando em `http://localhost:8080`.

```bash
node simulador/simulador.mjs                     # leituras a cada 10 s
node simulador/simulador.mjs --queda 0.3         # 30% de chance de perder sinal por ciclo
node simulador/simulador.mjs --cenario geada     # geada | seca | silo-quente
API_URL=http://192.168.0.10:8080 node simulador/simulador.mjs
```

## Firmware

1. Instale o [PlatformIO](https://platformio.org/).
2. Copie `esp32-sensor/include/config.example.h` para `config.h` e preencha o Wi-Fi, a URL da API, o código e a chave do dispositivo.
3. Compile e grave o tipo desejado:

```bash
cd esp32-sensor
pio run -e solo -t upload && pio device monitor
```

A chave de um dispositivo novo é gerada pelo endpoint `POST /api/iot/dispositivos` (perfil ADMIN) e só é exibida uma vez. Os dispositivos de demonstração usam as chaves de `backend/src/main/resources/seed/dispositivos.json`.

Detalhes de arquitetura, hardware e consumo: [docs/SISTEMA-EMBARCADO.md](../docs/SISTEMA-EMBARCADO.md).
