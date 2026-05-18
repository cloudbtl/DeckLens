# CloudBTL Product Journey

CloudBTL should cover the full journey from proposal creation to delivery, measurement, feedback, and iteration. DeckLens is the analytics layer inside that journey, not the whole product surface.

CloudBTL should be English-first for global BTL, proposal, agency, and sales users. Korean should be supported as a secondary language for domestic teams, operators, and early customer development, but the default product language, docs, examples, and public positioning should be English.

## End-to-End Journey

1. Create
   - User writes or imports proposal material.
   - Source formats may include PPTX, PDF, DOCX, Figma export, plain HTML, Markdown, or AI-generated drafts.

2. Convert
   - Material becomes web-native HTML.
   - The output should preserve enough visual fidelity for proposals while becoming readable by browsers, analytics, and AI tools.

3. Instrument
   - The HTML receives DeckLens SDK, section metadata, and action metadata.
   - Important CTAs, forms, price blocks, case studies, and long sections should be named explicitly.

4. Send
   - User sends a tracked link instead of a static file attachment.
   - Delivery can be a public link, gated link, client room, expiring link, or embedded page.

5. Observe
   - Recipient reads, scrolls, hovers, clicks, inputs, and revisits.
   - DeckLens collects behavioral signals without needing the recipient to install anything.

6. Understand
   - Dashboard shows what was read, ignored, clicked, revisited, or abandoned.
   - Teams can compare sections, sessions, accounts, recipients, and versions.

7. Follow up
   - User receives suggested next actions.
   - AI can generate follow-up email, section-level objections, revision ideas, or meeting prep notes.

8. Improve
   - User edits the proposal based on behavior and feedback.
   - Versions can be compared to learn which narrative, CTA, or pricing page works better.

## DeckLens Boundary

DeckLens should own measurement and analytics for web-native proposal experiences.

DeckLens should include:

- Browser SDK for section dwell, action events, session paths, and page metadata.
- Collector API contract for event ingestion.
- Local collector for development and self-hosted testing.
- Hosted collector integration points.
- Dashboard primitives for page dwell, section heatmaps, action rollups, session paths, and raw events.
- Naming conventions for sections and actions.
- Privacy-conscious defaults: no raw input values, anonymous IDs, configurable endpoints.

DeckLens should not become:

- A full proposal editor.
- A conversion engine for PDF/PPTX/DOCX.
- A CRM.
- A file hosting platform.
- An AI copywriting workspace.
- A full team permission and billing product.

Those should be adjacent CloudBTL modules that use DeckLens as the measurement layer.

## Product Modules

### 1. DeckLens

Role: analytics SDK, collector, and dashboard for HTML proposals.

Core users:

- Marketers
- Proposal teams
- Sales teams
- Agencies sending web proposals

Core jobs:

- Know which sections were viewed.
- Know how long each section was viewed.
- Know which CTAs and interactive elements were used.
- Understand recipient paths through a deck or long proposal.
- Export behavior data to a hosted dashboard or downstream system.

Open-source surface:

- SDK
- Event schema
- Local collector
- Basic dashboard
- Integration docs

Hosted surface:

- Production collector
- Storage
- Team dashboard
- Client/project/deck management
- Access controls
- Exports and alerts

### 2. CloudBTL Convert

Role: convert existing proposal assets into AI-ready, analytics-ready HTML.

Inputs:

- PDF
- PPTX
- DOCX
- Markdown
- Existing HTML
- Later: Figma or Keynote exports

Outputs:

- Static HTML package
- Section metadata
- Asset folder
- Optional DeckLens SDK injection
- Optional deploy-ready bundle

Core jobs:

- Turn closed files into web-native proposal pages.
- Preserve visual hierarchy enough for client-facing use.
- Add semantic structure so AI tools can read and transform the proposal.
- Automatically identify candidate sections, CTAs, tables, pricing blocks, and forms.

DeckLens relationship:

- Convert prepares the HTML.
- DeckLens measures the HTML.
- Convert can auto-insert DeckLens instrumentation.

### 3. CloudBTL Rooms

Role: recipient-facing proposal delivery and client room.

Core jobs:

- Host proposal links.
- Gate access by email, passcode, domain, expiry, or account.
- Show related files, next steps, comments, and contact actions.
- Give each recipient or account a unique tracked URL.

DeckLens relationship:

- Rooms provides identity, access, and delivery context.
- DeckLens captures behavior inside each room or proposal.

### 4. CloudBTL Feedback

Role: collect explicit recipient feedback alongside implicit behavior.

Core jobs:

- Inline comments.
- Section reactions.
- Question forms.
- Objection capture.
- Meeting request forms.
- Structured feedback summaries.

DeckLens relationship:

- DeckLens captures implicit behavioral signals.
- Feedback captures explicit intent and objections.
- Together they explain both what happened and why.

### 5. CloudBTL Agent

Role: AI layer that turns proposal behavior into next actions.

Core jobs:

- Summarize recipient interest.
- Draft follow-up emails.
- Suggest proposal revisions.
- Identify ignored sections or confusing pages.
- Prepare meeting briefs.
- Generate CRM notes.

DeckLens relationship:

- DeckLens provides behavioral evidence.
- Agent interprets the evidence and generates work product.

### 6. CloudBTL Integrations

Role: connect CloudBTL signals to external tools.

Targets:

- CRM
- Slack
- Notion
- Google Drive
- Email tools
- Analytics warehouses

Core jobs:

- Push session summaries.
- Trigger alerts.
- Sync assets and recipients.
- Export raw or aggregated events.

## Recommended Build Order

1. DeckLens SDK and local dashboard
2. Hosted collector with project/deck/API key model
3. CloudBTL Convert MVP for PDF/PPTX to HTML package
4. Hosted dashboard with team/project/deck views
5. Proposal link hosting through CloudBTL Rooms
6. AI follow-up summaries from DeckLens event data
7. Explicit feedback and comments
8. CRM/Slack/Notion integrations

## DeckLens Expansion Path

DeckLens should evolve in layers:

1. Measurement
   - Section dwell, actions, session paths, page metadata.

2. Attribution
   - Recipient ID, account ID, campaign/source, link variants, version ID.

3. Visualization
   - Heatmaps, funnels, drop-offs, comparison views, session replay-lite timelines.

4. Decision Support
   - Alerts, summaries, recommended follow-ups, weak-section detection.

5. Platform Integration
   - Webhooks, exports, CRM sync, agent-ready event summaries.

## Key Product Principle

DeckLens should answer: "What did the recipient do with this web proposal?"

CloudBTL as a whole should answer: "How do we create, send, learn from, and improve BTL materials with AI and measurable web workflows?"

Keeping that separation prevents DeckLens from becoming too broad while still making it the first essential layer of the CloudBTL system.

## Immediate Module Direction

Build now:

- DeckLens
- CloudBTL Convert

Document and prepare:

- CloudBTL Rooms
- CloudBTL Studio

Rooms can borrow full-funnel B2B revenue patterns from tools like Re:catch, but CloudBTL should stay narrower: proposal rooms, buyer engagement, and follow-up signals rather than a full generic CRM.

## Language Principle

Default language:

- English

Supported secondary language:

- Korean

Product implications:

- Public docs, examples, event names, SDK APIs, and hosted UI defaults should be English.
- Korean support should be implemented through localization, not by forking product concepts or APIs.
- Internal notes can be Korean, but public product language should assume global English-speaking users first.
