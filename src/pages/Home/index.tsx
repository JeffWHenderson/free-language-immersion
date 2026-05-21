import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { loadDeckState, getDeckSummary, getBookmarkedCount, loadStoryBookmarks } from "../useStorage";
import PageSkeleton from "../../components/PageSkeleton";
import InfoTip from "../../components/InfoTip";
import { buildPrintableFlashcards, PrintCard, PrintSize } from "../../hooks/print";
import "../srs.css";

interface GrammarLessonMeta {
    id: string;
    name: string;
}

interface DeckCard {
    id: string;
    hidden?: boolean;
    english: string;
    word: string;
    romanized?: string;
    phrase?: string;
    phraseRomanized?: string;
    englishPhrase?: string;
    levels: unknown[];
}

interface DeckMeta {
    id: string;
    name: string;
    language: string;
    stories?: string[];
    pictureLessons?: string[];
    grammarLessons?: GrammarLessonMeta[];
    cards: DeckCard[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const prefetchReview    = () => { void import('../Review'); };
const prefetchBrowse    = () => { void import('../Browse'); };
const prefetchStories   = () => { void import('../StoryList'); };
const prefetchPictures  = () => { void import('../PictureList'); };
const prefetchGrammar   = () => { void import('../GrammarList'); };
const prefetchBookmarks = () => { void import('../Bookmarks'); };

const Home = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const [deckMetas, setDeckMetas] = useState<DeckMeta[]>([]);
    const [core2000Meta, setCore2000Meta] = useState<DeckMeta | null>(null);
    const [showPrint, setShowPrint] = useState(false);
    const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
    const [printMode, setPrintMode] = useState<'words' | 'phrases'>('words');
    const [printSize, setPrintSize] = useState<PrintSize>('large');
    const [printRomanized, setPrintRomanized] = useState(true);

    useEffect(() => {
        if (!language) return;
        Promise.all(
            AVAILABLE_DECKS.map((deckId) =>
                fetch(`/languages/${language}/${deckId}/index.json`)
                    .then((r) => r.json() as Promise<DeckMeta>)
                    .catch(() => null)
            )
        ).then((results) => {
            const metas = results.filter(Boolean) as DeckMeta[];
            setDeckMetas(metas);
            setSelectedDecks(new Set(metas.map(d => d.id)));
        });
    }, [language]);

    useEffect(() => {
        if (!language) return;
        fetch(`/languages/${language}/core_2000/index.json`)
            .then(r => r.json() as Promise<DeckMeta>)
            .catch(() => null)
            .then(meta => setCore2000Meta(meta));
    }, [language]);

    const toggleDeck = (deckId: string) => {
        setSelectedDecks(prev => {
            const next = new Set(prev);
            if (next.has(deckId)) next.delete(deckId);
            else next.add(deckId);
            return next;
        });
    };

    const allPrintDecks = core2000Meta ? [...deckMetas, core2000Meta] : deckMetas;

    const handlePrint = () => {
        const cards: PrintCard[] = allPrintDecks
            .filter(d => selectedDecks.has(d.id))
            .flatMap(d => d.cards.filter(c => !c.hidden).flatMap(c => {
                if (printMode === 'words') {
                    return [{ id: c.id, english: c.english, word: c.word, romanized: c.romanized }];
                }
                if (!c.phrase) return [];
                return [{ id: c.id, english: c.englishPhrase ?? c.english, word: c.phrase, romanized: c.phraseRomanized }];
            }));
        if (cards.length === 0) return;
        buildPrintableFlashcards(cards, `${language} Flashcards`, printSize, printRomanized);
    };

    const printCardCount = allPrintDecks
        .filter(d => selectedDecks.has(d.id))
        .reduce((n, d) => {
            const visible = d.cards.filter(c => !c.hidden);
            return n + (printMode === 'words' ? visible.length : visible.filter(c => c.phrase).length);
        }, 0);

    const hasRomanized = allPrintDecks
        .filter(d => selectedDecks.has(d.id))
        .some(d => d.cards.some(c =>
            printMode === 'words' ? !!c.romanized : !!c.phraseRomanized
        ));

    if (deckMetas.length === 0) return <PageSkeleton />;

    const deckEntries = deckMetas.map(deck => {
        const state = loadDeckState(language!, deck.id);
        return { deck, state };
    });
    const totalBookmarks = deckEntries.reduce((sum, { deck, state }) =>
        sum + getBookmarkedCount(deck.cards, state), 0)
        + loadStoryBookmarks(language!).length;
    const hasPictures = deckMetas.some(d => d.pictureLessons && d.pictureLessons.length > 0);

    const core2000State = core2000Meta ? loadDeckState(language!, core2000Meta.id) : null;
    const core2000Summary = core2000Meta && core2000State ? getDeckSummary(core2000Meta.cards, core2000State) : null;
    const core2000Due = core2000Summary ? core2000Summary.newCount + core2000Summary.dueCount + core2000Summary.learnCount : 0;

    return (
        <div className="srs-container">
            <div className="srs-home-header">
                <div className="srs-header-row">
                    <h2 style={{ textTransform: "capitalize" }}>{language} Course</h2>
                    <InfoTip>
                        <p><strong>New / Learning / Due</strong> — how many cards at each stage are ready to review today.</p>
                        <p><strong>Study</strong> — start a spaced repetition session for due cards.</p>
                        <p><strong>Browse</strong> — see all cards, hide ones you already know, and bookmark favorites.</p>
                        <p><strong>Stories</strong> — short reading passages using the deck's vocabulary.</p>
                        <p><strong>Grammar</strong> — lessons and drills covering key patterns.</p>
                    </InfoTip>
                </div>
            </div>

            <div className="srs-deck-list">
                {deckEntries.map(({ deck, state }) => {
                    const summary = getDeckSummary(deck.cards, state);
                    const totalDue = summary.newCount + summary.dueCount + summary.learnCount;

                    return (
                        <div key={deck.id} className="srs-deck-card">
                            <div className="srs-deck-top">
                                <div className="srs-deck-top-left">
                                    <div className="srs-deck-title">{deck.name}</div>
                                    <div className="srs-deck-counts">
                                        <span className="srs-count new">{summary.newCount} new</span>
                                        <span className="srs-count learn">{summary.learnCount} learning</span>
                                        <span className="srs-count review">{summary.dueCount} due</span>
                                    </div>
                                </div>
                                <button
                                    className="srs-btn-reset"
                                    onClick={() => navigate(`/${language}/${deck.id}/browse?filter=all`)}
                                    onMouseEnter={prefetchBrowse}
                                >
                                    Browse
                                </button>
                            </div>

                            <div className="srs-deck-bottom">
                                <button
                                    className="srs-btn-primary"
                                    disabled={totalDue === 0}
                                    onClick={() => navigate(`/${language}/${deck.id}`)}
                                    onMouseEnter={prefetchReview}
                                >
                                    {totalDue > 0 ? `Study (${totalDue})` : "Up to date"}
                                </button>
                                {deck.stories && deck.stories.length > 0 && (
                                    <button
                                        className="srs-btn-stories"
                                        onClick={() => navigate(`/${language}/stories?deck=${deck.id}`)}
                                        onMouseEnter={prefetchStories}
                                    >
                                        Stories
                                    </button>
                                )}
                                {deck.grammarLessons && deck.grammarLessons.length > 0 && (
                                    <button
                                        className="srs-btn-grammar"
                                        onClick={() => navigate(`/${language}/${deck.id}/grammar`)}
                                        onMouseEnter={prefetchGrammar}
                                    >
                                        Grammar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="srs-deck-card srs-experimental-card">
                <div className="srs-experimental-label">Experimental</div>

                {core2000Meta && (
                    <div className="srs-deck-bottom">
                        <button
                            className="srs-btn-primary"
                            disabled={core2000Due === 0}
                            onClick={() => navigate(`/${language}/${core2000Meta.id}`)}
                            onMouseEnter={prefetchReview}
                        >
                            Core 2000
                        </button>
                    </div>
                )}

                <div className="srs-deck-bottom" style={{ marginTop: core2000Meta ? '12px' : undefined }}>
                    {hasPictures && (
                        <button
                            className="srs-btn-secondary"
                            onClick={() => navigate(`/${language}/pictures`)}
                            onMouseEnter={prefetchPictures}
                        >
                            Picture Lessons
                        </button>
                    )}
                    {totalBookmarks > 0 && (
                        <button
                            className="srs-btn-bookmarks"
                            onClick={() => navigate(`/${language}/bookmarks`)}
                            onMouseEnter={prefetchBookmarks}
                        >
                            🔖 Bookmarks ({totalBookmarks})
                        </button>
                    )}
                    <button
                        className="srs-btn-secondary"
                        onClick={() => setShowPrint(p => !p)}
                    >
                        Print Flashcards
                    </button>
                </div>

                {showPrint && (
                    <div className="srs-print-options">
                        <div className="srs-print-mode">
                            <button
                                className={`srs-print-mode-btn${printMode === 'words' ? ' active' : ''}`}
                                onClick={() => setPrintMode('words')}
                            >
                                Words
                            </button>
                            <button
                                className={`srs-print-mode-btn${printMode === 'phrases' ? ' active' : ''}`}
                                onClick={() => setPrintMode('phrases')}
                            >
                                Phrases
                            </button>
                        </div>
                        <div className="srs-print-mode">
                            <button
                                className={`srs-print-mode-btn${printSize === 'large' ? ' active' : ''}`}
                                onClick={() => setPrintSize('large')}
                            >
                                Large
                            </button>
                            <button
                                className={`srs-print-mode-btn${printSize === 'small' ? ' active' : ''}`}
                                onClick={() => setPrintSize('small')}
                            >
                                Small
                            </button>
                        </div>
                        {hasRomanized && (
                            <div className="srs-print-mode">
                                <button
                                    className={`srs-print-mode-btn${printRomanized ? ' active' : ''}`}
                                    onClick={() => setPrintRomanized(true)}
                                >
                                    Romanized
                                </button>
                                <button
                                    className={`srs-print-mode-btn${!printRomanized ? ' active' : ''}`}
                                    onClick={() => setPrintRomanized(false)}
                                >
                                    Script only
                                </button>
                            </div>
                        )}
                        <div className="srs-print-decks">
                            {deckMetas.map(d => (
                                <label key={d.id} className="srs-print-deck-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedDecks.has(d.id)}
                                        onChange={() => toggleDeck(d.id)}
                                    />
                                    {d.name}
                                </label>
                            ))}
                            {core2000Meta && (
                                <label className="srs-print-deck-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedDecks.has(core2000Meta.id)}
                                        onChange={() => toggleDeck(core2000Meta.id)}
                                    />
                                    {core2000Meta.name}
                                </label>
                            )}
                        </div>
                        <button
                            className="srs-btn-primary"
                            disabled={printCardCount === 0}
                            onClick={handlePrint}
                        >
                            Print ({printCardCount} cards)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
