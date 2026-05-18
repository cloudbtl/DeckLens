# DeckLens Tracking Guide

DeckLens tracks behavior on HTML slide decks, proposals, landing pages, and long-form pages. The SDK has two tracking layers:

- Section tracking: how long visible page sections were viewed.
- Action tracking: how users interacted with clickable, focusable, editable, and explicitly marked elements.

## Quick Start

```html
<script src="/sdk/decklens.js"></script>
<script>
  DeckLens.createTracker({
    projectId: "brand-proposal",
    deckId: "2026-q2-proposal",
    endpoint: "/api/events"
  }).start();
</script>
```

## Sections

Sections are used for dwell time, section heatmaps, and session paths.

DeckLens automatically treats these elements as sections:

| Selector | Use |
| --- | --- |
| `[data-decklens-section]` | Explicit DeckLens section ID. Best for production HTML. |
| `[data-slide-id]` | Slide ID compatibility for slide decks. |
| `section` | Standard semantic HTML section. |
| `article` | Long-form article or content block. |

If no section is found, DeckLens marks `document.body` as one fallback section with `data-decklens-section="document"`.

### Section ID

The section ID is selected in this order:

1. `data-decklens-section`
2. `data-slide-id`
3. `id`
4. Generated fallback: `section-1`, `section-2`, ...

```html
<section data-decklens-section="pricing" data-section-title="Pricing">
  <h2>Pricing</h2>
</section>
```

### Section Title

The section title is selected in this order:

1. `data-section-title`
2. `aria-label`
3. `data-track-name`
4. First matching heading: `h1`, `h2`, `h3`, `[data-section-heading]`
5. Trimmed section text
6. `Untitled section`

Section titles are trimmed to 120 characters.

### Visibility Rules

By default, a section is considered visible when at least `25%` of its height is visible in the viewport.

```js
DeckLens.createTracker({
  visibilityThreshold: 0.3
}).start();
```

When a section becomes visible, DeckLens emits `section_enter`. When it leaves visibility, the page is hidden, or the visitor leaves the page, DeckLens emits `section_view` with the measured dwell time.

## Actions

DeckLens automatically tracks interactions on these targets:

| Selector | Tracked by default |
| --- | --- |
| `a` | Links and CTA anchors |
| `button` | Buttons |
| `input` | Text fields, sliders, checkboxes, radios, buttons |
| `textarea` | Multi-line text fields |
| `select` | Dropdowns |
| `summary` | Disclosure controls |
| `[role='button']` | ARIA button controls |
| `[role='link']` | ARIA link controls |
| `[onclick]` | Inline JavaScript action targets |
| `[tabindex]` | Focusable custom controls |
| `[contenteditable='true']` | Editable content |
| `[data-track]` | Explicitly tracked custom target |

You can override the selector:

```js
DeckLens.createTracker({
  actionSelector: "a, button, [data-track], .trackable"
}).start();
```

### Action Name

The action target name is selected in this order:

1. `data-track-name`
2. `aria-label`
3. `name`
4. Trimmed element text
5. `id`
6. Lowercase tag name

Target names are trimmed to 120 characters.

```html
<button data-track data-track-name="pricing_cta">Contact sales</button>
```

### Action Types

| Action type | Trigger | Extra fields |
| --- | --- | --- |
| `click` | Click on an action target | `x`, `y` viewport coordinates |
| `hover` | Pointer enters and leaves an action target | `durationMs` |
| `focus` | Target receives focus | none |
| `input` | Target emits input | `valueLength` only |
| `submit` | Form submit | none |

Hover events are recorded only when the pointer stays over the target for at least `250ms`. A target also has a `1000ms` hover cooldown to avoid excessive duplicate events.

For privacy, DeckLens does not send raw input values. It sends only `valueLength`.

## Event Schema

Every event includes common metadata:

| Field | Description |
| --- | --- |
| `type` | Event type. |
| `projectId` | Project configured in `createTracker`. |
| `deckId` | Deck/page asset configured in `createTracker`. |
| `sessionId` | Session-scoped anonymous ID stored in `sessionStorage`. |
| `userId` | Browser-scoped anonymous ID stored in `localStorage`. |
| `sequence` | Incrementing event sequence number per page runtime. |
| `viewport` | Current viewport width and height. |
| `userAgent` | Browser user agent. |
| `occurredAt` | Client-side ISO timestamp. |
| `pageUrl` | Full page URL. |
| `pagePath` | Path, search, and hash. |
| `pageTitle` | Current document title. |

### `session_start`

Emitted when tracking starts.

Additional fields:

| Field | Description |
| --- | --- |
| `referrer` | `document.referrer`, or `null`. |
| `documentHeight` | Maximum document height at start time. |

### `section_enter`

Emitted when a section crosses the visibility threshold.

Additional fields:

| Field | Description |
| --- | --- |
| `sectionId` | Section identifier. |
| `sectionTitle` | Human-readable section title. |
| `sectionIndex` | Section order in the document. |
| `ratio` | Visible intersection ratio at entry. |

### `section_view`

Emitted when a visible section is closed.

Additional fields:

| Field | Description |
| --- | --- |
| `sectionId` | Section identifier. |
| `sectionTitle` | Human-readable section title. |
| `sectionIndex` | Section order in the document. |
| `durationMs` | Time spent visible. |
| `maxRatio` | Maximum visible ratio observed while open. |
| `nextSectionId` | Reserved for navigation context. Currently `null` in most cases. |

DeckLens ignores section views shorter than `100ms`.

### `action`

Emitted when an interaction occurs on an action target.

Additional fields:

| Field | Description |
| --- | --- |
| `actionType` | `click`, `hover`, `focus`, `input`, or `submit`. |
| `targetId` | Element `id`, or `null`. |
| `targetName` | Human-readable target name. |
| `targetTag` | Lowercase element tag name. |
| `targetType` | Element `type` or `role`, or `null`. |
| `href` | Link URL when available. |
| `sectionId` | Nearest tracked section ID, or `null`. |
| `sectionTitle` | Nearest tracked section title, or `null`. |
| `sectionIndex` | Nearest tracked section index, or `null`. |
| `x`, `y` | Click viewport coordinates for `click`. |
| `durationMs` | Hover duration for `hover`. |
| `valueLength` | Input value length for `input`. |

### `session_end`

Emitted on `beforeunload` after open section views are closed.

## Dashboard Rollups

The local collector summarizes raw events into:

| View | Source events |
| --- | --- |
| Page Dwell | `section_view` grouped by `pagePath`. |
| Section Heatmap | `section_view` grouped by page and section. |
| Actions | `action` grouped by action type, target, and page. |
| Session Paths | `section_enter` order by session. |
| Recent Events | Last 50 events. |

## Manual Tracking

`createTracker` returns a tracker object:

```js
const tracker = DeckLens.createTracker({ projectId: "demo" });
tracker.start();
tracker.track("custom_event", {
  label: "opened_pricing_modal"
});
tracker.flush();
```

Custom events receive the same common metadata as built-in events. The local dashboard currently summarizes built-in event types only.

## Privacy Notes

DeckLens currently collects URL, page title, viewport, user agent, anonymous session/user IDs, section metadata, action metadata, click coordinates, hover duration, and input length. It does not collect raw input values.

Before using a hosted collector in production, add:

- API keys or project tokens.
- Consent handling where required.
- PII filtering for URLs, titles, section names, and custom target names.
- Access controls for raw event export and reset endpoints.
