import { useEffect, useRef } from "react";
import { Pack } from "../../hooks/useDecks";
import { loadDeckState, getDeckProgress, getDeckSummary, isCardHidden } from "../useStorage";
import "../srs.css";

interface Props {
    pack: Pack;
    language: string;
    included: boolean;
    onToggle: () => void;
    onClose: () => void;
    navigate: (path: string) => void;
}

const PackDrawer = ({ pack, language, included, onToggle, onClose, navigate }: Props) => {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Trigger open animation after mount
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            drawerRef.current?.classList.add("open");
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const deckState = loadDeckState(language, pack.id);
    const visibleCards = pack.cards.filter((c) => !isCardHidden(c, deckState));
    const { learned, total } = getDeckProgress(visibleCards, deckState);
    const { newCount, dueCount, learnCount } = getDeckSummary(visibleCards, deckState);
    const progressPct = total > 0 ? Math.round((learned / total) * 100) : 0;

    const hasStories = (pack.stories?.length ?? 0) > 0;
    const hasGrammar = (pack.grammarLessons?.length ?? 0) > 0;
    const hasPictures = (pack.pictureLessons?.length ?? 0) > 0;

    const go = (path: string) => {
        onClose();
        navigate(path);
    };

    return (
        <div className="srs-drawer-backdrop" onClick={onClose}>
            <div className="srs-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
                <div className="srs-drawer-header">
                    <h3>{pack.name}</h3>
                    <button className="srs-drawer-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                {total > 0 && (
                    <div className="srs-drawer-progress">
                        <div className="srs-progress-bar-wrap">
                            <div className="srs-progress-bar-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="srs-drawer-progress-label">
                            {learned} of {total} cards learned ({progressPct}%)
                        </span>
                    </div>
                )}

                {(newCount > 0 || dueCount > 0 || learnCount > 0) && (
                    <div className="srs-drawer-counts">
                        {newCount > 0 && <span className="srs-count new">{newCount} new</span>}
                        {learnCount > 0 && <span className="srs-count learn">{learnCount} learning</span>}
                        {dueCount > 0 && <span className="srs-count review">{dueCount} due</span>}
                    </div>
                )}

                <div className="srs-drawer-toggle">
                    <span>Include in Study Session</span>
                    <input
                        type="checkbox"
                        className="srs-pack-toggle"
                        checked={included}
                        onChange={onToggle}
                    />
                </div>

                <div className="srs-drawer-actions">
                    {total > 0 && (
                        <button
                            className="srs-drawer-action-btn primary"
                            onClick={() => go(`/${language}/${pack.id}/browse?filter=all`)}
                        >
                            Browse Cards ({total})
                        </button>
                    )}
                    {hasStories && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/stories?deck=${pack.id}`)}
                        >
                            Stories ({pack.stories!.length}) →
                        </button>
                    )}
                    {hasGrammar && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/${pack.id}/grammar`)}
                        >
                            Grammar Notes ({pack.grammarLessons!.length}) →
                        </button>
                    )}
                    {hasPictures && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/pictures?deck=${pack.id}`)}
                        >
                            Picture Lessons ({pack.pictureLessons!.length}) →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PackDrawer;
