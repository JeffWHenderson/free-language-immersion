import { useEffect, useState } from "react";
import { useParams } from "wouter";
import useLanguage from "../../hooks/useLanguage";
import { useLanguageApp } from "../../LanguageAppContext";
import "./picture-lesson.css";

interface Dot {
    top: string;
    left: string;
    label: string;
    translation: string;
    romanization?: string;
}

interface LessonData {
    name: string;
    image: string;
    dots: Dot[];
}

const PictureLesson = () => {
    const { language, deckId, section } = useParams();

    const { targetVoice } = useLanguage({ targetLanguage: language as string });
    const { volume } = useLanguageApp();
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        fetch(`/languages/${language}/${deckId}/picture_lessons/${section}.json`)
            .then(r => r.json())
            .then((data: LessonData) => setLesson(data))
            .catch(err => console.error(err));
    }, [language, deckId, section]);

    const total = lesson?.dots.length ?? 0;
    const current = lesson?.dots[activeIndex];

    const speak = (dot?: Dot) => {
        const target = dot ?? current;
        if (!target) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(target.translation);
        utt.voice = targetVoice ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        window.speechSynthesis.speak(utt);
    };

    const goNext = () => {
        if (!lesson) return;
        const next = (activeIndex + 1) % total;
        setActiveIndex(next);
        speak(lesson.dots[next]);
    };

    const goPrev = () => {
        if (!lesson) return;
        const prev = (activeIndex - 1 + total) % total;
        setActiveIndex(prev);
        speak(lesson.dots[prev]);
    };

    if (!lesson) {
        return <div className="picture-lesson-page"><p>Loading...</p></div>;
    }

    return (
        <div className="picture-lesson-page">
            <button className="srs-page-back" onClick={() => window.history.back()}>← Back</button>

            <div className="picture-frame">
                <img
                    className="picture-frame-img"
                    src={lesson.image}
                    alt={section}
                />
                {lesson.dots.map((dot, i) => (
                    <div
                        key={i}
                        className={`picture-dot${i === activeIndex ? " active" : ""}`}
                        style={{ top: dot.top, left: dot.left }}
                        onClick={() => {
                            setActiveIndex(i);
                            speak(dot);
                        }}
                    />
                ))}
            </div>

            <div className="picture-sentence-card">
                <div className="picture-sentence-target">
                    {current?.translation}
                </div>
                {current?.romanization && (
                    <div className="picture-sentence-romanization">
                        {current.romanization}
                    </div>
                )}
                <div className="picture-sentence-base">
                    {current?.label}
                </div>

                <div className="picture-nav">
                    <button className="picture-nav-btn" onClick={goPrev}>
                        ← Prev
                    </button>
                    <button className="picture-nav-btn" onClick={goNext}>
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PictureLesson;
