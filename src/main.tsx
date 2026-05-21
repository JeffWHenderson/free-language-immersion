import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Router, Route, Switch } from "wouter";
import { ThemeProvider } from './common/ThemeContext';
import PageSkeleton from './components/PageSkeleton';
import './index.css'

const LanguageAppLayout = lazy(() => import('./LanguageAppLayout'));
const LanguageLearningApp = lazy(() => import("./pages/LanguageApp"));
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
const SRSBookmarks = lazy(() => import('./pages/SRSBookmarks'));

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
        setInterval(() => registration.update(), 60 * 60 * 1000);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <ThemeProvider>
        <Suspense fallback={<PageSkeleton />}>
          <LanguageAppLayout>
            <Suspense fallback={<PageSkeleton />}>
              <Switch>
                <Route path="/:language/:deckId/grammar/:grammarId/review"><GrammarReview /></Route>
                <Route path="/:language/:deckId/grammar/:grammarId"><GrammarLesson /></Route>
                <Route path="/:language/picture-review/:deckId/:section"><SRSPictureLesson /></Route>
                <Route path="/:language/:deckId/story/:storyId"><SRSStoryReader /></Route>
                <Route path="/:language/:deckId/grammar"><GrammarList /></Route>
                <Route path="/:language/:deckId/browse"><SRSBrowse /></Route>
                <Route path="/:language/stories"><SRSStoryList /></Route>
                <Route path="/:language/pictures"><SRSPictureList /></Route>
                <Route path="/:language/bookmarks"><SRSBookmarks /></Route>
                <Route path="/es-zh"><ESZHReview /></Route>
                <Route path="/:language/:deckId"><SRSReview /></Route>
                <Route path="/:language/"><SRSHome /></Route>
                <Route path="/:language"><LanguageLearningApp /></Route>
                <Route><LanguageAppHome /></Route>
              </Switch>
            </Suspense>
          </LanguageAppLayout>
        </Suspense>
      </ThemeProvider>
    </Router>
  </StrictMode>,
)
