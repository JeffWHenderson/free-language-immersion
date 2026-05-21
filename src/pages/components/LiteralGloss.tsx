export type LiteralData = string | [string, string][];

interface Props {
    literal: LiteralData;
    /** 'card' = standalone below card, 'story' = story reader row, 'note' = inside grammar note body */
    context?: 'card' | 'story' | 'note';
}

const LiteralGloss = ({ literal, context = 'card' }: Props) => (
    <div className={`srs-literal-interlinear srs-literal-interlinear--${context}`}>
        {typeof literal === 'string' ? (
            <span className="srs-lit-string">Lit. {literal}</span>
        ) : (
            literal.map(([zh, en], i) => (
                <span key={i} className="srs-lit-pair">
                    <span className="srs-lit-zh">{zh}</span>
                    <span className="srs-lit-en">{en}</span>
                </span>
            ))
        )}
    </div>
);

export default LiteralGloss;
