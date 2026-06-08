// Obtiene precios actuales de FMP y escribe prices.json
// Uso: FMP_API_KEY=xxx node scripts/fetch-prices.js
const fs = require("fs");
const path = require("path");

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
  "SCYR.MC","TRE.MC","HOME.MC","MVC.MC","PSG.MC","TL5.MC","TLGO.MC",
  "NHH.MC","UNI.MC","RJF.MC","ZOT.MC","BME.MC","REE.MC","ANE.MC","CASH.MC","OPDE.MC",
  // USA
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","BRK.B","JPM","V",
  "WMT","XOM","UNH","JNJ","PG","HD","KO","PEP","MCD","DIS","BA","NKE","INTC","PFE",
  // Global
  "TSM","ASML","SAP","NVO","NESN","LVMH","TM","SONY","BABA","TCEHY",
  "RY","SHOP","SHEL","AZN","HSBC","INFY","VALE","BHP","ARMCO","SPOT"
];

const API_KEY = process.env.FMP_API_KEY;
const BASE    = "https://financialmodelingprep.com/api/v3";
const CHUNK   = 50; // FMP soporta hasta ~100 tickers por petición en quote

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchBatch(tickers) {
  const url = `${BASE}/quote/${tickers.join(",")}?apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Respuesta inesperada: " + JSON.stringify(data).slice(0, 120));
  return data;
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: FMP_API_KEY no está definido");
    process.exit(1);
  }

  const prices = {};
  let ok = 0, skipped = 0;

  for (const batch of chunk(TICKERS, CHUNK)) {
    try {
      const data = await fetchBatch(batch);
      for (const item of data) {
        if (item.symbol && item.price != null) {
          prices[item.symbol] = Math.round(item.price * 100) / 100;
          ok++;
        }
      }
      // Los tickers que FMP no devuelve quedan con su valor estático en stocks.js
      const returned = new Set(data.map(d => d.symbol));
      for (const t of batch) {
        if (!returned.has(t)) { console.warn(`  Sin precio: ${t}`); skipped++; }
      }
    } catch (e) {
      console.error(`  Error en lote [${batch.slice(0,3).join(",")}...]: ${e.message}`);
      skipped += batch.length;
    }
    // Pausa corta entre lotes
    await new Promise(r => setTimeout(r, 300));
  }

  const output = {
    updated: new Date().toISOString(),
    count: ok,
    prices
  };

  const outPath = path.join(__dirname, "..", "prices.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`prices.json actualizado: ${ok} precios OK, ${skipped} sin datos`);

  if (ok === 0) {
    console.error("ERROR: ningún precio obtenido — ¿API key válida?");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
