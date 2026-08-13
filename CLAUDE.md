# CLAUDE.md

Guía para trabajar en este repositorio. Describe **el código que hay hoy**, no el diseño inicial.

## Qué es esto

Juego diario tipo Wordle: hay que adivinar una acción de bolsa en **6 intentos**. Cada intento es
un ticker del pool, y el juego responde comparando ocho columnas (país, sector, capitalización,
precio, EBITDA, empleados, año de fundación) con un semáforo de tres colores.

Sin backend, sin base de datos, sin build step y sin dependencias. El navegador carga tres
ficheros y ya está.

## Stack

| Capa | Qué se usa |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla, sin frameworks |
| Pool de acciones | `stocks.js`, un array literal cargado como `window.STOCKS` |
| Precios | `prices.json`, regenerado por GitHub Actions (ver abajo) |
| Sesión y estadísticas | `localStorage` |
| Deploy | GitHub Pages, estático |

Node solo se usa **fuera del navegador**, para los scripts de `scripts/`. No hay `package.json`
ni `node_modules`: los scripts usan únicamente módulos nativos (`fs`, `path`) y el `fetch` global
de Node 18+.

## Estructura

```
stockle/
├── index.html                     # marcado base; carga stocks.js y app.js
├── style.css
├── app.js                         # toda la lógica del juego y de la interfaz
├── stocks.js                      # pool de acciones con los campos fijos
├── prices.json                    # generado; precios y perfiles descargados de FMP
├── .github/workflows/
│   └── update-prices.yml          # cron que regenera prices.json
└── scripts/
    ├── fetch-prices.js            # el que corre en CI y en local
    ├── test-alt-tickers.js        # exploratorio, no entra en CI
    ├── test-yahoo-fallback.js     # exploratorio, no entra en CI
    └── PENDIENTE-yahoo-fallback.md
```

## De dónde salen los datos

Hay **dos fuentes** y conviene no confundirlas, porque es el punto donde más fácil es meter la pata.

### 1. `stocks.js`, los campos fijos

Un array de objetos, uno por acción:

```javascript
window.STOCKS = [
  { ticker:"ITX.MC", name:"Inditex", country:"España", sector:"Consumer Cyclical",
    marketCap:120, price:42, ebitda:8.0, employees:165000, founded:1985, color:"#003087" },
  // …
];
```

| Campo | Unidad / formato | Origen |
|---|---|---|
| `ticker` | símbolo interno, sufijo `.MC` para BME | manual |
| `name`, `country`, `sector` | texto | manual |
| `marketCap`, `ebitda` | **miles de millones de dólares** | estimado a mano |
| `price` | dólares | valor inicial, se sobrescribe en runtime |
| `employees` | entero | estimado a mano |
| `founded` | año de fundación de la empresa | manual |
| `color` | hex, usado en el badge del logo | manual |

**Es un array, no un objeto indexado por ticker.** Buscar una acción es
`STOCKS.find(s => s.ticker === tk)`.

Ojo con dos cosas: `marketCap`, `ebitda` y `employees` son **estimaciones redondeadas a ojo**, no
datos verificados, y `founded` es el año de **fundación de la empresa**, no el de su salida a
bolsa. Son los valores que el juego usa para comparar.

### 2. `prices.json`, lo que se descarga

Lo genera `scripts/fetch-prices.js` contra la API de Financial Modeling Prep, y tiene dos bloques:

```json
{
  "updated": "2026-08-12T23:12:59.314Z",
  "count": 44,
  "prices":   { "ITX.MC": 58.66, "AAPL": 304.91 },
  "profiles": { "AAPL": { "price": 304.91, "marketCap": 4478321717960,
                          "employees": 166000, "sector": "Technology",
                          "country": "US", "ipoDate": "1980-12-12" } }
}
```

`count` es cuántos tickers respondieron **en la última ejecución**, no cuántos hay en el fichero.
`prices` acumula 127 tickers de ejecuciones anteriores; `profiles` solo trae los 44 que
respondieron esta vez. Que esos dos números no cuadren es justamente el síntoma del problema
descrito en "Limitaciones conocidas".

**Hoy el frontend solo consume `prices`.** `loadPrices()` en `app.js` sobrescribe `s.price` de
cada acción y nada más; el bloque `profiles`, que trae capitalización, empleados, sector y país
**reales**, se descarga y se queda sin usar. Por eso el juego compara con las estimaciones de
`stocks.js` teniendo los datos buenos en el mismo fichero.

