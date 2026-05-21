import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { loadDeckState, getDeckSummary, getBookmarkedCount, loadStoryBookmarks } from "../useSRSStorage";
import PageSkeleton from "../../components/PageSkeleton";
import InfoTip from "../../components/InfoTip";
import "../srs.css";

interface GrammarLessonMeta {
    id: string;
    name: string;
}

interface DeckMeta {
    id: string;
    name: string;
    language: string;
    stories?: string[];
    pictureLessons?: string[];
    grammarLessons?: GrammarLessonMeta[];
    cards: { id: string; hidden?: boolean; levels: unknown[] }[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const prefetchReview    = () => { void import('../SRSReview'); };
const prefetchBrowse    = () => { void import('../SRSBrowse'); };
const prefetchStories   = () => { void import('../SRSStoryList'); };
const prefetchPictures  = () => { void import('../SRSPictureList'); };
const prefetchGrammar   = () => { void import('../GrammarList'); };
const prefetchBookmarks = () => { void import('../SRSBookmarks'); };

const SRSHome = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const [deckMetas, setDeckMetas] = useState<DeckMeta[]>([]);

    useEffect(() => {
        if (!language) return;
        Promise.all(
            AVAILABLE_DECKS.map((deckId) =>
                fetch(`/languages/${language}/${deckId}/index.json`)
                    .then((r) => r.json() as Promise<DeckMeta>)
                    .catch(() => null)
            )
        ).then((results) => {
            setDeckMetas(results.filter(Boolean) as DeckMeta[]);
        });
    }, [language]);

    if (deckMetas.length === 0) return <PageSkeleton />;

    const deckEntries = deckMetas.map(deck => {
        const state = loadDeckState(language!, deck.id);
        return { deck, state };
    });
    const totalBookmarks = deckEntries.reduce((sum, { deck, state }) =>
        sum + getBookmarkedCount(deck.cards, state), 0)
        + loadStoryBookmarks(language!).length;
    const hasPictures = deckMetas.some(d => d.pictureLessons && d.pictureLessons.length > 0);

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

            {(hasPictures || totalBookmarks > 0) && (
                <div className="srs-deck-card srs-experimental-card">
                    <div className="srs-experimental-label">Experimental</div>
                    <div className="srs-deck-bottom">
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default SRSHome;
