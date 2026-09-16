'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getKitById, updateFlashcard, getMe } from '../../../../lib/api';
import Navbar from '../../../../components/Navbar';

export default function PracticeModePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = useState(null);
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingConfidence, setSavingConfidence] = useState(false);

  // Confidence session tally
  const [sessionRatings, setSessionRatings] = useState({
    low: 0,
    medium: 0,
    high: 0,
  });

  const fetchKit = useCallback(async () => {
    try {
      const res = await getKitById(id);
      if (res && res.success && res.kit) {
        setKit(res.kit);
        return res.kit;
      } else {
        setError(res.message || 'Failed to load kit');
        return null;
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server');
      return null;
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      try {
        const auth = await getMe();
        if (!auth || !auth.success || !auth.user) {
          router.push('/login');
          return;
        }
        setUser(auth.user);

        const data = await fetchKit();
        if (data) setLoading(false);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [fetchKit, router]);

  // Smart queue priority:
  // 1. Uncovered cards first (covered === false or confidence === null)
  // 2. Low confidence
  // 3. Medium confidence
  // 4. High confidence
  const queue = useMemo(() => {
    if (!kit || !Array.isArray(kit.flashcards) || kit.flashcards.length === 0) {
      return [];
    }

    const priorityScore = (fc) => {
      if (!fc.covered || !fc.confidence) return 0; // Top priority
      if (fc.confidence === 'low') return 1;
      if (fc.confidence === 'medium') return 2;
      return 3; // high
    };

    return [...kit.flashcards].sort((a, b) => priorityScore(a) - priorityScore(b));
  }, [kit]);

  const currentCard = queue[currentIndex] || null;

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleRateConfidence = async (level) => {
    if (!currentCard || savingConfidence) return;

    setSavingConfidence(true);

    // Optimistically record session rating
    setSessionRatings((prev) => ({
      ...prev,
      [level]: prev[level] + 1,
    }));

    try {
      await updateFlashcard(id, currentCard.id, {
        confidence: level,
        covered: true,
      });

      // Update local card state in kit
      setKit((prev) => {
        if (!prev) return prev;
        const updated = prev.flashcards.map((fc) =>
          fc.id === currentCard.id ? { ...fc, confidence: level, covered: true } : fc
        );
        return { ...prev, flashcards: updated };
      });
    } catch (err) {
      console.error('Failed to update flashcard confidence:', err);
    } finally {
      setSavingConfidence(false);
      setRevealed(false);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setRevealed(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < queue.length) {
      setRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setRevealed(false);
    setCurrentIndex(0);
    setSessionRatings({ low: 0, medium: 0, high: 0 });
    fetchKit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading flashcards...</p>
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 max-w-md mx-auto px-4 py-12 text-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">Practice Mode Error</h2>
            <p className="mt-2 text-xs text-red-600">{error || 'Kit not found'}</p>
            <div className="mt-6">
              <Link href={`/kits/${id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                &larr; Back to Kit
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 max-w-md mx-auto px-4 py-12 text-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">No Flashcards Available</h2>
            <p className="mt-2 text-xs text-slate-500">This kit does not have any flashcards generated yet.</p>
            <div className="mt-6">
              <Link href={`/kits/${id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                &larr; Back to Kit Builder
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Link
              href={`/kits/${id}`}
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800"
            >
              &larr; Back to Kit Builder
            </Link>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Practice Mode &bull; {kit.title}
            </h1>
          </div>

          <div className="text-right flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
              {currentIndex + 1} / {queue.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.round(((currentIndex + 1) / queue.length) * 100)}%`,
            }}
          />
        </div>

        {/* Active Flashcard View */}
        {currentCard && (
          <div className="space-y-6">
            {/* Card Container */}
            <div className="min-h-[300px] rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col justify-between">
              {/* Card Header Info */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-600 uppercase">{currentCard.id}</span>
                    <span className="font-mono text-slate-400">Ref: {currentCard.questionId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentCard.covered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Covered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Unreviewed
                      </span>
                    )}

                    {currentCard.confidence && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          currentCard.confidence === 'high'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentCard.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentCard.confidence}
                      </span>
                    )}
                  </div>
                </div>

                {/* Front Prompt */}
                <div className="py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block mb-2">
                    Question Prompt
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                    {currentCard.front}
                  </h2>
                </div>
              </div>

              {/* Back / Answer Section */}
              {revealed ? (
                <div className="mt-6 pt-5 border-t border-slate-200 bg-indigo-50/40 rounded-xl p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block mb-2">
                    Key Answer Talking Points
                  </span>
                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleReveal}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    Reveal Answer
                  </button>
                </div>
              )}
            </div>

            {/* Self Rating Bar (Shown only after reveal) */}
            {revealed && (
              <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-xs text-center space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Rate your confidence:
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleRateConfidence('low')}
                    disabled={savingConfidence}
                    className="flex-1 max-w-[130px] rounded-lg bg-red-50 text-red-700 border border-red-200 py-2 text-xs font-bold hover:bg-red-100 transition"
                  >
                    Low
                  </button>
                  <button
                    onClick={() => handleRateConfidence('medium')}
                    disabled={savingConfidence}
                    className="flex-1 max-w-[130px] rounded-lg bg-amber-50 text-amber-700 border border-amber-200 py-2 text-xs font-bold hover:bg-amber-100 transition"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleRateConfidence('high')}
                    disabled={savingConfidence}
                    className="flex-1 max-w-[130px] rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    High
                  </button>
                </div>
              </div>
            )}

            {/* Navigation: Previous / Next buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                &larr; Previous
              </button>

              <button
                onClick={handleRestart}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Restart Deck
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === queue.length - 1}
                className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
