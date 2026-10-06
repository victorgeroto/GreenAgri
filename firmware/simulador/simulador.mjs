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
 *   node simulador.mjs --talhao T-02      # talhão onde a colheitadeira RAST-CH01 vai trabalhar (padrão T-04)
 *   API_URL=http://servidor:8080 node simulador.mjs
 */

import { existsSync, readFileSync } from 'node:fs'

// Chaves geradas pelo backend na primeira execução (fora do Git): .greenagri-demo/credenciais.json
const ARQUIVO = process.env.GREENAGRI_CREDENCIAIS ?? new URL('../../.greenagri-demo/credenciais.json', import.meta.url)
if (!existsSync(ARQUIVO)) {
  console.error('Credenciais de demonstração não encontradas. Suba o backend uma vez (perfil dev) para gerá-las.')
  process.exit(1)
}
const CHAVES = JSON.parse(readFileSync(ARQUIVO, 'utf8')).dispositivos ?? {}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
)
const API = (process.env.API_URL ?? 'http://localhost:8080') + '/api/iot/telemetria'
const INTERVALO_S = Number(args.intervalo ?? 10)
const CHANCE_QUEDA = Number(args.queda ?? 0.15)
const CENARIO = args.cenario ?? 'normal' // normal | geada | seca | silo-quente

const dispositivos = [
  { codigo: 'EST-01', tipo: 'estacao', firmware: '1.2.0' },
  { codigo: 'SOLO-T02', tipo: 'solo', firmware: '1.2.0', solo: 22 },
  { codigo: 'SOLO-T03', tipo: 'solo', firmware: '1.1.4', solo: 37 },
  { codigo: 'SILO-01', tipo: 'silo', firmware: '2.0.1', nivel: 84.5, temp: 24 },
  { codigo: 'SILO-02', tipo: 'silo', firmware: '2.0.1', nivel: 66, temp: 31 },
  { codigo: 'RAST-CH01', tipo: 'rastreador', firmware: '1.0.0' },
].map((d) => ({ ...d, chave: CHAVES[d.codigo], buffer: [], bateria: 60 + Math.random() * 40 }))

const ruido = (a) => (Math.random() * 2 - 1) * a
const r1 = (v) => Math.round(v * 10) / 10

// ---------- Colheitadeira: galpão → talhão alvo → passadas em zigue-zague ----------
const TALHAO_ALVO = args.talhao ?? 'T-04'
const GALPAO = [-24.8794, -53.5609] // [lat, lon]
const M_POR_GRAU_LAT = 110_574
const mPorGrauLon = (lat) => 111_320 * Math.cos((lat * Math.PI) / 180)
// Compressão de tempo para a demonstração: cada ciclo avança o equivalente a ~1 min de trabalho.
const METROS_POR_CICLO = { deslocamento: 300, colheita: 110 }

function rotaColheita() {
  const arquivo = new URL('../../backend/src/main/resources/seed/talhoes.json', import.meta.url)
  const talhao = JSON.parse(readFileSync(arquivo, 'utf8')).find((t) => t.codigo === TALHAO_ALVO)
  if (!talhao) throw new Error(`Talhão ${TALHAO_ALVO} não encontrado em talhoes.json`)
  const anel = talhao.geometria.coordinates[0]
  const lats = anel.map(([, lat]) => lat)
  const lons = anel.map(([lon]) => lon)
  const margem = 40 / M_POR_GRAU_LAT // 40 m da borda (cabeceira)
  const [sul, norte] = [Math.min(...lats) + margem, Math.max(...lats) - margem]
  const [oeste, leste] = [Math.min(...lons) + margem, Math.max(...lons) - margem]
  // Passadas norte-sul a cada ~120 m (a plataforma real tem ~9 m; espaçado para a demo).
  const passo = 120 / mPorGrauLon(sul)
  const pontos = [{ p: GALPAO, op: false }, { p: [sul, oeste], op: false }]
  let subindo = true
  for (let lon = oeste; lon <= leste; lon += passo) {
    pontos.push({ p: [subindo ? sul : norte, lon], op: true }, { p: [subindo ? norte : sul, lon], op: true })
    subindo = !subindo
  }
  pontos.push({ p: GALPAO, op: false })
  return pontos
}

function criarTrajeto() {
  const rota = rotaColheita()
  let i = 0
  let pos = rota[0].p
  return () => {
    const alvo = rota[i + 1]
    if (!alvo) return { lat: pos[0], lon: pos[1], vel: 0, op: false, fim: true }
    const dy = (alvo.p[0] - pos[0]) * M_POR_GRAU_LAT
    const dx = (alvo.p[1] - pos[1]) * mPorGrauLon(pos[0])
    const dist = Math.hypot(dx, dy)
    const passo = alvo.op ? METROS_POR_CICLO.colheita : METROS_POR_CICLO.deslocamento
    if (dist <= passo) {
      pos = alvo.p
      i++
    } else {
      pos = [pos[0] + (dy / dist) * (passo / M_POR_GRAU_LAT), pos[1] + (dx / dist) * (passo / mPorGrauLon(pos[0]))]
    }
    return {
      lat: +(pos[0] + ruido(0.00002)).toFixed(6),
      lon: +(pos[1] + ruido(0.00002)).toFixed(6),
      vel: r1(alvo.op ? 6 + ruido(0.8) : 18 + ruido(2)),
      op: alvo.op,
    }
  }
}
const proximaPosicao = criarTrajeto()

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
    case 'rastreador': {
      // Ligado à bateria da máquina: sempre 100%.
      const { lat, lon, vel, op } = proximaPosicao()
      return { ...base, bat: 100, lat, lon, vel, op }
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
        const extra = (r.alertasGerados ? ` ⚠️  ${r.alertasGerados} alerta(s)` : '') + (r.mudancasStatus ? ` 🌾 colheita iniciada no talhão (${r.mudancasStatus})` : '')
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
