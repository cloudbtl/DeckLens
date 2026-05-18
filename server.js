const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

fs.mkdirSync(DATA_DIR, { recursive: true });

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  return fs
    .readFileSync(EVENTS_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function summarize(events) {
  const sections = {};
  const actions = {};
  const pages = {};
  const pathsBySession = {};
  const sessions = new Set();

  for (const event of events) {
    if (event.sessionId) sessions.add(event.sessionId);

    if (event.type === "section_enter") {
      const sessionKey = event.sessionId || "unknown";
      pathsBySession[sessionKey] ||= [];
      pathsBySession[sessionKey].push({
        sectionId: event.sectionId || "unknown",
        sectionTitle: event.sectionTitle || event.sectionId || "Unknown",
        pagePath: event.pagePath || "/",
        occurredAt: event.occurredAt
      });
    }

    if (event.type === "section_view" || event.type === "slide_view") {
      const pagePath = event.pagePath || "/";
      const sectionId = event.sectionId || event.slideId || "unknown";
      const sectionTitle = event.sectionTitle || sectionId;
      const sectionKey = `${event.deckId || "deck"}::${pagePath}::${sectionId}`;
      const durationMs = Number(event.durationMs || 0);

      sections[sectionKey] ||= {
        pagePath,
        sectionId,
        sectionTitle,
        sectionIndex: event.sectionIndex || 0,
        views: 0,
        totalMs: 0,
        maxRatio: 0
      };
      sections[sectionKey].views += 1;
      sections[sectionKey].totalMs += durationMs;
      sections[sectionKey].maxRatio = Math.max(sections[sectionKey].maxRatio, Number(event.maxRatio || 0));

      pages[pagePath] ||= { pagePath, views: 0, totalMs: 0 };
      pages[pagePath].views += 1;
      pages[pagePath].totalMs += durationMs;
    }

    if (event.type === "action" || event.type === "interaction") {
      const actionType = event.actionType || event.eventType || "interaction";
      const target = event.targetName || event.targetId || "unknown";
      const key = `${actionType}::${target}::${event.pagePath || "/"}`;
      actions[key] ||= {
        actionType,
        target,
        targetTag: event.targetTag || null,
        pagePath: event.pagePath || "/",
        sectionId: event.sectionId || event.slideId || null,
        sectionTitle: event.sectionTitle || null,
        count: 0,
        totalHoverMs: 0
      };
      actions[key].count += 1;
      if (actionType === "hover") actions[key].totalHoverMs += Number(event.durationMs || 0);
    }
  }

  const sectionRows = Object.values(sections);
  const maxSectionMs = sectionRows.reduce((max, section) => Math.max(max, section.totalMs), 0);

  return {
    sessions: sessions.size,
    events: events.length,
    pages: Object.values(pages)
      .map((page) => ({
        ...page,
        avgMs: page.views ? Math.round(page.totalMs / page.views) : 0
      }))
      .sort((a, b) => b.totalMs - a.totalMs),
    sections: sectionRows
      .map((section) => ({
        ...section,
        avgMs: section.views ? Math.round(section.totalMs / section.views) : 0,
        heat: maxSectionMs ? Number((section.totalMs / maxSectionMs).toFixed(3)) : 0
      }))
      .sort((a, b) => a.pagePath.localeCompare(b.pagePath) || a.sectionIndex - b.sectionIndex),
    actions: Object.values(actions)
      .map((action) => ({
        ...action,
        avgHoverMs: action.count ? Math.round(action.totalHoverMs / action.count) : 0
      }))
      .sort((a, b) => b.count - a.count),
    paths: Object.entries(pathsBySession)
      .map(([sessionId, path]) => ({ sessionId, path: path.slice(-25) }))
      .slice(-20),
    recentEvents: events.slice(-50).reverse()
  };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (req.method === "POST" && req.url === "/api/events") {
    try {
      const payload = JSON.parse(await readBody(req));
      const events = Array.isArray(payload.events) ? payload.events : [payload];
      const receivedAt = new Date().toISOString();
      const batchId = crypto.randomUUID();
      const lines = events.map((event) =>
        JSON.stringify({
          ...event,
          batchId,
          receivedAt,
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress
        })
      );
      fs.appendFileSync(EVENTS_FILE, `${lines.join("\n")}\n`);
      send(res, 202, JSON.stringify({ ok: true, accepted: events.length, batchId }));
    } catch (error) {
      send(res, 400, JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/summary") {
    send(res, 200, JSON.stringify(summarize(getEvents())));
    return;
  }

  if (req.method === "GET" && req.url === "/api/events") {
    send(res, 200, JSON.stringify(getEvents().slice(-500)));
    return;
  }

  if (req.method === "DELETE" && req.url === "/api/events") {
    fs.writeFileSync(EVENTS_FILE, "");
    send(res, 200, JSON.stringify({ ok: true }));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`DeckLens running at http://localhost:${PORT}`);
});
