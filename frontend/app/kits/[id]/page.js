'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getKitById, generateKit, getMe } from '../../../lib/api';

export default function KitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('brief');

  const fetchKit = useCallback(async () => {
    try {
      const res = await getKitById(id);
      if (res && res.success && res.kit) {
        setKit(res.kit);
        return res.kit;
      } else {
        setError(res.message || 'Failed to fetch kit details.');
        return null;
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server.');
      return null;
    }
  }, [id]);

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const auth = await getMe();
        if (!auth || !auth.success) {
          router.push('/login');
          return;
        }

        const data = await fetchKit();
        if (data) {
          setLoading(false);
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoad();
  }, [fetchKit, router]);

  // Polling effect when status is 'generating'
  useEffect(() => {
    let intervalId;

    if (kit && kit.status === 'generating') {
      intervalId = setInterval(async () => {
        const updated = await fetchKit();
        if (updated && (updated.status === 'completed' || updated.status === 'failed')) {
          clearInterval(intervalId);
        }
      }, 2500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [kit, fetchKit]);

  const handleStartGeneration = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateKit(id);
      await fetchKit();
    } catch (err) {
      setError(err.message || 'Failed to trigger kit generation.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading interview kit...</p>
      </main>
    );
  }

  if (error && !kit) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Kit Error</h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <div className="mt-6">
            <Link href="/kits" className="text-sm font-semibold text-indigo-600 hover:underline">
              &larr; Back to Kits
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!kit) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <Link href="/kits" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800">
              &larr; All Kits
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {kit.title}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Target: <span className="font-medium text-slate-700">{kit.companyUrl}</span> &bull; {kit.days} Days Preparation
            </p>
          </div>

          <div className="flex items-center gap-3">
            {kit.status === 'completed' && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Ready &bull; Completed
              </span>
            )}
            {kit.status === 'generating' && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse">
                Pipeline Running...
              </span>
            )}
            {kit.status === 'failed' && (
              <button
                onClick={handleStartGeneration}
                disabled={generating}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
              >
                {generating ? 'Retrying...' : 'Retry Generation'}
              </button>
            )}
            {kit.status === 'draft' && (
              <button
                onClick={handleStartGeneration}
                disabled={generating}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                {generating ? 'Starting...' : 'Run Generation Pipeline'}
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {kit.status === 'generating' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-8 text-center shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-600 border-r-transparent mb-4" />
            <h3 className="text-base font-bold text-amber-900">Generating your interview kit...</h3>
            <p className="mt-2 text-sm text-amber-700 max-w-lg mx-auto">
              PrepForge is researching the company, extracting JD requirements, generating mapped questions, verifying coverage, and designing your study schedule. This page updates automatically.
            </p>
          </div>
        )}

        {kit.status === 'failed' && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
            <h3 className="font-bold text-red-900">Pipeline Generation Failed</h3>
            <p className="mt-1">{kit.error || 'An unexpected error occurred during pipeline generation.'}</p>
          </div>
        )}

        {/* Completed Kit View */}
        {kit.status === 'completed' && (
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              {[
                { id: 'brief', label: 'Company & Role' },
                { id: 'requirements', label: `Requirements (${kit.requirements?.length || 0})` },
                { id: 'questions', label: `Question Bank (${kit.questionBank?.length || 0})` },
                { id: 'flashcards', label: `Flashcards (${kit.flashcards?.length || 0})` },
                { id: 'schedule', label: `Study Schedule (${kit.schedule?.days?.length || 0} Days)` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Company & Role */}
            {activeTab === 'brief' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Brief */}
                <div className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                    Company Brief
                  </h3>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Overview</h4>
                    <p className="mt-1 text-sm text-slate-700">{kit.companyBrief?.overview || 'Information grounded in JD.'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Industry & Domain</h4>
                    <p className="mt-1 text-sm text-slate-700">{kit.companyBrief?.industry || 'Technology'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Core Products & Offerings</h4>
                    <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-1">
                      {(kit.companyBrief?.products || []).map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Culture & Interview Context</h4>
                    <p className="mt-1 text-sm text-slate-700">{kit.companyBrief?.interviewContext || 'Prepare for technical depth and behavioral alignment.'}</p>
                  </div>
                </div>

                {/* Role Breakdown */}
                <div className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                    Role Breakdown
                  </h3>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Role Summary</h4>
                    <p className="mt-1 text-sm text-slate-700">{kit.roleBreakdown?.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Key Responsibilities</h4>
                    <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-1">
                      {(kit.roleBreakdown?.responsibilities || []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Required Skills</h4>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(kit.roleBreakdown?.requiredSkills || []).map((s, i) => (
                        <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400">Interview Focus Areas</h4>
                    <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-1">
                      {(kit.roleBreakdown?.interviewFocusAreas || []).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Requirements */}
            {activeTab === 'requirements' && (
              <div className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Extracted Job Requirements
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-medium">
                      Must-Have
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                      Nice-to-Have
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {(kit.requirements || []).map((req) => (
                    <div key={req.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5">
                          {req.id}
                        </span>
                        <p className="text-sm text-slate-800">{req.text}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          req.must
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {req.must ? 'Must-Have' : 'Nice-to-Have'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Question Bank */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                {(kit.questionBank || []).map((q) => (
                  <div key={q.id} className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {q.id}
                        </span>
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {q.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {q.durationMinutes} mins
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Mapped to:</span>
                        {(q.requirementIds || []).map((rId) => (
                          <span key={rId} className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {rId}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h4 className="text-base font-semibold text-slate-900 leading-snug">
                      {q.question}
                    </h4>

                    {Array.isArray(q.answerOutline) && q.answerOutline.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50 rounded-lg p-3">
                        <h5 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">
                          Recommended Answer Structure
                        </h5>
                        <ul className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                          {q.answerOutline.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: Flashcards */}
            {activeTab === 'flashcards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(kit.flashcards || []).map((fc) => (
                  <div key={fc.id} className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-mono">{fc.id}</span>
                        <span className="font-mono">Ref: {fc.questionId}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {fc.front}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 bg-indigo-50/50 rounded-lg p-3">
                      <span className="text-xs font-bold text-indigo-700 block mb-1">Key Takeaway</span>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {fc.back}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 5: Study Schedule */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                  <span>
                    Deterministic <strong>{kit.days} Days</strong> schedule calculated to prioritize core requirements earlier in your prep.
                  </span>
                  <span className="font-semibold">
                    Total Questions: {kit.questionBank?.length || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(kit.schedule?.days || []).map((d) => (
                    <div key={d.day} className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-2">
                          <span className="text-sm font-bold text-slate-900">
                            Day {d.day}
                          </span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {d.minutes} mins
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-indigo-700 mb-2">
                          {d.focus}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400 block mb-1">Assigned Questions:</span>
                        <div className="flex flex-wrap gap-1">
                          {(d.questionIds || []).map((qId) => (
                            <span key={qId} className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {qId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
