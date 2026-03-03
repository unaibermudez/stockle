# STOCKLE — Roadmap de Mejoras

> Documento de planificación para evolucionar el MVP hacia un producto completo.  
> Organizado por fases de menor a mayor complejidad.

---

## Estado actual del MVP

El MVP funciona con datos mockeados en un array estático de 20 stocks. La lógica de juego está implementada (5 intentos, comparación de atributos, modal de resultado) pero todo es local, sin persistencia, sin API real y sin identidad de usuario.

---

## FASE 1 — Integración de API real de datos

### API recomendada: Finnhub

**Por qué Finnhub:** Tier gratuito generoso (60 req/min), no requiere tarjeta, tiene todos los endpoints necesarios.

**Endpoints a usar:**

```
GET /stock/profile2?symbol=AAPL&token=TU_KEY
→ name, country, exchange, sector, marketCapitalization, employeeTotal, ipo (año fundación)

GET /stock/metric?symbol=AAPL&metric=all&token=TU_KEY  
→ peRatio, dividendYield, 52WeekHigh, 52WeekLow, beta, revenueGrowthTTMYoy

GET /search?q=apple&token=TU_KEY
→ Para el buscador con sugerencias (symbol + description)
```

**Flujo de implementación:**

El problema de llamar a Finnhub en cada request del usuario es la latencia y el gasto de rate limit. La solución es un **backend propio ligero** (puede ser serverless) que actúa de caché:

```
[Cliente React]
      ↓ GET /api/search?q=apple
[Backend / Edge Function]
      ↓ (solo si no está en caché)
[Finnhub API]
      ↓
[Redis / KV Store — TTL 24h]
      ↓ respuesta cacheada
[Cliente React]
```

**Pasos concretos:**

1. Crear una cuenta en [finnhub.io](https://finnhub.io) y obtener API key gratuita
2. Crear un backend mínimo en **Next.js API Routes** o **Cloudflare Workers**
3. Implementar tres endpoints propios:
   - `GET /api/search?q=...` → proxy del search de Finnhub
   - `GET /api/stock/:symbol` → combina profile2 + metric, devuelve objeto normalizado
   - `GET /api/daily` → devuelve el stock del día (pre-cargado en servidor)
4. Cachear los datos de cada stock con TTL de 24 horas (los fundamentales no cambian a diario)
5. Pre-cargar una lista curada de ~200 stocks grandes al arrancar el servidor

**Objeto normalizado que devolverá el backend:**

```javascript
{
  symbol: "AAPL",
  name: "Apple Inc.",
  sector: "Technology",
  country: "US",
  exchange: "NASDAQ",
  marketCap: 3500,        // en $B
  peRatio: 31.2,
  employees: 161000,
  founded: 1976,          // de campo "ipo" → año
  dividendYield: 0.5,
  // Nuevos campos disponibles con API real:
  beta: 1.24,
  revenueGrowth: 0.08,    // YoY
  weekHigh52: 199.6,
  weekLow52: 164.1,
}
```

**API alternativa/complementaria:** [Alpha Vantage](https://www.alphavantage.co/) — más datos fundamentales (EPS, revenue, deuda) pero límite más bajo (25 req/día en free). Útil como fallback.

---

## FASE 2 — Persistencia y usuario

### 2.1 Guardar estado del juego localmente

Sin login, se puede usar `localStorage` para persistir:

- El guess del día actual (para que si el usuario recarga no pierda el progreso)
- El histórico de partidas (racha de días consecutivos, porcentaje de victorias)
- Las estadísticas básicas

```javascript
// Estructura sugerida en localStorage
{
  "stockle_state": {
    "date": "2026-03-03",         // Si cambia la fecha, se resetea
    "guesses": [...],
    "gameStatus": "playing",
  },
  "stockle_stats": {
    "gamesPlayed": 42,
    "gamesWon": 31,
    "currentStreak": 5,
    "maxStreak": 12,
    "guessDistribution": [0, 3, 8, 12, 6, 3]  // victorias por intento 1-5 + derrotas
  }
}
```

### 2.2 Modal de estadísticas

Añadir un botón de estadísticas (icono de gráfica) en el header que abra un modal con:

- **Jugadas / % ganadas / Racha actual / Racha máxima** (como Wordle)
- **Distribución de intentos:** barras horizontales mostrando en qué intento suele acertar el usuario
- **Siguiente puzzle:** countdown hasta medianoche para el próximo stock

### 2.3 Botón de compartir resultado

El clásico de Wordle. Genera un texto con emojis copiable al portapapeles:

```
STOCKLE #42 — 3/5

🟩🟥🟩🟥🟦🟧🟩🟥
🟩🟥🟩🟩🟦🟧🟩🟥
🟩🟩🟩🟩🟩🟩🟩🟩
```

- Verde `🟩` = correcto
- Rojo `🟥` = incorrecto (categórico)
- Naranja `🟧` = numérico alto
- Azul `🟦` = numérico bajo

No revela el nombre del stock para no hacer spoiler.

---

## FASE 3 — Mejoras de jugabilidad

### 3.1 Más atributos y selección dinámica

Con la API real se pueden añadir más columnas opcionales. Propuesta de atributos extra:

| Atributo | Key | Tipo | Nota |
|---|---|---|---|
| Beta | `beta` | Numérico | Volatilidad vs mercado |
| Revenue growth YoY | `revenueGrowth` | Numérico | % |
| 52-week high | `weekHigh52` | Numérico | Precio max. anual |
| Índice | `index` | Categórico | S&P500, NASDAQ100, DAX... |
| Capitalización tipo | `capType` | Categórico | Mega / Large / Mid / Small |

**Implementación:** El juego podría mostrar solo 6 de los 10 atributos disponibles, seleccionados aleatoriamente cada día (o también determinísticos por fecha). Añade re-jugabilidad.

### 3.2 Modos de dificultad

- **Fácil:** 7 intentos, atributos más fáciles (sector, país, bolsa + 3 numéricos amplios)
- **Normal:** 5 intentos, los 8 atributos actuales
- **Difícil:** 4 intentos, sin mostrar el sector, solo datos numéricos

### 3.3 Hint / Pista

Después del 3er intento fallido, ofrecer una pista contextual generada:

- *"Esta empresa lleva más de 50 años en bolsa"*
- *"Es la empresa con más empleados de su sector en este juego"*
- *"Su ticker tiene 4 letras"*

Las pistas se generan con reglas simples a partir de los datos, no necesita IA.

### 3.4 Pregunta de desempate

Si el usuario llega al intento 5 sin acertar, mostrar una pregunta de opción múltiple como última oportunidad:

> *"¿En qué año fue fundada esta empresa?"*  
> A) 1972  B) 1984  C) 1993  D) 2001

