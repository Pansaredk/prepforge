'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logout } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const data = await getMe();
        if (isMounted) {
          if (data && data.success && data.user) {
            setUser(data.user);
          } else {
            router.push('/login');
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

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-slate-600">Verifying authentication...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between rounded-xl bg-white px-6 py-4 border border-slate-200 shadow-sm">
          <div>
            <span className="text-lg font-bold text-slate-900">PrepForge</span>
            <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Stage 2
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:inline">
              Logged in as: <strong className="text-slate-800">{user.email}</strong>
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition disabled:opacity-50"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </nav>

        {/* Dashboard Welcome Card */}
        <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome to PrepForge
          </h1>
          <p className="mt-3 text-base text-slate-600">
            You are successfully authenticated via HttpOnly MongoDB-backed session cookies.
          </p>

          <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
              User Profile
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Email Address</dt>
                <dd className="mt-1 font-medium text-slate-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">User ID</dt>
                <dd className="mt-1 font-mono text-xs text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded inline-block">
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Authentication Method</dt>
                <dd className="mt-1 text-emerald-600 font-medium">Session Cookie (HttpOnly)</dd>
              </div>
              <div>
                <dt className="text-slate-500">Session Store</dt>
                <dd className="mt-1 text-slate-700 font-medium">MongoDB (connect-mongo)</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}
