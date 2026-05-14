import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyDeck } from "../hooks/useDecklist";

const LanguageLearningApp = () => {
    const { language } = useParams();
    const navigator = useNavigate()
    const [course, setCourse] = useState<any | null>(null);

    useEffect(() => {
        fetch(`/languages/${language}/course.json`, { headers: { 'Cache-Control': 'max-age=60000' } }) // so I can update lessons and not break users
            .then(response => response.json())
            .then(data => setCourse(data))
            .catch(error => console.error('Error fetching data:', error));
    }, [language])


    function handleSelectStory(lessonType: string, lesson: any, level_id: string) {
        if (lessonType === "wordlist") {
            navigator(`wordlist/${level_id}/${lesson.filename}`)
        } else if (lessonType === 'flashcard' || lessonType === 'flashcards') {
            navigator(`flashcards/${level_id}/${lesson.filename}`)
        } else if (lessonType === 'story') {
            navigator(`story/${level_id}/${lesson.filename}`)
        } else if (lessonType === 'custom-deck') {
            navigator(`my-decks/${level_id}/custom-deck`)
        } else if (lessonType === 'lesson') {
            navigator(`view-lesson/${lesson.filename}`)
        } else if (lessonType === 'speaking') {
            navigator(`picture-review/${lesson.filename}`)
        } else {
            alert("The developer screwed up if this didn't work")
        }
    }

    function specialCall(levelId: string) {
        const specialDeck = getMyDeck(`${levelId}-custom-deck`)

        if (levelId === "aliceInWonderland") {
            return null;
        }
        return <button
            key={`mydeck-${levelId}`}
            className="customLessonCard"
            onClick={() => handleSelectStory("custom-deck", specialDeck, levelId)}>
            custom deck
        </button>
    }

    return (
        <>
            <div style={{ paddingLeft: '8px', maxWidth: '100vw' }}>
                <div>
                    <h2 className="course-header">{course?.course_name}</h2>
                </div>
                {course?.course_levels.map((level: any) => (
                    <div key={level.level_id}>
                        <h3 className="section-header">{level.level_name}</h3>
                        <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%' }}>
                            <div style={{ display: "flex" }}>
                                {level.lessons.map((lesson: any) => (
                                    lesson.type !== 'story' &&
                                    <div className="topic-container-card"
                                        onClick={() => handleSelectStory(lesson.type, lesson, level.level_id)}>
                                        <div className={`card-label-${lesson.type}`}>{lesson.type}</div>
                                        <div
                                            key={lesson.filename}
                                            className="change-this"
                                        >
                                            {lesson.name}
                                        </div>
                                    </div>
                                ))}
                                {
                                    specialCall(level.level_id)
                                }
                            </div>
                            <div style={{ display: "flex", height: '100%' }}>
                                {level.lessons.map((lesson: any) => (
                                    lesson.type === 'story' &&
                                    <div className="topic-container-card"
                                        onClick={() => handleSelectStory(lesson.type, lesson, level.level_id)}>
                                        <div className="card-label-story">{lesson.type}</div>
                                        <div
                                            key={lesson.filename}
                                            className="change-this"
                                        >
                                            {lesson.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div >
        </>
    )
}

export default LanguageLearningApp;

