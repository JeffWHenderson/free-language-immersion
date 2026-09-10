import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useDecks, Pack } from "../../hooks/useDecks";
import { loadDeckState, getDeckSummary, getDeckProgress, getBookmarkedCount, loadStoryBookmarks, isCardHidden } from "../useStorage";
import PageSkeleton from "../../components/PageSkeleton";
import InfoTip from "../../components/InfoTip";
import PackDrawer from "./PackDrawer";
import { buildPrintableFlashcards, PrintCard, PrintSize } from "../../hooks/print";
import "../srs.css";

const packSelectionKey = (language: string) => `pack_selection_${language}`;

const prefetchUnifiedReview = () => { void import('../UnifiedReview'); };
const prefetchStories = () => { void import('../StoryList'); };
const prefetchPictures = () => { void import('../PictureList'); };
const prefetchGrammar = () => { void import('../AllGrammarList'); };
const prefetchBookmarks = () => { void import('../Bookmarks'); };

/** A topic groups a section's split parts (or a single unsplit pack) into one home row. */
interface TopicGroup {
    key: string;
    name: string;
    parts: Pack[];
}

// Group packs by parent section, preserving first-seen order; sort parts within a topic.
function groupByTopic(packs: Pack[]): TopicGroup[] {
    const groups = new Map<string, TopicGroup>();
    for (const p of packs) {
        const key = p.parent ?? p.id;
        let g = groups.get(key);
        if (!g) {
            g = { key, name: p.parentName ?? p.name, parts: [] };
            groups.set(key, g);
        }
        g.parts.push(p);
    }
    for (const g of groups.values()) g.parts.sort((a, b) => (a.part ?? 1) - (b.part ?? 1));
    return [...groups.values()];
}

