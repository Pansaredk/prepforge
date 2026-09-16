/**
 * Comprehensive Domain Question Catalog & Generation Engine
 * Generates rich, realistic interview questions grounded directly in JD requirements.
 */

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'explain', 'describe', 'discuss', 'would', 'could', 'should', 'with',
  'from', 'this', 'that', 'these', 'those', 'have', 'your', 'about', 'does',
  'into', 'using', 'between', 'under', 'their', 'there', 'been', 'being'
]);

/**
 * Deduplicates a list of questions using exact matching and token Jaccard similarity
 * @param {Array<object>} questions
 * @returns {Array<object>} Unique questions
 */
function deduplicateQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  const seenExact = new Set();
  const seenTokenSets = [];
  const unique = [];

  for (const q of questions) {
    if (!q || typeof q.question !== 'string') continue;
    const text = q.question.trim();
    const lower = text.toLowerCase();

    if (seenExact.has(lower)) continue;

    // Tokenize significant content words (>3 chars, non-stopwords)
    const tokens = lower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    let isDuplicate = false;
    for (const existingSet of seenTokenSets) {
      if (tokens.length === 0 || existingSet.size === 0) continue;
      const intersection = tokens.filter((t) => existingSet.has(t)).length;
      const union = new Set([...tokens, ...existingSet]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      if (jaccard > 0.80) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) continue;

    seenExact.add(lower);
    seenTokenSets.push(new Set(tokens));
    unique.push(q);
  }

  return unique;
}

/**
 * Domain-specific question templates mapped by technology keyword
 */
