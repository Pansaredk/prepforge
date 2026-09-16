'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getKits, getMe, deleteKit } from '../../lib/api';
import Navbar from '../../components/Navbar';

export default function KitsListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const authData = await getMe();
        if (!authData || !authData.success || !authData.user) {
          router.push('/login');
          return;
        }
        setUser(authData.user);

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

  const handleDeleteKit = async (kitId, kitTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${kitTitle || 'this kit'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await deleteKit(kitId);
      if (res && res.success) {
        setKits((prev) => prev.filter((k) => (k.id || k._id) !== kitId));
      } else {
        alert((res && res.message) || 'Failed to delete kit.');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete kit.');
    }
  };

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading interview kits...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800">
                &larr; Dashboard
              </Link>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Interview Kits
            </h1>
          </div>

          <Link
            href="/kits/new"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            + Create Interview Kit
          </Link>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Kit Grid / Empty State */}
        {kits.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-xs">
            <h3 className="text-base font-semibold text-slate-900">No interview kits created yet</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Get started by creating your first AI-tailored prep kit with company research, questions, and practice deck.
            </p>
            <div className="mt-6">
              <Link
                href="/kits/new"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Create First Kit
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kits.map((kit) => {
              const kitId = kit.id || kit._id;
              return (
                <div
                  key={kitId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {kit.days} {kit.days === 1 ? 'Day' : 'Days'}
                      </span>
                      {getStatusBadge(kit.status)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                      {kit.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 truncate">
                      <span className="font-semibold text-slate-600">Company:</span> {kit.companyUrl}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {kit.createdAt ? new Date(kit.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }) : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteKit(kitId, kit.title)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Kit"
                      >
                        Delete
                      </button>
                      <Link
                        href={`/kits/${kitId}`}
                        className="rounded-lg bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        Open Kit &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
