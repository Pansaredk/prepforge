/**
 * Deterministic Requirement Coverage Service
 * Pure JavaScript application logic (NO LLM)
 */

/**
 * Checks requirement coverage against a question bank.
 * @param {Array<{ id: string, text: string, must: boolean, nice: boolean }>} requirements
 * @param {Array<{ id: string, requirementIds: string[] }>} questionBank
 * @param {number} passes
 * @returns {{
 *   passes: number,
 *   mustCovered: string[],
 *   mustUncovered: string[],
 *   niceCovered: string[],
 *   niceUncovered: string[],
 *   isComplete: boolean
 * }}
 */
function checkCoverage(requirements, questionBank, passes = 1) {
  const coveredReqIds = new Set();

  // Aggregate all requirement IDs mapped by any question in the bank
  for (const q of questionBank) {
    if (Array.isArray(q.requirementIds)) {
      for (const rId of q.requirementIds) {
        coveredReqIds.add(rId);
      }
    }
  }

  const mustCovered = [];
  const mustUncovered = [];
  const niceCovered = [];
  const niceUncovered = [];

  for (const req of requirements) {
    const isCovered = coveredReqIds.has(req.id);

    if (req.must) {
      if (isCovered) {
        mustCovered.push(req.id);
      } else {
        mustUncovered.push(req.id);
      }
    } else {
      if (isCovered) {
        niceCovered.push(req.id);
      } else {
        niceUncovered.push(req.id);
      }
    }
  }

  return {
    passes,
    mustCovered,
    mustUncovered,
    niceCovered,
    niceUncovered,
    isComplete: mustUncovered.length === 0
  };
}

module.exports = {
  checkCoverage
};
