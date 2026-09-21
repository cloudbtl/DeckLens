# DeckLens

**See what readers actually viewed and touched inside an HTML document.**

[![CI](https://github.com/cloudbtl/DeckLens/actions/workflows/ci.yml/badge.svg)](https://github.com/cloudbtl/DeckLens/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/runtime_dependencies-0-2ea44f)](package.json)

DeckLens is a small browser instrumentation SDK for proposals, slide decks, reports, and long-form pages. It records section visibility, dwell time, reading paths, and named interactions without transmitting full document bodies or raw form values.

The repository includes the SDK, event contract, an interactive demo dashboard, and a local JSONL collector. Hosted production dashboards are outside this repository.

## Try it in one minute

```bash
git clone https://github.com/cloudbtl/DeckLens.git
cd DeckLens
npm install
npm run dev
```

Open:

- [http://localhost:4173/demo/slides.html](http://localhost:4173/demo/slides.html) to generate events
- [http://localhost:4173/dashboard.html](http://localhost:4173/dashboard.html) to inspect section heat, actions, and session paths

The local server writes events to `data/events.jsonl`. It is a development fixture, not a production collector.

## Embed the tracker

```html
<script src="/sdk/decklens.js"></script>

<section data-decklens-section="problem" data-section-title="The problem">
  <h2>The problem</h2>
</section>

<section data-decklens-section="pricing" data-section-title="Pricing">
  <h2>Pricing</h2>
  <button data-track data-track-name="pricing_cta">Contact sales</button>
</section>

<script>
  DeckLens.createTracker({
    projectId: "sales",
    deckId: "proposal-2026-q3",
    endpoint: "/api/events"
  }).start();
</script>
```

DeckLens automatically recognizes semantic `section` and `article` elements. Explicit `data-decklens-section` and `data-track-name` attributes keep analytics stable when visible copy changes.

For production, serve `public/sdk/decklens.js` from your own static asset pipeline or CDN. The SDK is a browser script rather than a published npm package.

Your collector only needs to accept JSON batches:

```http
POST /api/events
Content-Type: application/json

{ "events": [{ "type": "section_enter", "...": "..." }] }
```

The demo collector returns `202 Accepted`. Cross-origin collectors must allow the embedding page's origin and `Content-Type` header. Failed network requests are queued for a later flush; the browser's unload beacon is best-effort.

## What it emits

| Event | Meaning | Useful fields |
| --- | --- | --- |
| `section_session_start` | Tracking started | page, viewport, session |
| `section_enter` | A section crossed the visibility threshold | section ID, title, ratio |
| `section_view` | A visible interval ended | duration, maximum ratio, next section |
| `section_session_end` | The page session ended | sequence and page context |
| `action` | A reader clicked, hovered, focused, typed, or submitted | action type, named target, section |

Every event carries an opaque `sessionId` and `visitorId`, an increasing sequence number, page context, viewport size, and client timestamp. A host application may inject its own IDs and optional `linkId`.

For input events, DeckLens sends `valueLength`; it does not send the value.

By default, `sessionId` is generated once per `sessionStorage` scope and `visitorId` persists in `localStorage`. Supply both values when the host already has an approved identity scheme. Narrow `actionSelector` to exclude inputs or other controls that should not emit interaction metadata:

```js
DeckLens.createTracker({
  actionSelector: "a, button, [data-track]"
}).start();
```

## Design principles

1. **Observe, do not infer.** The SDK reports browser events. Meaning, scoring, and recommendations belong downstream.
2. **Collect the minimum useful signal.** No full document bodies, raw form values, cookies, or application credentials enter the event payload.
3. **Let the host own identity.** DeckLens accepts opaque IDs and does not implement accounts or identity resolution.
4. **Keep the edge small.** The browser bundle has no runtime dependencies and no storage, workspace, billing, or retrieval logic.
5. **Evolve the contract additively.** Consumers should tolerate new fields and unknown event types.
6. **Keep the demo honest.** The bundled server demonstrates the contract; it is not hardened, authenticated, or intended for internet exposure.

## Transport modes

### Fetch

The default transport batches events and posts `{ events: [...] }` to the configured endpoint every five seconds and when the page closes.

```js
DeckLens.createTracker({
  endpoint: "https://collector.example.com/events",
  flushInterval: 3000,
  visibilityThreshold: 0.3
}).start();
```

### postMessage

Sandboxed or cross-origin embeds can relay events to their parent page:

```js
DeckLens.createTracker({
  transport: "postMessage",
  projectId: "workspace",
  deckId: "embedded-report",
  linkId: "link_abc123"
}).start();
```

The SDK posts with `targetOrigin="*"` so it can run inside opaque sandboxed frames. The parent must validate `event.origin`, the frame source, and the payload before delivering accepted events to its collector.

## Automatic action tracking

DeckLens observes common interactive elements such as links, buttons, inputs, selects, summaries, ARIA buttons, and elements marked with `data-track`. Events are named from this order:

1. `data-track-name`
2. `aria-label`
3. `name`
4. visible text
5. element ID
6. tag name

Override `actionSelector` when a page needs a narrower contract.

See the [tracking guide](docs/tracking.md) for selectors, timing rules, event fields, and configuration.

## Architecture and product boundary

```text
HTML document
      │
      ▼
DeckLens SDK ── events ──▶ your collector
                               │
                               ├── storage
                               ├── dashboards
                               └── downstream descriptors or ranking signals
```

This repository owns browser-side observation and the event schema. Hosted ingestion, retention, access control, dashboards, and document descriptors are separate system responsibilities; [CloudBTL](https://cloudbtl.com) is one implementation.

Read [Product Journey](docs/product-journey.md) for the boundary between DeckLens and adjacent CloudBTL components.

## Development

```bash
npm install
npm test
npm run dev
```

The project deliberately uses Node's built-in HTTP server and browser APIs so the contract remains easy to inspect and embed.

## Security and privacy

Applications embedding DeckLens are responsible for consent, retention, endpoint authentication, access control, and applicable privacy law. Do not expose the demo server to untrusted networks.

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
