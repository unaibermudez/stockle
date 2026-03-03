export interface Stock {
    symbol: string;
    name: string;
    sector: string;
    country: string;
    exchange: string;
    marketCap: number;
    peRatio: number;
    employees: number;
    founded: number;
    dividendYield: number;
    // New fields from Finnhub API
    beta?: number;
    revenueGrowth?: number;
    weekHigh52?: number;
    weekLow52?: number;
}

export type ComparisonResult = "correct" | "wrong" | "high" | "low";

export interface Attribute {
    key: keyof Stock;
    label: string;
    type: "categorical" | "numeric";
    icon: string;
    transform?: (v: number) => number;
}

export interface Guess extends Stock {
    results: Record<string, ComparisonResult>;
}

export type GameStatus = "playing" | "won" | "lost";
