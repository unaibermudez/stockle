# Stockle — CLAUDE.md

Juego diario estilo Wordle para adivinar una acción de bolsa. Cada día hay una acción objetivo; el usuario hace guesses por ticker y recibe feedback campo a campo. Sin backend, sin base de datos — todo corre en el navegador.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla (sin frameworks) |
| Datos estáticos | `stocks.js` — objeto JS hardcodeado con todos los datos fijos del pool |
| Datos dinámicos | Financial Modeling Prep (FMP) — llamada directa desde el frontend solo para precio actual |
| Sesión | `localStorage` — guarda el estado del juego del día actual |
| Deploy | GitHub Pages (estático, gratis) |

**No hay backend, no hay base de datos, no hay build step.**

---

## Estructura del proyecto

```
Stockle/
├── index.html
├── style.css
├── app.js          # lógica del juego
├── stocks.js       # pool completo de acciones con datos fijos
└── CLAUDE.md
```

---

## Separación de datos: fijos vs dinámicos

### Datos fijos — en `stocks.js` (hardcodeados, nunca cambian)

```javascript
const STOCKS = {
  "ITX.MC": {
    name: "Inditex",
    ticker: "ITX.MC",
    country: "España",
    sector: "Consumo",
    industry: "Textil",
    employees: 165000,
    ipoYear: 2001,
    mktCapBucket: "Mega Cap",  // bucket fijo para comparación
  },
  "AAPL": {
    name: "Apple",
    ticker: "AAPL",
    country: "USA",
    sector: "Tecnología",
    industry: "Hardware",
    employees: 164000,
    ipoYear: 1980,
    mktCapBucket: "Mega Cap",
  },
  // ... resto del pool
};
```

### Datos dinámicos — llamada a FMP al cargar la página

Solo se llama a FMP **una vez por sesión** para obtener el precio actual de la acción del día. El precio se guarda en `localStorage` con TTL de 24h para no repetir la llamada.

```javascript
// Único endpoint usado
GET https://financialmodelingprep.com/api/v3/quote-short/{ticker}?apikey=KEY
// Devuelve: { symbol, price, volume }
```

**La API key de FMP va en `stocks.js` como constante.** Al ser un proyecto personal/portfolio sin datos sensibles, es aceptable. Si se quiere proteger, se puede usar un proxy serverless (Netlify Function, Cloudflare Worker).

---

## Lógica del juego (app.js)

### Acción del día

Se determina de forma **determinista por fecha**, sin servidor:

```javascript
function getDailyStock() {
  const tickers = Object.keys(STOCKS);
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % tickers.length;
  return tickers[index];
}
```

Todos los usuarios del mismo día ven la misma acción. Sin servidor, sin sincronización.

### Comparación de campos

| Campo | Tipo | Lógica |
|-------|------|--------|
| `country` | Categórico | ✅ CORRECT / ❌ WRONG |
| `sector` | Categórico | ✅ CORRECT / ❌ WRONG |
| `industry` | Categórico | ✅ CORRECT / ❌ WRONG |
| `mktCapBucket` | Categórico | ✅ CORRECT / ❌ WRONG |
| `employees` | Numérico | ✅ / ↑ HIGHER / ↓ LOWER |
| `ipoYear` | Numérico | ✅ / ↑ HIGHER / ↓ LOWER |
| `price` | Numérico (FMP) | ✅ / ↑ HIGHER / ↓ LOWER |

Tolerancia en numéricos: ±10% → CORRECT.

**Market Cap como bucket, no como número exacto** (evita que el precio cambie el resultado del día):
```
Nano Cap    < 50M
Micro Cap   50M – 300M
Small Cap   300M – 2B
Mid Cap     2B – 10B
Large Cap   10B – 200B
Mega Cap    > 200B
```

### Sesión en localStorage

```javascript
// Clave: "stockle_YYYY-MM-DD"
{
  guesses: ["ITX.MC", "AAPL"],   // tickers intentados
  won: false,
  attempts: 2
}
```

Al cambiar el día, la clave es distinta → estado limpio automáticamente. Las claves viejas se limpian en cada carga.

---

