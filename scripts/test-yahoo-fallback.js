// Prueba Yahoo Finance para los 12 tickers sin cobertura en FMP
// Uso: node scripts/test-yahoo-fallback.js

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryYahoo(ticker) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA } });
  } catch (e) {
    return { ok: false, reason: `fetch error: ${e.message}` };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const json = await res.json();
  const meta  = json?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (price == null) return { ok: false, reason: "sin precio" };
  return { ok: true, price: Math.round(price * 100) / 100, name: meta.longName || meta.shortName || "?" };
}

// Los 12 sin cobertura FMP válida + posibles tickers alternativos en Yahoo
const CANDIDATES = [
  { internal: "GST.MC",   company: "Gestamp",              alts: ["GST.MC",    "GSTP.MC"]  },
  { internal: "DLEO.MC",  company: "Deoleo",               alts: ["DLEO.MC",   "OLV.MC"]   },
  { internal: "BRIO.MC",  company: "Bodegas Riojanas",     alts: ["BRIO.MC"]               },
  { internal: "BERKA.MC", company: "Berkeley Minera",      alts: ["BERKA.MC",  "BKYS.MC"]  },
  { internal: "LBTS.MC",  company: "Libertas 7",           alts: ["LBTS.MC"]               },
  { internal: "ECO.MC",   company: "Ecoener",              alts: ["ECO.MC",    "ECON.MC"]  },
  { internal: "TPZ.MC",   company: "Telepizza",            alts: ["TPZ.MC"]                },
  { internal: "PRIM.MC",  company: "Prim S.A.",            alts: ["PRIM.MC",   "PRI.MC"]   },
  { internal: "ELEC.MC",  company: "Elecnor",              alts: ["ELEC.MC",   "ELC.MC"]   },
  { internal: "INMB.MC",  company: "Inmobiliaria del Sur", alts: ["INMB.MC",   "INM.MC"]   },
  { internal: "BME.MC",   company: "Bolsas y Mercados",    alts: ["BME.MC"]                },
  { internal: "LAR.MC",   company: "Lar España SOCIMI",    alts: ["LAR.MC",    "LARE.MC"]  },
];

async function main() {
  const found    = [];
  const notFound = [];

  for (const { internal, company, alts } of CANDIDATES) {
    process.stdout.write(`\n── ${internal.padEnd(10)} ${company}\n`);
    let hit = null;
    for (const alt of alts) {
      const r = await tryYahoo(alt);
      if (r.ok) {
        console.log(`   ✓ ${alt.padEnd(12)} $${r.price}  "${r.name}"`);
        if (!hit) hit = { internal, alt, price: r.price, name: r.name };
      } else {
        console.log(`   ✗ ${alt.padEnd(12)} ${r.reason}`);
      }
      await sleep(400);
    }
    if (hit) found.push(hit);
    else notFound.push({ internal, company });
  }

  console.log("\n\n══════════════════════════════════════════════");
  console.log(`RESUMEN: ${found.length} en Yahoo Finance, ${notFound.length} sin cobertura`);
  if (found.length) {
    console.log("\nYAHOO_MAP sugerido:");
    for (const f of found) console.log(`  "${f.internal}": "${f.alt}",  // ${f.name}`);
  }
  if (notFound.length) {
    console.log("\nBORRAR del pool (sin precio en ninguna fuente):");
    for (const n of notFound) console.log(`  ${n.internal.padEnd(12)} ${n.company}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
