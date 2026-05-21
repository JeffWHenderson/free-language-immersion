import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useLanguageApp } from "../../LanguageAppContext";
import useLanguage from "../../hooks/useLanguage";
import Settings from "../components/Settings";
import GrammarNote from "../components/GrammarNote";
import LiteralGloss, { type LiteralData } from "../components/LiteralGloss";
import {
    loadStoryBookmarks, toggleSentenceBookmark, isSentenceBookmarked,
    type StorySentenceBookmark,
} from "../useStorage";
import "../srs.css";
import "./StoryReader.css";

interface StorySentence {
    base_language: string;
    target_language: string;
    romanized?: string;
    grammarNote?: string;
    literal?: LiteralData;
}

interface StoryData {
    id: string;
    name: string;
    sentences: StorySentence[];
}

const StoryReader = () => {
    const { language, deckId, storyId } = useParams<{ language: string; deckId: string; storyId: string }>();


    const [story, setStory] = useState<StoryData | null>(null);
    const [playingIndex, setPlayingIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speakingRate, setSpeakingRate] = useState(0.9);
    const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null);
    const [sentenceBookmarks, setSentenceBookmarks] = useState<StorySentenceBookmark[]>([]);

    const { volume, showRomanized } = useLanguageApp();
    const { targetVoice } = useLanguage({ targetLanguage: language ?? "english" });
    const playingRef = useRef(false);
    const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            playingRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!language || !deckId || !storyId) return;
        setSentenceBookmarks(loadStoryBookmarks(language));
        fetch(`/languages/${language}/${deckId}/stories/${storyId}.json`)
            .then(r => r.json())
            .then(data => setStory(data))
            .catch(console.error);
    }, [language, deckId, storyId]);

    const handleBookmarkSentence = (e: MouseEvent, sIdx: number) => {
        e.stopPropagation();
        if (!language || !deckId || !storyId || !story) return;
        const sentence = story.sentences[sIdx];
        const bookmark: StorySentenceBookmark = {
            deckId, storyId,
            storyName: story.name,
            sentenceIndex: sIdx,
            target_language: sentence.target_language,
            base_language: sentence.base_language,
            romanized: sentence.romanized,
        };
        setSentenceBookmarks(prev => toggleSentenceBookmark(language, bookmark, prev));
    };

    const speakSentence = (idx: number, continueAfter = false) => {
        if (!story || idx >= story.sentences.length) {
            setPlayingIndex(-1);
            setIsPlaying(false);
            playingRef.current = false;
            return;
        }
        const utt = new SpeechSynthesisUtterance(story.sentences[idx].target_language);
        utt.voice = targetVoice ?? null;
        utt.rate = speakingRate;
        utt.volume = volume;
        setPlayingIndex(idx);
        sentenceRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
        utt.onend = () => {
            if (continueAfter && playingRef.current) {
                setTimeout(() => speakSentence(idx + 1, true), 700);
            } else {
                setPlayingIndex(-1);
                setIsPlaying(false);
                playingRef.current = false;
            }
        };
        window.speechSynthesis.speak(utt);
    };

    const handlePlayAll = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            playingRef.current = false;
            setIsPlaying(false);
            setPlayingIndex(-1);
        } else {
            playingRef.current = true;
            setIsPlaying(true);
            const from = playingIndex >= 0 ? playingIndex : 0;
            speakSentence(from, true);
        }
    };

    const handleSentenceClick = (idx: number) => {
        window.speechSynthesis.cancel();
        playingRef.current = false;
        setIsPlaying(false);
        speakSentence(idx);
    };

    const handleBack = () => {
        window.speechSynthesis.cancel();
        window.history.back();
    };

    if (!story) return <div className="srs-container"><p>Loading...</p></div>;

    return (
        <div className="srs-story-page">
            {/* Back */}
            <button className="srs-page-back" onClick={handleBack}>← Back</button>

            {/* Header */}
            <div className="srs-header" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
                <span className="srs-deck-name">{story.name}</span>
                <Settings language={language} />
            </div>

            {/* Story body */}
            <div className="srs-story-body">
                {story.sentences.map((sentence, sIdx) => (
                    <div
                        key={sIdx}
                        ref={el => { sentenceRefs.current[sIdx] = el; }}
                        className={`srs-story-sentence ${playingIndex === sIdx ? "playing" : ""}`}
                        onClick={() => handleSentenceClick(sIdx)}
                    >
                        <button
                            className={`srs-sentence-bookmark ${isSentenceBookmarked(sentenceBookmarks, deckId!, storyId!, sIdx) ? "bookmarked" : ""}`}
                            onClick={e => handleBookmarkSentence(e as unknown as MouseEvent, sIdx)}
                            title="Bookmark sentence"
                        >
                            {isSentenceBookmarked(sentenceBookmarks, deckId!, storyId!, sIdx) ? "🔖" : "🏷"}
                        </button>
                        {showRomanized && sentence.romanized && (
                            <div className="srs-romanized">{sentence.romanized}</div>
                        )}
                        <div className="srs-story-target">{sentence.target_language}</div>
                        <div className="srs-story-base">{sentence.base_language}</div>
                        {(sentence.literal || sentence.grammarNote) && (
                            <div
                                className="srs-grammar-note-wrap"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    className="srs-grammar-note-toggle"
                                    onClick={() => setOpenNoteIndex(openNoteIndex === sIdx ? null : sIdx)}
                                >
                                    Grammar note {openNoteIndex === sIdx ? "▴" : "▾"}
                                </button>
                                {openNoteIndex === sIdx && (
                                    <div className="srs-grammar-note-body">
                                        {sentence.literal && <LiteralGloss literal={sentence.literal} context="note" />}
                                        {sentence.literal && sentence.grammarNote && <hr className="srs-note-divider" />}
                                        {sentence.grammarNote && <GrammarNote note={sentence.grammarNote} />}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Player bar */}
            <div className="srs-story-player">
                <div className="srs-story-player-inner">
                    <div className="srs-story-speed">
                        <button onClick={e => { e.stopPropagation(); setSpeakingRate(r => Math.max(0.2, parseFloat((r - 0.1).toFixed(1)))); }}>−</button>
                        <span>{speakingRate.toFixed(1)}×</span>
                        <button onClick={e => { e.stopPropagation(); setSpeakingRate(r => Math.min(2.0, parseFloat((r + 0.1).toFixed(1)))); }}>+</button>
                    </div>
                    <button className="srs-story-play-btn" onClick={e => { e.stopPropagation(); handlePlayAll(); }}>
                        {isPlaying ? "⏸ Pause" : "▶ Play All"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryReader;
