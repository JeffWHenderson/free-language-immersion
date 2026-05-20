import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { applyRating, CardState, isDue, isNew, previewIntervals, Rating } from "../fsrs";
import { useLanguageApp } from "../../LanguageAppContext";
import {
    loadDeckState,
    saveDeckState,
    getCardState,
    updateCardState,
    isCardHidden,
    SRSDeckState,
} from "../useSRSStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { shuffled } from "../../utils";
import FlipCard from "../components/FlipCard";
import SRSSettings from "../components/SRSSettings";
import "../srs.css";
import "./SRSReview.css";

interface Card {
    id: string;
    hidden?: boolean;
    english: string;
    word: string;
    romanized?: string;
    grammarNote?: string;
    englishPhrase?: string;
    phrase?: string;
    phraseRomanized?: string;
    literal?: string;
}

interface DeckData {
    id: string;
    name: string;
    language: string;
    cards: Card[];
}

type SessionCard = Card & { cardState: CardState };

function buildSession(cards: Card[], deckState: SRSDeckState, shuffle: boolean): SessionCard[] {
    const due: SessionCard[] = [];
    const learn: SessionCard[] = [];
    const newCards: SessionCard[] = [];

    for (const card of cards) {
        if (isCardHidden(card, deckState)) continue;
        const state = getCardState(deckState, card.id);
        if (isNew(state)) {
            newCards.push({ ...card, cardState: state });
        } else if (isDue(state)) {
            (state.state === "review" ? due : learn).push({ ...card, cardState: state });
        }
    }

    due.sort((a, b) => a.cardState.dueDate.localeCompare(b.cardState.dueDate));
    return [due, learn, newCards].flatMap(g => shuffle ? shuffled(g) : g);
}

