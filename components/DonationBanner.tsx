'use client';

import { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';

const DISMISS_KEY = 'violin-tracker-donation-dismissed';

export default function DonationBanner() {
  const [visible, setVisible] = useState(false);
  const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL;

  useEffect(() => {
    // Only show if a donation URL is configured and user hasn't dismissed
    if (!donationUrl) return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, [donationUrl]);

  if (!visible || !donationUrl) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-3xl p-4 border border-pink-100 flex items-start gap-3">
      <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Heart size={16} className="text-rose-500" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-rose-800" style={{ fontFamily: 'Nunito, sans-serif' }}>
          This app is free, forever.
        </p>
        <p className="text-xs text-rose-500 font-medium mt-0.5">
          If it&apos;s helped your child build a practice habit, a small contribution keeps it running.
        </p>
        <a
          href={donationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 bg-rose-500 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-rose-600 active:scale-95 transition-all"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          <Heart size={12} fill="white" /> Buy me a coffee
        </a>
      </div>
      <button
        onClick={dismiss}
        className="p-1 text-rose-300 hover:text-rose-500 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
