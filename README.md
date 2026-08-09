# DeckLens

DeckLens adds Google Analytics-style behavior tracking to HTML slide decks and web proposals.

DeckLens is English-first for global users, with Korean UI support for local teams and early CloudBTL operations.

## Concept

- Open source: slide/document instrumentation SDK, event spec, and demo.
- Hosting: storage, dashboards, team access, export, and alerts are **CloudBTL**
  (https://cloudbtl.com) — DeckLens does not run its own hosted collector.
  The bundled `server.js` is a local demo only. See [Product Boundary](#product-boundary).
- Target users: marketers and proposal teams who send HTML-based pitch decks.

## Run

```bash
npm run dev
```

Open:

- Website: http://localhost:4173
- Demo deck: http://localhost:4173/demo/slides.html
- Dashboard: http://localhost:4173/dashboard.html

## SDK Usage

```html
<script src="/sdk/decklens.js"></script>
<script>
  DeckLens.createTracker({
    projectId: "brand-proposal",
    deckId: "2026-q2-proposal",
    endpoint: "https://collector.example.com/api/events"
  }).start();
</script>
```

Mark slides and interactions:

```html
<section data-slide-id="pricing">...</section>
<button data-track data-track-name="pricing_cta">Contact</button>
```

## Events (v0.2 — CloudBTL contract)

- `section_session_start` / `section_session_end`
- `section_enter` / `section_view` (dwell + max visibility per section)
- `action` (click, hover, focus, input, submit)

Each event carries `sessionId` / `visitorId` (injectable), an optional `linkId`
context, and a `target` field that maps onto CloudBTL's events table.
`transport: "postMessage"` relays events to a parent frame for sandboxed
iframe embeds (this is how the CloudBTL viewer consumes the SDK).

## What It Tracks

- Section dwell time for slides, long pages, articles, and explicit `[data-decklens-section]` blocks.
- Page-level rollups by URL path.
- Click, hover, focus, input, and submit actions on interactive elements.
- Session paths across visible sections.

See [Tracking Guide](docs/tracking.md) for supported tags, events, fields, and privacy notes.
See [Product Journey](docs/product-journey.md) for DeckLens boundaries and adjacent CloudBTL modules.

## Product Boundary

The SDK, spec, and demo are open source. Storage, dashboards, team access, and
share-link tracking are the hosted product: **CloudBTL** (https://cloudbtl.com).
The CloudBTL document viewer ships this SDK for section-level read analytics —
DeckLens is the instrumentation edge, CloudBTL is the home.

## Repository

- Organization: https://github.com/cloudbtl
- Target repo: https://github.com/cloudbtl/DeckLens
