function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMs(ms) {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function renderTable(target, rows, columns) {
  if (!rows.length) {
    target.innerHTML = '<p class="muted empty">아직 수집된 데이터가 없습니다.</p>';
    return;
  }

  target.innerHTML = `
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderHeatmap(target, sections) {
  if (!sections.length) {
    target.innerHTML = '<p class="muted empty">아직 수집된 섹션 체류 데이터가 없습니다.</p>';
    return;
  }

  target.innerHTML = sections
    .map((section) => {
      const heat = Math.max(0.08, Number(section.heat || 0));
      return `
        <article class="heat-row" style="--heat: ${heat}">
          <div>
            <span class="path">${escapeHtml(section.pagePath)}</span>
            <strong>${escapeHtml(section.sectionTitle || section.sectionId)}</strong>
            <span class="muted">${escapeHtml(section.sectionId)} · ${section.views} views · avg ${formatMs(section.avgMs)}</span>
          </div>
          <div class="heat-bar" aria-label="Section dwell heat">
            <span style="width: ${Math.round(heat * 100)}%"></span>
          </div>
          <b>${formatMs(section.totalMs)}</b>
        </article>
      `;
    })
    .join("");
}

function renderPaths(target, paths) {
  if (!paths.length) {
    target.innerHTML = '<p class="muted empty">아직 세션 이동 경로가 없습니다.</p>';
    return;
  }

  target.innerHTML = paths
    .map(
      (session) => `
        <article class="path-row">
          <strong>${escapeHtml(session.sessionId.slice(0, 8))}</strong>
          <ol>
            ${session.path
              .map((step) => `<li><span>${escapeHtml(step.sectionTitle || step.sectionId)}</span></li>`)
              .join("")}
          </ol>
        </article>
      `
    )
    .join("");
}

async function load() {
  const summary = await fetch("/api/summary").then((res) => res.json());

  document.getElementById("metrics").innerHTML = `
    <article><strong>${summary.sessions}</strong><span>Sessions</span></article>
    <article><strong>${summary.events}</strong><span>Events</span></article>
    <article><strong>${summary.sections.length}</strong><span>Sections</span></article>
    <article><strong>${summary.actions.length}</strong><span>Action targets</span></article>
  `;

  renderTable(document.getElementById("pages"), summary.pages, [
    { key: "pagePath", label: "Page" },
    { key: "views", label: "Section views" },
    { key: "totalMs", label: "Total time", render: (row) => formatMs(row.totalMs) },
    { key: "avgMs", label: "Avg section time", render: (row) => formatMs(row.avgMs) }
  ]);

  renderHeatmap(document.getElementById("sections"), summary.sections);

  renderTable(document.getElementById("actions"), summary.actions, [
    { key: "actionType", label: "Action" },
    { key: "target", label: "Target" },
    { key: "sectionTitle", label: "Section", render: (row) => escapeHtml(row.sectionTitle || "-") },
    { key: "count", label: "Count" },
    { key: "avgHoverMs", label: "Avg hover", render: (row) => (row.actionType === "hover" ? formatMs(row.avgHoverMs) : "-") }
  ]);

  renderPaths(document.getElementById("paths"), summary.paths);
}

load();
setInterval(load, 5000);

document.getElementById("clear-data").addEventListener("click", async () => {
  await fetch("/api/events", { method: "DELETE" });
  await load();
});
