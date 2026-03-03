import type { Stock } from "@/types/stock";

export async function fetchDailyStock(): Promise<Stock> {
  const res = await fetch("/api/daily");
  if (!res.ok) throw new Error("Failed to fetch daily stock");
  return res.json();
}

export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search stocks");
  return res.json();
}

export async function fetchStock(symbol: string): Promise<Stock> {
  const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch stock ${symbol}`);
  return res.json();
}
