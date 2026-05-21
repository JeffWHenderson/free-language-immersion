import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { applyRating, CardState, isDue, isNew, previewIntervals, Rating } from "../fsrs";
import { loadDeckState, saveDeckState, getCardState, updateCardState, SRSDeckState } from "../useStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { shuffled } from "../../utils";
import { useLanguageApp } from "../../LanguageAppContext";
import Settings from "../components/Settings";
import FlipCard from "../components/FlipCard";
import GrammarNote from "../components/GrammarNote";
import "../srs.css";
import "../Review/Review.css";

const ESZH_LANG = "eszh";
const ESZH_DECK = "all";

interface ReviewItem {
    id: string;
    english: string;
    spanish: string;
    chinese: string;
    pinyin?: string;
    grammarNote?: string;
    spanishPhrase?: string;
    chinesePhrase?: string;
    chinesePhrasePin?: string;
}

type SessionItem = ReviewItem & { cardState: CardState };

function buildSession(items: ReviewItem[], deckState: SRSDeckState, shuffle: boolean): SessionItem[] {
    const due: SessionItem[] = [];
    const learn: SessionItem[] = [];
    const newItems: SessionItem[] = [];

    for (const item of items) {
        const state = getCardState(deckState, item.id);
        const s: SessionItem = { ...item, cardState: state };
        if (isNew(state)) {
            newItems.push(s);
        } else if (isDue(state)) {
            (state.state === "review" ? due : learn).push(s);
        }
    }

    due.sort((a, b) => a.cardState.dueDate.localeCompare(b.cardState.dueDate));
    return [due, learn, newItems].flatMap(g => shuffle ? shuffled(g) : g);
}