Si acierta, se cuenta como victoria especial (🎯*) en las estadísticas.

---

## FASE 4 — Universo de stocks curado

### 4.1 Lista ampliada y categorizada

El MVP tiene 20 stocks. Para un producto real se necesitan al menos **300-500 stocks** para que el juego sea sostenible durante meses sin repetir. Criterios de selección:

- Solo empresas que el usuario medio pueda reconocer (evitar microcaps oscuras)
- Balance geográfico: ~50% USA, ~25% Europa, ~15% Asia, ~10% resto
- Balance sectorial: que todos los sectores estén representados
- Excluir stocks con datos incompletos en Finnhub

**Script de pre-carga sugerido:**

```javascript
// Fuentes para la lista curada:
// 1. Componentes del S&P 500 (500 empresas USA top)
// 2. Componentes del EURO STOXX 50 (top europeas)
// 3. Componentes del NIKKEI 225 (top japonesas)
// 4. Componentes del CSI 300 (top chinas con ADR en NYSE)
// Filtrar las que tengan datos completos en Finnhub → ~400 stocks jugables
```

### 4.2 Rotación y no-repetición

El backend debe llevar un registro de qué stocks ya han sido el "stock del día" para no repetir en al menos 6 meses. Si se agotan los stocks disponibles, empezar de nuevo pero garantizando que no aparezca el mismo dentro del año natural.

### 4.3 Stock del día por región

Opción avanzada: ofrecer el mismo stock del día para todos los usuarios (como Wordle global) pero con una variante regional:

- **STOCKLE Global** — cualquier empresa del universo completo
- **STOCKLE USA** — solo NYSE/NASDAQ
- **STOCKLE Europe** — solo bolsas europeas

---

## FASE 5 — Social y comunidad

### 5.1 Ranking diario

