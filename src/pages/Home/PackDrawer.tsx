import { useEffect, useRef } from "react";
import { Pack } from "../../hooks/useDecks";
import { loadDeckState, getDeckProgress, getDeckSummary, isCardHidden } from "../useStorage";
import "../srs.css";

interface Props {
    /** All parts of one topic. `parts[0]` is Part 1 (keeps the section id + shared assets). */
    parts: Pack[];
    language: string;
    studyPackIds: Set<string>;
    onTogglePart: (packId: string) => void;
    onClose: () => void;
    navigate: (path: string) => void;
}

const PackDrawer = ({ parts, language, studyPackIds, onTogglePart, onClose, navigate }: Props) => {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Trigger open animation after mount
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            drawerRef.current?.classList.add("open");
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // Part 1 keeps the section id/directory and owns the shared stories/grammar/picture assets.
    const rep = parts[0];
    const title = rep.parentName ?? rep.name;
    const multi = parts.length > 1;

    // Aggregate progress/counts across all parts of the topic.
    const perPart = parts.map((pack) => {
        const state = loadDeckState(language, pack.id);
        const visible = pack.cards.filter((c) => !isCardHidden(c, state));
        return {
            pack,
            visible,
            progress: getDeckProgress(visible, state),
            summary: getDeckSummary(visible, state),
            included: studyPackIds.has(pack.id),
        };
    });
    const learned = perPart.reduce((n, p) => n + p.progress.learned, 0);
    const total = perPart.reduce((n, p) => n + p.progress.total, 0);
    const newCount = perPart.reduce((n, p) => n + p.summary.newCount, 0);
    const learnCount = perPart.reduce((n, p) => n + p.summary.learnCount, 0);
    const dueCount = perPart.reduce((n, p) => n + p.summary.dueCount, 0);
    const progressPct = total > 0 ? Math.round((learned / total) * 100) : 0;

    const hasStories = (rep.stories?.length ?? 0) > 0;
    const hasGrammar = (rep.grammarLessons?.length ?? 0) > 0;
    const hasPictures = (rep.pictureLessons?.length ?? 0) > 0;

    const go = (path: string) => {
        onClose();
        navigate(path);
    };

    return (
        <div className="srs-drawer-backdrop" onClick={onClose}>
            <div className="srs-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
                <div className="srs-drawer-header">
                    <h3>{title}</h3>
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

                {multi ? (
                    <div className="srs-drawer-parts">
                        {perPart.map(({ pack, visible, included }) => (
                            <div key={pack.id} className={`srs-drawer-part${included ? ' included' : ''}`}>
                                <label className="srs-drawer-part-main">
                                    <input
                                        type="checkbox"
                                        className="srs-pack-toggle"
                                        checked={included}
                                        onChange={() => onTogglePart(pack.id)}
                                    />
                                    <span className="srs-drawer-part-label">
                                        Part {pack.part ?? 1}
                                        <span className="srs-drawer-part-sub">{visible.length} words</span>
                                    </span>
                                </label>
                                <button
                                    className="srs-drawer-part-browse"
                                    onClick={() => go(`/${language}/${pack.id}/browse?filter=all`)}
                                >
                                    Browse →
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="srs-drawer-toggle">
                        <span>Include in Study Session</span>
                        <input
                            type="checkbox"
                            className="srs-pack-toggle"
                            checked={perPart[0].included}
                            onChange={() => onTogglePart(rep.id)}
                        />
                    </div>
                )}

                <div className="srs-drawer-actions">
                    {!multi && total > 0 && (
                        <button
                            className="srs-drawer-action-btn primary"
                            onClick={() => go(`/${language}/${rep.id}/browse?filter=all`)}
                        >
                            Browse Cards ({total})
                        </button>
                    )}
                    {hasStories && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/stories?deck=${rep.id}`)}
                        >
                            Stories ({rep.stories!.length}) →
                        </button>
                    )}
                    {rep.kind === "grammar" && rep.reading && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/${rep.id}/grammar/${rep.reading}`)}
                        >
                            Read Explanation →
                        </button>
                    )}
                    {hasGrammar && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/${rep.id}/grammar`)}
                        >
                            Grammar Notes ({rep.grammarLessons!.length}) →
                        </button>
                    )}
                    {hasPictures && (
                        <button
                            className="srs-drawer-action-btn"
                            onClick={() => go(`/${language}/pictures?deck=${rep.id}`)}
                        >
                            Picture Lessons ({rep.pictureLessons!.length}) →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PackDrawer;
