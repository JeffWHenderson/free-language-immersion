import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import LiteralGloss from "../components/LiteralGloss";
import GrammarNote from "../components/GrammarNote";
import { applyRating, CardState, isNew, previewIntervals, Rating } from "../fsrs";
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
import { getVoiceForLanguage, useVoices } from "../../hooks/useLanguage";
import { useAllDecks } from "../../hooks/useDecks";
import { shuffled } from "../../utils";
import FlipCard from "../components/FlipCard";
import { type CombinedCard, type CombinedSessionCard, categorize, buildSession, orderFastCards } from "../deckSession";
import Settings from "../components/Settings";
import { STANDARD_LANGUAGES, languageLabel } from "../../common/languages";
import "../srs.css";
import "../Review/Review.css";

const GLOBAL_SELECTION_KEY = "global_deck_selection";
const LANGUAGE_IDS = STANDARD_LANGUAGES.map((l) => l.id);

interface Selection {
    language: string;
    packId: string;
}

interface HideTarget {
    cardId: string;
    deckId: string;
    language: string;
}

const deckKeyOf = (language: string, packId: string) => `${language}:${packId}`;

function loadSelection(): Selection[] {
    try {
        const raw = localStorage.getItem(GLOBAL_SELECTION_KEY);
        return raw ? (JSON.parse(raw) as Selection[]) : [];
    } catch {
        return [];
    }
}

function saveSelection(sel: Selection[]) {
    localStorage.setItem(GLOBAL_SELECTION_KEY, JSON.stringify(sel));
}

