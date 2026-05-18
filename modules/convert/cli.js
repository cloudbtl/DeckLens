#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function usage() {
  console.log(`Usage:
  node modules/convert/cli.js <input.md|input.html> --out <dir> [options]

Options:
  --project <id>       DeckLens projectId
  --deck <id>          DeckLens deckId
  --endpoint <url>     DeckLens collector endpoint
  --inject-decklens    Inject the DeckLens SDK snippet
`);
}

function parseArgs(argv) {
  const args = { input: null, out: null, project: "demo", deck: null, endpoint: "/api/events", injectDecklens: false };
  const rest = [...argv];
  args.input = rest.shift();

  while (rest.length) {
    const key = rest.shift();
    const value = rest[0];
    if (key === "--out") args.out = rest.shift();
    else if (key === "--project") args.project = rest.shift();
    else if (key === "--deck") args.deck = rest.shift();
    else if (key === "--endpoint") args.endpoint = rest.shift();
    else if (key === "--inject-decklens") args.injectDecklens = true;
    else throw new Error(`Unknown option: ${key}${value ? ` ${value}` : ""}`);
  }

  if (!args.input || !args.out) throw new Error("Input and --out are required.");
  return args;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value, fallback) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function markdownToSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: "Overview", body: [] };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      if (current.body.length || sections.length) sections.push(current);
      current = { title: heading[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);
  return sections.filter((section) => section.title || section.body.some(Boolean));
}

function renderMarkdownBody(lines) {
  return lines
    .join("\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^[-*]\s+/m.test(block)) {
        const items = block
          .split(/\n/)
          .map((line) => line.replace(/^[-*]\s+/, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

function renderMarkdown(markdown, title) {
  const sections = markdownToSections(markdown);
  return {
    html: sections
      .map((section, index) => {
        const id = slugify(section.title, `section-${index + 1}`);
        return `<section data-decklens-section="${id}" data-section-title="${escapeHtml(section.title)}">
  <h2>${escapeHtml(section.title)}</h2>
  ${renderMarkdownBody(section.body)}
</section>`;
      })
      .join("\n"),
    sections: sections.map((section, index) => ({
      id: slugify(section.title, `section-${index + 1}`),
      title: section.title,
      sourcePage: index + 1
    })),
    title
  };
}

function extractHtmlSections(html) {
  const matches = Array.from(html.matchAll(/<(section|article)\b[^>]*>([\s\S]*?)<\/\1>/gi));
  return matches.map((match, index) => {
    const raw = match[0];
    const id = raw.match(/\sid=["']([^"']+)["']/i);
    const heading = raw.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
    const title = heading ? heading[1].replace(/<[^>]+>/g, "").trim() : `Section ${index + 1}`;
    return {
      id: id ? id[1] : slugify(title, `section-${index + 1}`),
      title,
      sourcePage: index + 1
    };
  });
}

function decklensSnippet(args) {
  if (!args.injectDecklens) return "";
  return `<script src="/sdk/decklens.js"></script>
<script>
  DeckLens.createTracker({
    projectId: ${JSON.stringify(args.project)},
    deckId: ${JSON.stringify(args.deck || path.basename(args.input, path.extname(args.input)))},
    endpoint: ${JSON.stringify(args.endpoint)}
  }).start();
</script>`;
}

function wrapHtml(content, args, title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #18191b; background: #f7f7f4; }
      main { width: min(980px, calc(100% - 40px)); margin: 0 auto; padding: 64px 0; }
      section, article { min-height: 70vh; padding: 48px 0; border-bottom: 1px solid #d9d9d2; }
      h1, h2 { line-height: 1.08; }
      h1 { font-size: 48px; }
      h2 { font-size: 36px; }
      p, li { color: #666b73; font-size: 18px; line-height: 1.65; }
    </style>
    ${decklensSnippet(args)}
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      ${content}
    </main>
  </body>
</html>
`;
}

function convert(args) {
  const inputPath = path.resolve(args.input);
  const outDir = path.resolve(args.out);
  const ext = path.extname(inputPath).toLowerCase();
  const title = args.deck || path.basename(inputPath, ext);
  const source = fs.readFileSync(inputPath, "utf8");
  let body;
  let sections;

  if (ext === ".md" || ext === ".markdown") {
    const rendered = renderMarkdown(source, title);
    body = rendered.html;
    sections = rendered.sections;
  } else if (ext === ".html" || ext === ".htm") {
    body = source;
    sections = extractHtmlSections(source);
  } else {
    throw new Error(`Unsupported input type for MVP: ${ext}. Start with .md or .html.`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), wrapHtml(body, args, title));
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      {
        module: "cloudbtl-convert",
        version: "0.1.0",
        source: { type: ext.replace(".", ""), filename: path.basename(inputPath) },
        output: { entry: "index.html", assets: "assets/" },
        decklens: args.injectDecklens
          ? {
              projectId: args.project,
              deckId: args.deck || title,
              endpoint: args.endpoint
            }
          : null,
        sections
      },
      null,
      2
    )
  );
}

try {
  const args = parseArgs(process.argv.slice(2));
  convert(args);
  console.log(`Converted ${args.input} -> ${args.out}`);
} catch (error) {
  console.error(error.message);
  usage();
  process.exit(1);
}
