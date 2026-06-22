import { useState, type ComponentType } from 'react';
import { Sidebar, type Route } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CursorPage } from './pages/CursorPage';
import { TrailsPage } from './pages/TrailsPage';
import { ClicksPage } from './pages/ClicksPage';
import { SoundsPage } from './pages/SoundsPage';
import { PresetsPage } from './pages/PresetsPage';
import { AboutPage } from './pages/AboutPage';
import { Onboarding } from './components/Onboarding';

const PAGES: Record<Route, ComponentType> = {
  cursor: CursorPage,
  trails: TrailsPage,
  clicks: ClicksPage,
  sounds: SoundsPage,
  presets: PresetsPage,
  about: AboutPage,
};

export default function App() {
  const [route, setRoute] = useState<Route>('cursor');
  const Active = PAGES[route];

  return (
    <div className="flex h-full bg-krypt-void">
      <div className="pointer-events-none fixed inset-0 bg-krypt-radial" />
      <Sidebar current={route} onNavigate={setRoute} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1">
          <Active />
        </main>
      </div>
      <Onboarding />
    </div>
  );
}
