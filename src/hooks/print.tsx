import { renderToString } from 'react-dom/server';

// TODO: this is kind of dead for now... just leaving here cause I want to use it for my own printing in the future
export const buildPrintableFlashcards = (wordList: any[]) => {
    const printableFlashCards = () => {
        return <html>
            <head>
                <title>World Wide Jeff --  Cut cards on dotted line</title>
            </head>
            <body style={{ margin: '0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {
                        wordList.map((phrase: any) => (
                            <div style={{ display: 'flex', flexDirection: 'column', breakInside: 'avoid', pageBreakInside: 'avoid', width: '230px', height: '110px', border: '1px dotted grey' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', height: '50%', borderBottom: '1px solid grey' }}>
                                    {phrase.romanized ? <div>{phrase.romanized}</div> : null}
                                    <b>{phrase.target_language}</b>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', height: '50%' }}>
                                    <b>{phrase.base_language}</b>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </body>
        </html>
    }

    var printWindow = window.open('', '_blank');
    // The render to string thing below is pretty sick
    printWindow?.document.write(renderToString(printableFlashCards()));
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
    printWindow?.close();
}
