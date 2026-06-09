// Obtiene precios y datos de perfil desde Financial Modeling Prep (FMP) stable/profile
// Local: crea un .env en la raíz con FMP_API_KEY=tu_clave
// CI:    añade el secret FMP_API_KEY en GitHub Actions → Settings → Secrets

const fs   = require("fs");
const path = require("path");

// Cargar .env si existe (desarrollo local)
try {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE    = "https://financialmodelingprep.com/stable";
const DELAY       = 350;   // ms entre peticiones (FMP free: 250 req/día)
const RETRY_AFTER = 10000;

// Campos que queremos extraer del perfil FMP y validar
const EXPECTED_FIELDS = ["price", "marketCap", "fullTimeEmployees", "sector", "country", "ipoDate"];

// Tickers internos que no coinciden con el símbolo en FMP
const FMP_MAP = {
  // Correcciones globales
  "BRK.B":  "BRK-B",
  "LVMH":   "MC.PA",
  "NESN":   "NESN.SW",
  "ARMCO":  "2222.SR",
  // España — tickers reales en BME distintos a los internos
  "ALMS.MC": "ALM.MC",   // Almirall
  "ATRM.MC": "A3M.MC",   // Atresmedia
  "ENCE.MC": "ENC.MC",   // ENCE Energía y Celulosa
  "AUD.MC":  "ADX.MC",   // Audax Renovables
  "GREN.MC": "GRE.MC",   // Grenergy Renovables
  "AMPE.MC": "AMP.MC",   // Amper
  "AIRT.MC": "AI.MC",    // Airtificial
  "ALBA.MC": "ALB.MC",   // Corporación Financiera Alba
  "IBPG.MC": "IBG.MC",   // Iberpapel Gestión
  "DFG.MC":  "MDF.MC",   // Duro Felguera
  "ERE.MC":  "ECR.MC",   // Ercros
  // España — cotiza en otro mercado
  "EBO.MC":  "EBRPF",    // Ebro Foods (OTC pink sheets)
  "CCEP.MC": "CCEP",     // Coca-Cola Europacific Partners (NASDAQ)
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
  "SCYR.MC","TRE.MC","HOME.MC","MVC.MC","PSG.MC","TL5.MC","TLGO.MC",
  "NHH.MC","UNI.MC","RJF.MC","ZOT.MC","BME.MC","REE.MC","ANE.MC","CASH.MC","OPDE.MC",
  // USA
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","BRK.B","JPM","V",
  "WMT","XOM","UNH","JNJ","PG","HD","KO","PEP","MCD","DIS","BA","NKE","INTC","PFE",
  "MNST",
  // Global
  "TSM","ASML","SAP","NVO","NESN","LVMH","TM","SONY","BABA","TCEHY",
  "RY","SHOP","SHEL","AZN","HSBC","INFY","VALE","BHP","ARMCO","SPOT",
];

function toFMP(ticker) { return FMP_MAP[ticker] || ticker; }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchProfile(ticker, attempt = 1) {
  const symbol = toFMP(ticker);
  const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`fetch error: ${e.message}`);
  }

  if (res.status === 429 && attempt <= 3) {
    console.warn(`    429 ${ticker} — esperando ${RETRY_AFTER / 1000}s (intento ${attempt}/3)`);
    await sleep(RETRY_AFTER * attempt);
    return fetchProfile(ticker, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) throw new Error("Respuesta vacía o ticker no encontrado");
  return data[0];
}