## API externa: Financial Modeling Prep (FMP)

**Solo se usa para el precio actual** — todo lo demás es estático.

```
Free tier: 250 requests/día
Uso real en Stockle: 1 request/día/usuario (precio de la acción del día)
```

```javascript
const FMP_API_KEY = "TU_KEY_AQUI"; // en stocks.js
const FMP_BASE = "https://financialmodelingprep.com/api/v3";

async function fetchCurrentPrice(ticker) {
  const cached = getPriceFromCache(ticker); // localStorage, TTL 24h
  if (cached) return cached;

  const res = await fetch(`${FMP_BASE}/quote-short/${ticker}?apikey=${FMP_API_KEY}`);
  const data = await res.json();
  const price = data[0]?.price ?? null;

  savePriceToCache(ticker, price);
  return price;
}
```

---

## Convenciones

- Todo en español en la UI, código en inglés
- Sin dependencias externas — cero `npm install`
- Sin transpilación — JS moderno (ES2020+), navegadores modernos
- Un archivo por responsabilidad: `stocks.js` solo datos, `app.js` solo lógica, `style.css` solo estilos
- Commits en inglés: `feat:`, `fix:`, `chore:`

---

## Levantar en local

```bash
# Opción 1 — Python (sin instalar nada)
python3 -m http.server 3000

# Opción 2 — VS Code Live Server
# Instalar extensión Live Server → botón "Go Live"
```

Abrir `http://localhost:3000` en el navegador.

---

## Deploy

GitHub Pages: subir los 4 archivos al repo, activar Pages desde `main/root`. URL automática: `https://usuario.github.io/stockle`.

---

## Pool de acciones

Pool curado en `stocks.js`. Total: ~161 acciones (~5,4 meses sin repetir).

**Regla de inclusión:** la acción debe tener todos los campos fijos bien definidos (country, sector, industry, employees, ipoYear, mktCapBucket). El precio lo obtiene FMP en tiempo real.

### 🇪🇸 España — Tier A: IBEX 35

```
SAN.MC    BBVA.MC   TEF.MC    IBE.MC    REP.MC
AMS.MC    CABK.MC   SAB.MC    BKT.MC    ENG.MC
FER.MC    ACS.MC    ANA.MC    MAP.MC    IAG.MC
MEL.MC    SOL.MC    VIS.MC    ACX.MC    GRF.MC
LOG.MC    MTS.MC    NTGY.MC   PHM.MC    CLNX.MC
COL.MC    AENA.MC   ROVI.MC   MRL.MC    ELE.MC
FDR.MC    ALMS.MC   BEST.MC   IDR.MC    ITX.MC
```

### 🇪🇸 España — Tier B: Mercado Continuo, grandes conocidas

```
SGRE.MC   # Siemens Gamesa
CIE.MC    # CIE Automotive
CAF.MC    # Construcciones y Aux. Ferrocarriles (Beasain)
FLC.MC    # Fluidra (piscinas, líder mundial)
GST.MC    # Gestamp (automoción)
ATRM.MC   # Atresmedia (Antena 3, La Sexta)
DIA.MC    # Dia (supermercados)
EBO.MC    # Ebro Foods (Gallo, SOS)
FCC.MC    # FCC (construcción, agua)
ENCE.MC   # Ence (papel, biomasa)
FAE.MC    # Faes Farma
CCEP.MC   # Coca-Cola Europacific Partners
EDR.MC    # eDreams (viajes online)
DOM.MC    # Dominion (servicios tecnológicos)
IND.MC    # Indra (defensa, tecnología)
ALM.MC    # Almirall (farmacia)
AZK.MC    # Azkoyen (máquinas vending)
LRE.MC    # Linea Directa Aseguradora
GCO.MC    # Grupo Catalana Occidente (seguros)
AUD.MC    # Audax Renovables
ECO.MC    # Ecoener
GREN.MC   # Grenergy (solar)
DLEO.MC   # Deoleo (aceite de oliva, Carbonell)
CBAV.MC   # Clínica Baviera
MCM.MC    # Mecalux (logística automatizada)
NXT.MC    # Nextil (textil técnico)
AMPE.MC   # Amper (telecomunicaciones, defensa)
```

