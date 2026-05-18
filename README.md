# DeckLens

HTML slide decks와 web proposal에 Google Analytics처럼 행동 계측을 붙이는 MVP입니다.

## Concept

- Open source: slide instrumentation SDK and future converter.
- Hosted business: event collector, storage, dashboard, team access, export, alerts.
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

## Events

- `session_start`
- `section_enter`
- `section_view`
- `action`
- `session_end`

## What It Tracks

- Section dwell time for slides, long pages, articles, and explicit `[data-decklens-section]` blocks.
- Page-level rollups by URL path.
- Click, hover, focus, input, and submit actions on interactive elements.
- Session paths across visible sections.

## Product Boundary

Local use is free. Real analytics requires either self-hosting the collector or using the hosted CloudBTL collector.

## Repository

- Organization: https://github.com/cloudbtl
- Target repo: https://github.com/cloudbtl/decklens