const Home = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const { packs, loading } = useDecks(language);

    const [studyPacks, setStudyPacks] = useState<Set<string>>(new Set());
    const [drawerParts, setDrawerParts] = useState<Pack[] | null>(null);
    const [extensionOpen, setExtensionOpen] = useState(false);
    const [grammarOpen, setGrammarOpen] = useState(false);
    const [experimentalOpen, setExperimentalOpen] = useState(false);
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
        // First-time default: only the core (main) topics are on. Extension and grammar
        // packs are opt-in; split topics start with Part 1 only (the starter).
        setStudyPacks(new Set(
            cardPacks
                .filter((p) => p.category === "main" && (p.part ?? 1) === 1)
                .map((p) => p.id)
        ));
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

    // Pill tap = include/exclude the whole topic. Turning on adds just Part 1 (the starter);
    // finer part control lives in the drawer.
    const toggleTopic = (group: TopicGroup) => {
        if (!language) return;
        setStudyPacks((prev) => {
            const next = new Set(prev);
            const anyOn = group.parts.some((p) => next.has(p.id));
            if (anyOn) group.parts.forEach((p) => next.delete(p.id));
            else next.add(group.parts[0].id);
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

    // Only packs with cards appear as pills (cross_section has 0 cards). Each pack's
    // category (from the file it loaded from) decides which home section it lands in:
    // core decks stay top-level; extension and grammar each get a collapsible section.
    const pillPacks = packs.filter((p) => p.cards.length > 0);
    // Printable flashcards only cover main + extension decks — grammar decks are excluded.
    const printablePacks = pillPacks.filter((p) => p.category !== "grammar");
    const mainTopics = groupByTopic(pillPacks.filter((p) => p.category === "main"));
    const extensionTopics = groupByTopic(pillPacks.filter((p) => p.category === "extension"));
    const grammarTopics = groupByTopic(pillPacks.filter((p) => p.category === "grammar"));
    const extensionSelected = extensionTopics.filter((g) => g.parts.some((p) => studyPacks.has(p.id))).length;
    const grammarSelected = grammarTopics.filter((g) => g.parts.some((p) => studyPacks.has(p.id))).length;

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

    const renderTopicRow = (group: TopicGroup) => {
        const isGrammar = group.parts[0].category === "grammar";
        const multi = group.parts.length > 1;
        let included = 0;
        let total = 0;
        let learned = 0;
        for (const p of group.parts) {
            const state = loadDeckState(language!, p.id);
            const visible = p.cards.filter((c) => !isCardHidden(c, state));
            total += visible.length;
            if (studyPacks.has(p.id)) included += visible.length;
            learned += getDeckProgress(visible, state).learned;
        }
        const active = group.parts.some((p) => studyPacks.has(p.id));
        const progressPct = total > 0 ? Math.round((learned / total) * 100) : 0;
        const countText = multi ? `${included}/${total} words` : `${total} words`;
        return (
            <div
                key={group.key}
                className={`srs-topic-row${isGrammar ? ' grammar' : ''}${active ? '' : ' inactive'}`}
            >
                <button
                    className="srs-topic-row-body"
                    onClick={() => setDrawerParts(group.parts)}
                    aria-label={`Details for ${group.name}`}
                >
                    <span className="srs-topic-row-name">{group.name}</span>
                    <span className="srs-topic-row-count">{countText}</span>
                    <span className="srs-topic-row-chevron">›</span>
                </button>
                <input
                    type="checkbox"
                    className="srs-pack-toggle"
                    checked={active}
                    onChange={() => toggleTopic(group)}
                    aria-label={active ? `Remove ${group.name} from study` : `Add ${group.name} to study`}
                />
                {progressPct > 0 && (
                    <div className="srs-topic-row-progress">
                        <div className="srs-topic-row-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                )}
            </div>
        );
    };

    // Extension decks render as compact toggle pills (tap = include/exclude from study).
    const renderExtensionPill = (group: TopicGroup) => {
        const isGrammar = group.parts[0].category === "grammar";
        const active = group.parts.some((p) => studyPacks.has(p.id));
        return (
            <button
                key={group.key}
                className={`srs-pill${isGrammar ? ' grammar' : ''}${active ? ' active' : ''}`}
                onClick={() => toggleTopic(group)}
                aria-pressed={active}
            >
                {group.name}
            </button>
        );
    };

    return (
        <>
            <div className="srs-container">
                <div className="srs-topic-list">
                    <div className="srs-course-heading">
                        <h2 className="srs-course-title" style={{ textTransform: "capitalize" }}>{language} Introduction</h2>
                        <InfoTip>
                            <p>Flip the switch on a topic to include or exclude it from your study session.</p>
                            <p>Tap a topic's name to browse its cards, stories, and grammar.</p>
                        </InfoTip>
                    </div>
                    {mainTopics.map(renderTopicRow)}
                </div>

                {grammarTopics.length > 0 && (
                    <div className="srs-extensions">
                        <button
                            className="srs-topic-section-header srs-extensions-header"
                            onClick={() => setGrammarOpen((o) => !o)}
                            aria-expanded={grammarOpen}
                        >
                            <span className={`srs-section-chevron${grammarOpen ? ' open' : ''}`}>›</span>
                            Grammar Decks
                            <span className="srs-section-meta">
                                {grammarSelected > 0
                                    ? `${grammarSelected} of ${grammarTopics.length} selected`
                                    : `${grammarTopics.length}`}
                            </span>
                        </button>
                        {grammarOpen && (
                            <div className="srs-pill-cloud">
                                {grammarTopics.map(renderExtensionPill)}
                            </div>
                        )}
                    </div>
                )}

                {extensionTopics.length > 0 && (
                    <div className="srs-extensions">
                        <button
                            className="srs-topic-section-header srs-extensions-header"
                            onClick={() => setExtensionOpen((o) => !o)}
                            aria-expanded={extensionOpen}
                        >
                            <span className={`srs-section-chevron${extensionOpen ? ' open' : ''}`}>›</span>
                            Extension Decks
                            <span className="srs-section-meta">
                                {extensionSelected > 0
                                    ? `${extensionSelected} of ${extensionTopics.length} selected`
                                    : `${extensionTopics.length}`}
                            </span>
                        </button>
                        {extensionOpen && (
                            <div className="srs-pill-cloud">
                                {extensionTopics.map(renderExtensionPill)}
                            </div>
                        )}
                    </div>
                )}

                <div className="srs-extensions srs-experimental">
                    <button
                        className="srs-topic-section-header srs-extensions-header"
                        onClick={() => setExperimentalOpen((o) => !o)}
                        aria-expanded={experimentalOpen}
                    >
                        <span className={`srs-section-chevron${experimentalOpen ? ' open' : ''}`}>›</span>
                        Experimental Features
                        <span className="srs-section-meta">
                            {1 + (hasStories ? 1 : 0) + (hasPictures ? 1 : 0) + (hasGrammar ? 1 : 0)}
                        </span>
                    </button>
                    {experimentalOpen && (
                        <div className="srs-pill-cloud">
                            {hasStories && (
                                <button className="srs-pill" onClick={() => navigate(`/${language}/stories`)} onMouseEnter={prefetchStories}>
                                    Stories
                                </button>
                            )}
                            {hasPictures && (
                                <button className="srs-pill" onClick={() => navigate(`/${language}/pictures`)} onMouseEnter={prefetchPictures}>
                                    Picture Lessons
                                </button>
                            )}
                            {hasGrammar && (
                                <button className="srs-pill" onClick={() => navigate(`/${language}/grammar`)} onMouseEnter={prefetchGrammar}>
                                    Grammar Lessons
                                </button>
                            )}
                            <button className={`srs-pill${showPrint ? ' active' : ''}`} onClick={() => setShowPrint((p) => !p)}>
                                Print Flashcards
                            </button>
                        </div>
                    )}
                </div>

                {experimentalOpen && showPrint && (
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
                            {printablePacks.map((p) => (
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

                {totalBookmarks > 0 && (
                    <div className="srs-util-row">
                        <button className="srs-btn-util" onClick={() => navigate(`/${language}/bookmarks`)} onMouseEnter={prefetchBookmarks}>
                            🔖 Bookmarks ({totalBookmarks})
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

            {drawerParts && (
                <PackDrawer
                    parts={drawerParts}
                    language={language!}
                    studyPackIds={studyPacks}
                    onTogglePart={toggleStudyPack}
                    onClose={() => setDrawerParts(null)}
                    navigate={navigate}
                />
            )}
        </>
    );
};

export default Home;   