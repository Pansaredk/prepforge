'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getKitById,
  generateKit,
  getMe,
  updateKit,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateFlashcard,
  regenerateBrief,
  regenerateCategoryQuestions,
  regenerateSchedule,
  deleteKit,
} from '../../../lib/api';
import Navbar from '../../../components/Navbar';

export default function KitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = useState(null);
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('brief');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals state
  const [editingBriefModal, setEditingBriefModal] = useState(false);
  const [briefFormData, setBriefFormData] = useState({
    overview: '',
    industry: '',
    products: '',
    interviewContext: '',
    roleSummary: '',
    responsibilities: '',
    requiredSkills: '',
    interviewFocusAreas: '',
  });

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null means Add New
  const [questionFormData, setQuestionFormData] = useState({
    question: '',
    category: 'Technical',
    durationMinutes: 5,
    answerOutline: '',
    requirementIds: [],
    pinned: false,
  });

  const [newReqText, setNewReqText] = useState('');
  const [newReqMust, setNewReqMust] = useState(true);

  const [editingFcModal, setEditingFcModal] = useState(false);
  const [editingFc, setEditingFc] = useState(null);
  const [fcFormData, setFcFormData] = useState({ front: '', back: '' });

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
        if (!auth || !auth.success || !auth.user) {
          router.push('/login');
          return;
        }
        setUser(auth.user);

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

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

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

  const handleDeleteThisKit = async () => {
    if (!window.confirm(`Are you sure you want to delete "${kit?.title || 'this kit'}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await deleteKit(id);
      if (res && res.success) {
        router.push('/dashboard');
      } else {
        setError((res && res.message) || 'Failed to delete kit.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete kit.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- BRIEF EDITING ---
  const openEditBriefModal = () => {
    setBriefFormData({
      overview: kit.companyBrief?.overview || '',
      industry: kit.companyBrief?.industry || '',
      products: (kit.companyBrief?.products || []).join(', '),
      interviewContext: kit.companyBrief?.interviewContext || '',
      roleSummary: kit.roleBreakdown?.summary || '',
      responsibilities: (kit.roleBreakdown?.responsibilities || []).join('\n'),
      requiredSkills: (kit.roleBreakdown?.requiredSkills || []).join(', '),
      interviewFocusAreas: (kit.roleBreakdown?.interviewFocusAreas || []).join('\n'),
    });
    setEditingBriefModal(true);
  };

  const handleSaveBrief = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await updateKit(id, {
        companyBrief: {
          overview: briefFormData.overview.trim(),
          industry: briefFormData.industry.trim(),
          products: briefFormData.products.split(',').map((p) => p.trim()).filter(Boolean),
          interviewContext: briefFormData.interviewContext.trim(),
        },
        roleBreakdown: {
          summary: briefFormData.roleSummary.trim(),
          responsibilities: briefFormData.responsibilities.split('\n').map((r) => r.trim()).filter(Boolean),
          requiredSkills: briefFormData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
          interviewFocusAreas: briefFormData.interviewFocusAreas.split('\n').map((f) => f.trim()).filter(Boolean),
        },
      });
      if (res.success && res.kit) {
        setKit(res.kit);
        setEditingBriefModal(false);
        showSuccess('Company brief and role breakdown updated successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update brief.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateBrief = async () => {
    if (!window.confirm('Regenerate Company Brief and Role Breakdown from the original JD?')) return;
    setActionLoading(true);
    try {
      const res = await regenerateBrief(id);
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess('Brief and role breakdown regenerated successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate brief.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- REQUIREMENTS EDITING ---
  const handleToggleRequirementMust = async (reqId) => {
    const updated = (kit.requirements || []).map((r) =>
      r.id === reqId ? { ...r, must: !r.must } : r
    );
    try {
      const res = await updateKit(id, { requirements: updated });
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess('Requirement updated.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update requirement.');
    }
  };

  const handleDeleteRequirement = async (reqId) => {
    if (!window.confirm(`Delete requirement ${reqId}?`)) return;
    const updated = (kit.requirements || []).filter((r) => r.id !== reqId);
    try {
      const res = await updateKit(id, { requirements: updated });
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess('Requirement deleted.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete requirement.');
    }
  };

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    if (!newReqText.trim()) return;

    const existingNums = (kit.requirements || [])
      .map((r) => parseInt((r.id || '').replace('req-', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const newReqId = `req-${String(nextNum).padStart(3, '0')}`;

    const updated = [
      ...(kit.requirements || []),
      {
        id: newReqId,
        text: newReqText.trim(),
        must: newReqMust,
      },
    ];

    try {
      const res = await updateKit(id, { requirements: updated });
      if (res.success && res.kit) {
        setKit(res.kit);
        setNewReqText('');
        setNewReqMust(true);
        showSuccess('New requirement added.');
      }
    } catch (err) {
      setError(err.message || 'Failed to add requirement.');
    }
  };

  // --- QUESTION BANK EDITING ---
  const openAddQuestionModal = () => {
    setEditingQuestion(null);
    setQuestionFormData({
      question: '',
      category: categoryFilter !== 'All' ? categoryFilter : 'Technical',
      durationMinutes: 5,
      answerOutline: '',
      requirementIds: (kit.requirements || []).length > 0 ? [kit.requirements[0].id] : [],
      pinned: false,
    });
    setQuestionModalOpen(true);
  };

  const openEditQuestionModal = (q) => {
    setEditingQuestion(q);
    setQuestionFormData({
      question: q.question,
      category: q.category,
      durationMinutes: q.durationMinutes || 5,
      answerOutline: (q.answerOutline || []).join('\n'),
      requirementIds: q.requirementIds || [],
      pinned: !!q.pinned,
    });
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const outline = questionFormData.answerOutline
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingQuestion) {
        // Update existing question
        const res = await updateQuestion(id, editingQuestion.id, {
          question: questionFormData.question.trim(),
          category: questionFormData.category,
          durationMinutes: parseInt(questionFormData.durationMinutes, 10) || 5,
          answerOutline: outline,
          requirementIds: questionFormData.requirementIds,
          pinned: questionFormData.pinned,
        });
        if (res.success && res.kit) {
          setKit(res.kit);
          setQuestionModalOpen(false);
          showSuccess('Question updated successfully.');
        }
      } else {
        // Add new question
        const res = await addQuestion(id, {
          question: questionFormData.question.trim(),
          category: questionFormData.category,
          durationMinutes: parseInt(questionFormData.durationMinutes, 10) || 5,
          answerOutline: outline,
          requirementIds: questionFormData.requirementIds,
        });
        if (res.success && res.kit) {
          setKit(res.kit);
          setQuestionModalOpen(false);
          showSuccess('Question added to kit.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save question.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm(`Are you sure you want to delete question ${qId}? Associated flashcards and schedule assignments will also be updated.`)) return;
    try {
      const res = await deleteQuestion(id, qId);
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess(`Question ${qId} deleted.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete question.');
    }
  };

  const handleTogglePinQuestion = async (q) => {
    try {
      const res = await updateQuestion(id, q.id, { pinned: !q.pinned });
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess(q.pinned ? 'Question unpinned.' : 'Question pinned (protected from selective regeneration).');
      }
    } catch (err) {
      setError(err.message || 'Failed to toggle pin.');
    }
  };

  const handleMoveQuestion = async (index, direction) => {
    const list = [...(kit.questionBank || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const questionIds = list.map((q) => q.id);
    try {
      const res = await reorderQuestions(id, questionIds);
      if (res.success && res.kit) {
        setKit(res.kit);
      }
    } catch (err) {
      setError(err.message || 'Failed to reorder questions.');
    }
  };

  const handleRegenerateCategory = async (category) => {
    if (!window.confirm(`Regenerate ${category} questions? Unpinned and unedited questions in this category will be replaced. Pinned, edited, and user-created questions will be preserved.`)) return;
    setActionLoading(true);
    try {
      const res = await regenerateCategoryQuestions(id, category);
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess(`${category} questions regenerated while preserving custom edits!`);
      }
    } catch (err) {
      setError(err.message || `Failed to regenerate ${category} questions.`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- FLASHCARD EDITING ---
  const openEditFcModal = (fc) => {
    setEditingFc(fc);
    setFcFormData({ front: fc.front, back: fc.back });
    setEditingFcModal(true);
  };

  const handleSaveFlashcard = async (e) => {
    e.preventDefault();
    if (!editingFc) return;
    try {
      const res = await updateFlashcard(id, editingFc.id, {
        front: fcFormData.front.trim(),
        back: fcFormData.back.trim(),
      });
      if (res.success && res.kit) {
        setKit(res.kit);
        setEditingFcModal(false);
        showSuccess('Flashcard updated.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update flashcard.');
    }
  };

  // --- SCHEDULE REGENERATION ---
  const handleRegenerateSchedule = async () => {
    if (!window.confirm('Recalculate study schedule using the current question bank and requirements?')) return;
    setActionLoading(true);
    try {
      const res = await regenerateSchedule(id);
      if (res.success && res.kit) {
        setKit(res.kit);
        showSuccess('Study schedule recalculated successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading interview kit...</p>
      </div>
    );
  }

  if (error && !kit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 max-w-md mx-auto px-4 py-12 text-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">Kit Error</h2>
            <p className="mt-2 text-xs text-red-600">{error}</p>
            <div className="mt-6">
              <Link href="/dashboard" className="text-xs font-semibold text-indigo-600 hover:underline">
                &larr; Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!kit) return null;

  // Filter questions by category if selected
  const displayedQuestions = (kit.questionBank || []).filter((q) => {
    if (categoryFilter === 'All') return true;
    return q.category === categoryFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800">
              &larr; Back to Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {kit.title}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Target: <span className="font-medium text-slate-700">{kit.companyUrl}</span> &bull; {kit.days} Days Preparation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {kit.status === 'completed' && (
              <>
                <Link
                  href={`/kits/${id}/practice`}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition flex items-center gap-1.5"
                >
                  <span>Practice Flashcards &rarr;</span>
                </Link>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Ready &bull; Completed
                </span>
              </>
            )}
            {kit.status === 'generating' && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse">
                Generating...
              </span>
            )}
            {kit.status === 'failed' && (
              <button
                onClick={handleStartGeneration}
                disabled={generating}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
              >
                {generating ? 'Retrying...' : 'Retry Generation'}
              </button>
            )}
            {kit.status === 'draft' && (
              <button
                onClick={handleStartGeneration}
                disabled={generating}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                {generating ? 'Starting...' : 'Run Generation Pipeline'}
              </button>
            )}

            <button
              onClick={handleDeleteThisKit}
              disabled={actionLoading || generating}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
              title="Delete this kit"
            >
              Delete Kit
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-800 transition">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold underline text-red-800">Dismiss</button>
          </div>
        )}

        {/* Pipeline running status */}
        {kit.status === 'generating' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8 text-center shadow-xs">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-600 border-r-transparent mb-4" />
            <h3 className="text-base font-bold text-amber-900">Generating your interview kit...</h3>
            <p className="mt-2 text-xs sm:text-sm text-amber-700 max-w-lg mx-auto">
              PrepForge is researching the company, extracting JD requirements, generating mapped questions, verifying coverage, and designing your study schedule. This page updates automatically.
            </p>
          </div>
        )}

        {/* Failed status */}
        {kit.status === 'failed' && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
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
                { id: 'brief', label: 'Company Brief' },
                { id: 'requirements', label: `Requirements (${kit.requirements?.length || 0})` },
                { id: 'questions', label: `Question Bank (${kit.questionBank?.length || 0})` },
                { id: 'flashcards', label: `Flashcards (${kit.flashcards?.length || 0})` },
                { id: 'schedule', label: `Schedule (${kit.schedule?.days?.length || 0} Days)` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Company Brief */}
            {activeTab === 'brief' && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={openEditBriefModal}
                    className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 shadow-xs hover:bg-slate-50 transition"
                  >
                    Edit Company & Role
                  </button>
                  <button
                    onClick={handleRegenerateBrief}
                    disabled={actionLoading}
                    className="rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-xs hover:bg-indigo-100 transition"
                  >
                    {actionLoading ? 'Regenerating...' : 'Regenerate Brief'}
                  </button>
                </div>

                {/* Target Website Validation Status Card */}
                <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Target Company Website</h4>
                      <a
                        href={kit.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-medium text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {kit.companyUrl}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <div>
                      {(() => {
                        const primarySource = kit.research?.sources?.[0];
                        const hasErrors = kit.research?.errors && kit.research.errors.length > 0;
                        const status = primarySource?.status || (hasErrors ? 'INVALID' : 'UNCERTAIN');

                        if (status === 'VALID') {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Reachable Organization Website
                            </span>
                          );
                        } else if (status === 'UNCERTAIN') {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Uncertain Organization Signal
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 border border-rose-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Website Invalid / Unreachable
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 space-y-1.5">
                    {(() => {
                      const primarySource = kit.research?.sources?.[0];
                      const hasErrors = kit.research?.errors && kit.research.errors.length > 0;
                      const status = primarySource?.status || (hasErrors ? 'INVALID' : 'UNCERTAIN');

                      if (status === 'VALID') {
                        return (
                          <p className="text-emerald-800">
                            Website appears to be a reachable organization/company website. Research data was successfully gathered to enrich the company overview.
                          </p>
                        );
                      } else if (status === 'UNCERTAIN') {
                        return (
                          <p className="text-amber-800">
                            Website is reachable, but there is not enough information to determine whether it represents the intended company.
                          </p>
                        );
                      } else {
                        return (
                          <div className="space-y-1">
                            <p className="text-rose-800 font-medium">
                              Website could not be reached or does not appear to contain a meaningful company website.
                            </p>
                            {kit.research?.errors?.map((err, i) => (
                              <p key={i} className="text-slate-500 text-[11px]">• {err}</p>
                            ))}
                            <p className="text-slate-500 text-[11px] italic">
                              PrepForge successfully grounded the company brief and interview preparation material in the provided job description.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Brief */}
                  <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
                      Company Overview
                    </h3>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Overview</h4>
                      <p className="mt-1 text-xs text-slate-700">{kit.companyBrief?.overview || 'Information grounded in JD.'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Industry & Domain</h4>
                      <p className="mt-1 text-xs text-slate-700">{kit.companyBrief?.industry || 'Technology'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Core Products & Offerings</h4>
                      <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
                        {(kit.companyBrief?.products || []).map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Culture & Interview Context</h4>
                      <p className="mt-1 text-xs text-slate-700">{kit.companyBrief?.interviewContext || 'Prepare for technical depth and behavioral alignment.'}</p>
                    </div>
                  </div>

                  {/* Role Breakdown */}
                  <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
                      Role Breakdown
                    </h3>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Role Summary</h4>
                      <p className="mt-1 text-xs text-slate-700">{kit.roleBreakdown?.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Key Responsibilities</h4>
                      <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
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
                      <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
                        {(kit.roleBreakdown?.interviewFocusAreas || []).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Requirements */}
            {activeTab === 'requirements' && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Extracted Job Requirements
                      </h3>
                      <p className="text-xs text-slate-500">
                        {kit.coverage?.percentage || 0}% covered across {kit.coverage?.totalRequirements || (kit.requirements?.length || 0)} requirements.
                      </p>
                    </div>
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
                      <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5">
                            {req.id}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800">{req.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRequirementMust(req.id)}
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap transition cursor-pointer hover:opacity-80 ${
                              req.must
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                            title="Click to toggle Must / Nice-to-have"
                          >
                            {req.must ? 'Must-Have' : 'Nice-to-Have'}
                          </button>
                          <button
                            onClick={() => handleDeleteRequirement(req.id)}
                            className="text-xs text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded transition"
                            title="Delete Requirement"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Requirement Form */}
                <form onSubmit={handleAddRequirement} className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase text-slate-600 mb-3">Add Custom Requirement</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="e.g. 3+ years experience with distributed message queues (Kafka, RabbitMQ)"
                      value={newReqText}
                      onChange={(e) => setNewReqText(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newReqMust}
                        onChange={(e) => setNewReqMust(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Must-Have
                    </label>
                    <button
                      type="submit"
                      disabled={!newReqText.trim()}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      Add Requirement
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: Question Bank */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                {/* Actions & Category Filters */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    {['All', 'Technical', 'Behavioral', 'Situational'].map((cat) => {
                      const count = (kit.questionBank || []).filter((q) =>
                        cat === 'All' ? true : q.category === cat
                      ).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition cursor-pointer ${
                            categoryFilter === cat
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions & Selective Regeneration */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={openAddQuestionModal}
                      className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      + Add Question
                    </button>
                    <span className="text-slate-300">|</span>
                    {['Technical', 'Behavioral', 'Situational'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleRegenerateCategory(cat)}
                        disabled={actionLoading}
                        className="rounded-xl bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                        title={`Regenerate ${cat} questions while preserving pinned and edited items`}
                      >
                        Regen {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-4">
                  {displayedQuestions.map((q) => {
                    const originalIdx = (kit.questionBank || []).findIndex((item) => item.id === q.id);
                    return (
                      <div key={q.id} className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-3">
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
                            {q.pinned && (
                              <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                Pinned
                              </span>
                            )}
                            {q.edited && (
                              <span className="text-xs text-slate-400 italic">
                                (edited)
                              </span>
                            )}
                            {q.source === 'user' && (
                              <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                                User-added
                              </span>
                            )}
                          </div>

                          {/* Controls: Move Up/Down, Pin, Edit, Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveQuestion(originalIdx, -1)}
                              disabled={originalIdx === 0}
                              className="text-xs text-slate-400 hover:text-slate-800 disabled:opacity-30 p-1"
                              title="Move Up"
                            >
                              &uarr;
                            </button>
                            <button
                              onClick={() => handleMoveQuestion(originalIdx, 1)}
                              disabled={originalIdx === kit.questionBank.length - 1}
                              className="text-xs text-slate-400 hover:text-slate-800 disabled:opacity-30 p-1"
                              title="Move Down"
                            >
                              &darr;
                            </button>
                            <span className="text-slate-200 mx-1">|</span>
                            <button
                              onClick={() => handleTogglePinQuestion(q)}
                              className={`text-xs px-2 py-0.5 rounded border transition ${
                                q.pinned
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={q.pinned ? 'Unpin question' : 'Pin to protect from regeneration'}
                            >
                              {q.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => openEditQuestionModal(q)}
                              className="text-xs bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <h4 className="text-base font-semibold text-slate-900 leading-snug">
                          {q.question}
                        </h4>

                        {/* Requirement tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs text-slate-400">Mapped Requirements:</span>
                          {(q.requirementIds || []).map((rId) => (
                            <span key={rId} className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {rId}
                            </span>
                          ))}
                        </div>

                        {Array.isArray(q.answerOutline) && q.answerOutline.length > 0 && (
                          <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50 rounded-xl p-3">
                            <h5 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">
                              Recommended Answer Structure
                            </h5>
                            <ul className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                              {q.answerOutline.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Flashcards */}
            {activeTab === 'flashcards' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Study Flashcards</h3>
                    <p className="text-xs text-slate-500">
                      {kit.flashcards?.filter((f) => f.covered).length || 0} of {kit.flashcards?.length || 0} cards reviewed
                    </p>
                  </div>
                  <Link
                    href={`/kits/${id}/practice`}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    Launch Practice Mode &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(kit.flashcards || []).map((fc) => (
                    <div key={fc.id} className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-mono font-bold text-slate-500">{fc.id}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400">{fc.questionId}</span>
                            {fc.confidence && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                                  fc.confidence === 'high'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : fc.confidence === 'medium'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {fc.confidence}
                              </span>
                            )}
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {fc.front}
                        </h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 bg-indigo-50/40 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-indigo-700 block">Key Takeaways</span>
                          <button
                            onClick={() => openEditFcModal(fc)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {fc.back}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: Study Schedule */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-sm">
                      {kit.days} Days Preparation Plan &bull; {kit.questionBank?.length || 0} Total Questions
                    </span>
                    <p className="text-indigo-700 text-xs mt-0.5">
                      Deterministic schedule balancing topic distribution and coverage priority.
                    </p>
                  </div>
                  <button
                    onClick={handleRegenerateSchedule}
                    disabled={actionLoading}
                    className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap self-start sm:self-auto"
                  >
                    {actionLoading ? 'Recalculating...' : 'Regenerate Schedule'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(kit.schedule?.days || []).map((d) => (
                    <div key={d.day} className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
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
      </main>

      {/* --- MODAL: Edit Company Brief & Role --- */}
      {editingBriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Edit Company Overview & Role</h3>
            <form onSubmit={handleSaveBrief} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Overview</label>
                <textarea
                  rows={3}
                  value={briefFormData.overview}
                  onChange={(e) => setBriefFormData({ ...briefFormData, overview: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={briefFormData.industry}
                    onChange={(e) => setBriefFormData({ ...briefFormData, industry: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Core Products (comma-separated)</label>
                  <input
                    type="text"
                    value={briefFormData.products}
                    onChange={(e) => setBriefFormData({ ...briefFormData, products: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Culture & Interview Context</label>
                <textarea
                  rows={2}
                  value={briefFormData.interviewContext}
                  onChange={(e) => setBriefFormData({ ...briefFormData, interviewContext: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Summary</label>
                <textarea
                  rows={2}
                  value={briefFormData.roleSummary}
                  onChange={(e) => setBriefFormData({ ...briefFormData, roleSummary: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Key Responsibilities (one per line)</label>
                <textarea
                  rows={3}
                  value={briefFormData.responsibilities}
                  onChange={(e) => setBriefFormData({ ...briefFormData, responsibilities: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={briefFormData.requiredSkills}
                    onChange={(e) => setBriefFormData({ ...briefFormData, requiredSkills: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Focus Areas (one per line)</label>
                  <textarea
                    rows={2}
                    value={briefFormData.interviewFocusAreas}
                    onChange={(e) => setBriefFormData({ ...briefFormData, interviewFocusAreas: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingBriefModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add / Edit Question --- */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingQuestion ? `Edit Question (${editingQuestion.id})` : 'Add Custom Question'}
            </h3>
            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={3}
                  value={questionFormData.question}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                  placeholder="e.g. How would you design a distributed rate limiter in Node.js?"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={questionFormData.category}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Situational">Situational</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Duration (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={questionFormData.durationMinutes}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, durationMinutes: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Answer Outline (one point per line)</label>
                <textarea
                  rows={4}
                  value={questionFormData.answerOutline}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, answerOutline: e.target.value })}
                  placeholder="1. Token bucket algorithm overview&#10;2. Redis sliding log implementation&#10;3. Trade-offs and failover strategy"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mapped Requirements</label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {(kit.requirements || []).map((req) => (
                    <label key={req.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={questionFormData.requirementIds.includes(req.id)}
                        onChange={(e) => {
                          const curr = [...questionFormData.requirementIds];
                          if (e.target.checked) {
                            curr.push(req.id);
                          } else {
                            const i = curr.indexOf(req.id);
                            if (i !== -1) curr.splice(i, 1);
                          }
                          setQuestionFormData({ ...questionFormData, requirementIds: curr });
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono text-slate-500">{req.id}:</span>
                      <span className="text-slate-700 truncate">{req.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editingQuestion && (
                <label className="flex items-center gap-2 text-slate-700 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionFormData.pinned}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, pinned: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Pin this question (protect it from category regeneration)</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Flashcard --- */}
      {editingFcModal && editingFc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Edit Flashcard ({editingFc.id})</h3>
            <form onSubmit={handleSaveFlashcard} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Front (Prompt)</label>
                <textarea
                  rows={2}
                  value={fcFormData.front}
                  onChange={(e) => setFcFormData({ ...fcFormData, front: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Back (Key Points)</label>
                <textarea
                  rows={4}
                  value={fcFormData.back}
                  onChange={(e) => setFcFormData({ ...fcFormData, back: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingFcModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
