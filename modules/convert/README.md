# CloudBTL Convert

CloudBTL Convert turns existing proposal assets into AI-ready, analytics-ready HTML packages. It is the second module after DeckLens.

## Position

DeckLens measures behavior inside HTML proposals. Convert creates the HTML proposal surface from files that teams already use.

## Initial Scope

Inputs:

- PDF
- PPTX
- DOCX
- Markdown
- Existing HTML

Outputs:

- Static HTML document or folder
- Asset folder
- Section metadata
- Optional DeckLens SDK injection
- Optional local preview route

## MVP Jobs

1. Convert a source file into browser-readable HTML.
2. Detect sections and assign stable section IDs.
3. Preserve readable proposal structure.
4. Mark likely CTAs, forms, pricing blocks, case studies, tables, and long-read sections.
5. Inject DeckLens with `projectId`, `deckId`, and collector `endpoint`.
6. Emit a manifest that future hosted services can read.

## Proposed Manifest

```json
{
  "module": "cloudbtl-convert",
  "version": "0.1.0",
  "source": {
    "type": "pptx",
    "filename": "proposal.pptx"
  },
  "output": {
    "entry": "index.html",
    "assets": "assets/"
  },
  "decklens": {
    "projectId": "brand-proposal",
    "deckId": "2026-q2-proposal",
    "endpoint": "https://collector.cloudbtl.com/api/events"
  },
  "sections": [
    {
      "id": "cover",
      "title": "Cover",
      "sourcePage": 1
    }
  ]
}
```

## CLI Shape

```bash
node modules/convert/cli.js ./proposal.md \
  --out ./dist/proposal \
  --project brand-proposal \
  --deck 2026-q2-proposal \
  --endpoint https://collector.cloudbtl.com/api/events \
  --inject-decklens
```

Current MVP support:

- Markdown input
- HTML input
- Static `index.html` output
- `manifest.json` output
- Optional DeckLens injection

Example:

```bash
node modules/convert/cli.js modules/convert/examples/proposal.md \
  --out /tmp/decklens-proposal \
  --project demo \
  --deck convert-demo \
  --endpoint /api/events \
  --inject-decklens
```

## Open Source Boundary

Open-source:

- CLI scaffold
- Static HTML packaging
- Section metadata generation
- DeckLens injection
- Local preview

Hosted/paid:

- High-fidelity conversion service
- Large file processing
- Team asset library
- Private storage
- Version history
- Hosted preview links
- Batch conversion

## Build Notes

Start pragmatic:

1. Markdown and existing HTML first. This is now the initial CLI path.
2. PPTX/PDF/DOCX conversion adapters second.
3. Add high-fidelity layout only after the instrumentation pipeline is stable.

The point is not to clone PowerPoint. The point is to make old proposal files measurable, AI-readable, and link-deliverable.
