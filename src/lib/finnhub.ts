import type { Stock } from "@/types/stock";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is not set");
  return key;
}

async function finnhubFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${endpoint}`);
  url.searchParams.set("token", getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface FinnhubProfile {
  ticker?: string;
  name?: string;
  finnhubIndustry?: string;
  country?: string;
  exchange?: string;
  marketCapitalization?: number;
  employeeTotal?: number;
  ipo?: string;
}

interface FinnhubMetric {
  metric?: {
    peBasicExclExtraTTM?: number;
    dividendYieldIndicatedAnnual?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    revenueGrowthTTMYoy?: number;
  };
}

interface FinnhubSearchResult {
  result?: Array<{
    symbol: string;
    description: string;
    type: string;
  }>;
}

export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
  const data = await finnhubFetch<FinnhubSearchResult>("/search", { q: query });
  if (!data.result) return [];

  return data.result
    .filter((r) => r.type === "Common Stock" || r.type === "ADR" || r.type === "")
    .slice(0, 10)
    .map((r) => ({ symbol: r.symbol, name: r.description }));
}

export async function getStockProfile(symbol: string): Promise<FinnhubProfile> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}

export async function getStockMetrics(symbol: string): Promise<FinnhubMetric> {
  return finnhubFetch<FinnhubMetric>("/stock/metric", { symbol, metric: "all" });
}

function mapExchange(exchange: string | undefined): string {
  if (!exchange) return "Unknown";
  const upper = exchange.toUpperCase();
  if (upper.includes("NASDAQ")) return "NASDAQ";
  if (upper.includes("NEW YORK") || upper.includes("NYSE")) return "NYSE";
  if (upper.includes("LONDON") || upper === "LSE") return "LSE";
  if (upper.includes("TOKYO") || upper === "TSE") return "TSE";
  if (upper.includes("HONG KONG") || upper === "HKEX") return "HKEX";
  if (upper.includes("FRANKFURT") || upper.includes("XETRA")) return "XETRA";
  if (upper.includes("PARIS") || upper.includes("EURONEXT")) return "EURONEXT";
  return exchange;
}

function mapSector(industry: string | undefined): string {
  if (!industry) return "Unknown";
  const lower = industry.toLowerCase();
  if (lower.includes("technolog") || lower.includes("software") || lower.includes("semiconductor")) return "Technology";
  if (lower.includes("financ") || lower.includes("bank") || lower.includes("insurance")) return "Financial";
  if (lower.includes("health") || lower.includes("pharma") || lower.includes("biotech")) return "Healthcare";
  if (lower.includes("energy") || lower.includes("oil") || lower.includes("gas")) return "Energy";
  if (lower.includes("consumer") && lower.includes("cyclical")) return "Consumer Cyclical";
  if (lower.includes("consumer") && (lower.includes("defensive") || lower.includes("staple"))) return "Consumer Defensive";
  if (lower.includes("communication") || lower.includes("media") || lower.includes("telecom")) return "Communication";
  if (lower.includes("industrial") || lower.includes("aerospace") || lower.includes("defense")) return "Industrial";
  if (lower.includes("real estate") || lower.includes("reit")) return "Real Estate";
  if (lower.includes("utilit")) return "Utilities";
  if (lower.includes("material") || lower.includes("chemical") || lower.includes("mining")) return "Materials";
  return industry;
}

export async function getFullStock(symbol: string): Promise<Stock | null> {
  const [profile, metrics] = await Promise.all([
    getStockProfile(symbol),
    getStockMetrics(symbol),
  ]);

  if (!profile.name) return null;

  const m = metrics.metric ?? {};
  const ipoYear = profile.ipo ? parseInt(profile.ipo.split("-")[0], 10) : 0;

  return {
    symbol: profile.ticker ?? symbol,
    name: profile.name,
    sector: mapSector(profile.finnhubIndustry),
    country: profile.country ?? "Unknown",
    exchange: mapExchange(profile.exchange),
    marketCap: Math.round((profile.marketCapitalization ?? 0) / 1000), // Finnhub returns in millions, we want billions
    peRatio: Math.round((m.peBasicExclExtraTTM ?? 0) * 10) / 10,
    employees: profile.employeeTotal ?? 0,
    founded: ipoYear || 0,
    dividendYield: Math.round((m.dividendYieldIndicatedAnnual ?? 0) * 100) / 100,
    beta: m.beta ? Math.round(m.beta * 100) / 100 : undefined,
    revenueGrowth: m.revenueGrowthTTMYoy ? Math.round(m.revenueGrowthTTMYoy * 100) / 100 : undefined,
    weekHigh52: m["52WeekHigh"] ? Math.round(m["52WeekHigh"] * 100) / 100 : undefined,
    weekLow52: m["52WeekLow"] ? Math.round(m["52WeekLow"] * 100) / 100 : undefined,
  };
}
