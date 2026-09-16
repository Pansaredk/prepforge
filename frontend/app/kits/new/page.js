'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createKit, generateKit, getMe } from '../../../lib/api';
import Navbar from '../../../components/Navbar';

export default function NewKitPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState('5');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => {
        if (!data || !data.success) {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [router]);

  const validateForm = () => {
    const errs = {};
    if (!title.trim()) {
      errs.title = 'Kit title or target role is required.';
    }

    if (!jobDescription.trim()) {
      errs.jobDescription = 'Job description is required to extract skills and requirements.';
    } else if (jobDescription.trim().length < 20) {
      errs.jobDescription = 'Job description is too short. Please paste more details.';
    }

    if (!companyUrl.trim()) {
      errs.companyUrl = 'Company website URL is required.';
    } else {
      try {
        const u = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
        if (!['http:', 'https:'].includes(u.protocol)) {
          errs.companyUrl = 'URL must use http or https protocol.';
        }
      } catch {
        errs.companyUrl = 'Please enter a valid URL (e.g. https://company.com).';
      }
    }

    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 60) {
      errs.days = 'Preparation days must be an integer between 1 and 60.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (andGenerate = false) => {
    setError('');
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // 1. Create kit
      const normalizedUrl = companyUrl.startsWith('http://') || companyUrl.startsWith('https://')
        ? companyUrl
        : `https://${companyUrl}`;

      const res = await createKit({
        title: title.trim(),
        jobDescription: jobDescription.trim(),
        companyUrl: normalizedUrl.trim(),
        days: parseInt(days, 10),
      });

      if (res && res.success && res.kit) {
        const kitId = res.kit.id || res.kit._id;

        // 2. Optionally trigger generation
        if (andGenerate) {
          try {
            await generateKit(kitId);
          } catch (genErr) {
            console.warn('Generation trigger notice:', genErr);
          }
        }

        router.push(`/kits/${kitId}`);
      } else {
        setError(res.message || 'Failed to create kit.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server.');
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800">
                &larr; Dashboard
              </Link>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Create New Interview Kit
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Provide the job description, company URL, and your prep timeline.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700">
              <span className="font-bold">Error: </span>
              {error}
            </div>
          )}

          {/* Form */}
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Kit Title / Target Role *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: null });
                }}
                placeholder="e.g. Senior Software Engineer – Stripe"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={submitting}
              />
              {fieldErrors.title && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="companyUrl" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Company Website URL *
                </label>
                <input
                  id="companyUrl"
                  type="text"
                  value={companyUrl}
                  onChange={(e) => {
                    setCompanyUrl(e.target.value);
                    if (fieldErrors.companyUrl) setFieldErrors({ ...fieldErrors, companyUrl: null });
                  }}
                  placeholder="https://stripe.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
                {fieldErrors.companyUrl ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.companyUrl}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Used for company research & context.</p>
                )}
              </div>

              <div>
                <label htmlFor="days" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Preparation Days (1 &ndash; 60) *
                </label>
                <input
                  id="days"
                  type="number"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    if (fieldErrors.days) setFieldErrors({ ...fieldErrors, days: null });
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
                {fieldErrors.days ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.days}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Schedule adapts to this exact duration.</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="jobDescription" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Job Description (JD) *
              </label>
              <textarea
                id="jobDescription"
                rows={9}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (fieldErrors.jobDescription) setFieldErrors({ ...fieldErrors, jobDescription: null });
                }}
                placeholder="Paste the full job description here (requirements, responsibilities, technical stack)..."
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={submitting}
              />
              {fieldErrors.jobDescription && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.jobDescription}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto text-center rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={() => handleCreate(false)}
                disabled={submitting}
                className="w-full sm:w-auto rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
              >
                Create Kit (Draft)
              </button>

              <button
                type="button"
                onClick={() => handleCreate(true)}
                disabled={submitting}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Creating & Generating...' : 'Generate Kit'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