async function main() {
  if (!FMP_API_KEY) {
    console.error("ERROR: FMP_API_KEY no configurada.");
    console.error("       Local: crea un .env en la raíz con FMP_API_KEY=tu_clave");
    console.error("       CI:    añade el secret FMP_API_KEY en GitHub → Settings → Secrets");
    process.exit(1);
  }

  console.log(`Actualizando ${TICKERS.length} acciones desde FMP…\n`);

  const outPath = path.join(__dirname, "..", "prices.json");
  const logPath = path.join(__dirname, "fetch-log.txt");

  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(outPath, "utf8")).prices || {}; } catch {}

  const prices   = { ...existing };
  const profiles = {};

  // Resultado por ticker: "ok" | "error" | "partial"
  const results = [];
  let countOk = 0, countError = 0, countPartial = 0;

  for (const ticker of TICKERS) {
    let profile, fetchError;
    try {
      profile = await fetchProfile(ticker);
    } catch (e) {
      fetchError = e.message;
    }

    if (fetchError) {
      process.stdout.write(`  ✗ ${ticker.padEnd(12)} ERROR: ${fetchError}\n`);
      results.push({ ticker, status: "error", error: fetchError, missingFields: EXPECTED_FIELDS });
      countError++;
      await sleep(DELAY);
      continue;
    }

    // Detectar campos nulos/ausentes
    const missingFields = EXPECTED_FIELDS.filter(f => profile[f] == null || profile[f] === "");

    if (profile.price != null) {
      prices[ticker] = Math.round(profile.price * 100) / 100;
    }

    profiles[ticker] = {
      price:       profile.price         ?? null,
      marketCap:   profile.marketCap     ?? null,
      employees:   profile.fullTimeEmployees != null ? Number(profile.fullTimeEmployees) : null,
      sector:      profile.sector        ?? null,
      country:     profile.country       ?? null,
      ipoDate:     profile.ipoDate       ?? null,
    };

    if (missingFields.length === 0) {
      process.stdout.write(`  ✓ ${ticker.padEnd(12)} $${prices[ticker]}\n`);
      results.push({ ticker, status: "ok", missingFields: [] });
      countOk++;
    } else {
      const tag = missingFields.length === EXPECTED_FIELDS.length ? "TODOS" : missingFields.join(", ");
      process.stdout.write(`  ~ ${ticker.padEnd(12)} $${prices[ticker] ?? "?"} (sin: ${tag})\n`);
      results.push({ ticker, status: "partial", missingFields });
      countPartial++;
    }

    await sleep(DELAY);
  }

  // Guardar prices.json
  fs.writeFileSync(outPath, JSON.stringify({
    updated:  new Date().toISOString(),
    count:    countOk + countPartial,
    prices,
    profiles,
  }, null, 2));

  console.log(`\nprices.json → ${countOk} ok, ${countPartial} parciales, ${countError} errores`);

  // ── Log detallado ────────────────────────────────────────────────────────
  const errors   = results.filter(r => r.status === "error");
  const partials = results.filter(r => r.status === "partial");
  const ok       = results.filter(r => r.status === "ok");

  const logLines = [
    `=== Fetch FMP ${new Date().toISOString()} ===`,
    `Total: ${TICKERS.length} | OK: ${countOk} | Parciales: ${countPartial} | Errores: ${countError}`,
    "",
  ];

  if (errors.length) {
    logLines.push("── ERRORES (sin datos) ─────────────────────────────");
    for (const r of errors) {
      logLines.push(`  ✗ ${r.ticker.padEnd(12)} ${r.error}`);
    }
    logLines.push("");
  }

  if (partials.length) {
    logLines.push("── PARCIALES (faltan campos) ────────────────────────");
    for (const r of partials) {
      logLines.push(`  ~ ${r.ticker.padEnd(12)} sin: ${r.missingFields.join(", ")}`);
    }
    logLines.push("");
  }

  if (ok.length) {
    logLines.push("── OK ───────────────────────────────────────────────");
    logLines.push("  " + ok.map(r => r.ticker).join("  "));
    logLines.push("");
  }

  fs.writeFileSync(logPath, logLines.join("\n"));
  console.log(`Log guardado en scripts/fetch-log.txt`);

  if (countOk + countPartial === 0) {
    console.error("ERROR: ningún precio obtenido — revisa la API key");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
