// app/dashboard/page.tsx
// useSearchParams() requires a Suspense boundary in Next.js 14 App Router.
// We split into a shell (exported default) and the real client component.
import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎻</div>
          <p className="text-indigo-400 font-bold">Loading your practice…</p>
        </div>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}