const SRSReview = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const navigate = useNavigate();

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionCard[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const { readBack, fastMode, showLiteral, shuffleCards } = useLanguageApp();
    const [done, setDone] = useState(false);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [noteOpen, setNoteOpen] = useState(true);
    const [reversed, setReversed] = useState(false);

    const [fastModeIndex, setFastModeIndex] = useState(0);

    const { buildUtt, speak } = useSpeech(language);
    const ttsGenRef = useRef(0);

    const cancelTts = () => {
        ttsGenRef.current += 1;
        window.speechSynthesis.cancel();
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

    const speakTargetSide = (card: SessionCard) => {
        if (!readBack) return;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        const wordUtt = buildUtt(card.word, true);
        if (card.phrase) {
            wordUtt.onend = () => {
                if (ttsGenRef.current !== gen) return;
                setTimeout(() => {
                    if (ttsGenRef.current !== gen) return;
                    window.speechSynthesis.speak(buildUtt(card.phrase!, true));
                }, 450);
            };
        }
        window.speechSynthesis.speak(wordUtt);
    };

    // Speak front on new card or direction toggle
    const currentCardId = session[0]?.id;
    useEffect(() => {
        if (fastMode || !currentCardId) return;
        const card = session[0];
        if (!card) return;
        if (reversed) speakTargetSide(card);
        else speak(card.english, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId, reversed]);

    // ── Fast mode ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!fastMode || !deck) return;
        window.speechSynthesis.cancel();
        const visibleCards = deck.cards.filter(c => !isCardHidden(c, deckState));
        if (visibleCards.length === 0) return;
        const card = visibleCards[fastModeIndex % visibleCards.length];
        const { readFront } = { readFront: true }; // fast mode always reads both
        if (readFront) {
            const frontUtt = buildUtt(card.english, false);
            frontUtt.onend = () => {
                setTimeout(() => window.speechSynthesis.speak(buildUtt(card.word, true)), 500);
            };
            window.speechSynthesis.speak(frontUtt);
        } else {
            window.speechSynthesis.speak(buildUtt(card.word, true));
        }
        return () => window.speechSynthesis.cancel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fastMode, fastModeIndex, deck]);

    useEffect(() => {
        if (!fastMode) window.speechSynthesis.cancel();
    }, [fastMode]);
    // ─────────────────────────────────────────────────────────────────────────

    const currentCard = session[0];

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (!currentCard) return;
        cancelTts();
        if (reversed) speak(currentCard.english, false);
        else speakTargetSide(currentCard);
    };

    const advanceSession = (nextSession: SessionCard[], updatedDeckState: SRSDeckState) => {
        setSession(nextSession);
        setDeckState(updatedDeckState);
        if (language && deckId) saveDeckState(language, deckId, updatedDeckState);
        setIsFlipped(false);
        setNoteOpen(true);
        if (nextSession.length === 0) setDone(true);
    };

    const rate = (rating: Rating) => {
        if (!deck || !currentCard || !language || !deckId) return;
        const newState = applyRating(currentCard.cardState, rating);
        setReviewed((r) => r + 1);

        const next = [...session];
        next.splice(0, 1);

        if (rating === 1) {
            const updatedCard: SessionCard = { ...currentCard, cardState: newState };
            const insertAt = Math.min(5, next.length);
            next.splice(insertAt, 0, updatedCard);
            setTotalCards((t) => t + 1);
        }

        const updated = updateCardState(deckState, currentCard.id, newState);
        advanceSession(next, updated);
    };

    const remaining = session.length;

    if (!deck) return <div className="srs-container"><p>Loading...</p></div>;

    // ── Fast mode view ────────────────────────────────────────────────────────
    if (fastMode) {
        const visibleCards = deck.cards.filter(c => !isCardHidden(c, deckState));
        const total = visibleCards.length;
        if (total === 0) {
            return (
                <div className="srs-container">
                    <div className="srs-header">
                        <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                        <span className="srs-deck-name">{deck.name}</span>
                        <SRSSettings />
                    </div>
                    <p className="srs-empty">No visible cards. Unhide cards in Browse to study them.</p>
                </div>
            );
        }
        const idx = fastModeIndex % total;
        const card = visibleCards[idx];
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                    <span className="srs-deck-name">{deck.name}</span>
                    <SRSSettings />
                </div>
                <div className="srs-card-wrap">
                    <div className="srs-card srs-card-fast">
                        <div className="srs-card-text">{card.english}</div>
                        {showLiteral && card.literal && <div className="srs-literal">{card.literal}</div>}
                        <hr className="srs-divider" />
                        <div className="srs-card-text">{card.word}</div>
                        {card.romanized && <div className="srs-romanized">{card.romanized}</div>}
                    </div>
                </div>
                <div className="srs-fast-nav">
                    <button className="srs-fast-nav-btn" onClick={() => setFastModeIndex(i => Math.max(0, i - 1))} disabled={idx === 0}>← Prev</button>
                    <span className="srs-fast-counter">{idx + 1} / {total}</span>
                    <button className="srs-fast-nav-btn" onClick={() => setFastModeIndex(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}>Next →</button>
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (done || remaining === 0) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>Come back tomorrow to review cards that are due.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate(`/${language}`)}>Back to Decks</button>
                    </div>
                </div>
            </div>
        );
    }

    const langLabel = language
        ? language.charAt(0).toUpperCase() + language.slice(1)
        : "Target";

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                <span className="srs-deck-name">{deck.name}</span>
                <SRSSettings />
            </div>

            <div className="eszh-controls">
                <button
                    className={`eszh-toggle ${!reversed ? "active" : ""}`}
                    onClick={() => { setReversed(false); setIsFlipped(false); setNoteOpen(true); }}
                >
                    EN → {langLabel}
                </button>
                <button
                    className={`eszh-toggle ${reversed ? "active" : ""}`}
                    onClick={() => { setReversed(true); setIsFlipped(false); setNoteOpen(true); }}
                >
                    {langLabel} → EN
                </button>
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

            <FlipCard
                english={currentCard.english}
                word={currentCard.word}
                romanized={currentCard.romanized}
                phrase={currentCard.phrase}
                phraseRomanized={currentCard.phraseRomanized}
                englishPhrase={currentCard.englishPhrase}
                literal={currentCard.literal}
                grammarNote={currentCard.grammarNote}
                isFlipped={isFlipped}
                onFlip={flip}
                noteOpen={noteOpen}
                onNoteToggle={() => setNoteOpen(o => !o)}
                reversed={reversed}
            />

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
