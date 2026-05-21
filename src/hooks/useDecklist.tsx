
const deckStub = {
    "name": "My Deck",
    "type": "flashcards",
    "filename": 'myDeck',
    "sentences": [
        { "base_language": "test", "target_language": "el testing" }
    ]
}

const DEFAULT_DECK = 'myDeckTest' // TODO: naming

export const getMyDeck = (key: string = DEFAULT_DECK) => {
    const deck = localStorage.getItem(key)
    if (deck) {
        return JSON.parse(deck)
    } else {
        localStorage.setItem(key, JSON.stringify(deckStub))
        return JSON.parse(localStorage.getItem(key) as string)
    }
}


export const addToDeck = (newPhrase: { target_language: string, base_language: string }, key: string = DEFAULT_DECK) => {
    const deckString = localStorage.getItem(key)
    const deckJson = JSON.parse(deckString as string)

    deckJson.sentences.unshift(newPhrase)

    localStorage.setItem(key, JSON.stringify(deckJson))

    return "success"
}

