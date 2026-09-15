/**
 * Flashcard Generation Service
 * Generates concise study flashcards from the question bank
 */

/**
 * Creates flashcards mapped to questions in the question bank
 * @param {Array<{ id: string, question: string, answerOutline: string[] }>} questionBank
 * @returns {Array<{ id: string, questionId: string, front: string, back: string, confidence: null, covered: boolean }>}
 */
function generateFlashcards(questionBank) {
  if (!Array.isArray(questionBank)) return [];

  const flashcards = [];

  questionBank.forEach((q, idx) => {
    const fcId = `fc-${String(idx + 1).padStart(3, '0')}`;

    // Front: Clean question prompt
    const front = q.question;

    // Back: Key takeaway synthesized from answer outline
    let back = '';
    if (Array.isArray(q.answerOutline) && q.answerOutline.length > 0) {
      back = q.answerOutline.slice(0, 3).map((pt, i) => `${i + 1}. ${pt}`).join('\n');
    } else {
      back = 'Focus on core principles, trade-offs, and practical production experience.';
    }

    flashcards.push({
      id: fcId,
      questionId: q.id,
      front,
      back,
      confidence: null,
      covered: false
    });
  });

  return flashcards;
}

module.exports = {
  generateFlashcards
};
