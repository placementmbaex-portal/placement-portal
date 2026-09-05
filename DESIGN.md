# Design system — MBAEx Placement Portal

Give this file to Claude Code alongside any UI prompt. Its job is to make every
page look like it was designed by one person on one afternoon.

---

## The idea

A placement portal is read under mild anxiety. A student opens it on a phone,
between a meeting and a class, wanting to know one thing: *am I about to miss
something.*

So the interface is almost entirely monochrome — ink on paper, the way an
official notice from the institute should look — and **colour is reserved
exclusively for time**. If something in the content area is coloured, it is
telling you about a deadline. Nothing else earns colour. That constraint is the
whole design, and it means urgency is legible at a glance without anyone reading
a word.

The two institutional marks live in the frame around that content — the header,
the sign-in page, the admin sidebar. Brand identifies whose portal this is;
colour inside the frame still only means time.

The convenient part is that the palette is already correct. Sampling the two
logos gives a navy, an orange and a brown. The MBAEx navy becomes the ink the
whole interface is set in. The MBAEx orange *is* the closing-soon colour — the
urgency signal is on-brand rather than invented. The IIM Calcutta brown marks
the admin side. Nothing had to be added.

The second idea: the student dashboard is **a single column ordered by time
remaining**, not a grid of company cards. Most job boards organise by employer.
Here the closing date is what matters, so the closest deadline sits at the top
regardless of company. One column also means the phone and the laptop get the
same layout, and there is only one thing to get right.

The admin side is deliberately different — a brown sidebar and dense tables.
Admins live in the tool; students visit it.

---

## Colour

Every value below is either sampled directly from the two logos or derived from
one of them. There are no invented brand colours.

```css
/* Sampled from the marks */
--navy:    #014488;   /* MBAEx blue — primary buttons, links, active state */
--flame:   #FB5813;   /* MBAEx orange — the 3px deadline rule. Never text. */
--brown:   #592B0B;   /* IIM Calcutta brown — admin sidebar, sign-in frame */

/* Derived */
--ink:     #0B2545;   /* navy darkened — all body text and headings */
--closing: #B03604;   /* flame darkened until it passes AA — countdown text */

/* Neutrals */
--slate:   #5A6675;   /* secondary text, metadata */
--rule:    #DEE3E8;   /* borders, dividers */
--paper:   #FAFAF8;   /* page background */
--surface: #FFFFFF;   /* raised surfaces, table rows */

/* Deadline state */
--live:    #0F7B54;   /* open, more than 48 hours left */
--shut:    #8B94A3;   /* closed, withdrawn, past */
```

**Why two oranges.** The logo orange is gorgeous and fails contrast as text at
3.2:1. It is fine as a 3px rule, where the requirement is 3:1 for non-text
elements. So `--flame` draws the rule and `--closing` sets the words beside it
at 5.95:1. Never set text in `--flame`, and never draw the deadline rule in
`--closing` — they are the same signal in two registers.

Measured against `--paper`: ink 14.7:1, slate 5.6:1, live 5.1:1, closing 6.0:1.
White on brown 11.8:1, white on navy 9.6:1. All pass AA comfortably.

Dark mode is out of scope. Ship light, do it properly.

---

## Type

Two families, clearly distinct in job.

**Source Serif 4** for page titles, company names, and job titles. It carries
the institutional register without looking like a fashion magazine.

**IBM Plex Sans** for everything else. Chosen over the usual grotesques for its
numerals — this interface is full of dates, years of experience and countdowns,
and Plex sets figures that align in a column.

```css
--font-display: 'Source Serif 4', Georgia, serif;
--font-body:    'IBM Plex Sans', system-ui, sans-serif;
```

Scale, in px / line-height:

| Role | Size | Family | Weight |
|---|---|---|---|
| Page title | 30 / 1.15 | display | 600 |
| Section heading | 21 / 1.3 | display | 600 |
| Job or company name | 17 / 1.35 | display | 600 |
| Body | 15 / 1.55 | body | 400 |
| Metadata, table cells | 13.5 / 1.45 | body | 400 |
| Countdown, counts | 13.5 / 1.4 | body | 500, `font-variant-numeric: tabular-nums` |

