// Curated list of well-known stock symbols used as the pool for the daily stock.
// Only symbols — all data is fetched from the Finnhub API at runtime.
export const STOCK_SYMBOLS: string[] = [
  // US — Technology
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "TSM", "AVGO", "ORCL",
  "CRM", "ADBE", "AMD", "INTC", "CSCO", "IBM", "QCOM", "TXN", "NOW", "INTU",
  "AMAT", "MU", "LRCX", "KLAC", "SNPS", "CDNS", "MRVL", "ADI", "NXPI", "PANW",
  "SHOP", "SQ", "PLTR", "NET", "CRWD", "DDOG", "ZS", "SNOW",

  // US — Financial
  "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "BLK", "SCHW", "AXP",
  "C", "USB", "PNC", "COF", "BK", "CME", "ICE", "SPGI", "MCO",

  // US — Healthcare
  "JNJ", "UNH", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
  "AMGN", "GILD", "VRTX", "REGN", "ISRG", "MDT", "SYK", "BSX", "EW", "ZTS",

  // US — Consumer
  "WMT", "PG", "KO", "PEP", "COST", "HD", "MCD", "NKE", "SBUX", "TGT",
  "LOW", "TJX", "EL", "CL", "MDLZ", "GIS", "K", "HSY", "DG",

  // US — Industrial / Energy
  "XOM", "CVX", "COP", "SLB", "EOG", "CAT", "DE", "UPS", "HON", "RTX",
  "BA", "LMT", "GE", "MMM", "EMR", "ETN", "ITW", "PH", "WM",

  // US — Communication / Media
  "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR", "EA", "TTWO", "WBD",

  // US — Other
  "BRK.B", "PYPL", "UBER", "ABNB", "SQ", "COIN",

  // Europe
  "ASML", "SAP", "NOVO-B", "NVO", "AZN", "SHEL", "TTE", "SAN", "HSBA",
  "LVMUY", "NSRGY", "RHHBY", "UL", "BP", "GSK", "DEO", "BUD", "RACE",
  "SIEGY", "EADSY",

  // Asia
  "SONY", "TM", "BABA", "JD", "PDD", "NIO", "BIDU", "MELI",
  "HDB", "INFY", "WIT",

  // Other
  "VALE", "ITUB", "NU", "SE", "GRAB", "CPNG",
];

/**
 * Deterministically selects a symbol for a given date.
 * Uses a simple hash of the date string to index into STOCK_SYMBOLS.
 */
export function getDailySymbol(date: Date): string {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % STOCK_SYMBOLS.length;
  return STOCK_SYMBOLS[index];
}
