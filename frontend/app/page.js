import StatusCard from '../components/StatusCard';

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <header className="text-center pb-8 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4">
            Stage 1: Foundation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            AI Interview Prep Kit
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-xl mx-auto">
            Full-stack engineering assessment foundation. Incremental architecture with Next.js App Router and Express backend.
          </p>
        </header>

        {/* System Status Grid */}
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
            System Component Status
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatusCard
              title="Frontend"
              status="Operational"
              badgeColor="green"
              description="Next.js App Router with Tailwind CSS and JavaScript running on port 3000."
            />
            <StatusCard
              title="Backend API"
              status="Ready"
              badgeColor="green"
              description="Node.js Express service configured with CORS, dotenv, and health check route."
            />
            <StatusCard
              title="Database"
              status="Configured"
              badgeColor="blue"
              description="Mongoose configuration module initialized with graceful connection handling."
            />
          </div>
        </section>

        {/* Foundation Details */}
        <section className="mt-10 rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            Stage 1 Foundation Checklist
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">&#10003;</span> Clean project structure with frontend and backend separation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">&#10003;</span> JavaScript implementation throughout (no TypeScript)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">&#10003;</span> Backend health endpoint active at <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs">/api/health</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">&#10003;</span> Environment variable template created (<code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs">.env.example</code>)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">&#10003;</span> Incremental development scope strictly maintained
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-500">
          AI Interview Prep Kit &bull; Stage 1 Foundation &bull; Node.js & Next.js
        </footer>
      </div>
    </main>
  );
}
