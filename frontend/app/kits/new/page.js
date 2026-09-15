'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createKit, generateKit, getMe } from '../../../lib/api';

export default function NewKitPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState('5');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => {
        if (!data || !data.success) {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a kit title.');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please paste the job description.');
      return;
    }

    if (!companyUrl.trim()) {
      setError('Please provide a company URL.');
      return;
    }

    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 60) {
      setError('Preparation duration must be between 1 and 60 days.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create kit in draft status
      const res = await createKit({
        title: title.trim(),
        jobDescription: jobDescription.trim(),
        companyUrl: companyUrl.trim(),
        days: daysNum
      });

      if (res && res.success && res.kit) {
        const kitId = res.kit.id || res.kit._id;
        // 2. Trigger asynchronous generation pipeline
        try {
          await generateKit(kitId);
        } catch {
          // Even if triggering had a brief issue, proceed to kit view where generation can be retried
        }

        router.push(`/kits/${kitId}`);
      } else {
        setError(res.message || 'Failed to create kit.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'Error creating interview kit. Please check inputs.');
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/kits" className="text-sm font-semibold text-indigo-600 hover:underline">
            &larr; Back to My Kits
          </Link>
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-semibold text-indigo-700">
            Stage 3 Pipeline
          </span>
        </div>

        <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create AI Interview Prep Kit
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Input the role details, job description, and company website to research the company, extract requirements, and build your personalized prep kit.
          </p>

          {error && (
            <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              <span className="font-semibold">Error: </span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                Kit Title / Target Role *
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer at Stripe"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="companyUrl" className="block text-sm font-medium text-slate-700">
                Company Website URL *
              </label>
              <input
                id="companyUrl"
                type="url"
                required
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-slate-500">
                Our crawler researches this domain to extract culture, mission, and interview signals.
              </p>
            </div>

            <div>
              <label htmlFor="days" className="block text-sm font-medium text-slate-700">
                Preparation Duration (Days, 1 &ndash; 60) *
              </label>
              <input
                id="days"
                type="number"
                min="1"
                max="60"
                required
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-slate-500">
                The deterministic study schedule will allocate your question bank across exactly this number of days.
              </p>
            </div>

            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-700">
                Job Description (JD) *
              </label>
              <textarea
                id="jobDescription"
                rows={8}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description, requirements, responsibilities, and qualifications..."
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                disabled={submitting}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Link
                href="/kits"
                className="rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
              >
                {submitting ? 'Creating & Starting Pipeline...' : 'Generate Prep Kit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
