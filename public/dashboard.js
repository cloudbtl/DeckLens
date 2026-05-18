function formatMs(ms) {
  if (!ms) return "0s";
  return `${Math.round(ms / 1000)}s`;
}

function renderTable(target, rows, columns) {
  if (!rows.length) {
    target.innerHTML = '<p class="muted">아직 수집된 데이터가 없습니다.</p>';
    return;
  }

  target.innerHTML = `
    <table>
      <thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((column) => `<td>${column.render ? column.render(row) : row[column.key]}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function load() {
  const summary = await fetch("/api/summary").then((res) => res.json());

  document.getElementById("metrics").innerHTML = `
    <article><strong>${summary.sessions}</strong><span>Sessions</span></article>
    <article><strong>${summary.events}</strong><span>Events</span></article>
    <article><strong>${summary.slides.length}</strong><span>Slides</span></article>
    <article><strong>${summary.interactions.length}</strong><span>Tracked targets</span></article>
  `;

  renderTable(document.getElementById("slides"), summary.slides, [
    { key: "slideId", label: "Slide" },
    { key: "views", label: "Views" },
    { key: "totalMs", label: "Total time", render: (row) => formatMs(row.totalMs) },
    { key: "avgMs", label: "Avg time", render: (row) => formatMs(row.avgMs) }
  ]);

  renderTable(document.getElementById("interactions"), summary.interactions, [
    { key: "target", label: "Target" },
    { key: "count", label: "Count" }
  ]);
}

load();
setInterval(load, 5000);
