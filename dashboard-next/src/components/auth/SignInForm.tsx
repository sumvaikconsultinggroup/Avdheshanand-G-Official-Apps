'use client';
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Monogram / portal identity */}
      <div className="mb-10 flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#8A0A26] to-[#4A0010] text-xl text-[#FFD54F] shadow-sm">
          &#x950;
        </div>
        <div className="leading-tight">
          <p className="font-serif text-lg font-bold text-[#3A2A22]">Admin Console</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#9A8A72]">Admin Portal</p>
        </div>
      </div>

      {/* Heading */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8A1E23]">
        Administrator Access
      </p>
      <h1 className="mt-2 font-serif text-[2.6rem] font-bold leading-none text-[#2A211C]">
        Welcome back
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#7A6E60]">
        Sign in to steward the Swami Avdheshanand G website &amp; records.
      </p>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[#D9A7A0] bg-[#FBEDEA] p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B23B2E]" />
          <p className="text-sm text-[#8A1E23]">{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-9 space-y-6">
        {/* Username */}
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#3A2A22]">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder="Enter your username"
            className="w-full rounded-xl border border-[#E1D6C2] bg-[#FCFAF4] px-4 py-3.5 text-[15px] text-[#2A211C] placeholder-[#B4A88E] shadow-inner outline-none transition focus:border-[#8A1E23] focus:bg-white focus:ring-4 focus:ring-[#8A1E23]/10"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#3A2A22]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[#E1D6C2] bg-[#FCFAF4] px-4 py-3.5 pr-12 text-[15px] text-[#2A211C] placeholder-[#B4A88E] shadow-inner outline-none transition focus:border-[#8A1E23] focus:bg-white focus:ring-4 focus:ring-[#8A1E23]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A2947E] transition hover:text-[#8A1E23]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-[#8C221B] to-[#5E0016] py-4 text-[15px] font-bold tracking-wide text-white shadow-[0_16px_34px_-14px_rgba(120,20,20,0.7)] transition hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Enter the Portal
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Ornamental divider */}
      <div className="mt-10 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4A017]/50" />
        <span className="text-[#C79A2E]">&#x965;</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4A017]/50" />
      </div>

      {/* Footer */}
      <div className="mt-5 text-center">
        <p className="text-xs tracking-wide text-[#9A8A72]">Protected area · Authorised personnel only</p>
        <p className="mt-1 text-[11px] text-[#B4A88E]">© 2026 Swami Avdheshanand G. All rights reserved.</p>
      </div>
    </div>
  );
}
