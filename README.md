# DeckLens

HTML slide decks에 Google Analytics처럼 행동 계측을 붙이는 MVP입니다.

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
- `slide_enter`
- `slide_view`
- `interaction`
- `session_end`

## Product Boundary

Local use is free. Real analytics requires either self-hosting the collector or using the hosted CloudBTL collector.

## Repository

- Organization: https://github.com/cloudbtl
- Target repo: https://github.com/cloudbtl/decklens
