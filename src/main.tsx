import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Router, Route, Switch } from "wouter";
import { ThemeProvider } from './common/ThemeContext';
import PageSkeleton from './components/PageSkeleton';
import './index.css'

const LanguageAppLayout = lazy(() => import('./LanguageAppLayout'));
const LanguageLearningApp = lazy(() => import("./pages/LanguageApp"));
const LanguageAppHome = lazy(() => import('./LanguageHome'));
const PictureLesson = lazy(() => import('./pages/PictureLesson'));
const Home = lazy(() => import('./pages/Home'));
const Review = lazy(() => import('./pages/Review'));
const StoryReader = lazy(() => import('./pages/StoryReader'));
const StoryList = lazy(() => import('./pages/StoryList'));
const PictureList = lazy(() => import('./pages/PictureList'));
const Browse = lazy(() => import('./pages/Browse'));
const GrammarList = lazy(() => import('./pages/GrammarList'));
const GrammarLesson = lazy(() => import('./pages/GrammarLesson'));
const GrammarReview = lazy(() => import('./pages/GrammarReview'));
const ESZHReview = lazy(() => import('./pages/ESZHReview'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));

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
                <Route path="/:language/picture-review/:deckId/:section"><PictureLesson /></Route>
                <Route path="/:language/:deckId/story/:storyId"><StoryReader /></Route>
                <Route path="/:language/:deckId/grammar"><GrammarList /></Route>
                <Route path="/:language/:deckId/browse"><Browse /></Route>
                <Route path="/:language/stories"><StoryList /></Route>
                <Route path="/:language/pictures"><PictureList /></Route>
                <Route path="/:language/bookmarks"><Bookmarks /></Route>
                <Route path="/es-zh"><ESZHReview /></Route>
                <Route path="/:language/:deckId"><Review /></Route>
                <Route path="/:language/"><Home /></Route>
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
