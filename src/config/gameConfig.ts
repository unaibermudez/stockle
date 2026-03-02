import type { Attribute } from "../types/stock";

export const MAX_GUESSES = 5;

export const ATTRIBUTES: Attribute[] = [
    { key: "sector", label: "Sector", type: "categorical", icon: "⚡" },
    { key: "country", label: "País", type: "categorical", icon: "🌍" },
    { key: "exchange", label: "Bolsa", type: "categorical", icon: "🏛" },
    { key: "marketCap", label: "Market Cap ($B)", type: "numeric", icon: "💰" },
    { key: "peRatio", label: "P/E Ratio", type: "numeric", icon: "📊" },
    { key: "employees", label: "Empleados (K)", type: "numeric", icon: "👥", transform: (v: number) => Math.round(v / 1000) },
    { key: "founded", label: "Fundada", type: "numeric", icon: "📅" },
    { key: "dividendYield", label: "Dividendo (%)", type: "numeric", icon: "💸" },
];
