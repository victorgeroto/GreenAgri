# Firmware e simulador

| Pasta | Conteúdo |
|---|---|
| `esp32-sensor/` | Firmware PlatformIO para ESP32 (estação, sensor de solo, sensor de silo e rastreador de máquina) |
| `simulador/` | Script Node que emula os dispositivos usando o mesmo protocolo, sem hardware |

## Simulador

Requer Node 18+ e o backend rodando em `http://localhost:8080`.

```bash
node simulador/simulador.mjs                     # leituras a cada 10 s
node simulador/simulador.mjs --queda 0.3         # 30% de chance de perder sinal por ciclo
node simulador/simulador.mjs --cenario geada     # geada | seca | silo-quente
node simulador/simulador.mjs --talhao T-02       # talhão onde a colheitadeira trabalha (padrão T-04)
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

Ambientes disponíveis: `solo`, `estacao`, `silo` e `rastreador`. O rastreador usa o mesmo `config.h` e o código fica em `src/rastreador.cpp`.

O simulador inclui a colheitadeira `RAST-CH01`. Ela sai do galpão, vai até o talhão escolhido e faz passadas com a plataforma ligada. Na primeira leitura dentro do talhão, a API responde `mudancasStatus: 1` e a colheita aparece como "Em colheita" no mapa. O simulador comprime o tempo: cada ciclo equivale a cerca de 1 minuto de trabalho.

A chave de um dispositivo novo é gerada pelo endpoint `POST /api/iot/dispositivos` (perfil ADMIN) e só é exibida uma vez. As chaves dos dispositivos de demonstração são geradas pelo backend na primeira execução e ficam em `.greenagri-demo/credenciais.json` (fora do Git); o simulador as lê de lá.

Detalhes de arquitetura, hardware e consumo: [docs/SISTEMA-EMBARCADO.md](../docs/SISTEMA-EMBARCADO.md).
