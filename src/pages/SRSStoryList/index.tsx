import { useState } from "react";
import { useParams, useNavigate, useSearchParams, useLoaderData } from "react-router-dom";
import "../srs.css";

interface StoryMeta {
    id: string;
    name: string;
    difficulty: string;
    deckId: string;
    deckName: string;
}

const DIFFICULTIES = ["easy", "medium", "hard"];

const SRSStoryList = () => {
    const { language } = useParams<{ language: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const stories = useLoaderData() as StoryMeta[];
    const [deckFilter, setDeckFilter] = useState(searchParams.get("deck") ?? "all");
    const [diffFilter, setDiffFilter] = useState("all");

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
            <button className="srs-page-back" onClick={() => navigate(-1)}>← Back</button>
            <div className="srs-home-header">
                <h2>Stories</h2>
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

            {filtered.length === 0 && (
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
