import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import LiteralGloss, { type LiteralData } from "../components/LiteralGloss";
import GrammarNote from "../components/GrammarNote";
import { applyRating, CardState, isDue, isNew, previewIntervals, Rating } from "../fsrs";
import { useLanguageApp } from "../../LanguageAppContext";
import {
    loadDeckState,
    saveDeckState,
    getCardState,
    updateCardState,
    isCardHidden,
    toggleBookmark,
    SRSDeckState,
} from "../useStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { shuffled } from "../../utils";
import FlipCard from "../components/FlipCard";
import Settings from "../components/Settings";
import "../srs.css";
import "./Review.css";

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
    literal?: LiteralData;
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

const Review = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const [, navigate] = useLocation();

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionCard[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const { readFront, readBack, fastMode, displayMode, autoplay, setAutoplay, showRomanized } = useLanguageApp();
    const [done, setDone] = useState(false);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [noteOpen, setNoteOpen] = useState(true);
    const [reversed, setReversed] = useState(false);

    const [fastModeIndex, setFastModeIndex] = useState(0);
    const [fastModeCards, setFastModeCards] = useState<Card[]>([]);
    const [ttsEnFirst, setTtsEnFirst] = useState(false);
    const [isSrsShuffled, setIsSrsShuffled] = useState(false);
    const [isFastShuffled, setIsFastShuffled] = useState(false);
    const [hideConfirmId, setHideConfirmId] = useState<string | null>(null);

    const { buildUtt } = useSpeech(language);
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
                setFastModeCards(data.cards);
                const state = loadDeckState(language, deckId);
                setDeckState(state);
                const s = buildSession(data.cards, state, false);
                setSession(s);
                setTotalCards(s.length);
            })
            .catch((e) => console.error(e));
    }, [language, deckId]);

    const speakTargetSide = (card: SessionCard) => {
        if (!readBack) return;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            if (displayMode === 'phrase') {
                if (card.phrase) window.speechSynthesis.speak(buildUtt(card.phrase, true));
                return;
            }
            const wordUtt = buildUtt(card.word, true);
            if (displayMode !== 'word' && card.phrase) {
                wordUtt.onend = () => {
                    if (ttsGenRef.current !== gen) return;
                    setTimeout(() => {
                        if (ttsGenRef.current !== gen) return;
                        window.speechSynthesis.speak(buildUtt(card.phrase!, true));
                    }, 650);
                };
            }
            window.speechSynthesis.speak(wordUtt);
        }, 200);
    };

    // Speak front on new card or direction toggle
    const currentCardId = session[0]?.id;
    useEffect(() => {
        if (fastMode || !currentCardId) return;
        const card = session[0];
        if (!card) return;
        if (reversed) speakTargetSide(card);
        else if (readFront) {
            const gen = ++ttsGenRef.current;
            window.speechSynthesis.cancel();
            const text = displayMode === 'phrase' && card.englishPhrase ? card.englishPhrase : card.english;
            setTimeout(() => {
                if (ttsGenRef.current !== gen) return;
                window.speechSynthesis.speak(buildUtt(text, false));
            }, 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId, reversed]);

    // ── Fast mode TTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!fastMode || !deck) return;
        const visibleCards = fastModeCards.filter(c => !isCardHidden(c, deckState));
        if (visibleCards.length === 0) return;
        const total = visibleCards.length;
        const card = visibleCards[fastModeIndex % total];

        const targetWord = readBack && displayMode !== 'phrase' ? [buildUtt(card.word, true)] : [];
        const enWord = readFront && displayMode !== 'phrase' ? [buildUtt(card.english, false)] : [];
        const targetPhrase = readBack && displayMode !== 'word' && card.phrase ? [buildUtt(card.phrase, true)] : [];
        const enPhrase = readFront && displayMode !== 'word' && card.englishPhrase ? [buildUtt(card.englishPhrase, false)] : [];
        const utterances = ttsEnFirst
            ? [...enWord, ...targetWord, ...enPhrase, ...targetPhrase]
            : [...targetWord, ...enWord, ...targetPhrase, ...enPhrase];

        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();

        const advance = () => {
            setTimeout(() => {
                if (ttsGenRef.current !== gen) return;
                setFastModeIndex(i => (i + 1) % total);
            }, 1500);
        };

        const speakChain = (utts: SpeechSynthesisUtterance[]) => {
            if (utts.length === 0 || ttsGenRef.current !== gen) return;
            const [head, ...rest] = utts;
            head.onend = () => {
                if (ttsGenRef.current !== gen) return;
                if (rest.length > 0) setTimeout(() => speakChain(rest), 700);
                else if (autoplay) advance();
            };
            window.speechSynthesis.speak(head);
        };

        let noTtsTimer: ReturnType<typeof setTimeout> | undefined;
        const startTimer = setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            if (utterances.length === 0 && autoplay) {
                noTtsTimer = setTimeout(advance, 2000);
            } else {
                speakChain(utterances);
            }
        }, 200);

        return () => {
            window.speechSynthesis.cancel();
            clearTimeout(startTimer);
            if (noTtsTimer !== undefined) clearTimeout(noTtsTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fastMode, fastModeIndex, fastModeCards, deck, autoplay, displayMode, ttsEnFirst]);

    useEffect(() => {
        if (!fastMode) window.speechSynthesis.cancel();
    }, [fastMode]);

    useEffect(() => {
        if (fastMode) setNoteOpen(true);
    }, [fastModeIndex, fastMode]);
    // ─────────────────────────────────────────────────────────────────────────

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

    keyHandlerRef.current = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;

        if (fastMode && deck) {
            const visibleCards = fastModeCards.filter(c => !isCardHidden(c, deckState));
            const total = visibleCards.length;
            if (total === 0) return;
            const idx = fastModeIndex % total;
            if (e.key === ' ' || e.key === 'ArrowRight') {
                e.preventDefault();
                setFastModeIndex(Math.min(total - 1, idx + 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setFastModeIndex(Math.max(0, idx - 1));
            }
            return;
        }

        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!isFlipped && session.length > 0) flip();
        } else if (isFlipped) {
            if (e.key === '1') rate(1);
            else if (e.key === '2') rate(2);
            else if (e.key === '3') rate(3);
            else if (e.key === '4') rate(4);
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    const currentCard = session[0];

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (!currentCard) return;
        cancelTts();
        if (reversed) {
            if (readFront) {
                const gen = ++ttsGenRef.current;
                const text = displayMode === 'phrase' && currentCard.englishPhrase ? currentCard.englishPhrase : currentCard.english;
                setTimeout(() => {
                    if (ttsGenRef.current !== gen) return;
                    window.speechSynthesis.speak(buildUtt(text, false));
                }, 200);
            }
        } else speakTargetSide(currentCard);
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
        const ratedState = applyRating(currentCard.cardState, rating);
        // Preserve bookmarked flag — currentCard.cardState is from session build time
        // and may not reflect a bookmark toggled mid-session
        const newState: CardState = { ...ratedState, bookmarked: deckState[currentCard.id]?.bookmarked };
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

    const handleBookmark = (cardId: string) => {
        if (!language || !deckId) return;
        const newState = toggleBookmark(deckState, cardId);
        setDeckState(newState);
        saveDeckState(language, deckId, newState);
    };

    const handlePlay = () => {
        const card = currentCard;
        if (!card) return;
        cancelTts();
        const gen = ++ttsGenRef.current;

        const speakTarget = () => {
            if (displayMode === 'phrase') {
                if (card.phrase) setTimeout(() => { if (ttsGenRef.current === gen) window.speechSynthesis.speak(buildUtt(card.phrase!, true)); }, 100);
                return;
            }
            setTimeout(() => {
                if (ttsGenRef.current !== gen) return;
                const wordUtt = buildUtt(card.word, true);
                if (displayMode !== 'word' && card.phrase) {
                    wordUtt.onend = () => {
                        if (ttsGenRef.current !== gen) return;
                        setTimeout(() => {
                            if (ttsGenRef.current !== gen) return;
                            window.speechSynthesis.speak(buildUtt(card.phrase!, true));
                        }, 650);
                    };
                }
                window.speechSynthesis.speak(wordUtt);
            }, 100);
        };

        speakTarget();
    };

    const handleFastPlay = (card: Card) => {
        cancelTts();
        const gen = ++ttsGenRef.current;
        const targetWord = displayMode !== 'phrase' ? [buildUtt(card.word, true)] : [];
        const targetPhrase = displayMode !== 'word' && card.phrase ? [buildUtt(card.phrase, true)] : [];
        const utterances = [...targetWord, ...targetPhrase];
        if (utterances.length === 0) return;
        const speakChain = (utts: SpeechSynthesisUtterance[]) => {
            if (utts.length === 0 || ttsGenRef.current !== gen) return;
            const [head, ...rest] = utts;
            head.onend = () => { if (ttsGenRef.current !== gen) return; if (rest.length > 0) setTimeout(() => speakChain(rest), 700); };
            window.speechSynthesis.speak(head);
        };
        setTimeout(() => { if (ttsGenRef.current === gen) speakChain(utterances); }, 100);
    };

    const confirmHide = () => {
        if (!hideConfirmId || !language || !deckId) return;
        const currentState = getCardState(deckState, hideConfirmId);
        const newCardState: CardState = { ...currentState, hidden: true };
        const newDeckState = updateCardState(deckState, hideConfirmId, newCardState);
        setDeckState(newDeckState);
        saveDeckState(language, deckId, newDeckState);
        setSession(s => s.filter(c => c.id !== hideConfirmId));
        if (fastMode && deck) {
            const newVisible = fastModeCards.filter(c => !isCardHidden(c, newDeckState));
            if (newVisible.length > 0) setFastModeIndex(i => Math.min(i, newVisible.length - 1));
        }
        const hidingCurrentCard = currentCard?.id === hideConfirmId;
        setHideConfirmId(null);
        if (hidingCurrentCard) { setIsFlipped(false); setNoteOpen(true); }
    };

    const hideConfirmDialog = hideConfirmId ? (
        <div className="srs-confirm-overlay" onClick={() => setHideConfirmId(null)}>
            <div className="srs-confirm-dialog" onClick={e => e.stopPropagation()}>
                <p>Hide this card?</p>
                <p className="srs-confirm-sub">It won't appear in future sessions.</p>
                <div className="srs-confirm-actions">
                    <button className="srs-confirm-cancel" onClick={() => setHideConfirmId(null)}>Cancel</button>
                    <button className="srs-confirm-ok" onClick={confirmHide}>Hide</button>
                </div>
            </div>
        </div>
    ) : null;

    const remaining = session.length;

    if (!deck) return <div className="srs-container"><p>Loading...</p></div>;

    const langLabel = language
        ? language.charAt(0).toUpperCase() + language.slice(1)
        : "Target";

    // ── Fast mode view ────────────────────────────────────────────────────────
    if (fastMode) {
        const visibleCards = fastModeCards.filter(c => !isCardHidden(c, deckState));
        const total = visibleCards.length;
        if (total === 0) {
            return (
                <div className="srs-container">
                    <div className="srs-header">
                        <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                        <span className="srs-deck-name">{deck.name}</span>
                        <Settings language={language} />
                    </div>
                    <p className="srs-empty">No visible cards. Unhide cards in Browse to study them.</p>
                </div>
            );
        }
        const idx = fastModeIndex % total;
        const card = visibleCards[idx];
        const isBookmarked = !!deckState[card.id]?.bookmarked;
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                    <span className="srs-deck-name">{deck.name}</span>
                    <Settings language={language} onShuffle={() => {
                        if (isFastShuffled) {
                            if (deck) setFastModeCards([...deck.cards]);
                            setIsFastShuffled(false);
                        } else {
                            setFastModeCards(c => shuffled(c));
                            setIsFastShuffled(true);
                        }
                        setFastModeIndex(0);
                    }} isShuffled={isFastShuffled} />
                </div>
                <div className="eszh-controls">
                    <button className={`eszh-toggle ${!ttsEnFirst ? "active" : ""}`} onClick={() => setTtsEnFirst(false)}>
                        {langLabel} first
                    </button>
                    <button className={`eszh-toggle ${ttsEnFirst ? "active" : ""}`} onClick={() => setTtsEnFirst(true)}>
                        EN first
                    </button>
                    <button className={`eszh-toggle ${autoplay ? "active" : ""}`} onClick={() => setAutoplay(!autoplay)}>
                        {autoplay ? '⏸' : '⏵'} Auto
                    </button>
                </div>
                <div className="srs-card-wrap">
                    <div className="srs-card srs-card-fast">
                        {displayMode !== 'phrase' && (
                            <div className="srs-card-back-word-group">
                                {showRomanized && card.romanized && <div className="srs-romanized">{card.romanized}</div>}
                                <div className="srs-card-text">{card.word}</div>
                                <div className="srs-card-back-english">{card.english}</div>
                            </div>
                        )}
                        {displayMode !== 'word' && (card.phrase || card.phraseRomanized || card.englishPhrase) && (
                            <div className="srs-card-back-phrase-group">
                                {showRomanized && card.phraseRomanized && <div className="srs-romanized">{card.phraseRomanized}</div>}
                                {card.phrase && <div className="srs-card-text">{card.phrase}</div>}
                                {card.englishPhrase && <div className="srs-card-back-english">{card.englishPhrase}</div>}
                            </div>
                        )}
                        <button
                            className={`srs-card-bookmark ${isBookmarked ? "bookmarked" : ""}`}
                            onClick={e => { e.stopPropagation(); handleBookmark(card.id); }}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                        >
                            {isBookmarked ? "🔖" : "🏷"}
                        </button>
                        <div className="srs-card-actions">
                            <button className="srs-card-action-btn" onClick={e => { e.stopPropagation(); handleFastPlay(card); }} title="Play audio">▶</button>
                            <button className="srs-card-action-btn hide-btn" onClick={e => { e.stopPropagation(); setHideConfirmId(card.id); }} title="Hide card">✕</button>
                        </div>
                    </div>
                    {(card.literal || card.grammarNote) && (
                        <div className="srs-grammar-note-wrap">
                            <button className="srs-grammar-note-toggle" onClick={() => setNoteOpen(o => !o)}>
                                Grammar note {noteOpen ? "▴" : "▾"}
                            </button>
                            {noteOpen && (
                                <div className="srs-grammar-note-body">
                                    {card.literal && <LiteralGloss literal={card.literal} context="note" />}
                                    {card.literal && card.grammarNote && <hr className="srs-note-divider" />}
                                    {card.grammarNote && <GrammarNote note={card.grammarNote} inline />}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="srs-fast-nav">
                    <button className="srs-fast-nav-btn" onClick={() => setFastModeIndex(i => Math.max(0, i - 1))} disabled={idx === 0}>← Prev</button>
                    <div className="srs-fast-jump">
                        <input
                            type="range"
                            className="srs-fast-slider"
                            min={0}
                            max={total - 1}
                            value={idx}
                            onChange={e => setFastModeIndex(Number((e.target as HTMLInputElement).value))}
                        />
                        <span className="srs-fast-counter">{idx + 1} / {total}</span>
                    </div>
                    <button className="srs-fast-nav-btn" onClick={() => setFastModeIndex(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}>Next →</button>
                </div>
                {hideConfirmDialog}
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (done || remaining === 0) {
        const hiddenCount = deck.cards.filter(c => isCardHidden(c, deckState)).length;
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>Come back tomorrow to review cards that are due.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate(`/${language}`)}>Back to Decks</button>
                        {hiddenCount > 0 && (
                            <button
                                className="srs-btn-secondary"
                                onClick={() => navigate(`/${language}/${deckId}/browse?filter=hidden`)}
                            >
                                Add more cards ({hiddenCount} hidden)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const currentIsBookmarked = !!deckState[currentCard.id]?.bookmarked;

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => navigate(`/${language}`)}>← Decks</button>
                <span className="srs-deck-name">{deck.name}</span>
                <Settings onShuffle={() => {
                    if (isSrsShuffled) {
                        if (deck) setSession(buildSession(deck.cards, deckState, false));
                        setIsSrsShuffled(false);
                    } else {
                        setSession(s => shuffled(s));
                        setIsSrsShuffled(true);
                    }
                    setIsFlipped(false);
                    setNoteOpen(true);
                }} isShuffled={isSrsShuffled} />
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
                <button
                    className="eszh-toggle"
                    onClick={() => {
                        if (isSrsShuffled) {
                            if (deck) setSession(buildSession(deck.cards, deckState, false));
                            setIsSrsShuffled(false);
                        } else {
                            setSession(s => shuffled(s));
                            setIsSrsShuffled(true);
                        }
                        setIsFlipped(false);
                        setNoteOpen(true);
                    }}
                >
                    {isSrsShuffled ? "↺ Unshuffle" : "⇄ Shuffle"}
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
                onPlay={handlePlay}
                onHide={() => setHideConfirmId(currentCard.id)}
                cardCorner={
                    <button
                        className={`srs-card-bookmark ${currentIsBookmarked ? "bookmarked" : ""}`}
                        onClick={e => { e.stopPropagation(); handleBookmark(currentCard.id); }}
                        title={currentIsBookmarked ? "Remove bookmark" : "Bookmark"}
                    >
                        {currentIsBookmarked ? "🔖" : "🏷"}
                    </button>
                }
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
            {hideConfirmDialog}
        </div>
    );
};

export default Review;
