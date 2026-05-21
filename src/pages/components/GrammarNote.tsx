import type { JSX } from "react";

const parseInline = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let key = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        parts.push(<strong key={key++}>{m[1]}</strong>);
        last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
};

const GrammarNote = ({ note, inline }: { note: string; inline?: boolean }) => {
    const lines = note.split('\n').map((line, i) => (
        <p key={i} className="gnote-p">{parseInline(line)}</p>
    ));
    return inline
        ? <>{lines}</>
        : <div className="srs-grammar-note-body">{lines}</div>;
};

export default GrammarNote;
