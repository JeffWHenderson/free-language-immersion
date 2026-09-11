import { useEffect, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useDecks } from "../../hooks/useDecks";
import "../srs.css";
import "./PictureList.css";

interface PictureMeta {
    id: string;
    name: string;
    image: string;
    deckId: string;
    deckName: string;
}

const PictureList = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const searchParams = new URLSearchParams(useSearch());
    const { packs } = useDecks(language);

    const [pictures, setPictures] = useState<PictureMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [deckFilter] = useState(searchParams.get("deck") ?? "all");

    useEffect(() => {
        if (!language || packs.length === 0) return;
        setLoading(true);

        const packsWithPictures = packs.filter((p) => (p.pictureLessons?.length ?? 0) > 0);
        const pictureFetches = packsWithPictures.flatMap((pack) =>
            (pack.pictureLessons ?? []).map((lessonId) =>
                fetch(`/languages/${language}/picture_lessons/${lessonId}.json`)
                    .then((r) => r.json())
                    .then((p) => ({
                        id: lessonId,
                        name: p.name ?? lessonId,
                        image: p.image ?? `/${lessonId}.jpg`,
                        deckId: pack.id,
                        deckName: pack.name,
                    }))
                    .catch(() => null)
            )
        );

        Promise.all(pictureFetches).then((results) => {
            setPictures(results.filter(Boolean) as PictureMeta[]);
            setLoading(false);
        });
    }, [language, packs]);

    const filtered = pictures.filter((p) =>
        deckFilter === "all" || p.deckId === deckFilter
    );

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(`/${language}/`)}>← Back</button>
            <div className="srs-home-header">
                <h2>Picture Lessons</h2>
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
                        onClick={() => navigate(`/${language}/picture-review/${picture.deckId}/${picture.id}`)}
                    >
                        <div className="srs-picture-thumb">
                            <img src={picture.image} alt={picture.name} />
                        </div>
                        <div className="srs-picture-card-info">
                            <div className="srs-picture-card-deck">{picture.deckName}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PictureList;
