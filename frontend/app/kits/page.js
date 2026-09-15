'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getKits, getMe } from '../../lib/api';

export default function KitsListPage() {
  const router = useRouter();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const authData = await getMe();
        if (!authData || !authData.success) {
          router.push('/login');
          return;
        }

        const data = await getKits();
        if (data && data.success) {
          setKits(data.kits || []);
        } else {
          setError(data.message || 'Failed to load kits.');
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to server.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Generating...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading interview kits...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
                &larr; Dashboard
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                My Preparation Kits
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Interview Kits
            </h1>
          </div>

          <Link
            href="/kits/new"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
          >
            + Create Interview Kit
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Kit Grid / Empty State */}
        {kits.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-sm">
            <div className="mx-auto h-12 w-12 text-slate-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No interview kits created yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Get started by creating your first AI-tailored prep kit with company research and questions.
            </p>
            <div className="mt-6">
              <Link
                href="/kits/new"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Create First Kit
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => {
              const kitId = kit.id || kit._id;
              return (
                <Link
                  key={kitId}
                  href={`/kits/${kitId}`}
                  className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition hover:border-indigo-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      {kit.days} {kit.days === 1 ? 'Day' : 'Days'} Plan
                    </span>
                    {getStatusBadge(kit.status)}
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-slate-900 line-clamp-2">
                    {kit.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 truncate">
                    {kit.companyUrl}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {new Date(kit.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="font-semibold text-indigo-600">View Kit &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
