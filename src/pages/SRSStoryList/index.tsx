import { useEffect, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import InfoTip from "../../components/InfoTip";
import "../srs.css";
import "./SRSStoryList.css";

interface StoryMeta {
    id: string;
    name: string;
    difficulty: string;
    deckId: string;
    deckName: string;
}

interface DeckMeta {
    id: string;
    name: string;
    stories?: string[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const DIFFICULTIES = ["easy", "medium", "hard"];

const SRSStoryList = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const searchParams = new URLSearchParams(useSearch());

    const [stories, setStories] = useState<StoryMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [deckFilter, setDeckFilter] = useState(searchParams.get("deck") ?? "all");
    const [diffFilter, setDiffFilter] = useState("all");

    useEffect(() => {
        if (!language) return;
        setLoading(true);

        Promise.all(
            AVAILABLE_DECKS.map((deckId) =>
                fetch(`/languages/${language}/${deckId}/index.json`)
                    .then((r) => r.json())
                    .catch(() => null)
            )
        ).then((decks: (DeckMeta | null)[]) => {
            const validDecks = decks.filter(Boolean) as DeckMeta[];

            const storyFetches = validDecks.flatMap((deck) =>
                (deck.stories ?? []).map((storyId) =>
                    fetch(`/languages/${language}/${deck.id}/stories/${storyId}.json`)
                        .then((r) => r.json())
                        .then((s) => ({
                            id: storyId,
                            name: s.name ?? storyId,
                            difficulty: s.difficulty ?? "easy",
                            deckId: deck.id,
                            deckName: deck.name,
                        }))
                        .catch(() => null)
                )
            );

            Promise.all(storyFetches).then((results) => {
                setStories(results.filter(Boolean) as StoryMeta[]);
                setLoading(false);
            });
        });
    }, [language]);

    const filtered = stories.filter((s) => {
        if (deckFilter !== "all" && s.deckId !== deckFilter) return false;
        if (diffFilter !== "all" && s.difficulty !== diffFilter) return false;
        return true;
    });

    const uniqueDecks = Array.from(new Set(stories.map((s) => s.deckId))).map(
        (id) => ({ id, name: stories.find((s) => s.deckId === id)!.deckName })
    );

    const presentDifficulties = Array.from(new Set(stories.map((s) => s.difficulty)));

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => window.history.back()}>← Back</button>
            <div className="srs-home-header">
                <div className="srs-header-row">
                    <h2>Stories</h2>
                    <InfoTip>
                        <p>Short passages written around each deck's vocabulary.</p>
                        <p>Filter by <strong>Topic</strong> to focus on a specific deck, or by <strong>Difficulty</strong> for easier or harder reading.</p>
                        <p>Reading reinforces words you've seen as flashcards and helps you see them in natural context.</p>
                    </InfoTip>
                </div>
            </div>

            <div className="srs-story-filters">
                <div className="srs-filter-group">
                    <span className="srs-filter-label">Topic</span>
                    <div className="srs-filter-pills">
                        <button
                            className={`srs-filter-pill ${deckFilter === "all" ? "active" : ""}`}
                            onClick={() => setDeckFilter("all")}
                        >
                            All
                        </button>
                        {uniqueDecks.map((d) => (
                            <button
                                key={d.id}
                                className={`srs-filter-pill ${deckFilter === d.id ? "active" : ""}`}
                                onClick={() => setDeckFilter(d.id)}
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="srs-filter-group">
                    <span className="srs-filter-label">Difficulty</span>
                    <div className="srs-filter-pills">
                        <button
                            className={`srs-filter-pill ${diffFilter === "all" ? "active" : ""}`}
                            onClick={() => setDiffFilter("all")}
                        >
                            All
                        </button>
                        {DIFFICULTIES.filter((d) => presentDifficulties.includes(d)).map((d) => (
                            <button
                                key={d}
                                className={`srs-filter-pill diff-${d} ${diffFilter === d ? "active" : ""}`}
                                onClick={() => setDiffFilter(d)}
                            >
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <p>Loading stories...</p>}

            {!loading && filtered.length === 0 && (
                <p className="srs-empty">No stories match these filters.</p>
            )}

            <div className="srs-story-grid">
                {filtered.map((story) => (
                    <button
                        key={`${story.deckId}-${story.id}`}
                        className="srs-story-card"
                        onClick={() => navigate(`/${language}/${story.deckId}/story/${story.id}`)}
                    >
                        <div className="srs-story-card-title">{story.name}</div>
                        <div className="srs-story-card-meta">
                            <span className="srs-story-card-deck">{story.deckName}</span>
                            <span className={`srs-story-card-diff diff-${story.difficulty}`}>
                                {story.difficulty}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SRSStoryList;
