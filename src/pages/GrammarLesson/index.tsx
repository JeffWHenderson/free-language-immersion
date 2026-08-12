import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import "../srs.css";
import "./grammar-lesson.css";

const GrammarLesson = () => {
    const { language, deckId, grammarId } = useParams<{
        language: string;
        deckId: string;
        grammarId: string;
    }>();
    const [, navigate] = useLocation();
    const [lessonName, setLessonName] = useState("");
    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState(false);

    // Reached either from a section (deckId = section) or a canonical grammar
    // pill (deckId = "grammar_<concept>"); the latter has no per-section JSON.
    const fromGrammarPill = deckId?.startsWith("grammar_") ?? false;
    const backPath = fromGrammarPill ? `/${language}/` : `/${language}/${deckId}/grammar`;

    useEffect(() => {
        if (!language || !deckId || !grammarId) return;

        if (!fromGrammarPill) {
            fetch(`/languages/${language}/${deckId}/grammar/${grammarId}.json`)
                .then(r => r.json())
                .then(data => setLessonName(data.name ?? grammarId))
                .catch(() => {});
        }

        fetch(`/languages/${language}/grammar/${grammarId}.html`)
            .then(r => {
                if (!r.ok) throw new Error("not found");
                return r.text();
            })
            .then(text => setHtml(text))
            .catch(() => setError(true));
    }, [language, deckId, grammarId]);

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(backPath)}>← Back</button>

            {lessonName && (
                <div className="srs-home-header">
                    <h2>{lessonName}</h2>
                </div>
            )}

            {error && <p className="srs-empty">Grammar lesson not found.</p>}

            {html && (
                <div
                    className="grammar-html"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}

            {!html && !error && <p>Loading...</p>}

        </div>
    );
};

export default GrammarLesson;
