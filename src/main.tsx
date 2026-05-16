import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, LoaderFunctionArgs } from "react-router-dom";
import { ThemeProvider } from './common/ThemeContext';
import LanguageAppLayout from './LanguageAppLayout';
import { normalizeCards } from './pages/useSRSStorage';
import './index.css'

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

async function srsHomeLoader({ params }: LoaderFunctionArgs) {
    const { language } = params;
    const results = await Promise.all(
        AVAILABLE_DECKS.map(deckId =>
            fetch(`/languages/${language}/${deckId}.json`)
                .then(r => r.json())
                .then((raw: any) => ({ ...raw, cards: normalizeCards(raw.cards) }))
                .catch(() => null)
        )
    );
    return results.filter(Boolean);
}

async function srsStoryListLoader({ params }: LoaderFunctionArgs) {
    const { language } = params;
    const decks = (await Promise.all(
        AVAILABLE_DECKS.map(deckId =>
            fetch(`/languages/${language}/${deckId}.json`)
                .then(r => r.json() as Promise<{ id: string; name: string; stories?: string[] }>)
                .catch(() => null)
        )
    )).filter(Boolean) as { id: string; name: string; stories?: string[] }[];

    const stories = (await Promise.all(
        decks.flatMap(deck =>
            (deck.stories ?? []).map(storyId =>
                fetch(`/languages/${language}/${deck.id}/stories/${storyId}.json`)
                    .then(r => r.json())
                    .then((s: any) => ({
                        id: storyId,
                        name: s.name ?? storyId,
                        difficulty: s.difficulty ?? "easy",
                        deckId: deck.id,
                        deckName: deck.name,
                    }))
                    .catch(() => null)
            )
        )
    )).filter(Boolean);
    return stories;
}

async function srsPictureListLoader({ params }: LoaderFunctionArgs) {
    const { language } = params;
    const decks = (await Promise.all(
        AVAILABLE_DECKS.map(deckId =>
            fetch(`/languages/${language}/${deckId}.json`)
                .then(r => r.json() as Promise<{ id: string; name: string; pictureLessons?: string[] }>)
                .catch(() => null)
        )
    )).filter(Boolean) as { id: string; name: string; pictureLessons?: string[] }[];

    const pictures = (await Promise.all(
        decks.flatMap(deck =>
            (deck.pictureLessons ?? []).map(lessonId =>
                fetch(`/languages/${language}/pictureLessons/${lessonId}.json`)
                    .then(r => r.json())
                    .then((p: any) => ({
                        id: lessonId,
                        name: p.name ?? lessonId,
                        image: p.image ?? `/${lessonId}.jpg`,
                        deckId: deck.id,
                        deckName: deck.name,
                    }))
                    .catch(() => null)
            )
        )
    )).filter(Boolean);
    return pictures;
}

async function deckLoader({ params }: LoaderFunctionArgs) {
    const { language, deckId } = params;
    const raw = await fetch(`/languages/${language}/${deckId}.json`).then(r => r.json());
    return { ...raw, cards: normalizeCards(raw.cards) };
}

async function pictureLessonLoader({ params }: LoaderFunctionArgs) {
    const { language, section } = params;
    return fetch(`/languages/${language}/pictureLessons/${section}.json`).then(r => r.json());
}

async function storyReaderLoader({ params }: LoaderFunctionArgs) {
    const { language, deckId, storyId } = params;
    return fetch(`/languages/${language}/${deckId}/stories/${storyId}.json`).then(r => r.json());
}

const router = createBrowserRouter([
    {
        path: '/',
        element: <LanguageAppLayout />,
        children: [
            {
                index: true,
                lazy: () => import('./LanguageHome').then(m => ({ Component: m.default })),
            },
            {
                path: ':language',
                loader: srsHomeLoader,
                lazy: () => import('./pages/SRSHome').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/picture-review/:section',
                loader: pictureLessonLoader,
                lazy: () => import('./pages/SRSPictureLesson').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/stories',
                loader: srsStoryListLoader,
                lazy: () => import('./pages/SRSStoryList').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/pictures',
                loader: srsPictureListLoader,
                lazy: () => import('./pages/SRSPictureList').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/:deckId',
                loader: deckLoader,
                lazy: () => import('./pages/SRSReview').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/:deckId/browse',
                loader: deckLoader,
                lazy: () => import('./pages/SRSBrowse').then(m => ({ Component: m.default })),
            },
            {
                path: ':language/:deckId/story/:storyId',
                loader: storyReaderLoader,
                lazy: () => import('./pages/SRSStoryReader').then(m => ({ Component: m.default })),
            },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    </StrictMode>
);
