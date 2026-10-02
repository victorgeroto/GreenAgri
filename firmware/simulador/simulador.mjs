#!/usr/bin/env node
/**
 * Simulador de dispositivos de campo GreenAgri.
 *
 * Emula os nós ESP32 usando exatamente o protocolo do firmware: lotes JSON com
 * chaves curtas, autenticação por X-Device-Key e store-and-forward quando a
 * "rede" cai. Não precisa de dependências (Node 18+).
 *
 *   node simulador.mjs                    # leituras a cada 10 s
 *   node simulador.mjs --intervalo 3      # mais rápido
 *   node simulador.mjs --queda 0.3        # 30% de chance de ficar sem sinal em cada ciclo
 *   node simulador.mjs --cenario geada    # força a estação a registrar geada
 *   API_URL=http://servidor:8080 node simulador.mjs
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
)
const API = (process.env.API_URL ?? 'http://localhost:8080') + '/api/iot/telemetria'
const INTERVALO_S = Number(args.intervalo ?? 10)
const CHANCE_QUEDA = Number(args.queda ?? 0.15)
const CENARIO = args.cenario ?? 'normal' // normal | geada | seca | silo-quente

// Chaves de demonstração (backend/src/main/resources/seed/dispositivos.json)
const dispositivos = [
  { codigo: 'EST-01', chave: 'dev-key-est-01', tipo: 'estacao', firmware: '1.2.0' },
  { codigo: 'SOLO-T02', chave: 'dev-key-solo-t02', tipo: 'solo', firmware: '1.2.0', solo: 22 },
  { codigo: 'SOLO-T03', chave: 'dev-key-solo-t03', tipo: 'solo', firmware: '1.1.4', solo: 37 },
  { codigo: 'SILO-01', chave: 'dev-key-silo-01', tipo: 'silo', firmware: '2.0.1', nivel: 84.5, temp: 24 },
  { codigo: 'SILO-02', chave: 'dev-key-silo-02', tipo: 'silo', firmware: '2.0.1', nivel: 66, temp: 31 },
].map((d) => ({ ...d, buffer: [], bateria: 60 + Math.random() * 40 }))

const ruido = (a) => (Math.random() * 2 - 1) * a
const r1 = (v) => Math.round(v * 10) / 10

function medir(d) {
  const agora = new Date()
  const hora = agora.getHours() + agora.getMinutes() / 60
  const ciclo = Math.sin((2 * Math.PI * (hora - 9)) / 24)
  d.bateria = Math.max(5, d.bateria - 0.02)
  const base = { ts: Math.floor(agora.getTime() / 1000), bat: r1(d.bateria), rssi: -60 - Math.floor(Math.random() * 35) }

  switch (d.tipo) {
    case 'estacao': {
      const t = CENARIO === 'geada' ? 1.5 + ruido(0.8) : 22 + 7 * ciclo + ruido(0.6)
      return { ...base, t: r1(t), ur: r1(Math.min(100, 68 - 2.5 * (t - 22) + ruido(2))) }
    }
    case 'solo': {
      d.solo = Math.max(5, d.solo - (CENARIO === 'seca' ? 0.8 : 0.03) + ruido(0.2)) // evapotranspiração
      return { ...base, t: r1(21 + 3 * ciclo + ruido(0.3)), us: r1(d.solo) }
    }
    case 'silo': {
      if (CENARIO === 'silo-quente') d.temp += 0.3
      return { ...base, t: r1(d.temp + ruido(0.15)), nivel: r1(d.nivel + ruido(0.2)) }
    }
  }
}

async function ciclo() {
  for (const d of dispositivos) {
    d.buffer.push(medir(d))
    if (Math.random() < CHANCE_QUEDA) {
      console.log(`📡 ${d.codigo.padEnd(9)} sem sinal — ${d.buffer.length} leitura(s) no buffer`)
      continue
    }
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Key': d.chave },
        body: JSON.stringify({ codigo: d.codigo, firmware: d.firmware, leituras: d.buffer }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.status === 202) {
        const r = await res.json()
        const extra = r.alertasGerados ? ` ⚠️  ${r.alertasGerados} alerta(s)` : ''
        console.log(`✅ ${d.codigo.padEnd(9)} lote de ${d.buffer.length} → aceitas ${r.aceitas}, duplicadas ${r.duplicadas}${extra}`)
        d.buffer = []
      } else {
        console.log(`❌ ${d.codigo.padEnd(9)} HTTP ${res.status}: ${await res.text()}`)
      }
    } catch (e) {
      console.log(`📡 ${d.codigo.padEnd(9)} API inacessível (${e.cause?.code ?? e.message}) — mantendo ${d.buffer.length} no buffer`)
    }
  }
}

console.log(`Simulando ${dispositivos.length} dispositivos → ${API} (a cada ${INTERVALO_S}s, queda ${CHANCE_QUEDA * 100}%, cenário ${CENARIO})\n`)
await ciclo()
setInterval(ciclo, INTERVALO_S * 1000)
