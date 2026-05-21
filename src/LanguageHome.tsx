import { Link, useLocation } from "wouter";
import "./main-styles.css";

const prefetchLanguage = () => { void import('./pages/LanguageApp'); void import('./pages/SRSHome'); };
const prefetchESZH = () => { void import('./pages/ESZHReview'); };

const LanguageAppHome = () => {
    const [, navigate] = useLocation()

    return (
        <div className="lang-home">
            <h1 className="lang-home-title">Free Language Immersion</h1>
            <p className="lang-home-subtitle">A free, open-source language learning app built around spaced repetition, stories, and picture lessons.</p>

            <div className="lang-home-courses">
                <button className="lang-course-btn" onClick={() => navigate('/spanish')} onMouseEnter={prefetchLanguage}>
                    Spanish Course →
                </button>
                <button className="lang-course-btn" onClick={() => navigate('/chinese')} onMouseEnter={prefetchLanguage}>
                    Chinese Course →
                </button>
                <button className="lang-course-btn" onClick={() => navigate('/japanese')} onMouseEnter={prefetchLanguage}>
                    Japanese Course →
                </button>
                <button className="lang-course-btn" onClick={() => navigate('/arabic')} onMouseEnter={prefetchLanguage}>
                    Arabic Course →
                </button>
                <button className="lang-course-btn" onClick={() => navigate('/french')} onMouseEnter={prefetchLanguage}>
                    French Course →
                </button>
                <button className="lang-course-btn" onClick={() => navigate('/korean')} onMouseEnter={prefetchLanguage}>
                    Korean Course →
                </button>
            </div>

            <div className="lang-home-courses">
                <button className="lang-cross-btn" onClick={() => navigate('/es-zh')} onMouseEnter={prefetchESZH}>

                    Spanish → Chinese Flashcards →
                </button>
            </div>

            <div className="lang-home-content">
                <h2>What's in the app?</h2>
                <ul>
                    <li><strong>Spaced Repetition (SRS) Flashcards</strong> — Vocabulary and phrases organized by topic. Cards you struggle with come back sooner; cards you know well are shown less often. Progress is saved in your browser.</li>
                    <li><strong>Grammar Notes</strong> — Key grammar points are attached directly to cards and story sentences so you learn structure in context, not in isolation.</li>
                    <li><strong>Stories</strong> — Short reading and listening exercises built around the same vocabulary as the flashcard decks. Each story has per-sentence grammar notes you can reveal on demand.</li>
                    <li><strong>Picture Lessons</strong> — Interactive images with labeled vocabulary points. Click a dot to see the word or phrase and hear it spoken.</li>
                </ul>

                <h2>Core philosophy</h2>
                <ul>
                    <li><strong>Comprehensible input:</strong> Work at the edge of your comfort zone — not so easy it's boring, not so hard it's overwhelming.</li>
                    <li><strong>Thematic vocabulary:</strong> Each deck covers a topic with limited vocab but varied grammar, so you can talk about something real quickly rather than drilling isolated words for months.</li>
                    <li><strong>No accounts, no ads, no tracking:</strong> Progress is stored locally in your browser. Code is open source.</li>
                </ul>

                <h2>How do I start?</h2>
                <ul>
                    <li><strong>Absolute beginner:</strong> Watch a short video on pronunciation first — it helps a lot with listening. Then jump in.</li>
                    <li><strong>Go at your own pace:</strong> Read each card, listen, and repeat. You'll naturally start picking up patterns.</li>
                    <li><strong>Use the stories:</strong> Once a topic feels familiar, read the stories for that deck. Comprehensible input matters more than perfect memorization.</li>
                    <li><strong>Picture lessons:</strong> Great for visual vocabulary — tap the dots to explore what's in the scene.</li>
                    <li><strong>Consistency over intensity:</strong> 10 minutes a day beats two hours on the weekend. Keep the streak going.</li>
                    <li><strong>Move on:</strong> This app gives you a solid foundation. Once you're comfortable, seek out native content — vlogs, podcasts, TV. That's where real fluency comes from.</li>
                </ul>

                <h2>Contribute</h2>
                <ul>
                    <li>This app is open to contributions — new languages, new decks, bug fixes, feature ideas.</li>
                    <li><strong>Code: <a href="https://github.com/JeffWHenderson/free-language-immersion">GitHub</a></strong></li>
                    <li><strong>Bugs or feature requests:</strong> <Link href="/contact">Contact me</Link></li>
                </ul>
            </div>
        </div>
    );
}

export default LanguageAppHome;
