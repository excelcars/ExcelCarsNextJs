const modules = [
  "Home / Auth / Session",
  "Inventory",
  "Inquiry",
  "Follow-up",
  "Loan / Insurance / RTO",
  "Configuration / Masters",
  "Reports",
  "AI Productivity Layer",
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">ExcelCars Platform</p>
        <h1>Docker-ready Next.js starter</h1>
        <p className="lede">
          This scaffold gives us a running web container, a worker container,
          Postgres, and Redis so we can build the Phase 1 platform and Phase 2
          AI layer on top of a stable foundation.
        </p>
      </section>

      <section className="grid-card">
        <h2>Planned modules</h2>
        <div className="module-grid">
          {modules.map((module) => (
            <article key={module} className="module-tile">
              {module}
            </article>
          ))}
        </div>
      </section>

      <section className="grid-card">
        <h2>Container ports</h2>
        <ul className="port-list">
          <li>
            <strong>Web:</strong> <code>3000</code>
          </li>
          <li>
            <strong>PostgreSQL:</strong> <code>5432</code>
          </li>
          <li>
            <strong>Redis:</strong> <code>6379</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
