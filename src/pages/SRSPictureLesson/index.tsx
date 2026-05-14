import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useLanguage from "../../hooks/useLanguage";
import { useLanguageApp } from "../../LanguageAppContext";
import "./picture-lesson.css";

interface Sentence {
    base_language: string;
    target_language: string;
}

interface Dot {
    top: string;
    left: string;
    sentences: Sentence[];
}

interface LessonData {
    image: string;
    dots: Dot[];
}

const SRSPictureLesson = () => {
    const { language, section } = useParams();
    const navigate = useNavigate();
    const { targetVoice } = useLanguage({ targetLanguage: language as string });
    const { volume } = useLanguageApp();
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        fetch(`/languages/${language}/pictureLessons/${section}.json`)
            .then(res => res.json())
            .then(data => setLesson(data))
            .catch(err => console.error(err));
    }, [language, section]);

    const total = lesson?.dots.length ?? 0;
    const current = lesson?.dots[activeIndex];

    const goNext = () => setActiveIndex(i => Math.min(i + 1, total - 1));
    const goPrev = () => setActiveIndex(i => Math.max(i - 1, 0));

    const speak = () => {
        if (!current) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(current.sentences[0].target_language);
        utt.voice = targetVoice ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        window.speechSynthesis.speak(utt);
    };

    if (!lesson) {
        return <div className="picture-lesson-page"><p>Loading...</p></div>;
    }

    return (
        <div className="picture-lesson-page">
            <button className="srs-page-back" onClick={() => navigate(-1)}>← Back</button>

            {/* Image frame — 3:4 portrait, source images should be 900×1200px */}
            <div className="picture-frame">
                <img
                    className="picture-frame-img"
                    src={lesson.image}
                    alt={section}
                />
                {current && (
                    <div
                        className="picture-dot-active"
                        style={{ top: current.top, left: current.left }}
                    />
                )}
            </div>

            {/* Sentence card */}
            <div className="picture-sentence-card">
                <div className="picture-sentence-target">
                    {current?.sentences[0].target_language}
                </div>
                <div className="picture-sentence-base">
                    {current?.sentences[0].base_language}
                </div>

                <div className="picture-progress">
                    {lesson.dots.map((_, i) => (
                        <button
                            key={i}
                            className={`picture-progress-dot ${i === activeIndex ? "active" : ""}`}
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Go to ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="picture-nav">
                    <button
                        className="picture-nav-btn"
                        onClick={goPrev}
                        disabled={activeIndex === 0}
                    >
                        ← Prev
                    </button>

                    <button className="picture-play-btn" onClick={speak}>
                        ▶
                    </button>

                    <button
                        className="picture-nav-btn"
                        onClick={goNext}
                        disabled={activeIndex === total - 1}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SRSPictureLesson;