### 🇪🇸 España — Tier C: Mercado Continuo, medianas (verificar datos antes de añadir)

```
AIRT.MC   # Airtificial (robótica industrial)
AEDAS.MC  # Aedas Homes (promotora inmobiliaria)
ALBA.MC   # Corp. Financiera Alba (holding)
IBPG.MC   # Iberpapel
TPZ.MC    # Telepizza
PRIM.MC   # Prim (material médico)
TUB.MC    # Tubacex (tubos acero — Llodio)
VID.MC    # Vidrala (envases vidrio — Álava)
SLR.MC    # Solaria (solar)
LAR.MC    # Lar España (SOCIMI retail)
OHLA.MC   # OHLA (construcción)
DFG.MC    # Duro Felguera (ingeniería industrial)
ERE.MC    # Ercros (química)
ELEC.MC   # Elecnor
```

### 🇪🇸 España — Tier D: Pequeñas (añadir solo si datos completos verificados)

```
ADX.MC    # Alantra (banca inversión)
BRIO.MC   # Bodegas Riojanas
LGT.MC    # Lingotes Especiales
GAM.MC    # GAM (alquiler maquinaria)
BERKA.MC  # Berkeley (minería uranio)
LBTS.MC   # Libertas 7
INMB.MC   # Inmobiliaria del Sur
```

### 🇺🇸 USA — S&P 500 + tech conocida (~60)

```
AAPL   MSFT   GOOGL  AMZN   NVDA   META   TSLA   JPM
V      MA     UNH    JNJ    XOM    PG     HD     CVX
MRK    ABBV   KO     PEP    AVGO   LLY    COST   MCD
TMO    ACN    BAC    CRM    NFLX   AMD    INTC   CSCO
DIS    NKE    ADBE   TXN    QCOM   PM     WMT    IBM
GE     BA     CAT    MMM    HON    RTX    LMT    GS
MS     PYPL   UBER   SPOT   ABNB   COIN   PLTR   SQ
BRK-B  BKNG   HOOD
```

### 🌍 Globales conocidas (~18)

```
ASML      # ASML (litografía semiconductores, Holanda)
SAP       # SAP (ERP, Alemania)
TM        # Toyota (Japón)
HSBC      # HSBC (banca global)
SHEL      # Shell (energía)
TSM       # TSMC (semiconductores, Taiwán)
BABA      # Alibaba (China)
NVO       # Novo Nordisk (farmacia, Dinamarca)
TTE       # TotalEnergies (energía, Francia)
RACE      # Ferrari (Italia)
ARM       # ARM Holdings (chips, UK)
MC.PA     # LVMH (lujo, Francia)
AIR.PA    # Airbus (aeroespacial)
SIE.DE    # Siemens (Alemania)
ADS.DE    # Adidas (Alemania)
VOW3.DE   # Volkswagen (Alemania)
NESN.SW   # Nestlé (Suiza)
```

### Resumen del pool

| Región | Tier | Nº acciones | Estado |
|--------|------|-------------|--------|
| 🇪🇸 España | A (IBEX 35) | 35 | ✅ Activo |
| 🇪🇸 España | B (Continuo grandes) | 27 | ✅ Activo |
| 🇪🇸 España | C (Continuo medianas) | 14 | ⚠️ Verificar |
| 🇪🇸 España | D (Pequeñas) | 7 | ⚠️ Verificar |
| 🇺🇸 USA | — | ~60 | ✅ Activo |
| 🌍 Globales | — | ~17 | ✅ Activo |
| **Total** | | **~160** | |

**~160 días = ~5,3 meses** sin repetir acción.

---

## Roadmap de fases

1. **Setup** — repo GitHub, 4 archivos base, GitHub Pages activo
2. **Datos** — rellenar `stocks.js` con el pool completo (campos fijos)
3. **Juego core** — lógica de selección diaria, comparación de campos, localStorage
4. **UI** — tabla de guesses, autocomplete, feedback visual (colores)
5. **FMP** — integración precio actual, caché en localStorage 24h
6. **Polish** — animaciones, share button (grid de emojis), mobile
