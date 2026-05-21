import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applyRating, CardState, isDue, isNew, previewIntervals, Rating } from "../fsrs";
import { loadDeckState, saveDeckState, getCardState, updateCardState, SRSDeckState } from "../useSRSStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { shuffled } from "../../utils";
import { useLanguageApp } from "../../LanguageAppContext";
import SRSSettings from "../components/SRSSettings";
import "../srs.css";
import "../components/FlipCard.css";
import "../SRSReview/SRSReview.css";

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
    const navigate = useNavigate();

    const [allItems, setAllItems] = useState<ReviewItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [deckState, setDeckState] = useState<SRSDeckState>({});
    const [session, setSession] = useState<SessionItem[]>([]);
    const [totalCards, setTotalCards] = useState(0);
    const [reviewed, setReviewed] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [noteOpen, setNoteOpen] = useState(true);
    const [done, setDone] = useState(false);
    const [reversed, setReversed] = useState(false);
    const [showEnglish, setShowEnglish] = useState(true);

    const { shuffleCards, readBack, fastMode } = useLanguageApp();
    const { speak: speakSpanish, buildUtt: buildSpanishUtt } = useSpeech("spanish");
    const { speak: speakChinese, buildUtt: buildChineseUtt } = useSpeech("chinese");
    const ttsGenRef = useRef(0);
    const [fastModeIndex, setFastModeIndex] = useState(0);

    useEffect(() => {
        fetch("/cross/spanish-chinese/index.json")
            .then(r => r.json())
            .then((data: { cards: ReviewItem[] }) => {
                const state = loadDeckState(ESZH_LANG, ESZH_DECK);
                const s = buildSession(data.cards, state, shuffleCards);
                setAllItems(data.cards);
                setDeckState(state);
                setSession(s);
                setTotalCards(s.length);
                setLoaded(true);
            })
            .catch(e => console.error(e));
    }, []);

    // ── Fast mode TTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!fastMode || allItems.length === 0) return;
        const card = allItems[fastModeIndex % allItems.length];

        const tgtWord = reversed ? buildSpanishUtt(card.spanish, true) : buildChineseUtt(card.chinese, true);
        const srcWord = reversed ? buildChineseUtt(card.chinese, true) : buildSpanishUtt(card.spanish, true);
        const tgtPhrase = reversed
            ? (card.spanishPhrase ? buildSpanishUtt(card.spanishPhrase, true) : null)
            : (card.chinesePhrase ? buildChineseUtt(card.chinesePhrase, true) : null);
        const srcPhrase = reversed
            ? (card.chinesePhrase ? buildChineseUtt(card.chinesePhrase, true) : null)
            : (card.spanishPhrase ? buildSpanishUtt(card.spanishPhrase, true) : null);

        const utterances = [tgtWord, srcWord, ...(tgtPhrase ? [tgtPhrase] : []), ...(srcPhrase ? [srcPhrase] : [])];

        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();

        const speakChain = (utts: SpeechSynthesisUtterance[]) => {
            if (utts.length === 0 || ttsGenRef.current !== gen) return;
            const [head, ...rest] = utts;
            head.onend = () => {
                if (ttsGenRef.current !== gen) return;
                setTimeout(() => speakChain(rest), 350);
            };
            window.speechSynthesis.speak(head);
        };

        speakChain(utterances);
        return () => window.speechSynthesis.cancel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fastMode, fastModeIndex, allItems.length, reversed]);

    useEffect(() => {
        if (!fastMode) window.speechSynthesis.cancel();
    }, [fastMode]);
    // ─────────────────────────────────────────────────────────────────────────

    const currentCard = session[0];

    const speakFront = (card: SessionItem) => {
        if (reversed) speakChinese(card.chinese, true);
        else speakSpanish(card.spanish, true);
    };

    const speakBack = (card: SessionItem) => {
        if (!readBack) return;
        window.speechSynthesis.cancel();
        if (reversed) {
            const wordUtt = buildSpanishUtt(card.spanish, true);
            if (card.spanishPhrase) {
                wordUtt.onend = () => setTimeout(() =>
                    window.speechSynthesis.speak(buildSpanishUtt(card.spanishPhrase!, true)), 450);
            }
            window.speechSynthesis.speak(wordUtt);
        } else {
            const wordUtt = buildChineseUtt(card.chinese, true);
            if (card.chinesePhrase) {
                wordUtt.onend = () => setTimeout(() =>
                    window.speechSynthesis.speak(buildChineseUtt(card.chinesePhrase!, true)), 450);
            }
            window.speechSynthesis.speak(wordUtt);
        }
    };

    const currentCardId = currentCard?.id;
    useEffect(() => {
        if (currentCard) speakFront(currentCard);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardId]);

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (currentCard) speakBack(currentCard);
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

    const title = reversed ? "Chinese → Spanish" : "Spanish → Chinese";

    const header = (
        <div className="srs-header">
            <button className="srs-back-link" onClick={() => navigate("/")}>← Home</button>
            <span className="srs-deck-name">{title}</span>
            <SRSSettings />
        </div>
    );

    const controls = (
        <div className="eszh-controls">
            <button className={`eszh-toggle ${!reversed ? "active" : ""}`} onClick={toggleReversed}>
                ES → 中文
            </button>
            <button className={`eszh-toggle ${reversed ? "active" : ""}`} onClick={toggleReversed}>
                中文 → ES
            </button>
            <button className={`eszh-toggle ${showEnglish ? "active" : ""}`} onClick={() => setShowEnglish(v => !v)}>
                EN hint
            </button>
        </div>
    );

    if (!loaded) return <div className="srs-container"><p>Loading...</p></div>;

    // ── Fast mode view ────────────────────────────────────────────────────────
    if (fastMode) {
        const total = allItems.length;
        const idx = fastModeIndex % Math.max(total, 1);
        const card = allItems[idx];
        const srcText = reversed ? card.chinese : card.spanish;
        const srcPin = reversed ? card.pinyin : undefined;
        const tgtText = reversed ? card.spanish : card.chinese;
        const tgtPin = reversed ? undefined : card.pinyin;
        const tgtPhrase = reversed ? card.spanishPhrase : card.chinesePhrase;
        const tgtPhrasePin = reversed ? undefined : card.chinesePhrasePin;
        return (
            <div className="srs-container">
                {header}
                {controls}
                <div className="srs-card-wrap">
                    <div className="srs-card srs-card-fast">
                        <div className="srs-card-text">{srcText}</div>
                        {srcPin && <div className="srs-romanized">{srcPin}</div>}
                        {showEnglish && <div className="eszh-en">{card.english}</div>}
                        <hr className="srs-divider" />
                        {tgtPin && <div className="srs-romanized">{tgtPin}</div>}
                        <div className="srs-card-text">{tgtText}</div>
                        {(tgtPhrase || tgtPhrasePin) && (
                            <div className="srs-fast-phrase-group">
                                {tgtPhrasePin && <div className="eszh-phrase-pin">{tgtPhrasePin}</div>}
                                {tgtPhrase && <div className="eszh-phrase">{tgtPhrase}</div>}
                            </div>
                        )}
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

    if (done || (loaded && session.length === 0 && reviewed > 0)) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
                    <p>Come back tomorrow to review cards that are due.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => navigate("/")}>
                            Back to Home
                        </button>
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
                        <button className="srs-btn-primary" onClick={() => navigate("/")}>
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const remaining = session.length;
    const preview = previewIntervals(currentCard.cardState);

    const frontText = reversed ? currentCard.chinese : currentCard.spanish;
    const frontPinyin = reversed ? currentCard.pinyin : undefined;
    const frontPhrase = reversed ? currentCard.chinesePhrase : currentCard.spanishPhrase;
    const frontPhrasePin = reversed ? currentCard.chinesePhrasePin : undefined;
    const backText = reversed ? currentCard.spanish : currentCard.chinese;
    const backPinyin = reversed ? undefined : currentCard.pinyin;
    const backPhrase = reversed ? currentCard.spanishPhrase : currentCard.chinesePhrase;
    const backPhrasePin = reversed ? undefined : currentCard.chinesePhrasePin;

    return (
        <div className="srs-container">
            {header}
            {controls}

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
                <div
                    className={`srs-card ${isFlipped ? "flipped" : ""}`}
                    onClick={!isFlipped ? flip : undefined}
                >
                    <div className="srs-card-front">
                        <div className="srs-card-text">{frontText}</div>
                        {frontPinyin && <div className="srs-romanized">{frontPinyin}</div>}
                        {frontPhrase && <div className="eszh-phrase">{frontPhrase}</div>}
                        {frontPhrasePin && <div className="eszh-phrase-pin">{frontPhrasePin}</div>}
                        {showEnglish && <div className="eszh-en">{currentCard.english}</div>}
                        {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                    </div>
                    <div className="srs-card-back">
                        <div className="srs-card-text front-dim">{frontText}</div>
                        {frontPinyin && <div className="srs-romanized" style={{ opacity: 0.4 }}>{frontPinyin}</div>}
                        {frontPhrase && <div className="eszh-phrase front-dim">{frontPhrase}</div>}
                        <div className="eszh-en eszh-en-dim">{currentCard.english}</div>
                        <hr className="srs-divider" />
                        <div className="srs-card-text">{backText}</div>
                        {backPinyin && <div className="srs-romanized">{backPinyin}</div>}
                        {backPhrase && <div className="eszh-phrase">{backPhrase}</div>}
                        {backPhrasePin && <div className="eszh-phrase-pin">{backPhrasePin}</div>}
                    </div>
                </div>
                {isFlipped && currentCard.grammarNote && (
                    <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className="srs-grammar-note-toggle"
                            onClick={() => setNoteOpen(o => !o)}
                        >
                            Grammar note {noteOpen ? "▴" : "▾"}
                        </button>
                        {noteOpen && (
                            <div className="srs-grammar-note-body">{currentCard.grammarNote}</div>
                        )}
                    </div>
                )}
            </div>

            {isFlipped ? (
                <div className="srs-rating-row">
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
