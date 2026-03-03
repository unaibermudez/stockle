import { NextRequest, NextResponse } from "next/server";
import { getFullStock } from "@/lib/finnhub";
import { stockCache } from "@/lib/cache";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const cacheKey = `stock:${upperSymbol}`;
  const cached = stockCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const stock = await getFullStock(upperSymbol);
    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }
    stockCache.set(cacheKey, stock as unknown as Record<string, unknown>);
    return NextResponse.json(stock);
  } catch (error) {
    console.error(`Stock API error for ${upperSymbol}:`, error);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}