Si `prices.json` falla al cargarse, `loadPrices()` traga el error y el juego sigue con los precios
estáticos de `stocks.js`. Degrada, no rompe.

## La clave de FMP nunca va en el frontend

Esto es importante y el repo es público:

- La clave vive en **`FMP_API_KEY`**, y solo la lee `scripts/fetch-prices.js`, que corre en Node.
- En CI llega por `secrets.FMP_API_KEY`, inyectada como variable de entorno en el workflow.
- En local se lee de un `.env` en la raíz (`FMP_API_KEY=tu_clave`), parseado a mano al arrancar
  el script. **`.env` está en `.gitignore` y no debe salir de ahí.**
- El navegador **no llama a FMP** ni conoce la clave. Solo hace `fetch("prices.json")`.

Versiones antiguas de este documento decían que la clave iba como constante en `stocks.js`. **Eso
es falso y además sería un error:** cualquier visitante puede leer un fichero servido a su
navegador. Si algún día hiciera falta consultar FMP en tiempo real, la salida es un proxy
serverless, no una constante en el cliente.

## Cómo se actualizan los precios

`.github/workflows/update-prices.yml`, de lunes a viernes a las 22:30 UTC, después del cierre de
Europa y Estados Unidos. También se puede lanzar a mano con `workflow_dispatch`.

El job pide el perfil de los 139 tickers de la lista `TICKERS`, escribe `prices.json` y hace
commit solo si hay cambios, firmando como `github-actions[bot]`.

Detalles de `fetch-prices.js` que importan al tocarlo:

- **350 ms de espera entre peticiones**, porque el plan gratuito de FMP da 250 al día.
- **Reintento ante un 429**, hasta 3 veces, con espera creciente de 10 s por intento.
- **`FMP_MAP`** traduce los tickers internos a los símbolos reales de FMP cuando no coinciden.
  Ejemplos: `ATRM.MC` es `A3M.MC`, `LVMH` es `MC.PA`, `CCEP.MC` cotiza como `CCEP` en NASDAQ.
- **Los precios anteriores se conservan.** El script parte del `prices.json` existente, así que un
  ticker que falle un día mantiene su último precio bueno en lugar de desaparecer.
- Cada acción se clasifica como `ok`, `partial` (le faltan campos) o `error`, y el detalle se
  escribe en `scripts/fetch-log.txt`, que está ignorado por git.
- Si no se obtiene **ningún** precio, sale con código 1 para que el workflow falle de forma visible.

**Los commits del bot no cuentan como contribuciones en el perfil de GitHub.** Es normal, no es un
síntoma de nada roto.

## Lógica del juego

Todo está en `app.js`.

### Qué acción toca cada día

```javascript
const EPOCH = Date.UTC(2025, 0, 1);

function puzzleNumber() {
  const d = new Date();
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((utc - EPOCH) / 86400000);
}
function getDailyAnswer(pn) {
  return STOCKS[((pn % STOCKS.length) + STOCKS.length) % STOCKS.length];
}
```

Días transcurridos desde el 1 de enero de 2025 en UTC, y ese número indexa el array. Determinista,
igual para todo el mundo y sin servidor. El doble módulo es para que fechas anteriores a la época
no den un índice negativo.

Como el índice avanza de uno en uno, **el pool se recorre en orden**, no aleatoriamente: la acción
de mañana es la siguiente del array. Con 140 entradas, el ciclo completo son unos 4,6 meses.

### Las columnas y su comparación

`COLUMNS` define las ocho columnas de la tabla. Cada una es `cat` (categórica) o `num` (numérica),
y `compareCell()` devuelve un estado y una dirección:

| Tipo | Regla | Estados posibles |
|---|---|---|
| `cat` (ticker, país, sector) | igualdad exacta | verde o rojo |
| `founded` | diferencia absoluta de años: 0 verde, ≤ 8 ámbar, resto rojo | verde, ámbar, rojo |
| Resto de `num` | ratio `guess / answer`: entre 0,95 y 1,05 verde; entre 0,5 y 2,0 ámbar; resto rojo | verde, ámbar, rojo |

**Son tres estados, no dos.** El ámbar significa "cerca" y es lo que hace jugable el juego: con
solo verde y rojo, acertar una capitalización exacta sería imposible.

La dirección (`up` / `down`) se calcula comparando con la respuesta y se pinta como flecha en las
celdas numéricas que no son verdes.

### Estado guardado

Dos claves de `localStorage`, con formatos distintos:

