import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { applyRating, CardState, isDue, isNew, levelUpState, previewIntervals, LEVEL_UP_REPS, Rating } from "../fsrs";
import { useLanguageApp } from "../../LanguageAppContext";
import {
    loadDeckState,
    saveDeckState,
    getCardState,
    updateCardState,
    isCardHidden,
    SRSDeckState,
} from "../useSRSStorage";
import useLanguage from "../../hooks/useLanguage";
import SRSSettings from "../components/SRSSettings";
import "../srs.css";

interface CardLevel {
    front: string;
    back: string;
    romanized?: string;
    grammarNote?: string;
    literal?: string;
}

interface Card {
    id: string;
    hidden?: boolean;
    levels: CardLevel[];
}

interface DeckData {
    id: string;
    name: string;
    language: string;
    cards: Card[];
}

type SessionCard = Card & { cardState: CardState; isAgain?: boolean };

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildSession(cards: Card[], deckState: SRSDeckState, shuffle: boolean): SessionCard[] {
    const due: SessionCard[] = [];      // graduated (interval > 1), most overdue first
    const learn: SessionCard[] = [];    // short interval (≤ 1 day)
    const newWords: SessionCard[] = []; // never seen, level 0
    const newPhrases: SessionCard[] = []; // never seen, level 1+

    for (const card of cards) {
        if (isCardHidden(card, deckState)) continue;
        const state = getCardState(deckState, card.id);
        if (isNew(state)) {
            (state.level === 0 ? newWords : newPhrases).push({ ...card, cardState: state });
        } else if (isDue(state)) {
            (state.state === "review" ? due : learn).push({ ...card, cardState: state });
        }
    }

    // Anki order: due (most overdue first) → learn → new words → new phrases
    due.sort((a, b) => a.cardState.dueDate.localeCompare(b.cardState.dueDate));

    const groups = [due, learn, newWords, newPhrases];
    return groups.flatMap(g => shuffle ? shuffled(g) : g);
}

function currentLevel(card: Card & { cardState: CardState }): CardLevel {
    const idx = Math.min(card.cardState.level, card.levels.length - 1);
    return card.levels[idx];
}

function hasNextLevel(card: SessionCard): boolean {
    return card.cardState.level < card.levels.length - 1;
}

const LEVEL_NAMES = ["Vocabulary", "Phrase"];