const GlobalDeck = () => {
    const [, navigate] = useLocation();
    const { packsByLang, loading: packsLoading } = useAllDecks(LANGUAGE_IDS);
    const voices = useVoices();

    const [selection, setSelection] = useState<Selection[]>(() => loadSelection());
    const [editing, setEditing] = useState<boolean>(() => loadSelection().length === 0);

    const [allCards, setAllCards] = useState<CombinedCard[]>([]);
    const [deckStates, setDeckStates] = useState<Map<string, SRSDeckState>>(new Map());
    const [session, setSession] = useState<CombinedSessionCard[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const { readFront, readBack, volume, fastMode, displayMode, autoplay, setAutoplay, showRomanized } = useLanguageApp();
    const [done, setDone] = useState(false);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [noteOpen, setNoteOpen] = useState(true);
    const [reversed, setReversed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const [fastModeIndex, setFastModeIndex] = useState(0);
    const [fastModeCards, setFastModeCards] = useState<CombinedCard[]>([]);
    const [ttsEnFirst, setTtsEnFirst] = useState(false);
    const [isSrsShuffled, setIsSrsShuffled] = useState(false);
    const [isFastShuffled, setIsFastShuffled] = useState(false);
    const [hideTarget, setHideTarget] = useState<HideTarget | null>(null);

    const ttsGenRef = useRef(0);

    // Per-card TTS: pick the voice from the card's own language for the target
    // side, English for the prompt side. (Mirrors ESZHReview's per-language utts.)
    const buildUtt = useCallback((text: string, isTarget: boolean, cardLang: string): SpeechSynthesisUtterance => {
        const utt = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
        utt.voice = getVoiceForLanguage(voices, isTarget ? cardLang : "english") ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        return utt;
    }, [voices, volume]);

    const cancelTts = () => {
        ttsGenRef.current += 1;
        window.speechSynthesis.cancel();
    };

    // Build the combined cross-language session from the saved selection.
    useEffect(() => {
        if (packsLoading) return;
        if (selection.length === 0) {
            setAllCards([]);
            setSession([]);
            setLoaded(true);
            return;
        }
        const combined: CombinedCard[] = [];
        const states = new Map<string, SRSDeckState>();
        for (const { language, packId } of selection) {
            const pack = (packsByLang[language] ?? []).find((p) => p.id === packId);
            if (!pack) continue;
            const deckKey = deckKeyOf(language, packId);
            states.set(deckKey, loadDeckState(language, packId));
            for (const c of pack.cards) {
                combined.push({ ...c, deckId: packId, deckKey, deckName: pack.name, language });
            }
        }
        setAllCards(combined);
        setDeckStates(states);
        setFastModeCards(orderFastCards(combined, states));
        const s = buildSession(combined, states, false);
        setSession(s);
        setTotalCards(s.length);
        setReviewed(0);
        setDone(false);
        setIsFlipped(false);
        setLoaded(true);
    }, [selection, packsByLang, packsLoading]);

    const getCardDeckState = (card: CombinedCard): SRSDeckState =>
        deckStates.get(card.deckKey) ?? {};

    const speakTargetSide = (card: CombinedSessionCard) => {
        if (!readBack) return;
        const lang = card.language!;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            if (displayMode === 'phrase') {
                if (card.phrase) window.speechSynthesis.speak(buildUtt(card.phrase, true, lang));
                return;
            }
            const wordUtt = buildUtt(card.word, true, lang);
            if (displayMode !== 'word' && card.phrase) {
                wordUtt.onend = () => {
                    if (ttsGenRef.current !== gen) return;
                    setTimeout(() => {
                        if (ttsGenRef.current !== gen) return;
                        window.speechSynthesis.speak(buildUtt(card.phrase!, true, lang));
                    }, 650);
                };
            }
            window.speechSynthesis.speak(wordUtt);
        }, 200);
    };

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
                window.speechSynthesis.speak(buildUtt(text, false, card.language!));
            }, 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId, reversed]);

    // ── Fast mode TTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!fastMode || allCards.length === 0) return;
        const visibleCards = fastModeCards.filter(c => !isCardHidden(c, getCardDeckState(c)));
        if (visibleCards.length === 0) return;
        const total = visibleCards.length;
        const card = visibleCards[fastModeIndex % total];
        const lang = card.language!;

        const targetWord = readBack && displayMode !== 'phrase' ? [buildUtt(card.word, true, lang)] : [];
        const enWord = readFront && displayMode !== 'phrase' ? [buildUtt(card.english, false, lang)] : [];
        const targetPhrase = readBack && displayMode !== 'word' && card.phrase ? [buildUtt(card.phrase, true, lang)] : [];
        const enPhrase = readFront && displayMode !== 'word' && card.englishPhrase ? [buildUtt(card.englishPhrase, false, lang)] : [];
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
    }, [fastMode, fastModeIndex, fastModeCards, allCards, autoplay, displayMode, ttsEnFirst]);

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
        if (editing) return;
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;

        if (fastMode && allCards.length > 0) {
            const visibleCards = fastModeCards.filter(c => !isCardHidden(c, getCardDeckState(c)));
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
                    window.speechSynthesis.speak(buildUtt(text, false, currentCard.language!));
                }, 200);
            }
        } else speakTargetSide(currentCard);
    };

    const rate = (rating: Rating) => {
        if (!currentCard) return;
        const deckState = getCardDeckState(currentCard);
        const ratedState = applyRating(currentCard.cardState, rating);
        const newState: CardState = { ...ratedState, bookmarked: deckState[currentCard.id]?.bookmarked };
        setReviewed(r => r + 1);

        const next = [...session];
        next.splice(0, 1);

        if (rating === 1) {
            const updatedCard: CombinedSessionCard = { ...currentCard, cardState: newState };
            const insertAt = Math.min(5, next.length);
            next.splice(insertAt, 0, updatedCard);
            setTotalCards(t => t + 1);
        }

        const updatedDeckState = updateCardState(deckState, currentCard.id, newState);
        setDeckStates(m => new Map(m).set(currentCard.deckKey, updatedDeckState));
        saveDeckState(currentCard.language!, currentCard.deckId, updatedDeckState);
        setSession(next);
        setIsFlipped(false);
        setNoteOpen(true);
        if (next.length === 0) setDone(true);
    };

    const handleBookmark = (card: CombinedCard) => {
        const deckState = getCardDeckState(card);
        const newState = toggleBookmark(deckState, card.id);
        setDeckStates(m => new Map(m).set(card.deckKey, newState));
        saveDeckState(card.language!, card.deckId, newState);
    };

    const handlePlay = () => {
        const card = currentCard;
        if (!card) return;
        cancelTts();
        const gen = ++ttsGenRef.current;
        const lang = card.language!;
        if (displayMode === 'phrase') {
            if (card.phrase) setTimeout(() => { if (ttsGenRef.current === gen) window.speechSynthesis.speak(buildUtt(card.phrase!, true, lang)); }, 100);
            return;
        }
        setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            const wordUtt = buildUtt(card.word, true, lang);
            if (displayMode !== 'word' && card.phrase) {
                wordUtt.onend = () => {
                    if (ttsGenRef.current !== gen) return;
                    setTimeout(() => {
                        if (ttsGenRef.current !== gen) return;
                        window.speechSynthesis.speak(buildUtt(card.phrase!, true, lang));
                    }, 650);
                };
            }
            window.speechSynthesis.speak(wordUtt);
        }, 100);
    };

    const handleFastPlay = (card: CombinedCard) => {
        cancelTts();
        const gen = ++ttsGenRef.current;
        const lang = card.language!;
        const targetWord = displayMode !== 'phrase' ? [buildUtt(card.word, true, lang)] : [];
        const targetPhrase = displayMode !== 'word' && card.phrase ? [buildUtt(card.phrase, true, lang)] : [];
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
        if (!hideTarget) return;
        const { cardId, deckId, language } = hideTarget;
        const deckKey = deckKeyOf(language, deckId);
        const deckState = deckStates.get(deckKey) ?? {};
        const currentState = getCardState(deckState, cardId);
        const newCardState: CardState = { ...currentState, hidden: true };
        const newDeckState = updateCardState(deckState, cardId, newCardState);
        const newDeckStates = new Map(deckStates).set(deckKey, newDeckState);
        setDeckStates(newDeckStates);
        saveDeckState(language, deckId, newDeckState);
        setSession(s => s.filter(c => !(c.id === cardId && c.deckKey === deckKey)));
        if (fastMode) {
            const newVisible = fastModeCards.filter(c => !isCardHidden(c, newDeckStates.get(c.deckKey) ?? {}));
            if (newVisible.length > 0) setFastModeIndex(i => Math.min(i, newVisible.length - 1));
        }
        const hidingCurrent = currentCard?.id === cardId && currentCard?.deckKey === deckKey;
        setHideTarget(null);
        if (hidingCurrent) { setIsFlipped(false); setNoteOpen(true); }
    };

    const hideConfirmDialog = hideTarget ? (
        <div className="srs-confirm-overlay" onClick={() => setHideTarget(null)}>
            <div className="srs-confirm-dialog" onClick={e => e.stopPropagation()}>
                <p>Hide this card?</p>
                <p className="srs-confirm-sub">It won't appear in future sessions.</p>
                <div className="srs-confirm-actions">
                    <button className="srs-confirm-cancel" onClick={() => setHideTarget(null)}>Cancel</button>
                    <button className="srs-confirm-ok" onClick={confirmHide}>Hide</button>
                </div>
            </div>
        </div>
    ) : null;

    const remaining = session.length;

    // ── Deck picker ───────────────────────────────────────────────────────────
    const isSelected = (language: string, packId: string) =>
        selection.some((s) => s.language === language && s.packId === packId);

    const togglePack = (language: string, packId: string) => {
        setSelection((prev) => {
            const next = isSelected(language, packId)
                ? prev.filter((s) => !(s.language === language && s.packId === packId))
                : [...prev, { language, packId }];
            saveSelection(next);
            return next;
        });
    };

    if (!loaded && !editing) return <div className="srs-container"><p>Loading...</p></div>;

    if (editing) {
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate('/')}>← Home</button>
                    <span className="srs-deck-name">Combined Deck</span>
                    <span style={{ width: 60 }} />
                </div>
                <p className="srs-empty" style={{ marginBottom: 8 }}>
                    Pick packs from any languages to study together in one deck.
                </p>
                {packsLoading && <p className="srs-empty">Loading decks…</p>}
                {STANDARD_LANGUAGES.map(({ id, label }) => {
                    const packs = packsByLang[id] ?? [];
                    if (packs.length === 0) return null;
                    return (
                        <div key={id} className="global-lang-group">
                            <h3 className="global-lang-title">{label}</h3>
                            <div className="global-pack-list">
                                {packs.map((p) => (
                                    <button
                                        key={p.id}
                                        className={`eszh-toggle ${isSelected(id, p.id) ? "active" : ""}`}
                                        onClick={() => togglePack(id, p.id)}
                                    >
                                        {isSelected(id, p.id) ? "✓ " : ""}{p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
                <div className="srs-done-actions" style={{ position: 'sticky', bottom: 12, marginTop: 16 }}>
                    <button
                        className="srs-btn-primary"
                        disabled={selection.length === 0}
                        onClick={() => { setEditing(false); setIsFlipped(false); setNoteOpen(true); }}
                    >
                        Study {selection.length > 0 ? `(${selection.length} pack${selection.length !== 1 ? "s" : ""})` : ""}
                    </button>
                </div>
            </div>
        );
    }

    if (allCards.length === 0) {
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate('/')}>← Home</button>
                    <span className="srs-deck-name">Combined Deck</span>
                    <button className="srs-back-link" onClick={() => setEditing(true)}>✎ Decks</button>
                </div>
                <p className="srs-empty">No packs selected. Tap “✎ Decks” to choose some.</p>
            </div>
        );
    }

    // ── Fast mode view ────────────────────────────────────────────────────────
    if (fastMode) {
        const visibleCards = fastModeCards.filter(c => !isCardHidden(c, getCardDeckState(c)));
        const total = visibleCards.length;
        const header = (
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => setEditing(true)}>✎ Decks</button>
                <span className="srs-deck-name">Combined Deck</span>
                <Settings onShuffle={() => {
                    if (isFastShuffled) {
                        setFastModeCards(orderFastCards(allCards, deckStates));
                        setIsFastShuffled(false);
                    } else {
                        setFastModeCards(c => shuffled(c));
                        setIsFastShuffled(true);
                    }
                    setFastModeIndex(0);
                }} isShuffled={isFastShuffled} />
            </div>
        );
        if (total === 0) {
            return (
                <div className="srs-container">
                    {header}
                    <p className="srs-empty">No visible cards. Unhide cards in Browse to study them.</p>
                </div>
            );
        }
        const idx = fastModeIndex % total;
        const card = visibleCards[idx];
        const cardDeckState = getCardDeckState(card);
        const isBookmarked = !!cardDeckState[card.id]?.bookmarked;
        return (
            <div className="srs-container">
                {header}
                <div className="eszh-controls">
                    <button className={`eszh-toggle ${!ttsEnFirst ? "active" : ""}`} onClick={() => setTtsEnFirst(false)}>
                        Target first
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
                        <span className="global-card-lang-badge">{languageLabel(card.language!)}</span>
                        {displayMode !== 'phrase' && (
                            <div className="srs-card-back-word-group">
                                {card.code ? (
                                    <>
                                        {card.codeLang && <div className="srs-card-code-lang">{card.codeLang}</div>}
                                        <pre className="srs-card-code"><code>{card.code}</code></pre>
                                    </>
                                ) : (
                                    <>
                                        {showRomanized && card.romanized && <div className="srs-romanized">{card.romanized}</div>}
                                        <div className="srs-card-text">{card.word}</div>
                                    </>
                                )}
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
                            onClick={e => { e.stopPropagation(); handleBookmark(card); }}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                        >
                            {isBookmarked ? "🔖" : "🏷"}
                        </button>
                        <div className="srs-card-actions">
                            <button className="srs-card-action-btn" onClick={e => { e.stopPropagation(); handleFastPlay(card); }} title="Play audio">▶</button>
                            <button className="srs-card-action-btn hide-btn" onClick={e => { e.stopPropagation(); setHideTarget({ cardId: card.id, deckId: card.deckId, language: card.language! }); }} title="Hide card">✕</button>
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
        const remainingNew = categorize(allCards, deckStates).newCards.length;
        const addMoreCards = () => {
            const next = buildSession(allCards, deckStates, isSrsShuffled);
            setSession(next);
            setTotalCards(next.length);
            setReviewed(0);
            setDone(false);
            setIsFlipped(false);
            setNoteOpen(true);
        };
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>
                        {remainingNew > 0
                            ? "Add more new cards, or come back tomorrow for cards that are due."
                            : "Come back tomorrow to review cards that are due."}
                    </p>
                    <div className="srs-done-actions">
                        {remainingNew > 0 && (
                            <button className="srs-btn-primary" onClick={addMoreCards}>
                                Add {Math.min(10, remainingNew)} more card{Math.min(10, remainingNew) !== 1 ? "s" : ""}
                            </button>
                        )}
                        <button className={remainingNew > 0 ? "srs-btn-secondary" : "srs-btn-primary"} onClick={() => setEditing(true)}>Choose Decks</button>
                        <button className="srs-btn-secondary" onClick={() => navigate('/')}>Home</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentIsBookmarked = !!getCardDeckState(currentCard)[currentCard.id]?.bookmarked;

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button className="srs-back-link" onClick={() => setEditing(true)}>✎ Decks</button>
                <span className="srs-deck-name">Combined Deck</span>
                <Settings onShuffle={() => {
                    if (isSrsShuffled) {
                        setSession(buildSession(allCards, deckStates, false));
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
                    EN → Target
                </button>
                <button
                    className={`eszh-toggle ${reversed ? "active" : ""}`}
                    onClick={() => { setReversed(true); setIsFlipped(false); setNoteOpen(true); }}
                >
                    Target → EN
                </button>
                <button
                    className="eszh-toggle"
                    onClick={() => {
                        if (isSrsShuffled) {
                            setSession(buildSession(allCards, deckStates, false));
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
                <span className="srs-count new">{session.filter(c => isNew(c.cardState)).length} new</span>
                <span className="srs-count learn">{session.filter(c => c.cardState.state === "learning").length} learn</span>
                <span className="srs-count review">{session.filter(c => c.cardState.state === "review").length} due</span>
            </div>

            <FlipCard
                english={currentCard.english}
                word={currentCard.word}
                romanized={currentCard.romanized}
                code={currentCard.code}
                codeLang={currentCard.codeLang}
                phrase={currentCard.phrase}
                phraseRomanized={currentCard.phraseRomanized}
                englishPhrase={currentCard.englishPhrase}
                literal={currentCard.literal}
                grammarNote={currentCard.grammarNote}
                grammar={currentCard.grammar}
                grammarFormat={currentCard.format ? {
                    format: currentCard.format,
                    cloze: currentCard.cloze,
                    table: currentCard.table,
                    contrast: currentCard.contrast,
                    produce: currentCard.produce,
                } : undefined}
                isFlipped={isFlipped}
                onFlip={flip}
                noteOpen={noteOpen}
                onNoteToggle={() => setNoteOpen(o => !o)}
                reversed={reversed}
                onPlay={handlePlay}
                onHide={() => setHideTarget({ cardId: currentCard.id, deckId: currentCard.deckId, language: currentCard.language! })}
                cardCorner={
                    <>
                        <span className="global-card-lang-badge">{languageLabel(currentCard.language!)}</span>
                        <button
                            className={`srs-card-bookmark ${currentIsBookmarked ? "bookmarked" : ""}`}
                            onClick={e => { e.stopPropagation(); handleBookmark(currentCard); }}
                            title={currentIsBookmarked ? "Remove bookmark" : "Bookmark"}
                        >
                            {currentIsBookmarked ? "🔖" : "🏷"}
                        </button>
                    </>
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

export default GlobalDeck;