| Clave | Contenido |
|---|---|
| `stockle_game_<pn>` | partida del día: `{ guesses: [ticker], status }`. `<pn>` es el número de puzzle, no la fecha |
| `stockle_stats` | acumulado: `{ currentStreak, maxStreak, played, wins, lastWonPuzzle }` |

Al cambiar de día cambia `<pn>`, así que la partida arranca limpia sola. Las claves viejas **no se
borran**, se quedan acumulando en el navegador.

Todos los accesos van envueltos en `try/catch`: si `localStorage` no está disponible, se juega sin
persistencia en lugar de petar.

### Otras piezas de la interfaz

- **Autocompletado** en el buscador, filtrando por nombre o ticker.
- **Pista** (`getHintStock()`), con 30 segundos de espera entre usos.
- **Texto para compartir**, la típica cuadrícula de emojis, con 🟩 🟨 🟥.
- **Confeti** al ganar, dibujado a mano sin librería.
- **Modo dev**: se activa con `?dev=1` en la URL o con `Ctrl+Shift+D`. Muestra la lista completa
  de acciones con filtros, útil para revisar el pool. No hace falta quitarlo para desplegar.

## Levantar en local

Hace falta un servidor, porque `app.js` hace `fetch("prices.json")` y `file://` lo bloquea.

```bash
python3 -m http.server 3000     # o la extensión Live Server de VS Code
```

Para regenerar los precios a mano:

```bash
echo "FMP_API_KEY=tu_clave" > .env
node scripts/fetch-prices.js
```

Gasta una petición por ticker, 139 en total, sobre un límite diario de 250. No conviene lanzarlo
varias veces el mismo día.

## Deploy

GitHub Pages sobre `main`, sin build. Está publicado en
**https://unaibermudez.github.io/stockle/** (la ruta va en minúsculas).

Cualquier push a `main` republica, incluidos los del bot de precios.

## Convenciones

- La interfaz está en inglés y el código y los comentarios, en español. Es así por histórico.
- Cero dependencias. Añadir un `package.json` es una decisión de calado, no un detalle: hoy la
  ausencia de build step es lo que permite que Pages sirva el repo tal cual.
- Un fichero por responsabilidad: `stocks.js` solo datos, `app.js` solo lógica, `style.css` solo
  estilos.
- Prefijos de commit `feat:`, `fix:`, `chore:`, `docs:`. El idioma está sin unificar: los del bot
  van en español y los manuales han ido en los dos. Conviene decidirlo antes de escribir muchos
  más.
- **Los commits van a nombre del usuario.** No añadir trailers `Co-Authored-By` de Claude ni de
  ninguna IA.

## Limitaciones conocidas

Cosas que están mal a propósito o a medias, para no volver a diagnosticarlas desde cero:

1. **El bloque `profiles` de `prices.json` no se usa.** Es la mejora de mayor impacto: haría que
   las comparaciones dejaran de basarse en estimaciones a ojo.
2. **`GRF.MC` está duplicado en `stocks.js`**, como "Grifols" y "Grifols B". Son 140 entradas con
   139 tickers únicos, y la segunda se descarta en silencio porque `find()` devuelve la primera.
3. **FMP ya no cubre la bolsa española, y es el problema más serio del proyecto.** De los 94
   tickers `.MC` de la lista, **92 fallan** en cada ejecución. Los dos que sobreviven, `EBO.MC` y
   `CCEP.MC`, son precisamente los dos que `FMP_MAP` redirige a mercados de fuera de BME (OTC y
   NASDAQ). En junio de 2026 fallaban 25 de 139; hoy fallan 95.

   El efecto es silencioso y por eso engaña: como el script conserva los precios anteriores, esas
   acciones **siguen apareciendo con el precio que tenían la última vez que la cobertura
   funcionó**, sin ninguna marca de que están congeladas. El juego presenta datos viejos como si
   fueran del día.

   Afecta a dos tercios del pool, que es justo la parte española, la razón de ser del proyecto.
   Antes de tocar nada más, hay que decidir la fuente de datos: el fallback a Yahoo Finance
   analizado en `scripts/PENDIENTE-yahoo-fallback.md`, otro proveedor, o un plan de pago.
   Mientras tanto, conviene no fiarse de los precios `.MC` de `prices.json`.
4. **No hay tests.** `puzzleNumber()`, `getDailyAnswer()` y `compareCell()` son funciones puras y
   deterministas, así que serían fáciles de cubrir, pero exigirían decidir antes lo del
   `package.json`.
5. **No hay README.** Este documento es la única documentación del repo.
