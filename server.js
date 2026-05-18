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
  const bySlide = {};
  const interactions = {};
  const sessions = new Set();

  for (const event of events) {
    sessions.add(event.sessionId);
    if (event.type === "slide_view") {
      const key = event.slideId || "unknown";
      bySlide[key] ||= { slideId: key, views: 0, totalMs: 0 };
      bySlide[key].views += 1;
      bySlide[key].totalMs += Number(event.durationMs || 0);
    }
    if (event.type === "interaction") {
      const key = event.targetName || event.targetId || "unknown";
      interactions[key] ||= { target: key, count: 0 };
      interactions[key].count += 1;
    }
  }

  return {
    sessions: sessions.size,
    events: events.length,
    slides: Object.values(bySlide).map((slide) => ({
      ...slide,
      avgMs: slide.views ? Math.round(slide.totalMs / slide.views) : 0
    })),
    interactions: Object.values(interactions).sort((a, b) => b.count - a.count)
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

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`DeckLens running at http://localhost:${PORT}`);
});
