import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/finnhub";
import { searchCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const results = await searchStocks(q);
    searchCache.set(cacheKey, results);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 });
  }
}