const ESZHReview = () => {
    const [, navigate] = useLocation();

    const [allItems, setAllItems] = useState<ReviewItem[]>([]);
    const [fastModeCards, setFastModeCards] = useState<ReviewItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionItem[]>([]);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [noteOpen, setNoteOpen] = useState(true);
    const [done, setDone] = useState(false);
    const [reversed, setReversed] = useState(false);
    const [ttsEnFirst, setTtsEnFirst] = useState(false);
    const [fastModeIndex, setFastModeIndex] = useState(0);
    const [isSrsShuffled, setIsSrsShuffled] = useState(false);
    const [isFastShuffled, setIsFastShuffled] = useState(false);

    const { readFront, readBack, fastMode, displayMode, autoplay, setAutoplay } = useLanguageApp();
    const { buildUtt: buildSpanishUtt } = useSpeech("spanish");
    const { buildUtt: buildChineseUtt } = useSpeech("chinese");
    const ttsGenRef = useRef(0);

    const cancelTts = () => {
        ttsGenRef.current += 1;
        window.speechSynthesis.cancel();
    };

    useEffect(() => {
        fetch("/cross/spanish-chinese/index.json")
            .then(r => r.json())
            .then((data: { cards: ReviewItem[] }) => {
                const state = loadDeckState(ESZH_LANG, ESZH_DECK);
                const s = buildSession(data.cards, state, false);
                setAllItems(data.cards);
                setFastModeCards(data.cards);
                setDeckState(state);
                setSession(s);
                setTotalCards(s.length);
                setLoaded(true);
            })
            .catch(e => console.error(e));
    }, []);

    // ── Fast mode TTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!fastMode || fastModeCards.length === 0) return;
        const total = fastModeCards.length;
        const card = fastModeCards[fastModeIndex % total];

        const zhWord = buildChineseUtt(card.chinese, true);
        const esWord = buildSpanishUtt(card.spanish, true);
        const zhPhrase = card.chinesePhrase ? buildChineseUtt(card.chinesePhrase, true) : null;
        const esPhrase = card.spanishPhrase ? buildSpanishUtt(card.spanishPhrase, true) : null;

        const utterances = ttsEnFirst
            ? [
                ...(readFront && displayMode !== 'phrase' ? [esWord] : []),
                ...(readBack && displayMode !== 'phrase' ? [zhWord] : []),
                ...(readFront && displayMode !== 'word' && esPhrase ? [esPhrase] : []),
                ...(readBack && displayMode !== 'word' && zhPhrase ? [zhPhrase] : []),
              ]
            : [
                ...(readBack && displayMode !== 'phrase' ? [zhWord] : []),
                ...(readFront && displayMode !== 'phrase' ? [esWord] : []),
                ...(readBack && displayMode !== 'word' && zhPhrase ? [zhPhrase] : []),
                ...(readFront && displayMode !== 'word' && esPhrase ? [esPhrase] : []),
              ];

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
    }, [fastMode, fastModeIndex, fastModeCards, autoplay, displayMode, ttsEnFirst]);

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

        if (fastMode) {
            const total = fastModeCards.length;
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

    const speakFront = (card: SessionItem) => {
        if (!readFront) return;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        if (reversed) {
            const text = displayMode === 'phrase' ? (card.chinesePhrase || card.chinese) : card.chinese;
            setTimeout(() => {
                if (ttsGenRef.current !== gen) return;
                window.speechSynthesis.speak(buildChineseUtt(text, true));
            }, 200);
        } else {
            const text = displayMode === 'phrase' ? (card.spanishPhrase || card.spanish) : card.spanish;
            setTimeout(() => {
                if (ttsGenRef.current !== gen) return;
                window.speechSynthesis.speak(buildSpanishUtt(text, true));
            }, 200);
        }
    };

    const speakBack = (card: SessionItem) => {
        if (!readBack) return;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            if (reversed) {
                if (displayMode === 'phrase') {
                    window.speechSynthesis.speak(buildSpanishUtt(card.spanishPhrase || card.spanish, true));
                    return;
                }
                const wordUtt = buildSpanishUtt(card.spanish, true);
                if (displayMode !== 'word' && card.spanishPhrase) {
                    wordUtt.onend = () => setTimeout(() =>
                        window.speechSynthesis.speak(buildSpanishUtt(card.spanishPhrase!, true)), 650);
                }
                window.speechSynthesis.speak(wordUtt);
            } else {
                if (displayMode === 'phrase') {
                    window.speechSynthesis.speak(buildChineseUtt(card.chinesePhrase || card.chinese, true));
                    return;
                }
                const wordUtt = buildChineseUtt(card.chinese, true);
                if (displayMode !== 'word' && card.chinesePhrase) {
                    wordUtt.onend = () => setTimeout(() =>
                        window.speechSynthesis.speak(buildChineseUtt(card.chinesePhrase!, true)), 650);
                }
                window.speechSynthesis.speak(wordUtt);
            }
        }, 200);
    };

    const currentCardId = currentCard?.id;
    useEffect(() => {
        if (fastMode || !currentCardId) return;
        if (currentCard) speakFront(currentCard);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId, reversed]);

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (!currentCard) return;
        cancelTts();
        speakBack(currentCard);
    };

    const toggleReversed = () => {
        setReversed(r => !r);
        setIsFlipped(false);
        setNoteOpen(true);
    };

    const rate = (rating: Rating) => {
        if (!currentCard) return;
        const newState = applyRating(currentCard.cardState, rating);
        setReviewed(r => r + 1);

        const next = [...session];
        next.splice(0, 1);

        if (rating === 1) {
            const updatedCard: SessionItem = { ...currentCard, cardState: newState };
            const insertAt = Math.min(5, next.length);
            next.splice(insertAt, 0, updatedCard);
            setTotalCards(t => t + 1);
        }

        const updated = updateCardState(deckState, currentCard.id, newState);
        saveDeckState(ESZH_LANG, ESZH_DECK, updated);
        setDeckState(updated);
        setSession(next);
        setIsFlipped(false);
        setNoteOpen(true);
        if (next.length === 0) setDone(true);
    };

    const fastModeShuffle = () => {
        if (isFastShuffled) {
            setFastModeCards([...allItems]);
            setIsFastShuffled(false);
        } else {
            setFastModeCards(c => shuffled(c));
            setIsFastShuffled(true);
        }
        setFastModeIndex(0);
    };
    const srsShuffle = () => {
        if (isSrsShuffled) {
            setSession(buildSession(allItems, deckState, false));
            setIsSrsShuffled(false);
        } else {
            setSession(s => shuffled(s));
            setIsSrsShuffled(true);
        }
        setIsFlipped(false);
        setNoteOpen(true);
    };

    const header = (
        <div className="srs-header">
            <button className="srs-back-link" onClick={() => navigate("/")}>← Home</button>
            <span className="srs-deck-name">{reversed ? "中文 → ES" : "ES → 中文"}</span>
            <Settings onShuffle={fastMode ? fastModeShuffle : srsShuffle} isShuffled={fastMode ? isFastShuffled : isSrsShuffled} />
        </div>
    );

    if (!loaded) return <div className="srs-container"><p>Loading...</p></div>;

    // ── Fast mode view ────────────────────────────────────────────────────────
    if (fastMode) {
        const total = fastModeCards.length;
        const idx = fastModeIndex % Math.max(total, 1);
        const card = fastModeCards[idx];
        return (
            <div className="srs-container">
                {header}
                <div className="eszh-controls">
                    <button className={`eszh-toggle ${!ttsEnFirst ? "active" : ""}`} onClick={() => setTtsEnFirst(false)}>
                        ZH first
                    </button>
                    <button className={`eszh-toggle ${ttsEnFirst ? "active" : ""}`} onClick={() => setTtsEnFirst(true)}>
                        ES first
                    </button>
                    <button className={`eszh-toggle ${autoplay ? "active" : ""}`} onClick={() => setAutoplay(!autoplay)}>
                        {autoplay ? '⏸' : '⏵'} Auto
                    </button>
                </div>
                <div className="srs-card-wrap">
                    <div className="srs-card srs-card-fast">
                        {displayMode !== 'phrase' && (
                            <div className="srs-card-back-word-group">
                                {card.pinyin && <div className="srs-romanized">{card.pinyin}</div>}
                                <div className="srs-card-text">{card.chinese}</div>
                                <div className="srs-card-back-english">{card.spanish}</div>
                            </div>
                        )}
                        {displayMode !== 'word' && (card.chinesePhrase || card.chinesePhrasePin || card.spanishPhrase) && (
                            <div className="srs-card-back-phrase-group">
                                {card.chinesePhrasePin && <div className="srs-romanized">{card.chinesePhrasePin}</div>}
                                {card.chinesePhrase && <div className="srs-card-text">{card.chinesePhrase}</div>}
                                {card.spanishPhrase && <div className="srs-card-back-english">{card.spanishPhrase}</div>}
                            </div>
                        )}
                    </div>
                    {card.grammarNote && (
                        <div className="srs-grammar-note-wrap">
                            <button className="srs-grammar-note-toggle" onClick={() => setNoteOpen(o => !o)}>
                                Grammar note {noteOpen ? "▴" : "▾"}
                            </button>
                            {noteOpen && (
                                <div className="srs-grammar-note-body">
                                    <GrammarNote note={card.grammarNote} inline />
                                </div>
                            )}
                        </div>
                    )}
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

    if (done || (loaded && session.length === 0 && reviewed > 0)) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>Come back tomorrow to review cards that are due.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate("/")}>Back to Home</button>
                    </div>
                </div>
            </div>
        );
    }

    if (loaded && session.length === 0) {
        return (
            <div className="srs-container">
                {header}
                <div className="srs-done">
                    <h2>Nothing due!</h2>
                    <p>{allItems.length} cards total — come back tomorrow.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate("/")}>Back to Home</button>
                    </div>
                </div>
            </div>
        );
    }

    const remaining = session.length;
    const preview = previewIntervals(currentCard.cardState);

    return (
        <div className="srs-container">
            {header}
            <div className="eszh-controls">
                <button className={`eszh-toggle ${!reversed ? "active" : ""}`} onClick={toggleReversed}>
                    ES → 中文
                </button>
                <button className={`eszh-toggle ${reversed ? "active" : ""}`} onClick={toggleReversed}>
                    中文 → ES
                </button>
                <button className="eszh-toggle" onClick={srsShuffle}>{isSrsShuffled ? "↺ Unshuffle" : "⇄ Shuffle"}</button>
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

            <FlipCard
                english={currentCard.spanish}
                word={currentCard.chinese}
                romanized={currentCard.pinyin}
                phrase={currentCard.chinesePhrase}
                phraseRomanized={currentCard.chinesePhrasePin}
                englishPhrase={currentCard.spanishPhrase}
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

export default ESZHReview;
