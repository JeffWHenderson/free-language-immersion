import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useDecks, Pack } from "../../hooks/useDecks";
import { loadDeckState, getDeckSummary, getBookmarkedCount, loadStoryBookmarks, isCardHidden } from "../useStorage";
import PageSkeleton from "../../components/PageSkeleton";
import InfoTip from "../../components/InfoTip";
import PackDrawer from "./PackDrawer";
import { buildPrintableFlashcards, PrintCard, PrintSize } from "../../hooks/print";
import "../srs.css";

const packSelectionKey = (language: string) => `pack_selection_${language}`;

const prefetchUnifiedReview = () => { void import('../UnifiedReview'); };
const prefetchBrowse = () => { void import('../Browse'); };
const prefetchStories = () => { void import('../StoryList'); };
const prefetchPictures = () => { void import('../PictureList'); };
const prefetchGrammar = () => { void import('../AllGrammarList'); };
const prefetchBookmarks = () => { void import('../Bookmarks'); };

function visibleCount(pack: Pack, deckState: ReturnType<typeof loadDeckState>): number {
    return pack.cards.filter((c) => !isCardHidden(c, deckState)).length;
}

const Home = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const { packs, loading } = useDecks(language);

    const [studyPacks, setStudyPacks] = useState<Set<string>>(new Set());
    const [drawerPack, setDrawerPack] = useState<Pack | null>(null);
    const [showPrint, setShowPrint] = useState(false);
    const [printSelectedDecks, setPrintSelectedDecks] = useState<Set<string>>(new Set());
    const [printMode, setPrintMode] = useState<'words' | 'phrases'>('words');
    const [printSize, setPrintSize] = useState<PrintSize>('large');
    const [printRomanized, setPrintRomanized] = useState(true);

    // Restore pack selection from localStorage once packs are loaded
    useEffect(() => {
        if (!language || packs.length === 0) return;
        const cardPacks = packs.filter((p) => p.cards.length > 0);
        const raw = localStorage.getItem(packSelectionKey(language));
        if (raw) {
            try {
                const saved = JSON.parse(raw) as string[];
                const validIds = new Set(packs.map((p) => p.id));
                const restored = new Set(saved.filter((id) => validIds.has(id)));
                if (restored.size > 0) {
                    setStudyPacks(restored);
                    setPrintSelectedDecks(new Set(cardPacks.map((p) => p.id)));
                    return;
                }
            } catch { /* fall through */ }
        }
        setStudyPacks(new Set(cardPacks.map((p) => p.id)));
        setPrintSelectedDecks(new Set(cardPacks.map((p) => p.id)));
    }, [language, packs]);

    const toggleStudyPack = (packId: string) => {
        if (!language) return;
        setStudyPacks((prev) => {
            const next = new Set(prev);
            if (next.has(packId)) next.delete(packId);
            else next.add(packId);
            localStorage.setItem(packSelectionKey(language), JSON.stringify([...next]));
            return next;
        });
    };

    const togglePrintDeck = (packId: string) => {
        setPrintSelectedDecks((prev) => {
            const next = new Set(prev);
            if (next.has(packId)) next.delete(packId);
            else next.add(packId);
            return next;
        });
    };

    const handlePrint = () => {
        const cards: PrintCard[] = packs
            .filter((p) => printSelectedDecks.has(p.id))
            .flatMap((p) => {
                const state = loadDeckState(language!, p.id);
                return p.cards.filter((c) => !isCardHidden(c, state)).flatMap((c) => {
                    if (printMode === 'words') {
                        return [{ id: c.id, english: c.english, word: c.word, romanized: c.romanized }];
                    }
                    if (!c.phrase) return [];
                    return [{ id: c.id, english: c.englishPhrase ?? c.english, word: c.phrase, romanized: c.phraseRomanized }];
                });
            });
        if (cards.length === 0) return;
        buildPrintableFlashcards(cards, `${language} Flashcards`, printSize, printRomanized);
    };

    if (loading) return <PageSkeleton />;

    // Only packs with cards appear as pills (cross_section has 0 cards)
    const pillPacks = packs.filter((p) => p.cards.length > 0);

    const deckEntries = pillPacks.map((pack) => {
        const state = loadDeckState(language!, pack.id);
        return { pack, state };
    });

    const totalBookmarks = deckEntries.reduce((sum, { pack, state }) =>
        sum + getBookmarkedCount(pack.cards, state), 0)
        + loadStoryBookmarks(language!).length;

    const hasPictures = packs.some((p) => (p.pictureLessons?.length ?? 0) > 0);
    const hasStories = packs.some((p) => (p.stories?.length ?? 0) > 0);
    const hasGrammar = packs.some((p) => (p.grammarLessons?.length ?? 0) > 0);

    const combinedCounts = deckEntries
        .filter(({ pack }) => studyPacks.has(pack.id))
        .reduce(
            (acc, { pack, state }) => {
                const visible = pack.cards.filter((c) => !isCardHidden(c, state));
                const s = getDeckSummary(visible, state);
                return { due: acc.due + s.dueCount + s.learnCount, newCount: acc.newCount + s.newCount };
            },
            { due: 0, newCount: 0 }
        );
    const combinedTotal = combinedCounts.due + combinedCounts.newCount;

    const printCardCount = packs
        .filter((p) => printSelectedDecks.has(p.id))
        .reduce((n, p) => {
            const state = loadDeckState(language!, p.id);
            const visible = p.cards.filter((c) => !isCardHidden(c, state));
            return n + (printMode === 'words' ? visible.length : visible.filter((c) => c.phrase).length);
        }, 0);

    const hasRomanized = packs
        .filter((p) => printSelectedDecks.has(p.id))
        .some((p) => {
            const state = loadDeckState(language!, p.id);
            const visible = p.cards.filter((c) => !isCardHidden(c, state));
            return visible.some((c) => printMode === 'words' ? !!c.romanized : !!c.phraseRomanized);
        });

    return (
        <>
            <div className="srs-container">
                <div className="srs-home-header">
                    <div className="srs-header-row">
                        <h2 style={{ textTransform: "capitalize" }}>{language} Course</h2>
                        <InfoTip>
                            <p>Tap a pack to include or exclude it from your study session.</p>
                            <p>Tap <strong>›</strong> on a pack to browse its cards, stories, and grammar.</p>
                        </InfoTip>
                    </div>
                </div>

                <div className="srs-pill-grid">
                    {pillPacks.map((pack) => {
                        const state = loadDeckState(language!, pack.id);
                        const count = visibleCount(pack, state);
                        const active = studyPacks.has(pack.id);
                        return (
                            <div
                                key={pack.id}
                                className={`srs-pill${active ? ' active' : ' inactive'}`}
                            >
                                <span
                                    className="srs-pill-body"
                                    onClick={() => toggleStudyPack(pack.id)}
                                    role="checkbox"
                                    aria-checked={active}
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === ' ' && toggleStudyPack(pack.id)}
                                >
                                    {pack.name}
                                    <span className="srs-pill-count">{count}</span>
                                </span>
                                <button
                                    className="srs-pill-info"
                                    onClick={() => setDrawerPack(pack)}
                                    aria-label={`Details for ${pack.name}`}
                                >
                                    ›
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="srs-util-row">
                    {hasStories && (
                        <button className="srs-btn-util" onClick={() => navigate(`/${language}/stories`)} onMouseEnter={prefetchStories}>
                            Stories
                        </button>
                    )}
                    {hasGrammar && (
                        <button className="srs-btn-util" onClick={() => navigate(`/${language}/grammar`)} onMouseEnter={prefetchGrammar}>
                            Grammar
                        </button>
                    )}
                    {hasPictures && (
                        <button className="srs-btn-util" onClick={() => navigate(`/${language}/pictures`)} onMouseEnter={prefetchPictures}>
                            Picture Lessons
                        </button>
                    )}
                    {totalBookmarks > 0 && (
                        <button className="srs-btn-util" onClick={() => navigate(`/${language}/bookmarks`)} onMouseEnter={prefetchBookmarks}>
                            🔖 Bookmarks ({totalBookmarks})
                        </button>
                    )}
                    <button className="srs-btn-util" onClick={() => setShowPrint((p) => !p)}>
                        Print Flashcards
                    </button>
                </div>

                {showPrint && (
                    <div className="srs-print-panel">
                        <div className="srs-print-mode">
                            <button className={`srs-print-mode-btn${printMode === 'words' ? ' active' : ''}`} onClick={() => setPrintMode('words')}>Words</button>
                            <button className={`srs-print-mode-btn${printMode === 'phrases' ? ' active' : ''}`} onClick={() => setPrintMode('phrases')}>Phrases</button>
                        </div>
                        <div className="srs-print-mode">
                            <button className={`srs-print-mode-btn${printSize === 'large' ? ' active' : ''}`} onClick={() => setPrintSize('large')}>Large</button>
                            <button className={`srs-print-mode-btn${printSize === 'medium' ? ' active' : ''}`} onClick={() => setPrintSize('medium')}>Medium</button>
                            <button className={`srs-print-mode-btn${printSize === 'small' ? ' active' : ''}`} onClick={() => setPrintSize('small')}>Small</button>
                        </div>
                        {hasRomanized && (
                            <div className="srs-print-mode">
                                <button className={`srs-print-mode-btn${printRomanized ? ' active' : ''}`} onClick={() => setPrintRomanized(true)}>Romanized</button>
                                <button className={`srs-print-mode-btn${!printRomanized ? ' active' : ''}`} onClick={() => setPrintRomanized(false)}>Script only</button>
                            </div>
                        )}
                        <div className="srs-print-decks">
                            {pillPacks.map((p) => (
                                <label key={p.id} className="srs-print-deck-label">
                                    <input type="checkbox" checked={printSelectedDecks.has(p.id)} onChange={() => togglePrintDeck(p.id)} />
                                    {p.name}
                                </label>
                            ))}
                        </div>
                        <button className="srs-btn-primary" disabled={printCardCount === 0} onClick={handlePrint}>
                            Print ({printCardCount} cards)
                        </button>
                    </div>
                )}
            </div>

            <div className="srs-study-bar">
                <button
                    className="srs-btn-combined"
                    disabled={combinedTotal === 0 || studyPacks.size === 0}
                    onClick={() => {
                        if (!language) return;
                        localStorage.setItem(packSelectionKey(language), JSON.stringify([...studyPacks]));
                        navigate(`/${language}/deck`);
                    }}
                    onMouseEnter={prefetchUnifiedReview}
                    style={{ maxWidth: 500 }}
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

            {drawerPack && (
                <PackDrawer
                    pack={drawerPack}
                    language={language!}
                    included={studyPacks.has(drawerPack.id)}
                    onToggle={() => toggleStudyPack(drawerPack.id)}
                    onClose={() => setDrawerPack(null)}
                    navigate={navigate}
                />
            )}
        </>
    );
};

export default Home;
