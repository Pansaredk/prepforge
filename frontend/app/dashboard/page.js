'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getKits, logout } from '../../lib/api';
import Navbar from '../../components/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const authData = await getMe();
        if (!isMounted) return;

        if (!authData || !authData.success || !authData.user) {
          router.push('/login');
          return;
        }
        setUser(authData.user);

        const kitsData = await getKits();
        if (isMounted) {
          if (kitsData && kitsData.success) {
            setKits(kitsData.kits || []);
          } else {
            setError(kitsData.message || 'Failed to load kits.');
          }
        }
      } catch (err) {
        if (isMounted) {
          router.push('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    } finally {
      router.push('/login');
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
        <p className="text-sm text-slate-500">Loading PrepForge Dashboard...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage your interview preparation kits and launch practice sessions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/kits/new"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              + Create New Kit
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Existing Interview Kits Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Existing Interview Kits
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Total: {kits.length}
            </span>
          </div>

          {kits.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-xs">
              <h3 className="text-base font-semibold text-slate-900">No interview kits created yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Paste a job description and company URL to generate targeted questions, flashcards, and a day-by-day study schedule.
              </p>
              <div className="mt-6">
                <Link
                  href="/kits/new"
                  className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Create Your First Kit
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
                      {/* Status & Days header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {kit.days} {kit.days === 1 ? 'Day' : 'Days'}
                        </span>
                        {getStatusBadge(kit.status)}
                      </div>

                      {/* Kit Title */}
                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        {kit.title}
                      </h3>

                      {/* Company */}
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        <span className="font-semibold text-slate-600">Target:</span> {kit.companyUrl}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {kit.createdAt ? new Date(kit.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        }) : ''}
                      </span>
                      <Link
                        href={`/kits/${kitId}`}
                        className="rounded-lg bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        Open Kit &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
