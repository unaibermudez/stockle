import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import type { Stock, Guess, GameStatus } from "../../types/stock";
import { STOCKS_DB, getTodayStock } from "../../data/stocks";
import { MAX_GUESSES, ATTRIBUTES } from "../../config/gameConfig";
import { compareAttribute, formatValue, getArrow } from "../../utils/helpers";
import "./Stockle.css";

export default function Stockle() {
    const [target] = useState<Stock>(getTodayStock);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Stock | null>(null);
    const [suggestions, setSuggestions] = useState<Stock[]>([]);
    const [guesses, setGuesses] = useState<Guess[]>([]);
    const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
    const [showModal, setShowModal] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Initial focus
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Suggestions filtering
    useEffect(() => {
        if (query.length < 1 || selected?.name === query) {
            setSuggestions([]);
            setActiveIndex(-1);
            return;
        }
        const q = query.toLowerCase();
        const already = new Set(guesses.map(g => g.symbol));
        const results = STOCKS_DB.filter(s =>
            !already.has(s.symbol) &&
            (s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        ).slice(0, 6);
        setSuggestions(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
    }, [query, guesses, selected]);

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSuggestions([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (stock: Stock) => {
        setSelected(stock);
        setQuery(stock.name);
        setSuggestions([]);
        setActiveIndex(-1);
        inputRef.current?.focus();
    };

    const handleGuess = () => {
        if (!selected || gameStatus !== "playing") return;
        
        const results: Record<string, any> = {};
        ATTRIBUTES.forEach(attr => {
            results[attr.key] = compareAttribute(
                selected[attr.key as keyof Stock], 
                target[attr.key as keyof Stock], 
                attr.type
            );
        });

        const newGuess: Guess = {
            ...selected,
            results,
        };
        
        const newGuesses = [...guesses, newGuess];
        setGuesses(newGuesses);
        setSelected(null);
        setQuery("");
        inputRef.current?.focus();

        if (selected.symbol === target.symbol) {
            setGameStatus("won");
            setTimeout(() => setShowModal(true), 600);
        } else if (newGuesses.length >= MAX_GUESSES) {
            setGameStatus("lost");
            setTimeout(() => setShowModal(true), 600);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (gameStatus !== "playing") return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                handleSelect(suggestions[activeIndex]);
            } else if (selected) {
                handleGuess();
            }
        } else if (e.key === "Escape") {
            setSuggestions([]);
            setActiveIndex(-1);
        }
    };

    return (
        <>
            <div className="scanline" />
            <div className="grid-bg" />
            <div className="app">

                {/* HEADER */}
                <header className="header">
                    <div className="logo">FINANCIAL PUZZLE</div>
                    <h1 className="title">STOCKLE</h1>
                    <p className="subtitle">Adivina la acción del día · {MAX_GUESSES} intentos</p>
                    <div className="attempt-counter">
                        <span>INTENTOS</span>
                        <div className="attempt-dots">
                            {Array.from({ length: MAX_GUESSES }).map((_, i) => {
                                const guess = guesses[i];
                                let dotClass = "";
                                if (guess) {
                                    dotClass = guess.symbol === target.symbol ? "used" : "wrong-dot";
                                }
                                return (
                                    <div
                                        key={i}
                                        className={`dot ${dotClass}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </header>

                {/* LEGEND */}
                <div className="legend">
                    {[
                        { status: "correct", color: "var(--correct)", border: "var(--correct)", label: "Correcto" },
                        { status: "wrong", color: "rgba(255,58,87,0.15)", border: "var(--wrong)", label: "Incorrecto" },
                        { status: "high", color: "rgba(255,140,66,0.15)", border: "var(--high)", label: "Real es menor" },
                        { status: "low", color: "rgba(77,159,255,0.15)", border: "var(--low)", label: "Real es mayor" },
                    ].map(l => (
                        <div key={l.status} className="legend-item">
                            <div className="legend-dot" style={{ background: l.color, borderColor: l.border }} />
                            {l.label}
                        </div>
                    ))}
                </div>

                {/* SEARCH */}
                {gameStatus === "playing" && (
                    <div className="search-section" ref={searchRef}>
                        <div className="search-label">BUSCAR ACCIÓN</div>
                        <div className="search-wrapper">
                            <input
                                ref={inputRef}
                                className="search-input"
                                placeholder="Nombre de empresa o ticker (ej: Apple, AAPL...)"
                                value={query}
                                onChange={e => { setQuery(e.target.value); if (selected) setSelected(null); }}
                                onKeyDown={handleKeyDown}
                                disabled={gameStatus !== "playing"}
                            />
                            {suggestions.length > 0 && (
                                <div className="suggestions">
                                    {suggestions.map((s, idx) => (
                                        <button 
                                            key={s.symbol} 
                                            type="button"
                                            className={`suggestion-item ${idx === activeIndex ? 'active' : ''}`} 
                                            onClick={() => handleSelect(s)}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onFocus={() => setActiveIndex(idx)}
                                        >
                                            <span className="suggestion-symbol">{s.symbol}</span>
                                            <span className="suggestion-name">{s.name}</span>
                                            <span className="suggestion-cap">${s.marketCap}B</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="guess-btn" onClick={handleGuess} disabled={!selected}>
                            {selected ? `ADIVINAR ${selected.symbol}` : "SELECCIONA UNA ACCIÓN"}
                        </button>
                    </div>
                )}

                {/* GUESSES TABLE */}
                {guesses.length > 0 && (
                    <div className="guesses-section">
                        <div className="guesses-container">
                            {/* Column headers */}
                            <div className="attr-header">
                                <div className="attr-label-header" style={{ textAlign: "left" }}>ACCIÓN</div>
                                {ATTRIBUTES.map(attr => (
                                    <div key={attr.key} className="attr-label-header">
                                        <div>{attr.icon}</div>
                                        <div>{attr.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Rows */}
                            {guesses.map((guess, i) => (
                                <div key={i} className="guess-row">
                                    <div className="guess-stock-info">
                                        <div className="guess-symbol">{guess.symbol}</div>
                                        <div className="guess-name">{guess.name}</div>
                                    </div>
                                    {ATTRIBUTES.map(attr => (
                                        <div key={attr.key} className={`cell ${guess.results[attr.key]}`}>
                                            <div className="cell-value">
                                                {formatValue(attr, guess[attr.key as keyof Stock])}
                                            </div>
                                            <div className="cell-arrow">
                                                {getArrow(guess.results[attr.key])}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RESULT MODAL */}
                {showModal && (
                    <div className="overlay" onClick={() => setShowModal(false)}>
                        <div className={`modal ${gameStatus}`} onClick={e => e.stopPropagation()}>
                            <span className="modal-emoji">{gameStatus === "won" ? "🎯" : "📉"}</span>
                            <div className="modal-title">
                                {gameStatus === "won" ? "¡Correcto!" : "¡Game Over!"}
                            </div>
                            <div className="modal-subtitle">
                                {gameStatus === "won"
                                    ? `Acertaste la acción del día en ${guesses.length} de ${MAX_GUESSES} intentos.`
                                    : `No lo conseguiste. La acción del día era:`}
                            </div>
                            <div className="modal-stock">
                                <div className="modal-stock-symbol">{target.symbol}</div>
                                <div className="modal-stock-name">{target.name}</div>
                                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontFamily: "Space Mono" }}>
                                    {target.sector} · {target.country} · ${target.marketCap}B cap
                                </div>
                            </div>
                            {gameStatus === "won" && (
                                <div className="modal-attempts">
                                    {guesses.length}/{MAX_GUESSES} intentos usados
                                </div>
                            )}
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                VER RESULTADOS
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