const SRSReview = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const navigate = useNavigate();

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionCard[]>([]);
    const [currentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const { readFront, readBack, fastMode, volume, showLiteral, shuffleCards } = useLanguageApp();
    const [done, setDone] = useState(false);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [levelUpCard, setLevelUpCard] = useState<SessionCard | null>(null);
    const [noteOpen, setNoteOpen] = useState(true);

    // Fast mode state
    const [fastModeIndex, setFastModeIndex] = useState(0);

    const { targetVoice, baseVoice } = useLanguage({ targetLanguage: language ?? "english" });

    // Returns the utterance so callers can attach onend
    const buildUtt = useCallback((text: string, isTarget: boolean): SpeechSynthesisUtterance => {
        const utt = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
        utt.voice = (isTarget ? targetVoice : baseVoice) ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        return utt;
    }, [targetVoice, baseVoice, volume]);

    const speak = (text: string, isTarget: boolean) => {
        if (isTarget ? !readBack : !readFront) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(buildUtt(text, isTarget));
    };

    useEffect(() => {
        if (!language || !deckId) return;
        fetch(`/languages/${language}/${deckId}/index.json`)
            .then((r) => r.json())
            .then((data: DeckData) => {
                setDeck(data);
                const state = loadDeckState(language, deckId);
                setDeckState(state);
                const s = buildSession(data.cards, state, shuffleCards);
                setSession(s);
                setTotalCards(s.length);
            })
            .catch((e) => console.error(e));
    }, [language, deckId]);

    // ── Normal mode: speak front when a new card appears ──────────────────────
    const currentCardId = session[0]?.id;
    useEffect(() => {
        if (fastMode || !currentCardId) return;
        const card = session[0];
        if (card) speak(currentLevel(card).front, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId]);
    // ──────────────────────────────────────────────────────────────────────────

    // ── Fast mode: speak front then back when card changes ────────────────────
    useEffect(() => {
        if (!fastMode || !deck) return;
        window.speechSynthesis.cancel();
        const visibleCards = deck.cards.filter(c => !isCardHidden(c, deckState));
        if (visibleCards.length === 0) return;
        const card = visibleCards[fastModeIndex % visibleCards.length];
        const level = currentLevel({ ...card, cardState: getCardState(deckState, card.id) });
        if (readFront) {
            const frontUtt = buildUtt(level.front, false);
            frontUtt.onend = () => {
                if (readBack) setTimeout(() => window.speechSynthesis.speak(buildUtt(level.back, true)), 500);
            };
            window.speechSynthesis.speak(frontUtt);
        } else if (readBack) {
            window.speechSynthesis.speak(buildUtt(level.back, true));
        }
        return () => window.speechSynthesis.cancel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fastMode, fastModeIndex, deck]);

    useEffect(() => {
        if (!fastMode) window.speechSynthesis.cancel();
    }, [fastMode]);
    // ──────────────────────────────────────────────────────────────────────────

    const currentCard = session[currentIndex];

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(false);
        if (currentCard) speak(currentLevel(currentCard).back, true);
    };

    const advanceSession = (
        nextSession: SessionCard[],
        updatedDeckState: SRSDeckState
    ) => {
        setSession(nextSession);
        setDeckState(updatedDeckState);
        if (language && deckId) saveDeckState(language, deckId, updatedDeckState);
        setIsFlipped(false);
        setNoteOpen(false);
        if (nextSession.length === 0) setDone(true);
    };

    const rate = (rating: Rating) => {
        if (!deck || !currentCard || !language || !deckId) return;

        const newState = applyRating(currentCard.cardState, rating);
        setReviewed((r) => r + 1);

        const willLevelUp =
            rating >= 3 &&
            newState.reps >= LEVEL_UP_REPS &&
            hasNextLevel(currentCard);

        if (rating === 1) {
            const updatedCard: SessionCard = { ...currentCard, cardState: newState, isAgain: true };
            const next = [...session];
            next.splice(currentIndex, 1);
            const insertAt = Math.min(currentIndex + 5, next.length);
            next.splice(insertAt, 0, updatedCard);
            setTotalCards((t) => t + 1);
            const updated = updateCardState(deckState, currentCard.id, newState);
            advanceSession(next, updated);
        } else if (willLevelUp) {
            const leveledState = levelUpState(newState);
            const updated = updateCardState(deckState, currentCard.id, leveledState);
            saveDeckState(language, deckId, updated);
            setDeckState(updated);
            setLevelUpCard({ ...currentCard, cardState: leveledState });
            const next = [...session];
            next.splice(currentIndex, 1);
            setSession(next);
        } else {
            const next = [...session];
            next.splice(currentIndex, 1);
            const updated = updateCardState(deckState, currentCard.id, newState);
            advanceSession(next, updated);
        }
    };

    const upgradeNow = () => {
        if (!deck || !currentCard || !language || !deckId) return;
        const leveledState = levelUpState(currentCard.cardState);
        const updated = updateCardState(deckState, currentCard.id, leveledState);
        saveDeckState(language, deckId, updated);
        setDeckState(updated);
        setLevelUpCard({ ...currentCard, cardState: leveledState });
        const next = [...session];
        next.splice(currentIndex, 1);
        setSession(next);
    };

    const dismissLevelUp = () => {
        setLevelUpCard(null);
        setIsFlipped(false);
        if (session.length === 0) setDone(true);
    };

    const remaining = session.length;

    if (!deck) {
        return <div className="srs-container"><p>Loading...</p></div>;
    }

    // ── Fast mode view ─────────────────────────────────────────────────────────
    if (fastMode) {
        const visibleCards = deck.cards.filter(c => !isCardHidden(c, deckState));
        const total = visibleCards.length;
        if (total === 0) {
            return (
                <div className="srs-container">
                    <div className="srs-header">
                        <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>
                            ← Decks
                        </button>
                        <span className="srs-deck-name">{deck.name}</span>
                        <SRSSettings />
                    </div>
                    <p className="srs-empty">No visible cards. Unhide cards in Browse to study them.</p>
                </div>
            );
        }
        const idx = fastModeIndex % total;
        const card = visibleCards[idx];
        const level = currentLevel({ ...card, cardState: getCardState(deckState, card.id) });
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>
                        ← Decks
                    </button>
                    <span className="srs-deck-name">{deck.name}</span>
                    <SRSSettings />
                </div>

                <div className="srs-card-wrap">
                    <div className="srs-card srs-card-fast">
                        <div className="srs-card-text">{level.front}</div>
                        {showLiteral && level.literal && (
                            <div className="srs-literal">{level.literal}</div>
                        )}
                        <hr className="srs-divider" />
                        <div className="srs-card-text">{level.back}</div>
                        {level.romanized && (
                            <div className="srs-romanized">{level.romanized}</div>
                        )}
                    </div>
                </div>

                <div className="srs-fast-nav">
                    <button
                        className="srs-fast-nav-btn"
                        onClick={() => setFastModeIndex(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                    >
                        ← Prev
                    </button>
                    <span className="srs-fast-counter">{idx + 1} / {total}</span>
                    <button
                        className="srs-fast-nav-btn"
                        onClick={() => setFastModeIndex(i => Math.min(total - 1, i + 1))}
                        disabled={idx === total - 1}
                    >
                        Next →
                    </button>
                </div>
            </div>
        );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Level-up banner
    if (levelUpCard) {
        const nextLevelName = LEVEL_NAMES[levelUpCard.cardState.level] ?? "Next Level";
        const prevLevel = levelUpCard.levels[levelUpCard.cardState.level - 1];
        const nextLevelContent = currentLevel(levelUpCard);
        return (
            <div className="srs-container">
                <div className="srs-levelup-banner">
                    <div className="srs-levelup-icon">⬆</div>
                    <h2 className="srs-levelup-title">Level Up!</h2>
                    <p className="srs-levelup-sub">
                        You've mastered the <strong>{LEVEL_NAMES[levelUpCard.cardState.level - 1] ?? "word"}</strong> level.
                    </p>
                    <div className="srs-levelup-transition">
                        <div className="srs-levelup-old">
                            <span className="srs-levelup-badge old">{LEVEL_NAMES[levelUpCard.cardState.level - 1]}</span>
                            <div>{prevLevel?.front}</div>
                            <div className="srs-levelup-arrow-text">{prevLevel?.back}</div>
                        </div>
                        <div className="srs-levelup-arrow">→</div>
                        <div className="srs-levelup-new">
                            <span className="srs-levelup-badge new">{nextLevelName}</span>
                            <div>{nextLevelContent.front}</div>
                            <div className="srs-levelup-arrow-text">{nextLevelContent.back}</div>
                        </div>
                    </div>
                    <button className="srs-btn-primary" onClick={dismissLevelUp}>Continue</button>
                </div>
            </div>
        );
    }

    if (done || remaining === 0) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>Come back tomorrow to review cards that are due.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate(`/${language}`)}>
                            Back to Decks
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const level = currentLevel(currentCard);

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>
                    ← Decks
                </button>
                <span className="srs-deck-name">{deck.name}</span>
                <SRSSettings />
            </div>

            <div className="srs-progress-bar-wrap">
                <div
                    className="srs-progress-bar-fill"
                    style={{ width: `${totalCards > 0 ? ((totalCards - remaining) / totalCards) * 100 : 0}%` }}
                />
            </div>
            <div className="srs-count-row">
                <span className="srs-count new">{session.filter((c) => isNew(c.cardState)).length} new</span>
                <span className="srs-count learn">{session.filter((c) => c.cardState.state === "learning").length} learn</span>
                <span className="srs-count review">{session.filter((c) => c.cardState.state === "review").length} due</span>
            </div>

            <div className="srs-card-wrap">
                <div className={`srs-card ${isFlipped ? "flipped" : ""}`} onClick={!isFlipped ? flip : undefined}>
                    <div className="srs-card-front">
                        <div className="srs-card-text">{level.front}</div>
                        {showLiteral && level.literal && (
                            <div className="srs-literal">{level.literal}</div>
                        )}
                        {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                    </div>
                    <div className="srs-card-back">
                        <div className="srs-card-text front-dim">{level.front}</div>
                        {showLiteral && level.literal && (
                            <div className="srs-literal front-dim">{level.literal}</div>
                        )}
                        <hr className="srs-divider" />
                        <div className="srs-card-text">{level.back}</div>
                        {level.romanized && (
                            <div className="srs-romanized">{level.romanized}</div>
                        )}
                        {hasNextLevel(currentCard) && (
                            <div className="srs-levelup-hint">
                                <span>
                                    {LEVEL_UP_REPS - currentCard.cardState.reps > 0
                                        ? `${LEVEL_UP_REPS - currentCard.cardState.reps} good review${LEVEL_UP_REPS - currentCard.cardState.reps !== 1 ? "s" : ""} to unlock phrase`
                                        : "Phrase unlocks on Good or Easy!"}
                                </span>
                                <button className="srs-upgrade-btn" onClick={e => { e.stopPropagation(); upgradeNow(); }}>
                                    Upgrade now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {isFlipped && level.grammarNote && (
                    <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className="srs-grammar-note-toggle"
                            onClick={() => setNoteOpen(o => !o)}
                        >
                            Grammar note {noteOpen ? "▴" : "▾"}
                        </button>
                        {noteOpen && (
                            <div className="srs-grammar-note-body">{level.grammarNote}</div>
                        )}
                    </div>
                )}
            </div>

            {isFlipped ? (
                <div className="srs-rating-row">
                    {(() => {
                        const preview = previewIntervals(currentCard.cardState);
                        return (
                            <>
                                <button className="srs-rating again" onClick={() => rate(1)}>
                                    <span className="rating-label">Again</span>
                                    <span className="rating-interval">{preview[1]}</span>
                                </button>
                                <button className="srs-rating hard" onClick={() => rate(2)}>
                                    <span className="rating-label">Hard</span>
                                    <span className="rating-interval">{preview[2]}</span>
                                </button>
                                <button className="srs-rating good" onClick={() => rate(3)}>
                                    <span className="rating-label">Good</span>
                                    <span className="rating-interval">{preview[3]}</span>
                                </button>
                                <button className="srs-rating easy" onClick={() => rate(4)}>
                                    <span className="rating-label">Easy</span>
                                    <span className="rating-interval">{preview[4]}</span>
                                </button>
                            </>
                        );
                    })()}
                </div>
            ) : (
                <div className="srs-flip-hint">
                    <button className="srs-show-answer" onClick={flip}>Show Answer</button>
                </div>
            )}
        </div>
    );
};

export default SRSReview;