const DOMAIN_QUESTION_BANK = {
  'javascript': [
    {
      category: 'Technical',
      question: 'How does the JavaScript runtime execute code through the event loop, call stack, and task queues? Distinguish microtasks from macrotasks.',
      answerOutline: [
        'Call stack executes synchronous code; Web APIs handle asynchronous tasks',
        'Microtasks (Promises, queueMicrotask) execute immediately after current call stack before rendering',
        'Macrotasks (setTimeout, setInterval, I/O) are processed one per event loop tick'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'Explain the difference between `var`, `let`, and `const` regarding scope, hoisting, and the temporal dead zone. When should each be used?',
      answerOutline: [
        'var is function-scoped and hoisted with undefined; let and const are block-scoped',
        'Temporal Dead Zone (TDZ) prevents accessing let/const before their lexical declaration',
        'Use const by default for immutability, let for reassignable variables, and avoid var'
      ],
      durationMinutes: 5
    },
    {
      category: 'Technical',
      question: 'How do `async/await` and Promises handle asynchronous control flow? How do you run concurrent independent tasks with `Promise.all` versus `Promise.allSettled`?',
      answerOutline: [
        'async/await is syntactic sugar over Promises, turning asynchronous code into readable linear flow',
        'Promise.all fails fast if any promise rejects, aborting other results',
        'Promise.allSettled waits for all promises to fulfill or reject, returning full status inspection'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'What causes memory leaks in modern JavaScript web applications, and how do you diagnose and resolve closures retaining detached DOM elements?',
      answerOutline: [
        'Unremoved event listeners, stale global variables, and uncancelled timers retain memory',
        'Closures holding references to outer scope variables prevent garbage collection',
        'Use Chrome DevTools Memory tab heap snapshots to identify detached DOM trees and retainers'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'How would you implement a robust debounce and throttle utility in JavaScript? Explain the key differences in their execution timing and use cases.',
      answerOutline: [
        'Debounce delays execution until a set delay has elapsed since the last invocation (e.g. search input)',
        'Throttle guarantees execution at most once per defined time interval (e.g. scroll/resize listeners)',
        'Implement debounce using clearTimeout and throttle using timestamp comparisons or flags'
      ],
      durationMinutes: 7
    }
  ],

  'react': [
    {
      category: 'Technical',
      question: "Explain how React's Virtual DOM reconciliation and Fiber architecture optimize UI updates compared to direct browser DOM manipulation.",
      answerOutline: [
        'Virtual DOM keeps a lightweight tree representation of UI in memory',
        'Diffing algorithm compares previous and current Virtual DOM trees with O(n) heuristic complexity',
        'Fiber architecture breaks reconciliation into incremental, interruptible units of work'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How does the `useEffect` dependency array govern execution timing? How do you handle cleanup functions to prevent memory leaks and race conditions?',
      answerOutline: [
        'Empty array runs on mount; specified dependencies re-run when shallow comparison changes',
        'Cleanup function executes before component unmount or before the effect re-runs',
        'Prevent race conditions in async effects using cancellation flags or AbortController'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'When would you choose React Context API versus an external state management library (like Redux or Zustand)? What are the rendering performance implications?',
      answerOutline: [
        'Context API is ideal for low-frequency global data like themes, localization, or user auth',
        'Context triggers re-renders on all consuming components whenever any part of value changes',
        'Zustand/Redux support fine-grained selectors preventing unnecessary component re-renders'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How do you diagnose and resolve unnecessary component re-renders in a large React application? Discuss `React.memo`, `useCallback`, and `useMemo`.',
      answerOutline: [
        'Profile re-renders using React DevTools Profiler to identify components re-rendering without prop changes',
        'React.memo prevents re-rendering if props are shallowly equal',
        'useCallback caches function references; useMemo caches expensive computation results'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'How would you implement an efficient virtualized list in React for rendering thousands of items without freezing the browser?',
      answerOutline: [
        'DOM virtualization only renders items currently visible inside the viewport scroll container',
        'Calculate item offsets and total virtual container height dynamically',
        'Use libraries like react-window/react-virtualized or custom intersection observer techniques'
      ],
      durationMinutes: 8
    }
  ],

  'next.js': [
    {
      category: 'Technical',
      question: 'Explain the differences between Server Components and Client Components in Next.js App Router. When should a component use the `"use client"` directive?',
      answerOutline: [
        'Server Components render strictly on the server with zero client JavaScript bundle size',
        'Client Components execute on client and server to support useState, useEffect, and DOM listeners',
        'Use "use client" at the boundary where browser interactivity or client hooks are needed'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How do Static Site Generation (SSG), Server-Side Rendering (SSR), and Incremental Static Regeneration (ISR) work in Next.js?',
      answerOutline: [
        'SSG pre-renders HTML at build time for optimal CDN caching and performance',
        'SSR renders HTML on demand per request for personalized or highly dynamic data',
        'ISR revalidates and regenerates static pages in background without full site rebuilds'
      ],
      durationMinutes: 7
    }
  ],

  'node.js': [
    {
      category: 'Technical',
      question: 'Explain the architecture of Node.js, specifically the single-threaded event loop and how libuv offloads asynchronous I/O to the thread pool.',
      answerOutline: [
        'V8 executes JavaScript code on a single main thread',
        'libuv provides cross-platform event-driven asynchronous I/O and a configurable worker thread pool (UV_THREADPOOL_SIZE)',
        'Network I/O utilizes non-blocking OS primitives (epoll/kqueue); file system I/O runs in thread pool'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'How do Node.js Streams work, and why are they critical when processing large files or handling HTTP uploads without exhausting available RAM?',
      answerOutline: [
        'Streams process data chunk by chunk rather than loading the entire payload into memory',
        'Readable, Writable, Duplex, and Transform stream types handle different data pipelines',
        'Piping streams manages backpressure automatically when consumer is slower than producer'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'What is the recommended strategy for centralized error handling in Node.js, and how do you handle `uncaughtException` and `unhandledRejection` in production?',
      answerOutline: [
        'Create custom Operational Error classes distinguishing expected errors from programmatic bugs',
        'Use centralized error-handling middleware for Express and async wrapper functions',
        'Log uncaught exceptions with full stack traces and gracefully restart process via PM2 or container orchestrator'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How do you scale a Node.js application to take advantage of multi-core servers? Discuss the Cluster module and worker processes.',
      answerOutline: [
        'Node.js main process runs on a single CPU core by default',
        'Cluster module forks multiple child processes that share server ports via round-robin IPC',
        'In cloud container environments, scale horizontally across pods/containers behind load balancers'
      ],
      durationMinutes: 6
    }
  ],

  'express': [
    {
      category: 'Technical',
      question: 'Explain the middleware execution pipeline in Express.js. How do request, response, and the `next()` callback interact during request processing?',
      answerOutline: [
        'Middleware functions execute sequentially in the order registered via app.use()',
        'Each middleware can modify req and res or terminate request by sending a response',
        'Calling next() passes control to next middleware; passing an argument (next(err)) jumps directly to error handler'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'How do you implement secure user authentication in Express using session cookies versus JWTs? What security headers and cookie flags should be configured?',
      answerOutline: [
        'Session cookies store session ID in HttpOnly, SameSite, Secure cookies backed by MongoDB/Redis store',
        'JWTs are stateless but require secure storage and token revocation/refresh mechanisms',
        'Configure Helmet for security headers, rate limiting to prevent brute force, and strict CORS policies'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How do you design a clean, modular Express application architecture that separates routing, controller logic, and database service layers?',
      answerOutline: [
        'Routes define HTTP endpoints and mount middleware validators',
        'Controllers parse and validate request parameters and format HTTP responses',
        'Services encapsulate business logic and database interactions independently of HTTP'
      ],
      durationMinutes: 6
    }
  ],

  'mongodb': [
    {
      category: 'Technical',
      question: 'When designing a MongoDB schema, how do you decide between embedding subdocuments versus referencing separate collections? Discuss performance trade-offs.',
      answerOutline: [
        'Embedding provides atomic updates and high read performance with single-query retrieval',
        'Use referencing when related data grows unboundedly (preventing 16MB document size limit) or is shared across entities',
        'Balance query access patterns: embed for 1-to-few; reference for 1-to-many or high write frequency'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'Explain how compound indexes work in MongoDB and how the Equality-Sort-Range (ESR) rule applies to query optimization. How do you analyze an `explain()` plan?',
      answerOutline: [
        'Compound indexes index multiple fields together in defined directional order',
        'ESR rule: place Equality fields first, Sort fields second, and Range query fields last',
        'Inspect explain("executionStats") for IXSCAN vs COLLSCAN and totalDocsExamined vs nReturned'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'How does the MongoDB Aggregation Pipeline operate? Explain how to construct a pipeline using `$match`, `$group`, `$lookup`, and `$project`.',
      answerOutline: [
        'Aggregation pipeline processes documents in sequence through multi-stage data transformation stages',
        '$match filters early to leverage indexes and reduce working data size',
        '$group aggregates metrics, $lookup joins foreign collections, and $project reshapes fields'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How does MongoDB maintain high availability and data durability across replica sets? Explain Write Concern (`w: "majority"`) and Read Preferences.',
      answerOutline: [
        'Replica sets have one Primary node accepting writes and multiple Secondary nodes replicating oplog',
        'Write Concern w: "majority" guarantees write is committed to a majority of nodes before acknowledging',
        'Read Preferences (primary, secondaryPreferred) balance read scalability against eventual consistency'
      ],
      durationMinutes: 7
    }
  ],

  'rest': [
    {
      category: 'Technical',
      question: 'Explain HTTP method idempotency and safety. Why is PUT considered idempotent while POST is not, and what are the appropriate HTTP status codes for each?',
      answerOutline: [
        'Safe methods (GET, HEAD) do not modify server state; Idempotent methods (GET, PUT, DELETE) can be repeated without changing outcome',
        'PUT replaces the resource entirely and produces the same result on multiple identical calls',
        'POST creates new subordinate resources (status 201 Created); PUT returns 200 OK or 204 No Content'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'How do you design REST APIs to handle high concurrency with rate limiting, pagination (cursor vs offset), and idempotency keys?',
      answerOutline: [
        'Cursor-based pagination outperforms offset pagination on large datasets and prevents skipped/duplicated records',
        'Rate limiting (Token Bucket or Sliding Window) protects endpoints from exhaustion and abuse',
        'Idempotency keys cached in Redis prevent double-billing or duplicate entity creation on network retries'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'What constitutes a production-grade REST API error response format, and how should validation errors versus server-side exceptions be formatted?',
      answerOutline: [
        'Consistent JSON structure: status code, standardized error code, human-readable message, and field validation array',
        'Return 400 Bad Request / 422 Unprocessable Entity for client validation failures with specific field details',
        'Never expose internal stack traces or database schema details in 500 Internal Server Error payloads'
      ],
      durationMinutes: 6
    }
  ],

  'html': [
    {
      category: 'Technical',
      question: 'Explain semantic HTML and why it is critical for accessibility (a11y), SEO, and maintainable document structure.',
      answerOutline: [
        'Semantic tags (<main>, <article>, <section>, <nav>, <header>) convey meaning to browsers and screen readers',
        'Screen readers build landmark navigation trees from semantic elements without requiring excessive ARIA overrides',
        'Search engine crawlers prioritize semantic headings (h1-h6) and article boundaries for indexing'
      ],
      durationMinutes: 5
    }
  ],

  'css': [
    {
      category: 'Technical',
      question: 'Explain the core architectural differences between CSS Flexbox and CSS Grid. In what layout scenarios is one preferred over the other?',
      answerOutline: [
        'Flexbox is one-dimensional (content-first row or column flow)',
        'CSS Grid is two-dimensional (layout-first simultaneous rows and columns control)',
        'Use Flexbox for component alignment, navbars, and item lists; use Grid for page-level structural layouts'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'What are Core Web Vitals (LCP, FID/INP, CLS), and what frontend CSS/HTML optimization techniques improve them in production?',
      answerOutline: [
        'Largest Contentful Paint (LCP) measures loading speed; optimize via image compression, CDN, and font preloading',
        'Interaction to Next Paint (INP) measures responsiveness; minimize long JavaScript tasks on the main thread',
        'Cumulative Layout Shift (CLS) measures visual stability; always specify width/height on images and dynamic content'
      ],
      durationMinutes: 7
    }
  ],

  'git': [
    {
      category: 'Technical',
      question: 'Explain the difference between `git merge` and `git rebase`. When is rebasing preferred, and how do you resolve merge conflicts safely?',
      answerOutline: [
        'git merge preserves complete historical branch topology with a merge commit',
        'git rebase replays your commits on top of the target branch, producing a clean linear project history',
        'Never rebase public shared branches; resolve conflicts step by step and verify with git status and tests'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: 'What branching strategies (e.g. GitHub Flow, Trunk-Based Development) best facilitate continuous integration and high-velocity code reviews?',
      answerOutline: [
        'GitHub Flow uses short-lived feature branches merged into main via pull requests after automated CI checks',
        'Trunk-Based Development minimizes merge drift with frequent small daily commits to main behind feature flags',
        'Automated CI tests, linting, and required peer reviews ensure main branch remains deployable at all times'
      ],
      durationMinutes: 6
    }
  ],

  'typescript': [
    {
      category: 'Technical',
      question: 'Explain the differences between TypeScript `type` aliases and `interface` declarations. How do generics and union types improve application safety?',
      answerOutline: [
        'Interfaces support declaration merging and object contracts; type aliases support unions, primitives, and tuples',
        'Generics enable reusable components that maintain type relationships without using `any`',
        'Union types and discriminated unions enforce exhaustiveness checking in switch/if branches'
      ],
      durationMinutes: 7
    },
    {
      category: 'Technical',
      question: 'How do you use TypeScript utility types (`Partial`, `Pick`, `Omit`, `Record`) and type narrowing guards in production code?',
      answerOutline: [
        'Partial makes all properties optional; Pick and Omit selectively construct sub-types',
        'Record<K, T> types object mappings with known key sets',
        'Type guards (typeof, instanceof, user-defined is predicate) narrow broad types safely at runtime'
      ],
      durationMinutes: 7
    }
  ],

  'python': [
    {
      category: 'Technical',
      question: 'How does Python handle memory management, garbage collection, and the Global Interpreter Lock (GIL)? What are the implications for concurrency?',
      answerOutline: [
        'Memory managed via private heap, reference counting, and cyclic garbage collector',
        'GIL prevents multiple native threads from executing Python bytecodes simultaneously in CPython',
        'Use multiprocessing or async event loops for CPU-bound or high-concurrency I/O tasks respectively'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'Explain the differences between WSGI and ASGI in Python web frameworks (such as Flask, Django, and FastAPI). How does async I/O function in FastAPI?',
      answerOutline: [
        'WSGI handles synchronous request-response flow; ASGI supports asynchronous coroutines and WebSockets',
        'FastAPI builds on Starlette/Uvicorn utilizing async def endpoints for non-blocking I/O operations',
        'Avoid blocking synchronous calls inside async route handlers to prevent freezing event loop'
      ],
      durationMinutes: 7
    }
  ],

  'sql': [
    {
      category: 'Technical',
      question: 'Explain the ACID properties in relational databases and the trade-offs among database transaction isolation levels.',
      answerOutline: [
        'Atomicity, Consistency, Isolation, Durability guarantee reliable database transaction processing',
        'Isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) balance concurrency vs consistency',
        'Higher isolation levels prevent dirty reads, non-repeatable reads, and phantom reads at the cost of locking overhead'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: 'How do B-tree indexes speed up SQL queries, and why might an unindexed foreign key cause serious performance bottlenecks or deadlocks?',
      answerOutline: [
        'B-tree indexes maintain sorted balanced tree allowing logarithmic O(log n) searches, range scans, and sorting',
        'Unindexed foreign keys trigger full table scans on parent table deletes/updates',
        'Lack of foreign key indexes can cause table-level share locks, resulting in concurrent write deadlocks'
      ],
      durationMinutes: 8
    }
  ],

  'docker': [
    {
      category: 'Technical',
      question: 'Explain the difference between a Docker image and a container. How do multi-stage Docker builds optimize production container size and security?',
      answerOutline: [
        'An image is a read-only layered template; a container is a running instance with a thin writable layer',
        'Multi-stage builds separate compile/build dependencies from minimal runtime environments (e.g. Alpine/Distroless)',
        'Significantly reduces final image size and eliminates build tools from production attack surface'
      ],
      durationMinutes: 7
    }
  ],

  'cloud': [
    {
      category: 'Technical',
      question: 'How do you architect a highly available, fault-tolerant web application in the cloud (e.g. AWS) utilizing load balancers and multi-AZ deployments?',
      answerOutline: [
        'Deploy stateless application servers across multiple Availability Zones behind an Application Load Balancer',
        'Utilize managed databases with automated Multi-AZ failover and read replicas',
        'Offload static assets to S3 and CloudFront CDN while using Auto Scaling Groups for traffic spikes'
      ],
      durationMinutes: 8
    }
  ],

  'testing': [
    {
      category: 'Technical',
      question: 'Explain the Testing Pyramid (Unit, Integration, End-to-End). What are the trade-offs between test execution speed, mocking, and production fidelity?',
      answerOutline: [
        'Unit tests are fast and isolated, validating individual functions with mocks',
        'Integration tests verify component communication with databases and external services',
        'End-to-end tests provide highest confidence simulating real user workflows but are slowest and flakiest'
      ],
      durationMinutes: 6
    }
  ]
};

/**
 * Standard behavioral questions assessing core competencies (STAR format)
 */
const BEHAVIORAL_QUESTIONS = [
  {
    category: 'Behavioral',
    question: 'Describe a situation where you had a fundamental technical disagreement with a colleague or lead regarding architecture or implementation. How did you resolve it?',
    answerOutline: [
      'Context: Outline the technical disagreement, architectural context, and conflicting viewpoints',
      'Action: Objective data gathering, benchmarking/prototyping, and facilitating a constructive discussion',
      'Result: Final aligned decision reached, delivery impact, and maintaining positive team cohesion'
    ],
    durationMinutes: 7
  },
  {
    category: 'Behavioral',
    question: 'Tell me about a high-severity production outage or critical bug you had to triage under pressure. Walk through your investigation, resolution, and post-mortem.',
    answerOutline: [
      'Context: Describe the incident severity, customer impact, and timeline constraints',
      'Action: Initial containment, log/metric analysis, root cause isolation, and coordinated hotfix release',
      'Result: System recovery, blameless post-mortem findings, and automated guardrails implemented to prevent recurrence'
    ],
    durationMinutes: 8
  },
  {
    category: 'Behavioral',
    question: 'Describe a project where you had to balance delivering a critical feature under a tight deadline while maintaining code quality and avoiding excessive technical debt.',
    answerOutline: [
      'Context: Feature requirements, business deadline, and technical complexity involved',
      'Action: Pragmatic scoping, modular architecture allowing future extension, and explicit technical debt documentation',
      'Result: On-time feature launch, measurable business outcome, and subsequent planned refactoring'
    ],
    durationMinutes: 7
  },
  {
    category: 'Behavioral',
    question: 'Tell me about a time you had to quickly learn and adopt an unfamiliar technology, library, or system to deliver a project. How did you get up to speed?',
    answerOutline: [
      'Context: Reason for introducing the unfamiliar technology and project stakes',
      'Action: Rapid documentation study, building small proof-of-concept prototypes, and consulting community practices',
      'Result: Successful production integration, knowledge sharing with team, and lessons learned'
    ],
    durationMinutes: 6
  }
];

/**
 * Standard role-specific / system design questions based on role context
 */
const ROLE_SPECIFIC_QUESTIONS = [
  {
    category: 'Role-specific',
    question: 'Walk through the end-to-end lifecycle of a user request in a modern full-stack web application: from client UI interaction down to database persistence and back.',
    answerOutline: [
      'Client event triggers HTTP request with authorization headers and JSON payload',
      'API gateway / reverse proxy routes request through TLS termination, rate limiting, and CORS verification',
      'Controller parses request, validates schema, invokes service business logic, executes database transaction, and returns standardized response'
    ],
    durationMinutes: 9
  },
  {
    category: 'Role-specific',
    question: 'How do you protect a web application from common vulnerabilities such as Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), and Injection attacks?',
    answerOutline: [
      'XSS: Context-aware output encoding, React automatic escaping, and strict Content Security Policy (CSP)',
      'CSRF: SameSite cookie attributes (Lax/Strict), Anti-CSRF tokens, and custom header validation',
      'Injection: Parameterized queries, ORM/ODM sanitization, and strict input validation schemas'
    ],
    durationMinutes: 8
  },
  {
    category: 'Role-specific',
    question: 'How do you establish observability, structured logging, and health monitoring in production to detect and remediate performance regressions proactively?',
    answerOutline: [
      'Implement structured JSON logging with unique correlation IDs across service boundaries',
      'Track golden signals: latency, traffic, errors, and saturation using APM tools',
      'Set up proactive synthetic health checks, alerts, and error tracking dashboards (e.g. Sentry/Datadog)'
    ],
    durationMinutes: 7
  }
];

/**
 * Detects domain technology keywords from requirement text
 * @param {string} text
 * @returns {string|null} Matched key in DOMAIN_QUESTION_BANK or null
 */
function matchDomainKey(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  if (/\b(?:react|next\.js|redux|hooks|jsx)\b/i.test(lower)) {
    if (/\bnext\.js\b/i.test(lower)) return 'next.js';
    return 'react';
  }
  if (/\b(?:node|node\.js|event loop|npm)\b/i.test(lower)) return 'node.js';
  if (/\b(?:express|express\.js|middleware)\b/i.test(lower)) return 'express';
  if (/\b(?:mongo|mongodb|mongoose|nosql)\b/i.test(lower)) return 'mongodb';
  if (/\b(?:javascript|es6|ecmascript|vanilla js)\b/i.test(lower)) return 'javascript';
  if (/\b(?:typescript|ts|generics)\b/i.test(lower)) return 'typescript';
  if (/\b(?:rest|api|apis|http|endpoints|graphql)\b/i.test(lower)) return 'rest';
  if (/\b(?:html|semantic html|dom)\b/i.test(lower)) return 'html';
  if (/\b(?:css|tailwind|flexbox|grid|styling)\b/i.test(lower)) return 'css';
  if (/\b(?:git|github|gitlab|version control|branching)\b/i.test(lower)) return 'git';
  if (/\b(?:python|django|fastapi|flask)\b/i.test(lower)) return 'python';
  if (/\b(?:sql|postgresql|postgres|mysql|database)\b/i.test(lower)) return 'sql';
  if (/\b(?:docker|container|containers|dockerfile)\b/i.test(lower)) return 'docker';
  if (/\b(?:cloud|aws|azure|gcp|infrastructure)\b/i.test(lower)) return 'cloud';
  if (/\b(?:test|testing|unit test|jest|cypress|qa)\b/i.test(lower)) return 'testing';

  return null;
}

/**
 * Generates dynamic tailored questions for custom/unmatched requirements
 * @param {object} req
 * @returns {Array<object>}
 */
function generateDynamicQuestionsForRequirement(req) {
  const cleanText = req.text.replace(/^Proficiency in\s+/i, '').replace(/\s+and associated.*$/i, '');
  return [
    {
      category: 'Technical',
      question: `Explain the core principles, underlying mechanics, and architectural best practices when working with ${cleanText}.`,
      answerOutline: [
        'Fundamental concepts and mental model',
        'Common architectural design patterns and industry standards',
        'Performance trade-offs and best practices in production'
      ],
      durationMinutes: 6
    },
    {
      category: 'Technical',
      question: `Describe a complex implementation scenario where you utilized ${cleanText}. What challenges arose and how did you resolve them?`,
      answerOutline: [
        'Context of the project and specific constraints',
        'Implementation approach, tools, and technical patterns applied',
        'Outcome, test coverage, and lessons learned'
      ],
      durationMinutes: 8
    },
    {
      category: 'Technical',
      question: `What are the most frequent pitfalls, performance bottlenecks, or edge cases encountered with ${cleanText}, and how do you prevent them?`,
      answerOutline: [
        'Identification of common failure modes or anti-patterns',
        'Preventative patterns, code review checks, or monitoring safeguards',
        'Trade-offs between performance, maintainability, and complexity'
      ],
      durationMinutes: 7
    }
  ];
}

/**
 * Generates a comprehensive, realistic question bank for given requirements and role title.
 * Targets:
 * - 6-10 requirements -> ~20-35 questions
 * - 3-5 requirements -> ~10-20 questions
 * - 10+ requirements -> ~25-40 questions
 *
 * @param {Array<object>} requirements
 * @param {string} roleTitle
 * @returns {Array<object>}
 */
function buildComprehensiveQuestionBank(requirements, roleTitle = 'Software Engineer') {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return [];
  }

  const generatedQuestions = [];
  const reqCount = requirements.length;

  // Determine questions per requirement based on requirement count
  // 3-4 reqs: 4 questions each
  // 5-11 reqs: 3 questions each
  // 12+ reqs: 2 questions each
  const questionsPerReq = reqCount <= 4 ? 4 : reqCount <= 11 ? 3 : 2;

  // Find behavioral requirement if one exists
  const behavioralReq = requirements.find((r) =>
    /\b(?:communication|collaboration|teamwork|behavioral|agile)\b/i.test(r.text)
  ) || requirements[requirements.length - 1];

  // 1. Generate technical and requirement-grounded questions
  requirements.forEach((req) => {
    const domainKey = matchDomainKey(req.text);
    let candidateTemplates = [];

    if (domainKey && DOMAIN_QUESTION_BANK[domainKey]) {
      candidateTemplates = DOMAIN_QUESTION_BANK[domainKey];
    } else {
      candidateTemplates = generateDynamicQuestionsForRequirement(req);
    }

    const selected = candidateTemplates.slice(0, questionsPerReq);

    selected.forEach((tmpl) => {
      generatedQuestions.push({
        category: tmpl.category || 'Technical',
        question: tmpl.question,
        answerOutline: tmpl.answerOutline,
        requirementIds: [req.id],
        durationMinutes: tmpl.durationMinutes || 6,
        source: 'generated',
        edited: false,
        pinned: false
      });
    });
  });

  // 2. Add Behavioral Questions (2 to 4 questions)
  const numBehavioral = reqCount <= 4 ? 2 : reqCount <= 8 ? 3 : 4;
  const selectedBehavioral = BEHAVIORAL_QUESTIONS.slice(0, numBehavioral);
  selectedBehavioral.forEach((tmpl) => {
    generatedQuestions.push({
      category: 'Behavioral',
      question: tmpl.question,
      answerOutline: tmpl.answerOutline,
      requirementIds: [behavioralReq.id],
      durationMinutes: tmpl.durationMinutes || 7,
      source: 'generated',
      edited: false,
      pinned: false
    });
  });

  // 3. Add Role-Specific & System Integration Questions (2 to 4 questions)
  const numRoleSpecific = reqCount <= 4 ? 2 : reqCount <= 8 ? 3 : 4;
  const primaryReq = requirements.find((r) => r.must) || requirements[0];
  const selectedRoleSpecific = ROLE_SPECIFIC_QUESTIONS.slice(0, numRoleSpecific);
  selectedRoleSpecific.forEach((tmpl) => {
    generatedQuestions.push({
      category: 'Role-specific',
      question: tmpl.question,
      answerOutline: tmpl.answerOutline,
      requirementIds: [primaryReq.id],
      durationMinutes: tmpl.durationMinutes || 8,
      source: 'generated',
      edited: false,
      pinned: false
    });
  });

  // 4. Deduplicate questions to prevent identical or near-duplicate prompts
  const deduplicated = deduplicateQuestions(generatedQuestions);

  // 5. Ensure sequential unique question IDs (q-001, q-002, ...)
  return deduplicated.map((q, idx) => ({
    ...q,
    id: `q-${String(idx + 1).padStart(3, '0')}`
  }));
}

module.exports = {
  buildComprehensiveQuestionBank,
  deduplicateQuestions,
  matchDomainKey
};
