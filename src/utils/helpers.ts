import type { ComparisonResult, Attribute } from "../types/stock";

export const compareAttribute = (guessVal: any, targetVal: any, type: "categorical" | "numeric"): ComparisonResult => {
    if (type === "categorical") {
        return guessVal === targetVal ? "correct" : "wrong";
    }
    const diff = Math.abs(guessVal - targetVal) / (Math.abs(targetVal) || 1);
    if (guessVal === targetVal || diff < 0.05) return "correct";
    return guessVal < targetVal ? "low" : "high";
};

export const formatValue = (attr: Attribute, value: any): string | number => {
    if (attr.transform && typeof value === "number") return attr.transform(value);
    if (attr.key === "marketCap") return `$${value}B`;
    if (attr.key === "dividendYield") return `${value}%`;
    if (attr.key === "peRatio" && typeof value === "number") return value.toFixed(1);
    if (attr.key === "founded") return value;
    if (typeof value === "number") return value.toLocaleString();
    return value;
};

export const getArrow = (status: ComparisonResult): string => {
    if (status === "correct") return "✓";
    if (status === "high") return "↓";
    if (status === "low") return "↑";
    return "✗";
};
