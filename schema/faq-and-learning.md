# FAQ and Learning from Conversations

## Overview

The wiki learns from two streams of interaction:

1. **Mailing list mining** — archived threads from the FreeSurfer mailing
   list that contain permanent community knowledge
2. **Developer dialogue** — substantive questions asked by developers,
   maintainers, and users during their conversations with the agent

Both streams feed into **raw source files** (archival, immutable after
creation except for in-session updates). From these raw sources, the
agent synthesises **FAQ pages** in the wiki — but only when explicitly
asked to do so.

```
Conversations ──→ raw/dialogue/     ──┐
                                      ├──→ wiki/faq/*.md (agent-triggered)
Mailing list  ──→ raw/mailing-list/ ──┘
```

---

## Part 1: Dialogue Archival (Automatic)

### When to Archive

The agent archives a Q&A pair to `raw/dialogue/` when **all** of the
following are true:

1. The user asked a **question** (not a command like "ingest tool X")
2. Answering the question required **synthesis** — the agent had to
   consult multiple wiki pages, investigate source code, or combine
   information from different sources
3. The answer contains **reusable knowledge** — it would be useful to
   other FreeSurfer users, not just this specific user's situation

Do NOT archive:
- Simple commands ("document mri_convert", "run a lint pass")
- Clarification questions ("what did you mean by X?")
- Requests for formatting or stylistic changes
- Questions whose answers are already fully contained in a single
  existing wiki page (just link to it)

### Filename Convention

```
raw/dialogue/{unix_timestamp}-{username}-{question-slug}.md
```

- **`unix_timestamp`**: current UTC Unix time (seconds since epoch).
  Obtain via `date +%s`. This is timezone-independent and monotonically
  increasing — no ambiguity about ordering.
