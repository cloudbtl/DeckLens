# Re:catch Benchmark Notes

This note captures public observations about Re:catch and how CloudBTL should position adjacent modules without becoming a generic CRM.

Sources:

- Re:catch solution partner page: https://www.recatch.cc/ko/solution
- Re:catch origin story: https://www.recatch.cc/ko/blog/the-story-of-sales-solution-recatch/
- Re:catch dashboard page: https://www.recatch.cc/ko/dashboard
- Re:catch embed SDK guide: https://guide.recatch.cc/ko/articles/Other-Embed-SDK-6806a7c5/
- Wanted job description for Re:catch sales consultant: https://www.wanted.co.kr/wd/226563

## What Re:catch Appears To Be

Based on public pages, Re:catch is positioned as a B2B CRM and revenue execution product. It spans marketing CRM, sales CRM, AI CRM, dashboards, expert services, solution partners, lead generation, onboarding, and B2B growth operations.

The public origin story frames Re:catch around reducing repetitive sales coordination work and helping teams focus on customer conversations and experience. Re:catch states that early usage included embedding the tool into website inquiry pages and facilitating thousands of sales meetings.

The dashboard positioning emphasizes reducing spreadsheet reporting, improving visibility, forecasting progress toward goals, and connecting marketing-to-sales performance.

The solution partner page frames Re:catch as part of a broader B2B full-funnel ecosystem, including lead generation, enrichment, outbound, inbound, business infrastructure, and partner services.

The embed SDK guide shows a website-embedded modal pattern through a `window.recatch.open()` style SDK API.

## Useful Patterns For CloudBTL

CloudBTL can borrow these patterns:

- Full-funnel framing.
- Fast movement from signal to follow-up.
- Embedded web SDK as a distribution surface.
- Dashboard as the management layer.
- Expert/onboarding/service layer for B2B teams.
- AI-assisted sales and marketing execution.
- Partner ecosystem around B2B workflows.

## What CloudBTL Should Not Copy

CloudBTL should avoid becoming a general CRM too early.

Avoid:

- Owning the entire sales pipeline.
- Building broad contact/company CRM tables before proposal engagement is proven.
- Competing directly on email sequencing, lead generation, or sales team management.
- Making the first paid product depend on replacing an existing CRM.

## CloudBTL Differentiation

CloudBTL starts from the material itself:

- Proposal
- Deck
- Brochure
- PDF
- Web room
- Follow-up artifact

The core object is not the CRM deal. The core object is the measurable sales material and the buyer's engagement with it.

That creates a sharper wedge:

1. Convert existing materials into web-native experiences.
2. Measure recipient behavior with DeckLens.
3. Deliver through Rooms.
4. Turn engagement into follow-up recommendations.
5. Sync the result to CRM rather than replacing CRM.

## Module Implications

### DeckLens

Owns behavior measurement inside proposal experiences.

### Convert

Turns existing static materials into measurable web-native material.

### Rooms

Owns delivery, recipient identity, access control, and engagement timeline.

### Feedback

Captures explicit comments, objections, reactions, and meeting requests.

### Agent

Turns proposal engagement into follow-up emails, meeting prep, revision suggestions, and CRM notes.

### Integrations

Pushes engagement summaries into Slack, Notion, CRM, and email workflows.

## Product Line

CloudBTL should describe itself as a buyer-engagement layer for BTL and proposal materials, not as a CRM.

Recommended positioning:

> CloudBTL turns static proposals into measurable web experiences, then helps teams understand and act on buyer engagement.

This is close enough to B2B revenue workflows to be valuable, but narrow enough to avoid the CRM replacement trap.
