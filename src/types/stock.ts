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
