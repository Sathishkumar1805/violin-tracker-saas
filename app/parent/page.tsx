import { Suspense } from 'react';
import ParentClient from './ParentClient';

export default function ParentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center"><div className="text-5xl mb-4">👩‍👧</div><p className="text-indigo-400 font-bold">Loading parent view…</p></div>
      </div>
    }>
      <ParentClient />
    </Suspense>
  );
}
