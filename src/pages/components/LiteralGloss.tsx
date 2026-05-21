export type LiteralData = string | [string, string][];

interface Props {
    literal: LiteralData;
    /** 'card' = standalone below card, 'story' = story reader row, 'note' = inside grammar note body */
    context?: 'card' | 'story' | 'note';
}

const LiteralGloss = ({ literal, context = 'card' }: Props) => {
    if (typeof literal === 'string') {
        if (context === 'note') return <p className="gnote-p srs-literal-inline">Lit. {literal}</p>;
        if (context === 'story') return <div className="srs-literal">Lit. {literal}</div>;
        return <div className="srs-literal-note">Lit. {literal}</div>;
    }

    return (
        <div className={`srs-literal-interlinear srs-literal-interlinear--${context}`}>
            {literal.map(([zh, en], i) => (
                <span key={i} className="srs-lit-pair">
                    <span className="srs-lit-zh">{zh}</span>
                    <span className="srs-lit-en">{en}</span>
                </span>
            ))}
        </div>
    );
};

export default LiteralGloss;
