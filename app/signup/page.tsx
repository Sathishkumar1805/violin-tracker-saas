'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { signUpWithEmail, IS_MOCK } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (IS_MOCK) {
      setTimeout(() => router.push('/onboarding?mock=true'), 600);
      return;
    }

    const { error: authError } = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push('/onboarding');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-4">
            <span className="text-4xl">🎻</span>
          </div>
          <h1 className="text-3xl font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Create Account
          </h1>
          <p className="text-indigo-400 font-semibold mt-1 text-sm">Set up your family in 2 minutes</p>
        </div>

        {IS_MOCK && (
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <p className="text-amber-700 text-sm font-bold">🎭 Mock Mode Active</p>
            <p className="text-amber-600 text-xs mt-0.5">Just tap Sign Up to preview the onboarding flow</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={17} />
            <input
              type="text"
              placeholder="Your name (e.g. Alex)"
              value={name}
              onChange={e => setName(e.target.value)}
              required={!IS_MOCK}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-indigo-100 rounded-2xl text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={17} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required={!IS_MOCK}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-indigo-100 rounded-2xl text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={17} />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!IS_MOCK}
              minLength={6}
              className="w-full pl-11 pr-12 py-3.5 bg-white border border-indigo-100 rounded-2xl text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300">
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 transition-all disabled:opacity-60"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {loading ? '⏳ Creating account…' : '🎻 Sign Up as Parent'}
          </button>
        </form>

        <p className="text-center text-sm text-indigo-400 mt-5 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">
            Log in
          </Link>
        </p>
        <p className="text-center text-xs text-indigo-300 mt-4 font-medium">Free forever · No credit card needed</p>
      </div>
    </div>
  );
}
