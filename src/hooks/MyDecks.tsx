import { useLocation } from "wouter";
import { addToDeck, getMyDeck } from "./useDecklist";

const MyDecks = () => {
    const [, navigator] = useLocation()
    const deck = getMyDeck()

    const handleAdd = (newPhrase: { target_language: string, base_language: string }) => {
        addToDeck(newPhrase)
    }


    return <>
        <button onClick={() => handleAdd({ base_language: "english", target_language: "spanish" })}>add something to my deck</button>
        <div>
            <button
                key={"my-deck"}
                className="flashCardLessonCard"
                onClick={() => navigator(`/spanish/flashcards/myDeck`)}
            >
                {deck.name}
            </button>
        </div>
    </>
}

export default MyDecks;