Body copy caps at 68 characters per line. Announcements are the only long-form
text in the product and they must not run the full width of a laptop screen.

**Do not** use all caps for labels, add an eyebrow above a heading, or set small
metadata in a monospace face.

---

## Layout

```
STUDENT — one column, max-width 760px, centred

┌──────────────────────────────────────────┐
│ (seal) │ MBAEx  Placements      Rahul  ⌄  │  56px, sticky, 1px bottom rule
├──────────────────────────────────────────┤
│                                          │
│  Open roles                              │  section heading
│                                          │
│ ┃ Accenture Strategy                     │  ← 3px left rule, --flame
│ ┃ Strategy Consulting · Mumbai           │
│ ┃ Closes in 31 hours · Wed 12 Mar, 6 PM  │
│ ┃                              Applied ✓ │
│ ├──────────────────────────────────────  │  1px --rule between rows
│ ┃ Deloitte India                         │  ← 3px left rule, --live
│ ┃ Operations Consulting · Bengaluru      │
│ ┃ Closes in 6 days · Mon 17 Mar, 6 PM    │
│                                          │
│  Your applications                       │
│  ...                                     │
└──────────────────────────────────────────┘


ADMIN — sidebar plus dense table, full width

┌────────────┬─────────────────────────────┐
│ ▓ MBAEx  ▓ │  Applicants · Accenture     │
│ ▓        ▓ │  Strategy Consulting        │
│ ▓Dashboard▓│  ─────────────────────────  │
│ ▓Companies▓│  Name      Roll   Exp   CV  │
│ ▓Jobs     ▓│  ─────────────────────────  │
│ ▓Students ▓│  A Sharma  EX01   7.5   ↓   │
│ ▓Announce²▓│  B Rao     EX04   5.0   ↓   │
│ ▓  brown  ▓│                             │
└────────────┴─────────────────────────────┘
```

Everything is left-aligned. Nothing is centred except the sign-in page.

Spacing uses a 4px base: `4 8 12 16 24 32 48 64`. Sections are separated by 32,
rows by 16 of internal padding.

Radius: `0` on rows, bands and table cells; `6px` on buttons, inputs and
dialogs. The rule is that rounding means *you can interact with this*. Do not
round everything to the same value.

Shadows: one, `0 1px 3px rgba(22,32,46,.08)`, and only on dialogs and dropdowns
that float above the page. Rows and tables use rules, not shadows.

---

## Components

**Job row.** The workhorse. A 3px left rule coloured by deadline state, then
company name in display type, then role and location in slate, then the
countdown. An "Applied" mark sits right-aligned. The whole row is the click
target. On hover the background moves to `--surface` — no lift, no scale.

State thresholds: more than 48 hours is `--live`; under 48 the rule is `--flame`
and the countdown text is `--closing`; past or closed is `--shut` with the row
text at 60% opacity.

**Countdown.** Always two facts, in this order: relative then absolute. "Closes
in 31 hours · Wed 12 Mar, 6:00 PM IST". Relative alone is unclear; absolute
alone is not urgent. Under 48 hours the countdown takes `--closing`.

**Buttons.** Primary is `--navy` background, white text, 6px radius, 40px tall.
Secondary is a 1px `--navy` border on transparent. Destructive is an underlined
text link in `--closing`, never a red filled button — nothing in this product is
dangerous enough to warrant one. Never append an arrow to button text.

**Tables (admin).** 13.5px, 40px rows, header in slate with a 1px bottom rule,
zebra striping off, a 1px rule between rows. Numeric columns right-aligned with
tabular figures. Sticky header when the list runs past a screen.

**Empty states.** One sentence saying what will appear here, and the action that
makes it appear. "No open roles right now. New postings appear here and you'll
get an email." Not an illustration, not an exclamation mark.

