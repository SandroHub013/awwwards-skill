# Submission playbook

## Before you submit — timing

- **Wait 2–4 weeks after launch.** Real traffic surfaces edge cases; fixing them before the
  jury sees the site is worth more than being early.
- **Once a submission is under review or approved, it cannot be edited.** Only drafts are
  editable. Whatever is live during the 5-day voting window is what gets scored — so freeze
  deploys during voting, or at least never ship anything risky.
- You have **3 months from approval** to win SOTD. Approval itself takes up to a week
  (longer on weekends or during submission spikes).
- A failed submission is **public record**. Do not use Awwwards as a test. If the honest
  self-score is below 6.5, fix first or submit to a less competitive award (CSS Design
  Awards is the usual entry point) and use the win as credibility.

## What to submit

- **Fee**: standard submission ~€65 per site; PRO plans bundle submissions and add
  visibility. Check current pricing at submission time.
- **Thumbnail**: **1600 × 1200 px**. This is the single highest-leverage asset in the whole
  submission — it is what a juror sees before deciding how generous to be.
  - Show the site's *idea*, not a browser chrome screenshot.
  - Must be legible at card size (~300px wide): no small text, no low contrast.
  - Pick the signature moment's most beautiful frame.
  - Do not add mockup devices, drop shadows, or "Awwwards" badges.
- **Extra images and a video** are optional but measurably improve visibility. A 10–20s
  screen capture of the signature interaction, at 60fps, no music, no titles.
- **Credits**: list every collaborator with their real profiles. Jurors check.
- **Description**: 2–4 sentences. Lead with the concept, then the technical approach. No
  marketing copy. Name the stack — the developer jury reads it.
- **Tags/technologies**: accurate, not aspirational. Tagging WebGL on a site with no WebGL
  is noticed.

## Eligibility rules

- Pre-made templates are rejected. A demo site *showcasing* a template you designed and
  built is allowed.
- The site must be live at a public URL, in a finished state, with no "coming soon"
  sections and no staging password.
- Original design and development. Heavily derivative work from a recent winner is the
  fastest way to a low creativity score.

## The 5-day window

- Jury: minimum 18 members, the 3 most extreme scores dropped, four weighted criteria.
- A high jury score plus **≥ 10 PRO user votes** can trigger SOTD before day 5.
- The user vote is independent and also needs ≥ 6.5 for an Honorable Mention — so sharing
  the submission with the community is not vanity, it is part of the mechanism.
- Share on the day it goes live: your own channels, design communities, the studio
  newsletter. Do not buy votes; it is detectable and it ends badly.
- **Do not deploy changes during voting.** A juror hitting a broken build mid-window is the
  worst outcome available.

## After the result

- **SOTD** → the site is automatically re-scored by the developer jury against the Developer
  Guidelines; **> 7** earns the Developer Award. If you have followed `11-performance.md`
  and `12-accessibility.md`, this is where it pays off. SOTD also puts you in the running
  for Site of the Month and then Site of the Year.
- **Honorable Mention** (≥ 6.5 from both jury and users) → still a legitimate credential.
  Ask what the weakest criterion was and fix it on the next project.
- **No award** → jury scores are only visible to SOTD winners, so you get no feedback.
  Re-run `15-audit.md` and `14-anti-patterns.md` yourself and be honest about which of the
  four criteria was the ceiling. Usually it is Usability (measurable) or Creativity (no idea).
- Winning grants a certificate/badge and directory presence. Also: one SOTD makes you
  eligible to apply to the main jury, which is the best way to internalize the scoring.

## Other awards worth entering

| Award | Notes |
|---|---|
| **CSS Design Awards** | Most accessible entry point; separate UI/UX/innovation scores. |
| **FWA** | FOTD/FOTM; skews toward technical spectacle and campaigns. |
| **The Webby Awards** | Category-based, jury + people's vote; more brand/agency prestige. |
| **Site Inspire / Httpster / Land-book** | Curation, not awards, but real traffic. |
| **Godly / Minimal Gallery / One Page Love** | Niche curation, useful for portfolio credibility. |

Stagger submissions: start with CSSDA, use the win as social proof, then Awwwards.

## Submission checklist

```
[ ] Live, final, public URL — no staging password, no "coming soon"
[ ] Self-score ≥ 7.0 with evidence (references/01-scoring.md)
[ ] Full audit passed (references/15-audit.md), screenshots archived
[ ] No RED anti-patterns remaining (references/14-anti-patterns.md)
[ ] 2–4 weeks of real-world traffic and fixes since launch
[ ] Deploy freeze planned for the voting window
[ ] Thumbnail 1600×1200, legible at 300px, shows the idea
[ ] Optional: 10–20s 60fps capture of the signature moment
[ ] Description written: concept first, stack second
[ ] Credits complete and linked
[ ] Tags accurate
[ ] Share plan ready for launch day (PRO user votes matter)
```
