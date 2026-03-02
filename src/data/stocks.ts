import type { Stock } from "../types/stock";

export const STOCKS_DB: Stock[] = [
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", country: "USA", exchange: "NASDAQ", marketCap: 3500, peRatio: 31.2, employees: 161000, founded: 1976, dividendYield: 0.5 },
    { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", country: "USA", exchange: "NASDAQ", marketCap: 3100, peRatio: 36.8, employees: 221000, founded: 1975, dividendYield: 0.7 },
    { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", country: "USA", exchange: "NASDAQ", marketCap: 2900, peRatio: 65.4, employees: 29600, founded: 1993, dividendYield: 0.03 },
    { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication", country: "USA", exchange: "NASDAQ", marketCap: 2200, peRatio: 25.1, employees: 182000, founded: 1998, dividendYield: 0 },
    { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", country: "USA", exchange: "NASDAQ", marketCap: 2000, peRatio: 43.7, employees: 1525000, founded: 1994, dividendYield: 0 },
    { symbol: "META", name: "Meta Platforms", sector: "Communication", country: "USA", exchange: "NASDAQ", marketCap: 1400, peRatio: 27.3, employees: 67000, founded: 2004, dividendYield: 0.4 },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", country: "USA", exchange: "NASDAQ", marketCap: 900, peRatio: 85.2, employees: 127855, founded: 2003, dividendYield: 0 },
    { symbol: "BRK.B", name: "Berkshire Hathaway", sector: "Financial", country: "USA", exchange: "NYSE", marketCap: 870, peRatio: 21.4, employees: 396500, founded: 1839, dividendYield: 0 },
    { symbol: "JPM", name: "JPMorgan Chase", sector: "Financial", country: "USA", exchange: "NYSE", marketCap: 680, peRatio: 12.3, employees: 316043, founded: 1799, dividendYield: 2.3 },
    { symbol: "V", name: "Visa Inc.", sector: "Financial", country: "USA", exchange: "NYSE", marketCap: 560, peRatio: 30.5, employees: 31700, founded: 1958, dividendYield: 0.8 },
    { symbol: "ASML", name: "ASML Holding", sector: "Technology", country: "Netherlands", exchange: "NASDAQ", marketCap: 290, peRatio: 40.1, employees: 42000, founded: 1984, dividendYield: 1.1 },
    { symbol: "SAP", name: "SAP SE", sector: "Technology", country: "Germany", exchange: "NYSE", marketCap: 270, peRatio: 52.3, employees: 105000, founded: 1972, dividendYield: 1.3 },
    { symbol: "NESN", name: "Nestlé S.A.", sector: "Consumer Defensive", country: "Switzerland", exchange: "OTC", marketCap: 250, peRatio: 18.7, employees: 273000, founded: 1866, dividendYield: 3.5 },
    { symbol: "NOVO-B", name: "Novo Nordisk", sector: "Healthcare", country: "Denmark", exchange: "NYSE", marketCap: 480, peRatio: 44.8, employees: 64000, founded: 1923, dividendYield: 1.2 },
    { symbol: "7203", name: "Toyota Motor", sector: "Consumer Cyclical", country: "Japan", exchange: "OTC", marketCap: 310, peRatio: 9.2, employees: 375235, founded: 1937, dividendYield: 2.8 },
    { symbol: "SONY", name: "Sony Group", sector: "Technology", country: "Japan", exchange: "NYSE", marketCap: 120, peRatio: 17.6, employees: 113000, founded: 1946, dividendYield: 0.6 },
    { symbol: "TSM", name: "TSMC", sector: "Technology", country: "Taiwan", exchange: "NYSE", marketCap: 920, peRatio: 29.4, employees: 73090, founded: 1987, dividendYield: 1.7 },
    { symbol: "BABA", name: "Alibaba Group", sector: "Consumer Cyclical", country: "China", exchange: "NYSE", marketCap: 200, peRatio: 11.2, employees: 228675, founded: 1999, dividendYield: 0 },
    { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", country: "USA", exchange: "NYSE", marketCap: 380, peRatio: 22.6, employees: 131900, founded: 1886, dividendYield: 3.2 },
    { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", country: "USA", exchange: "NYSE", marketCap: 720, peRatio: 37.4, employees: 2100000, founded: 1945, dividendYield: 1.1 },
];

export const getTodayStock = (): Stock => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return STOCKS_DB[seed % STOCKS_DB.length];
};