**Forms.** Labels above inputs, 13.5px slate. Inputs 40px tall, 1px `--rule`
border, `--ink` on focus with a visible 2px outline offset. Errors appear below
the field in `--closing`, naming what to fix. Never rely on colour alone.

**Announcement.** Title in display 21px, then author and timestamp in slate 13.5,
then body at 15px capped at 68 characters. Pinned items get a 3px `--navy` left
rule — the same structural device as job rows, so the language stays consistent.
Navy rather than a deadline colour, because a pin is about importance, not time.

---

## The marks

Two logos, two jobs. The IIM Calcutta seal says which institution. The MBAEx
mark says which programme. They never appear at the same weight.

Save as `/public/logo-iimc.svg` and `/public/logo-mbaex.svg`. The PNGs you have
work, but ask CDPO for SVG — the IIMC seal has fine gear teeth and lettering that
turn to mush at 28px from a 500px raster. The IIMC PNG already has a transparent
background and can be used as-is in the meantime.

**Header, desktop.** IIMC seal at 26px, a 1px `--rule` divider with 12px either
side, MBAEx mark at 22px, then "Placements" in body 15px `--slate`. Left
aligned, vertically centred in a 56px bar.

```
┌────────────────────────────────────────────────┐
│ (seal) │ MBAEx  Placements          Rahul  ⌄  │
└────────────────────────────────────────────────┘
```

**Header, mobile.** Drop the IIMC seal below 640px. MBAEx mark plus
"Placements" only — the seal becomes illegible and the programme mark is the one
students identify with anyway.

**Sign-in page.** The one centred page in the product. IIMC seal at 64px, 32px
of space, MBAEx mark at 40px, then the sign-in button. This is the only place
both marks get room.

**Admin sidebar.** Solid `--brown` background, MBAEx mark reversed to white at
the top, nav items in white at 80% opacity with the active item at 100% and a
2px `--flame` left rule. The brown is doing real work here: an admin never has
to wonder which side of the portal they are on, and students never see it.

**Rules for both marks.** Do not tint, stretch, rotate, add effects to, or place
either mark on a busy background. Do not lock them together into a single
combined logo. Do not use the IIMC seal smaller than 24px. Keep clear space of
at least half the mark's height on every side.

---

## Writing

Sentence case everywhere. No exclamation marks.

Buttons say what happens: "Apply with this CV", not "Submit". The verb stays the
same through the flow — a button that says "Withdraw" produces a confirmation
that says "Application withdrawn".

Errors say what went wrong and what to do. "This role closed on 12 March at
6:00 PM." Not "An error occurred." Never apologise in an error message.

Dates always carry the day name: "Wed 12 Mar, 6:00 PM IST". Students schedule
around days of the week, not dates.

Refer to things the way students do. "Roles", not "job postings". "Your CVs",
not "documents". "Closes", not "expires".

---

## Accessibility floor

Non-negotiable, and cheap if done from the start.

- Every interactive element reachable by keyboard, with a visible focus ring
- Deadline state conveyed by text as well as colour — the countdown says it
- Real `<button>` and `<a>` elements, not clickable divs
- Form inputs have associated `<label>` elements
- `prefers-reduced-motion` respected
- 44px minimum touch target on mobile

---

## Do not

The failure mode is the interface drifting toward a generic dashboard. Specific
things to refuse:

- Cards with rounded corners and grey shadows for every piece of content
- Any colour that is not in the token list — the three brand values and their
  two derivatives are the entire vocabulary
- Brand colour inside the content area; navy for interactive elements and the
  admin frame only, brown for the admin sidebar only
- Setting text in `--flame`, or drawing the deadline rule in `--closing`
- Gradients, glassmorphism, decorative background shapes
- Fade-and-slide entrance animations on scroll
- Icons next to every label
- A stat row of four big numbers across the top of the admin dashboard
- Tracked-out all-caps eyebrows
- Emoji in the interface

If a page needs one of these to look finished, the layout is wrong underneath.
