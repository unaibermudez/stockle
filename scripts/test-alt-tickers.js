// Prueba tickers alternativos contra FMP para todos los que fallaron
// Uso: node scripts/test-alt-tickers.js

const path = require("path");
const fs   = require("fs");

try {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE    = "https://financialmodelingprep.com/stable";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryTicker(symbol) {
  const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return { ok: false, reason: "vacío" };
  const p = data[0];
  return { ok: true, price: p.price, name: p.companyName, exch: p.exchange };
}

// Todos los que fallaron + candidatos alternativos ordenados por probabilidad
const CANDIDATES = [
  // ── Tier B ────────────────────────────────────────────────────────────
  { internal: "ALMS.MC",  company: "Almirall",              alts: ["ALM.MC"] },
  { internal: "GST.MC",   company: "Gestamp",               alts: ["GST", "GSTP.MC", "GST.MC"] },
  { internal: "ATRM.MC",  company: "Atresmedia",            alts: ["A3M.MC"] },
  { internal: "EBO.MC",   company: "Ebro Foods",            alts: ["EBR.MC", "EBO", "EBRPF"] },
  { internal: "ENCE.MC",  company: "Ence Energía",          alts: ["ENC.MC", "ENCE", "ENA.MC"] },
  { internal: "CCEP.MC",  company: "Coca-Cola Europacific", alts: ["CCEP", "CCEP.AS"] },
  { internal: "AUD.MC",   company: "Audax Renovables",      alts: ["ADX.MC", "AXR.MC", "AUD"] },
  { internal: "ECO.MC",   company: "Ecoener",               alts: ["ECN.MC", "ECO", "ECON.MC"] },
  { internal: "GREN.MC",  company: "Grenergy",              alts: ["GRE.MC"] },
  { internal: "DLEO.MC",  company: "Deoleo",                alts: ["DLO.MC", "DLEO", "OLV.MC"] },
  { internal: "AMPE.MC",  company: "Amper",                 alts: ["AMP.MC", "AMPE", "APR.MC"] },
  // ── Tier C ────────────────────────────────────────────────────────────
  { internal: "AIRT.MC",  company: "Airtificial",           alts: ["AI.MC", "ART.MC", "AIRT"] },
  { internal: "ALBA.MC",  company: "Corp. Financiera Alba", alts: ["ALB.MC", "ALBA", "CFA.MC"] },
  { internal: "IBPG.MC",  company: "Iberpapel",             alts: ["IBG.MC", "IBPG", "IPG.MC"] },
  { internal: "TPZ.MC",   company: "Telepizza",             alts: ["TPZ", "TLPZ.MC", "TEP.MC"] },
  { internal: "PRIM.MC",  company: "Prim",                  alts: ["PRI.MC", "PRIM", "PRG.MC"] },
  { internal: "LAR.MC",   company: "Lar España SOCIMI",     alts: ["LARE.MC", "LAR", "LRE.MC"] },
  { internal: "DFG.MC",   company: "Duro Felguera",         alts: ["MDF.MC", "DFG", "DFL.MC"] },
  { internal: "ERE.MC",   company: "Ercros",                alts: ["ERC.MC", "ERE", "ECR.MC"] },
  { internal: "ELEC.MC",  company: "Elecnor",               alts: ["ELC.MC", "ELEC", "ENR.MC"] },
  // ── Tier D ────────────────────────────────────────────────────────────
  { internal: "BRIO.MC",  company: "Bodegas Riojanas",      alts: ["BRI.MC", "BRIO", "BDR.MC"] },
  { internal: "BERKA.MC", company: "Berkeley Minera",       alts: ["BKY.MC", "BERKA", "BKY"] },
  { internal: "LBTS.MC",  company: "Libertas 7",            alts: ["LBT.MC", "LBTS", "LB7.MC"] },
  { internal: "INMB.MC",  company: "Inmobiliaria del Sur",  alts: ["INM.MC", "INMB", "IDS.MC"] },
  { internal: "BME.MC",   company: "Bolsas y Mercados",     alts: ["BME", "BMY.MC", "BLM.MC"] },
];

async function main() {
  if (!FMP_API_KEY) { console.error("FMP_API_KEY no configurada"); process.exit(1); }

  const found = [];
  const notFound = [];

  for (const { internal, company, alts } of CANDIDATES) {
    process.stdout.write(`\n── ${internal.padEnd(10)} ${company}\n`);
    let hit = null;
    for (const alt of alts) {
      const r = await tryTicker(alt);
      if (r.ok) {
        console.log(`   ✓ ${alt.padEnd(12)} $${r.price}  "${r.name}"  [${r.exch}]`);
        if (!hit) hit = { internal, alt, price: r.price, name: r.name, exch: r.exch };
      } else {
        console.log(`   ✗ ${alt.padEnd(12)} ${r.reason}`);
      }
      await sleep(300);
    }
    if (hit) found.push(hit);
    else notFound.push({ internal, company });
  }

  console.log("\n\n══════════════════════════════════════════════");
  console.log(`RESUMEN: ${found.length} encontrados, ${notFound.length} sin cobertura en FMP`);

  if (found.length) {
    console.log("\nMAPEO SUGERIDO para FMP_MAP:");
    for (const f of found) {
      if (f.internal !== f.alt) {
        console.log(`  "${f.internal}": "${f.alt}",  // ${f.name} [${f.exch}]`);
      }
    }
  }
  if (notFound.length) {
    console.log("\nSIN COBERTURA EN FMP (necesitan Yahoo Finance o precio estático):");
    for (const n of notFound) console.log(`  ${n.internal.padEnd(12)} ${n.company}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
