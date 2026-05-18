# CloudBTL Rooms

CloudBTL Rooms is the buyer-facing delivery layer for proposals and related materials. It should feel similar in category to B2B revenue tools like Re:catch, but focused on proposal engagement rather than full CRM ownership.

## Position

DeckLens answers: "What did the recipient do inside this proposal?"

Rooms answers: "Who received this proposal, under what access rules, and what should happen next?"

## Scope

Rooms should own:

- Recipient-specific proposal links
- Email or domain gated access
- Expiring links
- Passcode links
- Client/company/account context
- Related files and next-step CTAs
- Per-room DeckLens event context
- Alerts when a target account engages

Rooms should not own:

- General-purpose CRM records
- Full sales pipeline management
- Email sequencing
- Contract lifecycle management

Those can be integrations or later CloudBTL modules.

## Re:catch-Inspired Lessons

Public Re:catch material positions the product around B2B CRM, sales/marketing workflows, AI CRM, dashboards, lead generation partners, and expert services. CloudBTL should not compete head-on as a generic CRM.

The useful pattern to borrow:

- Full-funnel language
- Fast sales follow-up
- Dashboard-driven decision making
- AI-assisted execution
- Strong onboarding/service layer for B2B teams

The differentiation:

- CloudBTL starts from proposal assets and buyer engagement.
- The primary object is a proposal room, not a CRM deal.
- The strongest signal is recipient behavior inside sales materials.
- DeckLens data becomes the evidence layer for follow-up.

## MVP Jobs

1. Create a room for one proposal.
2. Generate a share link.
3. Attach recipient/company metadata.
4. Gate access by email.
5. Show the proposal HTML.
6. Pass room context into DeckLens events.
7. Notify the sender when meaningful engagement happens.

## Future Jobs

- Account timeline
- Multiple recipients per room
- Commenting and explicit feedback
- Meeting request capture
- AI follow-up summary
- CRM sync
- Slack/Notion alerts
