import { NextResponse } from "next/server";
import { getFullStock } from "@/lib/finnhub";
import { stockCache } from "@/lib/cache";
import { getDailySymbol, STOCK_SYMBOLS } from "@/lib/symbols";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date();
  const baseSymbol = getDailySymbol(today);
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Try the primary symbol first, then fallback to adjacent symbols if data is incomplete
  const symbolsToTry = [baseSymbol];
  const baseIndex = STOCK_SYMBOLS.indexOf(baseSymbol);
  for (let offset = 1; offset <= 5; offset++) {
    symbolsToTry.push(STOCK_SYMBOLS[(baseIndex + offset) % STOCK_SYMBOLS.length]);
  }

  for (const symbol of symbolsToTry) {
    const cacheKey = `daily:${dateKey}:${symbol}`;
    const cached = stockCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    try {
      const stock = await getFullStock(symbol);
      if (stock && stock.name && stock.marketCap > 0) {
        stockCache.set(cacheKey, stock as unknown as Record<string, unknown>);
        // Also cache in the regular stock cache
        stockCache.set(`stock:${symbol}`, stock as unknown as Record<string, unknown>);
        return NextResponse.json(stock);
      }
    } catch (error) {
      console.error(`Daily stock error for ${symbol}:`, error);
      continue;
    }
  }

  return NextResponse.json({ error: "Could not load daily stock" }, { status: 500 });
}
