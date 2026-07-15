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
    "software_development",
    "sports",
    "night_life",
    "dungeons_and_dragons",
    "core_2000",
];

const packSelectionKey = (language: string) => `pack_selection_${language}`;

const prefetchUnifiedReview = () => { void import('../UnifiedReview'); };
const prefetchBrowse = () => { void import('../Browse'); };
const prefetchStories = () => { void import('../StoryList'); };
const prefetchPictures = () => { void import('../PictureList'); };
const prefetchGrammar = () => { void import('../AllGrammarList'); };
const prefetchBookmarks = () => { void import('../Bookmarks'); };

const Home = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const [deckMetas, setDeckMetas] = useState<DeckMeta[]>([]);
    const [showPrint, setShowPrint] = useState(false);
    const [printSelectedDecks, setPrintSelectedDecks] = useState<Set<string>>(new Set());
    const [studyPacks, setStudyPacks] = useState<Set<string>>(new Set());
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
            setPrintSelectedDecks(new Set(metas.map(d => d.id)));

            // Load persisted study pack selection, defaulting to all packs
            const raw = localStorage.getItem(packSelectionKey(language));
            if (raw) {
                try {
                    const saved = JSON.parse(raw) as string[];
                    const validIds = new Set(metas.map(d => d.id));
                    setStudyPacks(new Set(saved.filter(id => validIds.has(id))));
                    return;
                } catch { /* fall through to default */ }
            }
            setStudyPacks(new Set(metas.map(d => d.id)));
        });
    }, [language]);

    const toggleStudyPack = (deckId: string) => {
        if (!language) return;
        setStudyPacks(prev => {
            const next = new Set(prev);
            if (next.has(deckId)) next.delete(deckId);
            else next.add(deckId);
            localStorage.setItem(packSelectionKey(language), JSON.stringify([...next]));
            return next;
        });
    };

    const togglePrintDeck = (deckId: string) => {
        setPrintSelectedDecks(prev => {
            const next = new Set(prev);
            if (next.has(deckId)) next.delete(deckId);
            else next.add(deckId);
            return next;
        });
    };

    const handlePrint = () => {
        const cards: PrintCard[] = deckMetas
            .filter(d => printSelectedDecks.has(d.id))
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

    const printCardCount = deckMetas
        .filter(d => printSelectedDecks.has(d.id))
        .reduce((n, d) => {
            const visible = d.cards.filter(c => !c.hidden);
            return n + (printMode === 'words' ? visible.length : visible.filter(c => c.phrase).length);
        }, 0);

    const hasRomanized = deckMetas
        .filter(d => printSelectedDecks.has(d.id))
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
    const hasStories = deckMetas.some(d => d.stories && d.stories.length > 0);
    const hasGrammar = deckMetas.some(d => d.grammarLessons && d.grammarLessons.length > 0);

    // Compute combined due/new across selected study packs
    const combinedCounts = deckEntries
        .filter(({ deck }) => studyPacks.has(deck.id))
        .reduce(
            (acc, { deck, state }) => {
                const s = getDeckSummary(deck.cards, state);
                return {
                    due: acc.due + s.dueCount + s.learnCount,
                    newCount: acc.newCount + s.newCount,
                };
            },
            { due: 0, newCount: 0 }
        );
    const combinedTotal = combinedCounts.due + combinedCounts.newCount;

    const handleStudyCombined = () => {
        if (!language) return;
        localStorage.setItem(packSelectionKey(language), JSON.stringify([...studyPacks]));
        navigate(`/${language}/deck`);
    };

    return (
        <>
        <div className="srs-container">
            <div className="srs-home-header">
                <div className="srs-header-row">
                    <h2 style={{ textTransform: "capitalize" }}>{language} Course</h2>
                    <InfoTip>
                        <p><strong>New / Learning / Due</strong> — how many cards at each stage are ready to review today.</p>
                        <p>Toggle the switch on each pack to include or exclude it from your study session.</p>
                        <p><strong>Browse</strong> — see all cards, hide ones you already know, and bookmark favorites.</p>
                    </InfoTip>
                </div>
            </div>

            <div className="srs-pack-list-card">
                {deckEntries.map(({ deck }) => {
                    const included = studyPacks.has(deck.id);

                    return (
                        <div key={deck.id} className={`srs-pack-row${included ? '' : ' srs-deck-excluded'}`}>
                            <input
                                type="checkbox"
                                className="srs-pack-toggle"
                                checked={included}
                                onChange={() => toggleStudyPack(deck.id)}
                                title={included ? 'Remove from study session' : 'Add to study session'}
                            />
                            <span className="srs-pack-row-name">
                                {deck.name} <span className="srs-pack-row-count">({deck.cards.filter(c => !c.hidden).length})</span>
                            </span>
                            <button
                                className="srs-btn-reset"
                                onClick={() => navigate(`/${language}/${deck.id}/browse?filter=all`)}
                                onMouseEnter={prefetchBrowse}
                            >
                                Browse
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="srs-deck-card srs-experimental-card">
                <div className="srs-experimental-label">Experimental</div>
                <div className="srs-utility-row">
                    {hasStories && (
                        <button
                            className="srs-btn-stories"
                            onClick={() => navigate(`/${language}/stories`)}
                            onMouseEnter={prefetchStories}
                        >
                            Stories
                        </button>
                    )}
                    {hasGrammar && (
                        <button
                            className="srs-btn-grammar"
                            onClick={() => navigate(`/${language}/grammar`)}
                            onMouseEnter={prefetchGrammar}
                        >
                            Grammar
                        </button>
                    )}
                    {hasPictures && (
                        <button
                            className="srs-btn-secondary srs-btn-utility"
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
                        className="srs-btn-secondary srs-btn-utility"
                        onClick={() => setShowPrint(p => !p)}
                    >
                        Print Flashcards
                    </button>
                </div>
            </div>

            {showPrint && (
                    <div className="srs-print-panel">
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
                                className={`srs-print-mode-btn${printSize === 'medium' ? ' active' : ''}`}
                                onClick={() => setPrintSize('medium')}
                            >
                                Medium
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
                                        checked={printSelectedDecks.has(d.id)}
                                        onChange={() => togglePrintDeck(d.id)}
                                    />
                                    {d.name}
                                </label>
                            ))}
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

        <div className="srs-study-bar">
            <button
                className="srs-btn-combined"
                disabled={combinedTotal === 0 || studyPacks.size === 0}
                onClick={handleStudyCombined}
                onMouseEnter={prefetchUnifiedReview}
            >
                Study Combined Deck
                {studyPacks.size > 0 && (
                    <span className="srs-btn-combined-counts">
                        {combinedTotal > 0
                            ? `· ${combinedCounts.due > 0 ? `${combinedCounts.due} due` : ''}${combinedCounts.due > 0 && combinedCounts.newCount > 0 ? ', ' : ''}${combinedCounts.newCount > 0 ? `${combinedCounts.newCount} new` : ''}`
                            : '· up to date'}
                    </span>
                )}
            </button>
        </div>
        </>
    );
};

export default Home;
