const { safeParseJson } = require('../utils/jsonParser');
const { buildComprehensiveQuestionBank } = require('./questionCatalog');

const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-flash';

/**
 * Calls LLM API with prompt and returns generated text or parsed JSON.
 * @param {string} prompt
 * @param {{ timeoutMs?: number, json?: boolean }} options
 * @returns {Promise<string | null>}
 */
async function callLlm(prompt, options = {}) {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || 15000;

  if (!apiKey) {
    return null; // Signals caller to use fallback generator
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          ...(options.json && { responseMimeType: 'application/json' })
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[LLM] API returned HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`[LLM] Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Extracts a factual, research-grounded Company Brief from crawled web content
 */
function extractCompanyBriefFromResearch(researchText, title = 'Target Role', companyUrl = '') {
  const cleanResearch = (researchText || '').trim();

  // If research is unavailable or too sparse (< 80 chars)
  if (!cleanResearch || cleanResearch.length < 80) {
    let domainHint = '';
    try {
      domainHint = new URL(companyUrl).hostname.replace(/^www\./, '');
    } catch {
      domainHint = companyUrl || 'the target company';
    }
    return {
      overview: `Company overview for ${domainHint} could not be determined from crawled sources. Context is grounded in the provided job description for ${title}.`,
      products: ['Specific products could not be determined from crawled sources'],
      industry: 'Could not be determined from crawled sources',
      culture: ['Hiring culture details could not be determined from crawled sources'],
      interviewContext: `Interviews focus on the core technical competencies and responsibilities specified in the job description for ${title}.`
    };
  }

  // 1. Extract titles and company name hint
  const sourceMatches = [...cleanResearch.matchAll(/---\s*SOURCE:\s*(https?:\/\/[^\s()]+)(?:\s*\((.*?)\))?\s*---/gi)];
  const pageTitles = sourceMatches.map((m) => (m[2] || '').trim()).filter(Boolean);

  let companyName = '';
  if (pageTitles.length > 0) {
    const rawTitle = pageTitles[0];
    const parts = rawTitle.split(/[-–—|:]/);
    if (parts.length > 1) {
      companyName = parts[0].trim();
      if (/careers\s+at|welcome\s+to|about\s+/i.test(companyName)) {
        companyName = parts[parts.length - 1].trim();
      }
    } else {
      companyName = rawTitle.trim();
    }
  }
  if (!companyName && companyUrl) {
    try {
      const h = new URL(companyUrl).hostname.replace(/^www\./, '');
      companyName = h.split('.')[0];
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    } catch {}
  }

  // 2. Extract Descriptive Overview Sentences
  const cleanBody = cleanResearch.replace(/---\s*SOURCE:.*?---\s*/gi, ' ');
  const rawSentences = cleanBody
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length >= 35 && s.length <= 260);

  const descPatterns = [
    /\b(?:is an?|helps|partner|provides|platform|leading|builds|develops|transforms|specializes in|delivers|accelerates|empowers|we help|we create|we build|we are)\b/i,
    /\b(?:solutions|services|software|engineering|technology|digital|products|enterprise|clients|customers|businesses)\b/i
  ];

  const overviewSentences = [];
  for (const s of rawSentences) {
    if (/cookie|privacy policy|terms of use|all rights reserved|copyright|click here|learn more|skip to|newsletter/i.test(s)) {
      continue;
    }
    if (descPatterns[0].test(s) && descPatterns[1].test(s)) {
      overviewSentences.push(s);
      if (overviewSentences.length >= 3) break;
    }
  }

  let overview = '';
  if (overviewSentences.length > 0) {
    overview = overviewSentences.join(' ');
  } else if (rawSentences.length > 0) {
    overview = rawSentences.slice(0, 2).join(' ');
  } else {
    overview = `Organization identified as ${companyName || 'the target company'}, though specific narrative overview could not be determined from crawled sources.`;
  }

  // 3. Extract Products & Offerings
  const products = [];
  const productNamedRegexes = [
    /\b([A-Z][a-zA-Z0-9]+(?:AI|Platform|Cloud|Data|Services|Solutions|Suite|Lab|Hub|Pods))\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}(?:\s+(?:Modernization|Engineering|Experiences|Platform|Operations|Management|Analytics|Testing|Architecture)))\b/g
  ];

  for (const regex of productNamedRegexes) {
    let match;
    while ((match = regex.exec(cleanBody)) !== null) {
      let prod = match[1].trim().replace(/^(?:Our|The|This|And|In|With|For|Of)\s+/i, '');
      // Avoid repetitive or noisy tokens
      if (
        prod.length >= 3 &&
        prod.length <= 45 &&
        !products.includes(prod) &&
        !/^(The|This|Our|Join|With|From|Learn|Explore|Previous|Next|About|Talk|Software|Digital|United|States|Privacy|Terms)$/i.test(prod)
      ) {
        // Strip duplicate phrase if text had "Practice Name Practice Name"
        const words = prod.split(/\s+/);
        if (words.length >= 4 && words.slice(0, 2).join(' ').toLowerCase() === words.slice(2, 4).join(' ').toLowerCase()) {
          prod = words.slice(0, 2).join(' ');
        }
        if (!products.includes(prod)) {
          products.push(prod);
        }
      }
      if (products.length >= 5) break;
    }
  }

  if (products.length === 0) {
    const serviceKeywords = ['Digital Product Engineering', 'Technology Consulting', 'Cloud & Architecture', 'Data & Analytics', 'Enterprise Modernization'];
    for (const sk of serviceKeywords) {
      if (new RegExp(sk, 'i').test(cleanBody)) {
        products.push(sk);
      }
    }
  }
  if (products.length === 0) {
    products.push('Technology & Engineering Services (specific branded offerings not enumerated in crawled pages)');
  }

  // 4. Extract Industry & Domain
  const industryKeywords = [
    { label: 'AI & Cognitive Computing', regex: /\b(?:artificial intelligence|AI-native|machine learning|cognitive computing|agentic)\b/i },
    { label: 'Digital Product Engineering & Technology Consulting', regex: /\b(?:digital product|product engineering|technology consulting|software development services)\b/i },
    { label: 'Cloud & Infrastructure Services', regex: /\b(?:cloud-native|cloud architecture|devops|infrastructure)\b/i },
    { label: 'Data Science & Enterprise Analytics', regex: /\b(?:data science|analytics|business intelligence|data foundations)\b/i },
    { label: 'Financial Technology (Fintech)', regex: /\b(?:fintech|financial services|payments|banking)\b/i },
    { label: 'Healthcare & Life Sciences', regex: /\b(?:healthcare|health tech|life sciences|medical)\b/i },
    { label: 'Enterprise Software & SaaS', regex: /\b(?:enterprise software|saas|b2b software)\b/i }
  ];

  const matchedIndustries = [];
  for (const ind of industryKeywords) {
    if (ind.regex.test(cleanBody)) {
      matchedIndustries.push(ind.label);
    }
  }
  const industry = matchedIndustries.length > 0
    ? matchedIndustries.slice(0, 2).join(' / ')
    : 'Software & Technology Services';

  // 5. Extract Culture & Work Environment
  const culturePoints = [];
  const culturePatterns = [
    { label: 'Product-Centric Engineering Mindset', regex: /\b(?:product mindset|product-centric|engineering excellence)\b/i },
    { label: 'Global Cross-Border Collaboration', regex: /\b(?:global workforce|global team|citizen of the world|collaborate together)\b/i },
    { label: 'Continuous Learning & Practice-Aligned Career Growth', regex: /\b(?:continuous learning|professional growth|accelerate career|development opportunities|practices)\b/i },
    { label: 'Flexible & Remote-Friendly Environment', regex: /\b(?:work from anywhere|flexible work|remote|hybrid)\b/i },
    { label: 'Emphasis on Employee Well-being', regex: /\b(?:well-being|fitness|mental health|generous time off)\b/i },
    { label: 'Agile & Collaborative Delivery Pods', regex: /\b(?:agile|scrum|cross-functional|delivery teams|pods)\b/i }
  ];

  for (const cult of culturePatterns) {
    if (cult.regex.test(cleanBody)) {
      culturePoints.push(cult.label);
    }
  }
  if (culturePoints.length === 0) {
    culturePoints.push('Collaborative engineering culture focused on technical delivery');
  }

  // 6. Interview Context
  const interviewContext = `Interviews evaluate hands-on technical problem solving, engineering best practices, and alignment with ${companyName || 'the organization'}'s delivery standards.`;

  return {
    overview,
    products: products.slice(0, 4),
    industry,
    culture: culturePoints.slice(0, 3),
    interviewContext
  };
}

function isBehavioralPhrase(phrase) {
  if (!phrase) return false;
  return /\b(?:cross[- ]functional|interpersonal|team\s+player|work\s+(?:effectively\s+)?with\s+teams?|team\s+collaboration|communication\s+skills?|agile\s+mindset|stakeholder\s+management|organizational\s+skills?|positive\s+attitude|fast[- ]paced\s+environment|collaborate\s+with\s+(?:product|design|team))\b/i.test(phrase);
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Checks whether a candidate skill or technology is explicitly traceable to the Job Description
 */
function isTraceableToJd(skill, jd) {
  if (!skill || typeof skill !== 'string') return false;
  const cleanSkill = skill.trim();
  if (!cleanSkill) return false;
  const cleanJd = jd || '';

  // 1. Exact or word-boundary check in JD
  const escaped = cleanSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(cleanJd)) {
    return true;
  }

  // 2. Handle slashes, hyphens, and whitespace (e.g. "Git/GitHub" -> check "Git" and "GitHub" in JD)
  const subParts = cleanSkill.split(/[\/\-\s]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
  if (
    subParts.length > 0 &&
    subParts.every((part) => new RegExp(`(?:^|\\W)${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\W)`, 'i').test(cleanJd))
  ) {
    return true;
  }

  // 3. Normalized concept mapping to root keywords
  const conceptRootKeywords = {
    'Database Management': /\bdatabases?\b/i,
    'Software Testing': /\b(?:testing|tests?)\b/i,
    'Problem Solving': /\bproblem[- ]solving\b/i,
    'Debugging': /\bdebugging\b/i,
    'API Integration': /\b(?:apis?|integration)\b/i,
    'Asynchronous Programming': /\b(?:asynchronous|async)\b/i,
    'Cloud Deployment': /\bcloud\b/i,
    'Backend Development': /\bbackend\b/i,
    'Frontend Development': /\b(?:frontend|web\s+applications?)\b/i
  };

  if (conceptRootKeywords[cleanSkill] && conceptRootKeywords[cleanSkill].test(cleanJd)) {
    return true;
  }

  return false;
}

/**
 * Normalizes a raw phrase or technology mention into a concise canonical skill/technology name.
 * Returns null if the phrase is behavioral, noise, or unmentioned.
 */
function normalizeSkillCandidate(rawToken, rawJd) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  let token = rawToken.trim();
  if (!token) return null;

  if (isBehavioralPhrase(token)) return null;

  token = token
    .replace(/^[*•\-\d.]+\s*/, '')
    .replace(/^(?:strong|good|solid|proven|hands-on|deep|basic|extensive|practical|working|demonstrated|in-depth|\d+\+?\s+years(?:\s+of)?)\s+/i, '')
    .replace(/^(?:proficiency in|knowledge of|experience (?:working\s+)?(?:with|in)|understanding of|familiarity with|expertise in|skills? in|ability to|background in|exposure to|in)\s+/i, '')
    .replace(/^(?:building|developing|designing|implementing|maintaining|working with)\s+/i, '')
    .replace(/[\s,]+skills?$/i, '')
    .trim();

  if (!token || isBehavioralPhrase(token)) return null;

  // 1. Explicit Technologies (Preserve exact canonical casing only when present in token)
  if (/^javascript$/i.test(token) || /\bjavascript\b/i.test(token)) return 'JavaScript';
  if (/^typescript$/i.test(token) || /\btypescript\b/i.test(token)) return 'TypeScript';
  if (/^node(?:\.js)?$/i.test(token) || /\bnode(?:\.js)?\b/i.test(token)) return 'Node.js';
  if (/^express(?:\.js)?$/i.test(token) || /\bexpress(?:\.js)?\b/i.test(token)) return 'Express.js';
  if (/^react(?:\.js)?$/i.test(token) || /\breact(?:\.js)?\b/i.test(token)) return 'React.js';
  if (/^next(?:\.js)?$/i.test(token) || /\bnext(?:\.js)?\b/i.test(token)) return 'Next.js';
  if (/^vue(?:\.js)?$/i.test(token) || /\bvue(?:\.js)?\b/i.test(token)) return 'Vue.js';
  if (/^angular$/i.test(token) || /\bangular\b/i.test(token)) return 'Angular';
  if (/^mongodb$/i.test(token) || /\bmongodb\b/i.test(token)) return 'MongoDB';
  if (/^postgresql|postgres$/i.test(token) || /\bpostgres(?:ql)?\b/i.test(token)) return 'PostgreSQL';
  if (/^mysql$/i.test(token) || /\bmysql\b/i.test(token)) return 'MySQL';
  if (/^redis$/i.test(token) || /\bredis\b/i.test(token)) return 'Redis';
  if (/^git(?:\s+(?:and|&)\s+github|\/github)?$/i.test(token) || /\bgit(?:hub)?\b/i.test(token)) return 'Git/GitHub';
  if (/^html5?$/i.test(token)) return 'HTML';
  if (/^css3?$/i.test(token)) return 'CSS';
  if (/^rest(?:ful)?(?:\s+apis?)?$/i.test(token) || /\brest(?:ful)?(?:\s+apis?)?\b/i.test(token)) return 'REST APIs';
  if (/^graphql$/i.test(token) || /\bgraphql\b/i.test(token)) return 'GraphQL';
  if (/^docker$/i.test(token)) return 'Docker';
  if (/^kubernetes|k8s$/i.test(token)) return 'Kubernetes';
  if (/^aws$/i.test(token)) return 'AWS';
  if (/^gcp|google cloud$/i.test(token)) return 'GCP';
  if (/^azure$/i.test(token)) return 'Azure';
  if (/^python$/i.test(token)) return 'Python';
  if (/^java$/i.test(token)) return 'Java';
  if (/^go|golang$/i.test(token)) return 'Go';

  // 2. Normalized Concepts
  if (/\b(?:other\s+databases|relational\s+and\s+nosql\s+databases|database\s+management|databases)\b/i.test(token)) {
    return 'Database Management';
  }
  if (/\basynchronous\s+programming|async\/await|event\s+loop\b/i.test(token)) {
    return 'Asynchronous Programming';
  }
  if (/\bapi\s+integration(?:\s+with\s+.*)?\b/i.test(token)) {
    return 'API Integration';
  }
  if (/\bproblem[- ]solving\b/i.test(token)) {
    return 'Problem Solving';
  }
  if (/\bdebugging\b/i.test(token)) {
    return 'Debugging';
  }
  if (/\b(?:software\s+development\s+and\s+testing(?:\s+practices)?|testing\s+practices|software\s+testing|automated\s+testing|unit\s+testing)\b/i.test(token)) {
    return 'Software Testing';
  }
  if (/\bbackend\s+development|backend\s+services\b/i.test(token)) {
    return 'Backend Development';
  }
  if (/\bfrontend\s+development\b/i.test(token)) {
    return 'Frontend Development';
  }
  if (/\bcloud\s+deployment|cloud\s+infrastructure\b/i.test(token)) {
    return 'Cloud Deployment';
  }

  if (/\b(?:third[- ]party|frontend\s+services|cross[- ]functional|methodologies?)\b/i.test(token)) {
    return null;
  }

  // 3. Fallback for clean short tokens (<= 3 words, < 30 chars)
  const words = token.split(/\s+/);
  if (words.length <= 3 && token.length <= 30 && !/^(?:and|or|with|to|in|of|for|on|the|a|an)$/i.test(token)) {
    return toTitleCase(token);
  }

  return null;
}

/**
 * Parses a Job Description into structural sections: overview, requirements, niceToHave, and responsibilities
 */
function parseJdSections(jd) {
  const normalized = (jd || '').replace(/(?:^|[.!?]|\b)\s*(Requirements|Qualifications|Nice to have|Preferred Qualifications?|Responsibilities|Duties)[\s:]+/gi, (m, p1) => `\n${p1}:\n`);
  const lines = normalized.split(/\r?\n/);
  const sections = {
    overview: [],
    requirements: [],
    niceToHave: [],
    responsibilities: []
  };

  let currentSection = 'overview';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^(?:responsibilities|key responsibilities|duties|what you(?:'ll| will) do|the role)[\s:]*$/i.test(line)) {
      currentSection = 'responsibilities';
      continue;
    }
    if (/^(?:requirements|qualifications|what you need|what we(?:'re| are) looking for|core requirements|must[- ]have(?:s)?|skills(?: required)?)[\s:]*$/i.test(line)) {
      currentSection = 'requirements';
      continue;
    }
    if (/^(?:nice to have(?:s)?|preferred qualifications?|bonus points?|good to have|desired skills?|preferred skills?|plus(?:es)?)[\s:]*$/i.test(line)) {
      currentSection = 'niceToHave';
      continue;
    }

    sections[currentSection].push(line);
  }

  return sections;
}

/**
 * Extracts concise normalized skills from a requirement line and verifies traceability to the JD
 */
function extractSkillsFromLine(line, rawJd) {
  const cleanLine = line.replace(/^[*\-•\d.]+\s*/, '').trim();
  if (!cleanLine || isBehavioralPhrase(cleanLine)) return [];

  const sentences = cleanLine.split(/(?<=[.!?])\s+/);
  const results = [];

  for (const sentence of sentences) {
    const s = sentence.replace(/[.!?]+$/, '').trim();
    if (!s || isBehavioralPhrase(s)) continue;

    if (/software\s+development\s+and\s+testing(?:\s+practices)?/i.test(s)) {
      results.push('Software Testing');
      continue;
    }

    if (/git\s+and\s+github/i.test(s)) {
      results.push('Git/GitHub');
      continue;
    }

    const parts = s.split(/,\s*|\s+(?:and|or|&)\s+/i).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const normalized = normalizeSkillCandidate(part, rawJd);
      if (normalized && !results.includes(normalized) && isTraceableToJd(normalized, rawJd)) {
        results.push(normalized);
      }
    }

    if (results.length === 0) {
      const wholeNorm = normalizeSkillCandidate(s, rawJd);
      if (wholeNorm && !results.includes(wholeNorm) && isTraceableToJd(wholeNorm, rawJd)) {
        results.push(wholeNorm);
      }
    }
  }

  return results;
}

/**
 * Extracts a factual, strictly JD-grounded Role Breakdown without inventing technologies
 */
function extractRoleBreakdownFromJd(jd, title = 'Software Engineer') {
  const cleanJd = (jd || '').trim();
  const sections = parseJdSections(cleanJd);

  // 1. Extract responsibilities directly from JD
  let responsibilities = sections.responsibilities
    .map((l) => l.replace(/^[*\-•\d.]+\s*/, '').trim())
    .filter(Boolean);

  if (responsibilities.length === 0) {
    const lines = cleanJd.split(/\r?\n/).map((l) => l.replace(/^[*\-•\d.]+\s*/, '').trim()).filter(Boolean);
    for (const l of lines) {
      if (/\b(?:develop|build|design|manage|maintain|architect|integrate|implement|debug|write|lead|collaborate|test)\b/i.test(l)) {
        if (!/requirements|qualifications|nice to have|salary|benefits/i.test(l) && !isBehavioralPhrase(l)) {
          responsibilities.push(l);
        }
      }
    }
  }

  if (responsibilities.length === 0) {
    responsibilities = [
      `Execute core engineering tasks and deliverables for ${title}`,
      'Collaborate effectively with team members to deliver project milestones'
    ];
  }

  // 2. Extract Required Skills & Nice-to-Have Skills strictly from the JD
  const reqSkillsList = [];
  const reqSourcePhrases = new Map();

  for (const line of sections.requirements) {
    const extracted = extractSkillsFromLine(line, cleanJd);
    for (const item of extracted) {
      if (!reqSkillsList.includes(item)) {
        reqSkillsList.push(item);
        reqSourcePhrases.set(item, line.replace(/^[*\-•\d.]+\s*/, '').trim());
      }
    }
  }

  const niceSkillsList = [];
  const niceSourcePhrases = new Map();

  for (const line of sections.niceToHave) {
    const extracted = extractSkillsFromLine(line, cleanJd);
    for (const item of extracted) {
      if (!niceSkillsList.includes(item) && !reqSkillsList.includes(item)) {
        niceSkillsList.push(item);
        niceSourcePhrases.set(item, line.replace(/^[*\-•\d.]+\s*/, '').trim());
      }
    }
  }

  // If no explicit requirement sections were present (e.g. unstructured JD)
  if (reqSkillsList.length === 0) {
    const lines = cleanJd.split(/\r?\n/).map((l) => l.replace(/^[*\-•\d.]+\s*/, '').trim()).filter(Boolean);
    for (const line of lines) {
      if (/nice to have|preferred/i.test(line)) continue;
      const extracted = extractSkillsFromLine(line, cleanJd);
      for (const item of extracted) {
        if (!reqSkillsList.includes(item)) {
          reqSkillsList.push(item);
          reqSourcePhrases.set(item, line);
        }
      }
    }
  }

  // If still empty (e.g. minimal JD), extract traceable key tokens
  if (reqSkillsList.length === 0) {
    const candidateTokens = cleanJd.split(/[\s,;.!?:()]+/).filter((w) => w.length >= 3);
    for (const tok of candidateTokens) {
      if (!/developer|engineer|looking|experience|strong|solid|build|with|high|performance|dashboards/i.test(tok)) {
        const norm = normalizeSkillCandidate(tok, cleanJd);
        if (norm && isTraceableToJd(norm, cleanJd) && !reqSkillsList.includes(norm)) {
          reqSkillsList.push(norm);
          reqSourcePhrases.set(norm, tok);
        }
      }
    }
  }

  // 3. Extract Role Purpose / Summary from JD
  let summary = '';
  if (sections.overview.length > 0) {
    summary = sections.overview.join(' ').trim();
  } else if (responsibilities.length > 0) {
    summary = `${title} role focused on ${responsibilities[0].toLowerCase().replace(/^develop\s+/, 'developing ')}.`;
  } else {
    summary = `Targeted ${title} role responsible for core responsibilities outlined in the job description.`;
  }

  // 4. Interview Focus Areas derived ONLY from extracted requirements and responsibilities
  const focusAreas = [];
  const hasFrontend = reqSkillsList.some((s) => /react|html|css|vue|angular|frontend/i.test(s));
  const hasBackend = reqSkillsList.some((s) => /node|express|api|rest|backend/i.test(s));
  const hasDb = reqSkillsList.some((s) => /mongo|sql|database|postgres/i.test(s));
  const hasVersionControl = reqSkillsList.some((s) => /git/i.test(s));
  const hasProblemSolving = reqSkillsList.some((s) => /problem[- ]solving|debug/i.test(s));

  if (hasFrontend) {
    const feSkills = reqSkillsList.filter((s) => /react|html|css|vue|angular|frontend/i.test(s)).join(', ');
    focusAreas.push(`Frontend Web Architecture & UI Design (${feSkills})`);
  }
  if (hasBackend) {
    const beSkills = reqSkillsList.filter((s) => /node|express|api|rest|backend/i.test(s)).join(', ');
    focusAreas.push(`Backend API Engineering & Services (${beSkills})`);
  }
  if (hasDb) {
    const dbSkills = reqSkillsList.filter((s) => /mongo|sql|database|postgres/i.test(s)).join(', ');
    focusAreas.push(`Database Design & Data Management (${dbSkills})`);
  }
  if (hasVersionControl) {
    focusAreas.push('Version Control & Collaborative Workflows (Git/GitHub)');
  }
  if (hasProblemSolving) {
    focusAreas.push('Practical Problem Solving, Application Debugging & Code Quality');
  }

  // Fallback focus areas strictly from responsibilities
  if (focusAreas.length === 0) {
    for (const resp of responsibilities.slice(0, 4)) {
      focusAreas.push(resp);
    }
  }

  return {
    summary,
    responsibilities: responsibilities.slice(0, 7),
    requiredSkills: reqSkillsList,
    niceToHaveSkills: niceSkillsList,
    interviewFocusAreas: focusAreas.slice(0, 5),
    sources: Object.fromEntries(reqSourcePhrases)
  };
}

/**
 * Intelligent deterministic fallback generator for when LLM is unavailable or unconfigured
 */
function generateHeuristicResponse(type, context = {}) {
  const jd = (context.jobDescription || '').trim();
  const title = (context.title || 'Software Engineer').trim();
  const researchText = (context.researchText || '').trim();
  const companyUrl = (context.companyUrl || '').trim();

  // Extract JD-grounded role breakdown without any generic technology list
  const roleData = extractRoleBreakdownFromJd(jd, title);
  const detectedTech = roleData.requiredSkills;

  // Fallback if very thin JD
  if (detectedTech.length === 0) {
    detectedTech.push('Core Software Development', 'Problem Solving', 'System Design', 'Communication');
  }

  if (type === 'requirements') {
    const reqs = [];
    let count = 1;

    // Scale requirements with detected skills: 4 to 8 technical requirements
    const maxTechReqs = Math.min(detectedTech.length, 8);
    for (let i = 0; i < maxTechReqs; i++) {
      const isMust = i < Math.min(4, Math.ceil(maxTechReqs * 0.6));
      reqs.push({
        id: `req-${String(count).padStart(3, '0')}`,
        text: `Proficiency in ${detectedTech[i]} and associated engineering best practices`,
        must: isMust,
        nice: !isMust
      });
      count++;
    }

    // Add behavioral / communication requirement
    reqs.push({
      id: `req-${String(count).padStart(3, '0')}`,
      text: 'Cross-functional collaboration and clear technical communication',
      must: true,
      nice: false
    });

    return { requirements: reqs };
  }

  if (type === 'companyBrief') {
    return extractCompanyBriefFromResearch(researchText, title, companyUrl);
  }

  if (type === 'roleBreakdown') {
    return extractRoleBreakdownFromJd(jd, title);
  }

  if (type === 'questions') {
    const requirements = context.requirements || [];
    const roleTitle = context.title || title || 'Software Engineer';
    const questions = buildComprehensiveQuestionBank(requirements, roleTitle);
    return { questions };
  }

  if (type === 'missingQuestions') {
    const uncovered = context.uncoveredRequirements || [];
    const startIndex = context.existingQuestionCount || 1;
    const questions = [];

    uncovered.forEach((req, idx) => {
      const qId = `q-${String(startIndex + idx + 1).padStart(3, '0')}`;
      questions.push({
        id: qId,
        category: 'Technical',
        question: `Deep Dive: Walk through a production implementation scenario and design trade-offs when applying ${req.text}.`,
        answerOutline: [
          'Core theoretical fundamentals and engineering constraints',
          'Concrete implementation details and error mitigation strategies',
          'Production monitoring, scalability, and test validation approach'
        ],
        requirementIds: [req.id],
        durationMinutes: 7,
        source: 'generated',
        edited: false,
        pinned: false
      });
    });

    return { questions };
  }

  return null;
}

module.exports = {
  callLlm,
  generateHeuristicResponse,
  safeParseJson,
  isTraceableToJd,
  extractRoleBreakdownFromJd
};