- **`username`**: the Linux username from `$USER`. Falls back to
  `unknown` if not set. This enables assigning confidence weights
  per user later (e.g., a FreeSurfer core developer's questions carry
  different weight than an external user's).
- **`question-slug`**: a short kebab-case summary of the question
  essence (3–6 words, no special characters). The agent generates this.

Examples:
```
raw/dialogue/1745193600-jdoe-surface-vertex-editing.md
raw/dialogue/1745280000-asmith-talairach-mni-confusion.md
raw/dialogue/1745366400-unknown-freeview-overlay-threshold.md
```

### Archive File Format

```yaml
---
type: dialogue-archive
unix_timestamp: 1745193600
username: "jdoe"
date_utc: "2026-04-21T00:00:00Z"
question_slug: "surface-vertex-editing"
question_summary: "Is it possible to manually edit a reconstructed white-matter surface mesh?"
answer_sources:
  - wiki: "[[freeview-surfaces]]"
  - wiki: "[[freeview-editing]]"
  - code: "freeview/DialogRepositionSurface.cpp"
answer_status: final          # initial | updated | final
update_count: 0               # incremented each time the answer is revised
tags:
  - freeview
  - surfaces
  - editing
---

## Question

Is it possible to manually edit a reconstructed white-matter surface mesh?

## Answer

[The agent's synthesised answer, written in the same style as wiki
pages — clear, factual, with [[wikilinks]] to relevant pages.]

## Sources Consulted

- [[freeview-surfaces]] — surface editing capabilities
- [[freeview-editing]] — Recon Edit mode, vertex repositioning
- Source code: `freeview/DialogRepositionSurface.cpp` — confirmed
  single-vertex repositioning interface

## Revision History

### Initial answer (1745193600)
[Summary of the initial answer]
```

### In-Session Updates

If the user pushes back on the answer, provides corrections, or the
agent discovers additional information during the same conversation:

1. **Update the existing archive file** — do not create a new file
2. Increment `update_count` in the frontmatter
3. Change `answer_status` to `updated` (or `final` if the user confirms)
4. Append a new entry to the Revision History section:
   ```markdown
   ### Revision 1 (1745193900)
   User pointed out that vertex repositioning also supports snapping to
   intensity gradients. Updated the answer to include this. Confirmed
   by reading DialogRepositionSurface.cpp line 245.
   ```
5. Update the main Answer section to reflect the current best answer

The archive file is **append-only for revision history** — the main
Answer section always reflects the latest understanding, and the
Revision History preserves the evolution.

### Logging

Dialogue archival operations are logged in `log.md` with metadata only —
never the question text, answer content, or revision details. The raw
archive file is the single source of truth for content.

Format:
```
## [2026-04-21] dialogue | archived
- Created raw/dialogue/1745193600-jdoe-surface-vertex-editing.md

## [2026-04-21] dialogue | updated
- Updated raw/dialogue/1745193600-jdoe-surface-vertex-editing.md (revision 2)

## [2026-04-21] faq-synthesis | freeview
- Processed 4 dialogue archives, 1 mailing-list archive
- Added 3 entries to wiki/faq/freeview.md
- Skipped 2 archives (ephemeral)
```

---

## Part 2: Mailing List Archival

### Trigger

Archive mailing list threads when explicitly asked to mine the mailing
list, or when a thread is encountered during research that contains
permanent knowledge.

### Filename Convention

```
raw/mailing-list/{YYYY-MM}-{topic-slug}.md
```

Example: `raw/mailing-list/2024-03-surface-vertex-count.md`

### Archive File Format

```yaml
---
type: mailing-list-archive
source: "freesurfer@nmr.mgh.harvard.edu"
thread_url: "https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msgNNNNN.html"
scraped_date: 2026-04-20
participants:
  - name: "Developer Name"
    email: "dev@example.com"
    role: developer            # developer | user | unknown
  - name: "User Name"
    email: "user@example.com"
    role: user
dates:
  first_message: 2024-03-15
  last_message: 2024-03-17
topic: "Surface vertex count modification"
permanent_knowledge: true
tags:
  - freeview
  - surfaces
---

# Thread: [Original Subject Line]

[Full text of the email exchange, preserving all messages in order,
with sender and date for each message.]
```

Mailing list archives are **immutable** after creation. They preserve
the original exchange because the online source may disappear.

---

## Part 3: FAQ Synthesis (Agent-Triggered Only)

### When FAQ Pages Are Created or Updated

FAQ pages are **never** created or updated automatically. The agent
synthesises or updates FAQ pages only when the user explicitly requests
it, for example:

- "Synthesise a FAQ page from the dialogue archives"
- "Update the FreeView FAQ with new entries from raw/dialogue/"
- "Create a FAQ page about coordinate systems"
- "Process unread dialogue archives into FAQs"

### FAQ Page Location

```
wiki/faq/<topic>.md
```

FAQ pages are organised by topic, not by source. Examples:
- `wiki/faq/freeview.md` — questions about FreeView
- `wiki/faq/coordinates.md` — questions about coordinate systems
- `wiki/faq/recon-all.md` — questions about the recon-all pipeline

> [!important] FAQ basenames collide with tool/pipeline pages.
> Always reference an FAQ page with its path-qualified wikilink:
> `[[wiki/faq/recon-all|recon-all FAQ]]`. A bare `[[recon-all]]` is
> ambiguous and breaks on the published site — see
> `schema/conventions.md` § "Path-Qualified Wikilinks".

### FAQ Entry Structure

Each entry within a FAQ page:

```markdown
### Can FreeView modify the number of vertices in a surface?

**Short answer:** No.

**Detail:** FreeView can reposition individual vertices (Tools →
Reposition Surface Vertex) but cannot add, remove, or change the
connectivity of vertices. The vertex count is determined during
surface tessellation by [[mri_tessellate]] and is fixed at that point.
To decimate a surface, use `mris_decimate` from the command line.

**Provenance:** Developer dialogue, 2026-04-21 (jdoe).
See `raw/dialogue/1745193600-jdoe-surface-vertex-editing.md`.
Code-verified: `freeview/DialogRepositionSurface.cpp`.

**Related:** [[freeview-surfaces]], [[mri_tessellate]], [[mris_fix_topology]]
```

Required fields per entry:
1. **Question as heading** (### level) — phrased as a user would ask it
2. **Short answer** — one sentence, direct
3. **Detail** — fuller explanation with `[[wikilinks]]`
4. **Provenance** — mandatory. One of:
   - `Developer dialogue, {date} ({username}). See raw/dialogue/{file}.`
   - `Mailing list, {date}. See raw/mailing-list/{file}.`
   - `Derived from source code analysis of {path}.`
   - If code-verified, append: `Code-verified: {path}.`
5. **Related** — `[[wikilinks]]` to relevant wiki pages

### FAQ Synthesis Workflow

When the user asks to synthesise FAQs:

1. Read all unprocessed files in `raw/dialogue/` and `raw/mailing-list/`
2. For each, determine:
   - Is this permanent knowledge? (If no, skip)
   - Does an FAQ entry for this topic already exist? (If yes, consider
     updating rather than duplicating)
   - Which FAQ page does it belong to? (By topic)
3. Draft FAQ entries and present them to the user for review
4. On approval, write the entries to the appropriate FAQ page(s)
5. Update the FAQ page frontmatter (`entry_count`, `last_agent_update`)
6. Log the operation in `log.md`

### Updating Existing FAQ Entries

When new dialogue or mailing list archives provide better answers to
questions that already have FAQ entries:

1. Update the Detail section with the improved answer
2. Add the new source to Provenance (accumulate, don't replace)
3. If the Short answer changes, update it
4. Note the update in `log.md`

---

## Part 4: Agent Behaviour Summary

### During a conversation:

1. Answer the user's question using wiki pages, FAQ pages, and source code
2. If the Q&A meets the archival criteria (substantive, synthesised,
   reusable), archive it to `raw/dialogue/` **automatically**
3. If the user pushes back and the answer evolves, update the archive
   file in place
4. Do NOT automatically create or update FAQ pages

### When explicitly asked to synthesise FAQs:

1. Read `raw/dialogue/` and `raw/mailing-list/`
2. Filter for permanent knowledge
3. Group by topic
4. Draft entries, present for review
5. Write to `wiki/faq/<topic>.md` on approval

### When explicitly asked to mine the mailing list:

1. Scrape relevant threads
2. Archive to `raw/mailing-list/` with full metadata
3. Determine if each thread contains permanent knowledge
4. Do NOT automatically create FAQ entries — wait for synthesis request

### Source priority for answering questions:

```
Wiki tool/concept pages  →  FAQ pages  →  Source code  →  Training data
```

### Separating permanent from ephemeral:

| Permanent (→ archive and FAQ) | Ephemeral (→ do not archive) |
|------------------------------|------|
| How a coordinate transform works | User's crash on specific OS version |
| What flags interact in mri_convert | User's specific data formatting issue |
| Whether FreeView can edit surfaces | User asking how to install FreeSurfer |
| Undocumented behaviour confirmed by code | Questions already fully answered by one wiki page |
