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
    const due: SessionCard[] = [];
    const learn: SessionCard[] = [];
    const newWords: SessionCard[] = [];
    const newPhrases: SessionCard[] = [];

    for (const card of cards) {
        if (isCardHidden(card, deckState)) continue;
        const state = getCardState(deckState, card.id);
        if (isNew(state)) {
            (state.level === 0 ? newWords : newPhrases).push({ ...card, cardState: state });
        } else if (isDue(state)) {
            (state.state === "review" ? due : learn).push({ ...card, cardState: state });
        }
    }

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

const LEVEL_NAMES = ["Word / Phrase", "Full Sentence"];

const GrammarReview = () => {
    const { language, deckId, grammarId } = useParams<{
        language: string;
        deckId: string;
        grammarId: string;
    }>();
    const navigate = useNavigate();

    // Progress is keyed separately from the main deck so it doesn't collide
    const storageKey = `grammar_${deckId}_${grammarId}`;

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionCard[]>([]);
    const [currentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const { readFront, readBack, volume, showLiteral, shuffleCards } = useLanguageApp();
    const [done, setDone] = useState(false);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [levelUpCard, setLevelUpCard] = useState<SessionCard | null>(null);
    const [noteOpen, setNoteOpen] = useState(true);

    const { targetVoice, baseVoice } = useLanguage({ targetLanguage: language ?? "english" });

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
        if (!language || !deckId || !grammarId) return;
        fetch(`/languages/${language}/${deckId}/grammar/${grammarId}.json`)
            .then(r => r.json())
            .then((data: DeckData) => {
                setDeck(data);
                const state = loadDeckState(language, storageKey);
                setDeckState(state);
                const s = buildSession(data.cards, state, shuffleCards);
                setSession(s);
                setTotalCards(s.length);
            })
            .catch(e => console.error(e));
    }, [language, deckId, grammarId]);

    const currentCardId = session[0]?.id;
    useEffect(() => {
        if (!currentCardId) return;
        const card = session[0];
        if (card) speak(currentLevel(card).front, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId]);

    const currentCard = session[currentIndex];

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(false);
        if (currentCard) speak(currentLevel(currentCard).back, true);
    };

    const advanceSession = (nextSession: SessionCard[], updatedDeckState: SRSDeckState) => {
        setSession(nextSession);
        setDeckState(updatedDeckState);
        if (language) saveDeckState(language, storageKey, updatedDeckState);
        setIsFlipped(false);
        setNoteOpen(false);
        if (nextSession.length === 0) setDone(true);
    };

    const rate = (rating: Rating) => {
        if (!deck || !currentCard || !language) return;

        const newState = applyRating(currentCard.cardState, rating);
        setReviewed(r => r + 1);

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
            setTotalCards(t => t + 1);
            const updated = updateCardState(deckState, currentCard.id, newState);
            advanceSession(next, updated);
        } else if (willLevelUp) {
            const leveledState = levelUpState(newState);
            const updated = updateCardState(deckState, currentCard.id, leveledState);
            if (language) saveDeckState(language, storageKey, updated);
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

    const dismissLevelUp = () => {
        setLevelUpCard(null);
        setIsFlipped(false);
        if (session.length === 0) setDone(true);
    };

    const remaining = session.length;

    if (!deck) return <div className="srs-container"><p>Loading...</p></div>;

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
                        You've unlocked the <strong>{nextLevelName}</strong> level.
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
                    <div className="srs-done-actions">
                        <button
                            className="srs-btn-secondary"
                            onClick={() => navigate(`/${language}/${deckId}/grammar/${grammarId}`)}
                        >
                            Back to Lesson
                        </button>
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
                <button
                    className="srs-back-link"
                    onClick={() => navigate(`/${language}/${deckId}/grammar/${grammarId}`)}
                >
                    ← Lesson
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
                <span className="srs-count new">{session.filter(c => isNew(c.cardState)).length} new</span>
                <span className="srs-count learn">{session.filter(c => c.cardState.state === "learning").length} learn</span>
                <span className="srs-count review">{session.filter(c => c.cardState.state === "review").length} due</span>
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
                                        ? `${LEVEL_UP_REPS - currentCard.cardState.reps} good review${LEVEL_UP_REPS - currentCard.cardState.reps !== 1 ? "s" : ""} to unlock full sentence`
                                        : "Full sentence unlocks on Good or Easy!"}
                                </span>
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

export default GrammarReview;
