import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import "../srs.css";

interface PictureMeta {
    id: string;
    name: string;
    image: string;
    deckId: string;
    deckName: string;
}

interface DeckMeta {
    id: string;
    name: string;
    pictureLessons?: string[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const SRSPictureList = () => {
    const { language } = useParams<{ language: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [pictures, setPictures] = useState<PictureMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [deckFilter, setDeckFilter] = useState(searchParams.get("deck") ?? "all");

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

            const pictureFetches = validDecks.flatMap((deck) =>
                (deck.pictureLessons ?? []).map((lessonId) =>
                    fetch(`/languages/${language}/picture_lessons/${lessonId}.json`)
                        .then((r) => r.json())
                        .then((p) => ({
                            id: lessonId,
                            name: p.name ?? lessonId,
                            image: p.image ?? `/${lessonId}.jpg`,
                            deckId: deck.id,
                            deckName: deck.name,
                        }))
                        .catch(() => null)
                )
            );

            Promise.all(pictureFetches).then((results) => {
                setPictures(results.filter(Boolean) as PictureMeta[]);
                setLoading(false);
            });
        });
    }, [language]);

    const filtered = pictures.filter((p) => {
        if (deckFilter !== "all" && p.deckId !== deckFilter) return false;
        return true;
    });

    const uniqueDecks = Array.from(new Set(pictures.map((p) => p.deckId))).map(
        (id) => ({ id, name: pictures.find((p) => p.deckId === id)!.deckName })
    );

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(-1)}>← Back</button>
            <div className="srs-home-header">
                <h2>Picture Lessons</h2>
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
            </div>

            {loading && <p>Loading...</p>}

            {!loading && filtered.length === 0 && (
                <p className="srs-empty">No picture lessons found.</p>
            )}

            <div className="srs-picture-grid">
                {filtered.map((picture) => (
                    <button
                        key={`${picture.deckId}-${picture.id}`}
                        className="srs-picture-card"
                        onClick={() => navigate(`/${language}/picture-review/${picture.id}`)}
                    >
                        <div className="srs-picture-thumb">
                            <img src={picture.image} alt={picture.name} />
                        </div>
                        <div className="srs-picture-card-info">
                            <div className="srs-story-card-deck">{picture.deckName}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SRSPictureList;
