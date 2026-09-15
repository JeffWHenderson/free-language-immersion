// Informative grammar-card faces. Instead of a plain sentence→translation flip,
// a grammar card can declare a `format` and render as a fill-in-the-blank (cloze),
// a paradigm table, or a side-by-side contrast. Front = the prompt/question,
// back = the reveal. Mechanics (flip, grading, grammar-note toggle) are unchanged.

export interface ClozeData {
    prompt: string;              // English hint shown on the front
    text: string;               // target sentence with `___` marking the blank
    answer: string;             // what fills the blank
    options?: string[];          // optional choice chips (display-only hint)
}

export interface TableData {
    title: string;              // paradigm heading (back), e.g. "querer — to want (e→ie)"
    hint?: string;              // small hint under the question, e.g. "stem-changing verb (o→ue)"
    rows: [string, string][];   // [label, form] pairs
    highlight?: string;         // label of a row to accent (e.g. an exception)
    note?: string;              // short footnote
}

export interface ContrastData {
    prompt: string;             // the question, e.g. "feliz — ser or estar?"
    a: { term: string; gloss: string };
    b: { term: string; gloss: string };
}

export interface ProduceData {
    concept: string;            // the rule, e.g. "Adjectives match the noun they modify"
    task: string;              // what to produce in English, e.g. "he is nervous, she is nervous"
    answer: string;            // the target-language production
    gloss?: string;             // optional note under the answer
}

export type GrammarFormat = "cloze" | "table" | "contrast" | "produce";

export interface GrammarFormatData {
    format?: GrammarFormat;
    cloze?: ClozeData;
    table?: TableData;
    contrast?: ContrastData;
    produce?: ProduceData;
}

const BLANK = "___";

function ClozeSentence({ text, fill }: { text: string; fill?: string }) {
    const idx = text.indexOf(BLANK);
    if (idx === -1) return <span>{text}</span>;
    const before = text.slice(0, idx);
    const after = text.slice(idx + BLANK.length);
    return (
        <span className="g-cloze-sentence" dir="auto">
            {before}
            <span className={`g-cloze-blank ${fill ? "filled" : ""}`}>{fill ?? "——"}</span>
            {after}
        </span>
    );
}

export function GrammarFront({ data, english }: { data: GrammarFormatData; english?: string }) {
    if (data.format === "cloze" && data.cloze) {
        const c = data.cloze;
        return (
            <div className="g-face g-cloze">
                <div className="g-prompt">{c.prompt}</div>
                <div className="g-cloze-text"><ClozeSentence text={c.text} /></div>
                {c.options && (
                    <div className="g-chips">
                        {c.options.map(o => <span key={o} className="g-chip">{o}</span>)}
                    </div>
                )}
            </div>
        );
    }
    if (data.format === "table" && data.table) {
        return (
            <div className="g-face g-table-front">
                <div className="g-prompt">{english ?? data.table.title}</div>
                <div className="g-hint">{data.table.hint ?? "recall the forms"}</div>
            </div>
        );
    }
    if (data.format === "contrast" && data.contrast) {
        return (
            <div className="g-face g-contrast-front">
                <div className="g-prompt g-prompt-big">{data.contrast.prompt}</div>
                <div className="g-hint">what's the difference?</div>
            </div>
        );
    }
    if (data.format === "produce" && data.produce) {
        const p = data.produce;
        return (
            <div className="g-face g-produce">
                <div className="g-produce-concept">{p.concept}</div>
                <div className="g-produce-task">
                    <span className="g-produce-try">try:</span> {p.task}
                </div>
                <div className="g-hint">say it, then flip</div>
            </div>
        );
    }
    return null;
}

export function GrammarBack({ data }: { data: GrammarFormatData }) {
    if (data.format === "cloze" && data.cloze) {
        const c = data.cloze;
        return (
            <div className="g-face g-cloze">
                <div className="g-cloze-text"><ClozeSentence text={c.text} fill={c.answer} /></div>
                <div className="g-prompt g-prompt-sub">{c.prompt}</div>
            </div>
        );
    }
    if (data.format === "table" && data.table) {
        const t = data.table;
        return (
            <div className="g-face g-table">
                <div className="g-table-title">{t.title}</div>
                <table className="g-paradigm">
                    <tbody>
                        {t.rows.map(([label, form]) => (
                            <tr key={label} className={label === t.highlight ? "hl" : ""}>
                                <td className="g-cell-label">{label}</td>
                                <td className="g-cell-form" dir="auto">{form}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {t.note && <div className="g-table-note">{t.note}</div>}
            </div>
        );
    }
    if (data.format === "contrast" && data.contrast) {
        const c = data.contrast;
        return (
            <div className="g-face g-contrast">
                <div className="g-contrast-cols">
                    <div className="g-contrast-col">
                        <div className="g-contrast-term" dir="auto">{c.a.term}</div>
                        <div className="g-contrast-gloss">{c.a.gloss}</div>
                    </div>
                    <div className="g-contrast-vs">vs</div>
                    <div className="g-contrast-col">
                        <div className="g-contrast-term" dir="auto">{c.b.term}</div>
                        <div className="g-contrast-gloss">{c.b.gloss}</div>
                    </div>
                </div>
            </div>
        );
    }
    if (data.format === "produce" && data.produce) {
        const p = data.produce;
        return (
            <div className="g-face g-produce">
                <div className="g-produce-answer" dir="auto">{p.answer}</div>
                {p.gloss && <div className="g-produce-gloss">{p.gloss}</div>}
                <div className="g-prompt g-prompt-sub">{p.concept}</div>
            </div>
        );
    }
    return null;
}
