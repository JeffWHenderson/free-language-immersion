export interface PrintCard {
    id: string;
    english: string;
    word: string;
    romanized?: string;
}

export type PrintSize = 'large' | 'small';

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildPrintableFlashcards = (cards: PrintCard[], title = 'Flashcards', size: PrintSize = 'large', showRomanized = true) => {
    const isSmall = size === 'small';
    const cols = isSmall ? 4 : 2;
    const cardHeight = isSmall ? '1in' : '2in';
    const pad = isSmall ? '4px 7px' : '8px 14px';
    const gap = isSmall ? '2px' : '5px';
    const wordSize = isSmall ? '13px' : '21px';
    const wordLineHeight = isSmall ? '1.25' : '1.3';
    const romanizedSize = isSmall ? '8px' : '11px';
    const englishSize = isSmall ? '11px' : '15px';

    const renderCard = (card: PrintCard) => `
        <div class="card">
            <div class="card-top">
                ${showRomanized && card.romanized ? `<div class="romanized">${esc(card.romanized)}</div>` : ''}
                <div class="word">${esc(card.word)}</div>
            </div>
            <div class="card-bottom">
                <div class="english">${esc(card.english)}</div>
            </div>
        </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)} — fold in half, cut on dotted border</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: letter portrait; margin: 0.25in; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif; }
.cards {
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap: 0;
}
.card {
    height: ${cardHeight};
    border: 1px dotted #ccc;
    display: flex;
    flex-direction: column;
    break-inside: avoid;
    page-break-inside: avoid;
}
.card-top {
    flex: 1;
    border-bottom: 1px dashed #ddd;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: ${pad};
    gap: ${gap};
}
.card-bottom {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: ${pad};
}
.word {
    font-size: ${wordSize};
    font-weight: 700;
    color: #111;
    text-align: center;
    line-height: ${wordLineHeight};
}
.romanized {
    font-size: ${romanizedSize};
    color: #888;
    text-align: center;
    line-height: 1.4;
    letter-spacing: 0.03em;
}
.english {
    font-size: ${englishSize};
    font-weight: 600;
    color: #222;
    text-align: center;
    line-height: 1.4;
}
</style>
</head>
<body>
<div class="cards">${cards.map(renderCard).join('')}</div>
<script>document.fonts.ready.then(function(){window.print();window.close();});</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
};
