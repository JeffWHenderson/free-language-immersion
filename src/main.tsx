import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from './common/ThemeContext';
import './index.css'

const LanguageLearningApp = lazy(() => import("./pages/LanguageApp"));
const LanguageAppLayout = lazy(() => import('./LanguageAppLayout'));
const LanguageAppHome = lazy(() => import('./LanguageHome'));
const SRSPictureLesson = lazy(() => import('./pages/SRSPictureLesson'));
const SRSHome = lazy(() => import('./pages/SRSHome'));
const SRSReview = lazy(() => import('./pages/SRSReview'));
const SRSStoryReader = lazy(() => import('./pages/SRSStoryReader'));
const SRSStoryList = lazy(() => import('./pages/SRSStoryList'));
const SRSPictureList = lazy(() => import('./pages/SRSPictureList'));
const SRSBrowse = lazy(() => import('./pages/SRSBrowse'));
const GrammarList = lazy(() => import('./pages/GrammarList'));
const GrammarLesson = lazy(() => import('./pages/GrammarLesson'));
const GrammarReview = lazy(() => import('./pages/GrammarReview'));
const ESZHReview = lazy(() => import('./pages/ESZHReview'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LanguageAppLayout />} >
              <Route index element={<LanguageAppHome />} />
              <Route path=":language" element={<LanguageLearningApp />} />
              <Route path=":language/picture-review/:deckId/:section" element={<SRSPictureLesson />} />
              <Route path=":language/stories" element={<SRSStoryList />} />
              <Route path=":language/pictures" element={<SRSPictureList />} />
              <Route path=":language/" element={<SRSHome />} />
              <Route path=":language/:deckId" element={<SRSReview />} />
              <Route path=":language/:deckId/browse" element={<SRSBrowse />} />
              <Route path=":language/:deckId/story/:storyId" element={<SRSStoryReader />} />
              <Route path=":language/:deckId/grammar" element={<GrammarList />} />
              <Route path=":language/:deckId/grammar/:grammarId" element={<GrammarLesson />} />
              <Route path=":language/:deckId/grammar/:grammarId/review" element={<GrammarReview />} />
              <Route path="es-zh" element={<ESZHReview />} />
            </Route>
          </Routes>
        </Suspense>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode >,
)


// OLD VERSION OF LANGUAGE APP
// <Route path=":language/flashcards/:section/:lessonId" element={<FlashCardsV2 />} />
// <Route path=":language/story/:section/:lessonId" element={<StoryReader />} />
// <Route path=":language/wordlist/:section/:lessonId" element={<WordList />} />
// <Route path=":language/view-lesson/:lessonId" element={<ViewLesson />} />
// <Route path=":language/my-decks" element={<MyDecks />} />
// <Route path=":language/my-decks/:section/:lessonId" element={<FlashCardsV2 />} />

// const FlashCardsV2 = lazy(() => import('./pages/flashcards/FlashCardsV2'));
// const WordList = lazy(() => import('./pages/wordlist/WordList'));
// const StoryReader = lazy(() => import('./pages/storyReader/StoryReader'));
// const ViewLesson = lazy(() => import('./pages/viewLesson/ViewLesson'));
// const MyDecks = lazy(() => import('./hooks/MyDecks'));