Tabla de clasificación del día ordenada por:

1. Número de intentos (menos = mejor)
2. Tiempo total (como desempate)

Sin autenticación fuerte: usar un nickname elegido por el usuario y guardado en localStorage. El backend almacena los resultados del día en una DB simple (Supabase, PlanetScale, etc.).

### 5.2 Modo duelo

Dos jugadores compiten en tiempo real (via WebSocket o polling) contra el mismo stock del día. Gana quien lo adivine en menos intentos, o en menos tiempo si empatan.

### 5.3 Modo practice

Un modo libre donde el usuario puede jugar con cualquier stock del universo, no solo el del día. No cuenta para estadísticas. Útil para aprender y familiarizarse con el juego.

---

## FASE 6 — Pulido y producto

### 6.1 Onboarding para nuevos usuarios

La primera vez que un usuario entra, mostrar un tutorial interactivo de 3 pasos con un stock de ejemplo (siempre "Apple" para que sea familiar) que explique el sistema de colores.

### 6.2 Internacionalización (i18n)

El juego tiene potencial internacional. Soporte inicial para:
- 🇪🇸 Español
- 🇬🇧 English  
- 🇧🇷 Português
- 🇩🇪 Deutsch

Los datos de stocks (nombre de sector, país) deben traducirse también, no solo la UI.

### 6.3 PWA (Progressive Web App)

Con un `manifest.json` y un service worker básico, el juego se puede instalar como app en móvil sin pasar por app stores. El service worker cachea los assets estáticos y los datos del stock del día para que funcione offline (el usuario puede ver su progreso incluso sin conexión).

### 6.4 SEO y meta tags dinámicos

Para que los resultados compartidos en redes sociales muestren una preview bonita:

```html
<!-- Open Graph dinámico para cada día -->
<meta property="og:title" content="STOCKLE #42 — ¿Puedes adivinar el stock de hoy?">
<meta property="og:image" content="https://stockle.app/og/2026-03-03.png">
```

La imagen OG se genera en el servidor (con `satori` o `sharp`) mostrando el número del puzzle y un grid de emojis del resultado promedio de los usuarios.

### 6.5 Analytics de negocio

Eventos a trackear (con Plausible o Fathom, alternativas privacy-friendly a GA):

- `game_started` — usuario hace su primer guess del día
- `game_won` — victoria, con atributo `attempts: N`
- `game_lost` — derrota
- `hint_used` — uso de pista
- `result_shared` — click en botón de compartir
- `stock_searched` — queries de búsqueda (para entender qué stocks busca la gente)

---

## Priorización sugerida

| Prioridad | Tarea | Impacto | Esfuerzo |
|---|---|---|---|
| 🔴 Alta | Integración Finnhub + backend caché | Alto | Medio |
| 🔴 Alta | Persistencia localStorage + stats | Alto | Bajo |
| 🔴 Alta | Botón de compartir (emojis) | Alto | Bajo |
| 🟡 Media | Lista ampliada ~300 stocks | Alto | Medio |
| 🟡 Media | Modal de estadísticas | Medio | Bajo |
| 🟡 Media | Modo practice | Medio | Bajo |
| 🟡 Media | Onboarding / tutorial | Medio | Medio |
| 🟢 Baja | Ranking diario | Alto | Alto |
| 🟢 Baja | Modos de dificultad | Medio | Medio |
| 🟢 Baja | PWA | Medio | Bajo |
| 🟢 Baja | Modo duelo | Alto | Alto |
| 🟢 Baja | i18n | Medio | Alto |

---

## Stack técnico recomendado para producción

```
Frontend:   Next.js (App Router) + Tailwind CSS
Backend:    Next.js API Routes (serverless, mismo repo)
Base datos: Supabase (PostgreSQL gestionado, free tier generoso)
Caché:      Upstash Redis (serverless Redis, free tier)
API datos:  Finnhub (principal) + Alpha Vantage (fallback)
Deploy:     Vercel (integración nativa con Next.js)
Analytics:  Plausible.io (privacy-friendly)
Dominio:    stockle.app (disponible al momento de este doc)
```

**Coste estimado en fase inicial (< 10k usuarios/día):** ~$0/mes usando los tiers gratuitos de todas estas herramientas.

---

*Documento generado el 03/03/2026 — v1.0*