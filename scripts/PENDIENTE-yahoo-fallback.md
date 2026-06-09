# Tarea pendiente: verificar 12 tickers sin cobertura FMP

## Contexto

Se migró el fetch de precios de Yahoo Finance a **Financial Modeling Prep (FMP)**
usando el endpoint `stable/profile`. De 139 acciones del pool, 12 no tienen
cobertura válida en FMP y necesitan Yahoo Finance como fallback.

## Los 12 tickers a verificar

```
GST.MC    Gestamp
DLEO.MC   Deoleo
BRIO.MC   Bodegas Riojanas
BERKA.MC  Berkeley Minera
LBTS.MC   Libertas 7
ECO.MC    Ecoener
TPZ.MC    Telepizza
PRIM.MC   Prim S.A.
ELEC.MC   Elecnor
INMB.MC   Inmobiliaria del Sur
BME.MC    Bolsas y Mercados Españoles
LAR.MC    Lar España SOCIMI
```

> **Nota:** Yahoo Finance bloqueó por rate limit durante las pruebas de hoy.
> La prueba individual de `GST.MC` devolvió **404** (no existe), pero los demás
> no se pudieron confirmar. Probar mañana con la IP limpia.

## Qué hacer mañana

### 1. Ejecutar el test de Yahoo

```bash
node scripts/test-yahoo-fallback.js
```

El script prueba cada ticker en Yahoo Finance e imprime un resumen de:
- Cuáles tienen precio válido → añadir a `YAHOO_FALLBACK` en `fetch-prices.js`
- Cuáles fallan → **borrar** de `stocks.js` y de la lista `TICKERS` en `fetch-prices.js`

### 2. Si Yahoo funciona para algunos

En `scripts/fetch-prices.js`, añadir una constante `YAHOO_FALLBACK` con los
tickers que sí funcionan en Yahoo, y ampliar `main()` para que tras el bucle
principal haga una segunda pasada solo para esos tickers usando:

```javascript
const YF_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36";

async function fetchYahooPrice(ticker) {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (price == null) throw new Error("sin precio");
  return Math.round(price * 100) / 100;
}
```

### 3. Si Yahoo falla para todos (o algunos)

Borrar los que fallen de **dos sitios**:

**`stocks.js`** — eliminar el objeto `{ ticker:"XXX.MC", ... }` correspondiente.

**`scripts/fetch-prices.js`** — eliminar el ticker de la lista `TICKERS`.

### 4. Re-ejecutar fetch completo

```bash
node scripts/fetch-prices.js
```

Verificar `scripts/fetch-log.txt` — debe quedar a 0 errores (o solo los
que se hayan decidido borrar).

## Estado actual del FMP_MAP

Ya configurado en `fetch-prices.js` con las correcciones descubiertas:

| Ticker interno | Símbolo FMP real | Empresa |
|---|---|---|
| `ALMS.MC` | `ALM.MC` | Almirall |
| `ATRM.MC` | `A3M.MC` | Atresmedia |
| `ENCE.MC` | `ENC.MC` | ENCE Energía |
| `AUD.MC`  | `ADX.MC` | Audax Renovables |
| `GREN.MC` | `GRE.MC` | Grenergy |
| `AMPE.MC` | `AMP.MC` | Amper |
| `AIRT.MC` | `AI.MC`  | Airtificial |
| `ALBA.MC` | `ALB.MC` | Corp. Financiera Alba |
| `IBPG.MC` | `IBG.MC` | Iberpapel |
| `DFG.MC`  | `MDF.MC` | Duro Felguera |
| `ERE.MC`  | `ECR.MC` | Ercros |
| `EBO.MC`  | `EBRPF`  | Ebro Foods (OTC) |
| `CCEP.MC` | `CCEP`   | Coca-Cola Europacific (NASDAQ) |
