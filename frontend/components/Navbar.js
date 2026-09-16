'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../lib/api';

export default function Navbar({ user, onLogout }) {
  const router = useRouter();

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.push('/login');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Links */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-indigo-600">
              PrepForge
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/kits/new"
              className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition"
            >
              New Kit
            </Link>
          </nav>
        </div>

        {/* Right Auth Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {user.email && (
                <span className="text-xs text-slate-500 hidden md:inline">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
