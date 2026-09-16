'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMe } from '../lib/api';
import Navbar from '../components/Navbar';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => {
        if (res && res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3.5 py-1 text-xs font-semibold text-indigo-700">
            <span>The AI Interview Prep Kit</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Master Technical & Behavioral Interviews with <span className="text-indigo-600">PrepForge</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Transform any job description and company URL into a personalized, grounded interview prep kit. Featuring tailored question banks, interactive flashcard practice decks, and deterministic study schedules.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Go to Dashboard &rarr;
                </Link>
                <Link
                  href="/kits/new"
                  className="rounded-xl bg-white border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Create New Kit
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-white border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Key Value Props Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Grounded Question Bank</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Technical, behavioral, and situational questions strictly mapped to extracted job requirements.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Active Recall Practice</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Interactive flashcard decks with prompt reveal, self-assessed confidence tracking, and smart queuing.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Deterministic Schedule</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Adaptive 1 to 60-day study timelines that prioritize must-have skills earlier in your preparation.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        PrepForge &bull; AI Interview Preparation Kit &bull; FS-AI-INTERVIEW-01
      </footer>
    </div>
  );
}
