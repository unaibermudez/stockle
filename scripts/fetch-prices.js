// Obtiene precios actuales de Yahoo Finance (gratis, sin API key)
// En GitHub Actions cada run usa una IP limpia → sin rate limiting
// Uso: node scripts/fetch-prices.js
const fs   = require("fs");
const path = require("path");

// Tickers que difieren entre stocks.js y Yahoo Finance
const YF_MAP = {
  "BRK.B":  "BRK-B",
  "LVMH":   "MC.PA",
  "NESN":   "NESN.SW",
  "ARMCO":  "2222.SR",
};

const TICKERS = [
  // España — IBEX 35
  "ITX.MC","SAN.MC","BBVA.MC","IBE.MC","CABK.MC","AENA.MC","FER.MC","AMS.MC",
  "CLNX.MC","NTGY.MC","ELE.MC","ACS.MC","REP.MC","TEF.MC","GRF.MC","IAG.MC",
  "MAP.MC","ANA.MC","SAB.MC","BKT.MC","ENG.MC","MTS.MC","VIS.MC","ACX.MC",
  "LOG.MC","IDR.MC","COL.MC","ROVI.MC","ALMS.MC","PHM.MC","SOL.MC","MEL.MC",
  "MRL.MC","FDR.MC",
  // España — Tier B
  "SGRE.MC","CIE.MC","CAF.MC","GST.MC","ATRM.MC","DIA.MC","EBO.MC","FCC.MC",
  "ENCE.MC","FAE.MC","CCEP.MC","EDR.MC","DOM.MC","AZK.MC","LRE.MC","GCO.MC",
  "AUD.MC","ECO.MC","GREN.MC","DLEO.MC","CBAV.MC","MCM.MC","NXT.MC","AMPE.MC",
  // España — Tier C
  "AIRT.MC","AEDAS.MC","ALBA.MC","IBPG.MC","TPZ.MC","PRIM.MC","TUB.MC",
  "VID.MC","LAR.MC","OHLA.MC","DFG.MC","ERE.MC","ELEC.MC",
  // España — Tier D + Adicionales
  "ADX.MC","BRIO.MC","LGT.MC","GAM.MC","BERKA.MC","LBTS.MC","INMB.MC",
  "SCYR.MC","TRE.MC","HOME.MC","MVC.MC","TL5.MC","TLGO.MC",
  "NHH.MC","UNI.MC","RJF.MC","ZOT.MC","BME.MC","REE.MC","ANE.MC","CASH.MC","OPDE.MC",
  // USA
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","BRK.B","JPM","V",
  "WMT","XOM","UNH","JNJ","PG","HD","KO","PEP","MCD","DIS","BA","NKE","INTC","PFE",
  // Global
  "TSM","ASML","SAP","NVO","NESN","LVMH","TM","SONY","BABA","TCEHY",
  "RY","SHOP","SHEL","AZN","HSBC","INFY","VALE","BHP","ARMCO","SPOT"
];

const UA    = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
const DELAY = 600;  // ms entre peticiones
const RETRY_AFTER = 15000; // ms de espera al recibir 429

function toYF(ticker) { return YF_MAP[ticker] || ticker; }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPrice(ticker, attempt = 1) {
  const yfTicker = toYF(ticker);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}?interval=1d&range=1d`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA } });
  } catch (e) {
    throw new Error(`fetch error: ${e.message}`);
  }

  if (res.status === 429 && attempt <= 3) {
    console.warn(`    429 ${ticker} — esperando ${RETRY_AFTER / 1000}s (intento ${attempt}/3)`);
    await sleep(RETRY_AFTER * attempt);
    return fetchPrice(ticker, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (price == null) throw new Error("Sin precio en respuesta");
  return Math.round(price * 100) / 100;
}

async function main() {
  console.log(`Actualizando ${TICKERS.length} acciones desde Yahoo Finance…\n`);

  // Cargar prices.json existente como fallback
  const outPath = path.join(__dirname, "..", "prices.json");
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(outPath, "utf8")).prices || {}; } catch {}

  const prices = { ...existing };
  let updated = 0, skipped = 0;

  for (const ticker of TICKERS) {
    try {
      prices[ticker] = await fetchPrice(ticker);
      process.stdout.write(`  ✓ ${ticker.padEnd(12)} ${prices[ticker]}\n`);
      updated++;
    } catch (e) {
      process.stdout.write(`  ✗ ${ticker.padEnd(12)} ${e.message}\n`);
      skipped++;
    }
    await sleep(DELAY);
  }

  const output = {
    updated: new Date().toISOString(),
    count: updated,
    prices
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nprices.json → ${updated} actualizados, ${skipped} sin datos`);

  if (updated === 0) {
    console.error("ERROR: ningún precio obtenido");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
