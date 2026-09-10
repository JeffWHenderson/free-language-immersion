import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useDecks } from "../../hooks/useDecks";
import { loadDeckState, getCardState, isCardHidden } from "../useStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { useLanguageApp } from "../../LanguageAppContext";
import { shuffled } from "../../utils";
import "../srs.css";
import "../components/Settings.css";
import "./match.css";

interface PoolItem {
    key: string; // unique across decks: `${deckId}:${cardId}`
    english: string;
    word: string;
    romanized?: string;
}

type CellStatus = "idle" | "wrong" | "matched";
interface Cell {
    item: PoolItem;
    status: CellStatus;
}

// How many pairs sit on the board at once.
const BOARD_PAIRS = 5;
// Below this many studied words we widen the pool to every available card so the
// board can always be filled (per the "fall back to all cards" choice).
const MIN_STUDIED = BOARD_PAIRS + 1;
const MATCH_FADE_MS = 320;
const WRONG_FLASH_MS = 550;

function dedupe(items: PoolItem[]): PoolItem[] {
    const seen = new Set<string>();
    return items.filter((i) => {
        const k = `${i.english}|${i.word}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

const MatchGame = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const { packs, loading: packsLoading } = useDecks(language);
    const { showRomanized, readBack, setReadBack } = useLanguageApp();
    const { buildUtt } = useSpeech(language);

    // Show the target chips as script or romanization (not both stacked). Seeds from
    // the global romanized preference; only surfaced when the pool has romanization.
    const [romanizedView, setRomanizedView] = useState(showRomanized);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!settingsOpen) return;
        const handler = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [settingsOpen]);

    // Speak the target word on a short delay after cancelling. Speaking immediately
    // after speechSynthesis.cancel() makes the browser ignore the assigned voice and
    // fall back to the default (English) one — the delay is the standard workaround.
    const speakTarget = (text: string) => {
        if (!readBack) return;
        window.speechSynthesis.cancel();
        setTimeout(() => window.speechSynthesis.speak(buildUtt(text, true)), 140);
    };

    // Build the word pool from the user's studied vocabulary; fall back to every
    // available (non-grammar, visible) card if too few words have been studied.
    const { items: pool, fellBack } = useMemo(() => {
        if (!language || packsLoading) return { items: [] as PoolItem[], fellBack: false };
        const studied: PoolItem[] = [];
        const all: PoolItem[] = [];
        for (const pack of packs) {
            const state = loadDeckState(language, pack.id);
            for (const c of pack.cards) {
                if (c.grammar || !c.word || !c.english) continue;
                if (isCardHidden(c, state)) continue;
                const item: PoolItem = { key: `${pack.id}:${c.id}`, english: c.english, word: c.word, romanized: c.romanized };
                all.push(item);
                if (getCardState(state, c.id).state !== "new") studied.push(item);
            }
        }
        const studiedUnique = dedupe(studied);
        if (studiedUnique.length >= MIN_STUDIED) return { items: studiedUnique, fellBack: false };
        return { items: dedupe(all), fellBack: studiedUnique.length > 0 || all.length > 0 };
    }, [language, packs, packsLoading]);

    const [leftCells, setLeftCells] = useState<Cell[]>([]);
    const [rightCells, setRightCells] = useState<Cell[]>([]);
    const [sel, setSel] = useState<{ left: number | null; right: number | null }>({ left: null, right: null });
    const [score, setScore] = useState({ correct: 0, misses: 0 });

    // Shuffled draw order + cursor so refills cycle the whole pool before repeating.
    const orderRef = useRef<PoolItem[]>([]);
    const cursorRef = useRef(0);
    const lockedRef = useRef(false);

    const drawNext = (exclude: Set<string>): PoolItem => {
        const order = orderRef.current;
        for (let n = 0; n < order.length; n++) {
            const it = order[cursorRef.current % order.length];
            cursorRef.current++;
            if (!exclude.has(it.key)) return it;
        }
        // Pool smaller than the board — allow a repeat rather than stalling.
        const it = order[cursorRef.current % order.length];
        cursorRef.current++;
        return it;
    };

    // (Re)deal the board whenever the pool changes.
    useEffect(() => {
        if (pool.length === 0) {
            setLeftCells([]);
            setRightCells([]);
            return;
        }
        orderRef.current = shuffled(pool);
        cursorRef.current = 0;
        const onBoard = new Set<string>();
        const count = Math.min(BOARD_PAIRS, pool.length);
        const items = Array.from({ length: count }, () => {
            const it = drawNext(onBoard);
            onBoard.add(it.key);
            return it;
        });
        setLeftCells(shuffled(items).map((item) => ({ item, status: "idle" as const })));
        setRightCells(shuffled(items).map((item) => ({ item, status: "idle" as const })));
        setSel({ left: null, right: null });
        setScore({ correct: 0, misses: 0 });
        lockedRef.current = false;
    }, [pool]);

    const evaluate = (i: number, j: number) => {
        const isMatch = leftCells[i].item.key === rightCells[j].item.key;
        setSel({ left: null, right: null });

        if (isMatch) {
            setScore((s) => ({ ...s, correct: s.correct + 1 }));
            speakTarget(rightCells[j].item.word);
            setLeftCells((cs) => cs.map((c, idx) => (idx === i ? { ...c, status: "matched" } : c)));
            setRightCells((cs) => cs.map((c, idx) => (idx === j ? { ...c, status: "matched" } : c)));
            lockedRef.current = true;
            // Board items never change identity between renders, so this snapshot of
            // the other five keys is a safe exclude set for the fresh draw.
            const exclude = new Set(leftCells.filter((_, idx) => idx !== i).map((c) => c.item.key));
            setTimeout(() => {
                const fresh = drawNext(exclude);
                setLeftCells((cs) => cs.map((c, idx) => (idx === i ? { item: fresh, status: "idle" } : c)));
                setRightCells((cs) => cs.map((c, idx) => (idx === j ? { item: fresh, status: "idle" } : c)));
                lockedRef.current = false;
            }, MATCH_FADE_MS);
        } else {
            setScore((s) => ({ ...s, misses: s.misses + 1 }));
            lockedRef.current = true;
            setLeftCells((cs) => cs.map((c, idx) => (idx === i ? { ...c, status: "wrong" } : c)));
            setRightCells((cs) => cs.map((c, idx) => (idx === j ? { ...c, status: "wrong" } : c)));
            setTimeout(() => {
                setLeftCells((cs) => cs.map((c, idx) => (idx === i && c.status === "wrong" ? { ...c, status: "idle" } : c)));
                setRightCells((cs) => cs.map((c, idx) => (idx === j && c.status === "wrong" ? { ...c, status: "idle" } : c)));
                lockedRef.current = false;
            }, WRONG_FLASH_MS);
        }
    };

    const selectLeft = (i: number) => {
        if (lockedRef.current || leftCells[i].status === "matched") return;
        if (sel.right !== null) evaluate(i, sel.right);
        else setSel((s) => ({ ...s, left: s.left === i ? null : i }));
    };
    const selectRight = (j: number) => {
        if (lockedRef.current || rightCells[j].status === "matched") return;
        if (sel.left !== null) evaluate(sel.left, j);
        else setSel((s) => ({ ...s, right: s.right === j ? null : j }));
    };

    const chipClass = (status: CellStatus, selected: boolean) =>
        `match-chip${selected ? " selected" : ""}${status === "wrong" ? " wrong" : ""}${status === "matched" ? " matched" : ""}`;

    const hasRomanized = pool.some((p) => !!p.romanized);
    const langLabel = language ? language.charAt(0).toUpperCase() + language.slice(1) : "target";

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => navigate(`/${language}/`)}>← Decks</button>
                <span className="srs-deck-name">Word Match</span>
                <div className="srs-settings-wrap" ref={settingsRef}>
                    <button
                        className={`srs-settings-btn ${settingsOpen ? "active" : ""}`}
                        onClick={() => setSettingsOpen((v) => !v)}
                        title="Settings"
                        aria-label="Settings"
                    >
                        ⚙
                    </button>
                    {settingsOpen && (
                        <div className="srs-settings-dropdown">
                            {hasRomanized && (
                                <div className="srs-settings-row">
                                    <div className="srs-settings-label-group">
                                        <span className="srs-settings-label">Romanization</span>
                                        <span className="srs-settings-sub">Show romanized instead of script</span>
                                    </div>
                                    <label className="srs-toggle">
                                        <input
                                            type="checkbox"
                                            checked={romanizedView}
                                            onChange={(e) => setRomanizedView((e.currentTarget as HTMLInputElement).checked)}
                                        />
                                        <span className="srs-toggle-track" />
                                    </label>
                                </div>
                            )}
                            <div className="srs-settings-row">
                                <div className="srs-settings-label-group">
                                    <span className="srs-settings-label">Read {langLabel}</span>
                                    <span className="srs-settings-sub">Speak the word on a match</span>
                                </div>
                                <label className="srs-toggle">
                                    <input
                                        type="checkbox"
                                        checked={readBack}
                                        onChange={(e) => setReadBack((e.currentTarget as HTMLInputElement).checked)}
                                    />
                                    <span className="srs-toggle-track" />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="match-wrap">
                <div className="match-score-row">
                    <span className="match-score ok">✓ {score.correct}</span>
                    <span className="match-score miss">✗ {score.misses}</span>
                </div>

                {pool.length === 0 ? (
                    <p className="srs-empty">No vocabulary yet. Study some cards and they'll show up here.</p>
                ) : (
                    <>
                        <p className="match-hint">
                            Tap an English word, then its match on the {language} side.
                            {fellBack && " (Studied words are running low, so all your cards are in play.)"}
                        </p>
                        <div className="match-board">
                            <div className="match-col">
                                {leftCells.map((cell, i) => (
                                    <button
                                        key={`L-${cell.item.key}-${i}`}
                                        className={chipClass(cell.status, sel.left === i)}
                                        onClick={() => selectLeft(i)}
                                    >
                                        {cell.item.english}
                                    </button>
                                ))}
                            </div>
                            <div className="match-col">
                                {rightCells.map((cell, j) => (
                                    <button
                                        key={`R-${cell.item.key}-${j}`}
                                        className={chipClass(cell.status, sel.right === j)}
                                        onClick={() => selectRight(j)}
                                    >
                                        {romanizedView && cell.item.romanized ? cell.item.romanized : cell.item.word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MatchGame;
