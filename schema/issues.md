# GitHub Issue Reports

This schema governs what the agent does when the user issues a
**GitHub-issue ingestion** — any request to read a report filed on the
upstream FreeSurfer issue tracker, mirror it into the wiki, and analyse
it against the source code. The result is a durable, interlinked record
that survives any later edits or deletions of the original GitHub
thread, and that supplies a maintainer with an evidence-based verdict
and a concrete recommendation.

Template: `templates/issue-page.md`
Page location: `wiki/issues/<github-issue-id>.md`
Page type: `issue` (see `schema/page-types.md` and `schema/conventions.md`)

Issue pages are **distinct** from bug pages (`wiki/bugs/`):

- A **bug page** (`wiki/bugs/<bug-slug>.md`) is authored from scratch by
  the agent after a source-code audit. It documents a defect the agent
  itself surfaced.
- An **issue page** (`wiki/issues/<N>.md`) mirrors a user- or
  developer-filed GitHub report and adds the agent's independent
  analysis of that report.

The same underlying defect may appear in both systems — in that case
the two pages cross-link (see "Cross-Reference", below). Do not merge
them: the provenance and the intended audience differ.

---

## What Counts as an Issue Ingestion

The agent should follow this schema when the user says, paraphrased:

- "Ingest GitHub issue #NNNN."
- "Create an issue page for freesurfer/freesurfer#NNNN."
- "Can you triage this GitHub issue: <URL>?"
- "Pull issue #NNNN and tell me whether it's a real bug."
- "Write up the latest open issue on `mri_convert`."

It does **not** apply to:

- Agent-initiated source audits (use `schema/bug-reports.md` → a bug
  page, not an issue page).
- Mailing-list threads (use the dialogue / mailing-list archival in
  `schema/faq-and-learning.md`).
- Pull requests — out of scope. If the user points at a PR, ask whether
  they want it treated as a bug investigation or a documentation
  update.

---

## Filename Convention

`wiki/issues/<ID>.md`, where `<ID>` is the **bare GitHub issue number**
as it appears in the URL — no zero-padding, no prefix, no slug. For
example, issue `https://github.com/freesurfer/freesurfer/issues/1234`
becomes `wiki/issues/1234.md`.

Rationale: human maintainers tracking a thread on GitHub can map the
number directly to a wiki file without lookup. This differs from bug
pages, whose slugs encode the defect because bug pages have no external
numbering.

The `issue_id` frontmatter field **must** match the filename.

---

## Guiding Principles

1. **Preserve the report verbatim.** GitHub issues can be edited,
   redacted, or deleted. The issue page is the durable archive. Copy
   the report body into the **Original Report** section with code
   blocks and log excerpts intact. Minor redaction of PII is
   permissible; technical content is not paraphrased.
2. **Separate report from analysis.** The **Original Report**,
   **Environment Reported**, **Reproducer from Report**, and
   **Discussion** sections mirror what the reporter / commenters said.
   The **Agent Analysis**, **Recommendation**, and **Verdict**
   sections are the agent's independent contribution. Do not blur the
   line — a maintainer reading the page must be able to distinguish
   reporter claims from agent claims.
3. **Code is truth.** Every agent claim about what the code does must
   be backed by a file / function / line-range / commit citation, using
   GitHub permalinks (see CLAUDE.md rule 10). Do not paraphrase code —
   quote verbatim.
4. **Do not confabulate.** If the agent cannot locate a plausible
   culprit in the source, say so with a `[!gap]` callout. A report
   that cannot be corroborated by code inspection is still worth a
   page; it is labelled `needs-more-info` or `implausible` and
   explains what was searched.
5. **Match the reporter's version.** The reporter may be running an
   older FreeSurfer. Where possible, read the code at the
   reporter-claimed version *and* at `$FREESURFER_VERSION`, and flag
   any divergence with a `[!contradiction]` or a "already fixed in
   v{X}" note. The wiki's default citation anchor remains
   `$FREESURFER_VERSION`, but the analysis must acknowledge version
   drift.
6. **One issue, one page.** Even if two GitHub issues describe the
   same defect, each gets its own page. Use the `verdict: duplicate`
   field and a **Relation to Known Bugs** cross-link to the canonical
   one.
7. **Preserve provenance.** The page's `issue_url` and ingestion date
   are mandatory. If the agent pulled the issue via `WebFetch`, record
   the fetch date in the **References** section.

---

## Workflow: Ingesting a GitHub Issue

### 1. Locate and Fetch the Issue

- Accept the issue number or full URL from the user. The canonical URL
  pattern is `https://github.com/freesurfer/freesurfer/issues/<N>`.
- Use `WebFetch` to retrieve the issue page. If `gh` is available in
  the environment, `gh issue view <N> --repo freesurfer/freesurfer
  --comments` gives cleaner output; otherwise rely on `WebFetch`.
- If the fetch fails (network, 404, private repo), stop and tell the
  user. Do not guess content.

### 2. Extract Metadata

From the fetched page, capture:

- Issue number, title, state (`open` / `closed`), URL.
- Reporter's GitHub login; real name if shown on their profile.
- Opened date, last-activity date.
- GitHub labels (array).
- Reporter-claimed FreeSurfer version and platform. These are almost
  always in the issue body, not in structured fields — read for
  phrases like "I'm running FreeSurfer 7.4.1 on Ubuntu 22.04".
- Every substantive comment, with author and date.

### 3. Pre-Ingestion Check

- Grep `wiki/issues/` for `<N>.md` — if it already exists, switch to
  the update workflow (see "Updating an Existing Issue Page").
- Grep `wiki/bugs/` and `wiki/issues/` for the reporter's symptom
  (error message, tool name, function name). A corresponding bug or
  duplicate issue may already exist.
- Check `raw/mailing-list/` and `raw/dialogue/` for prior discussion of
  the same symptom.

### 4. Scaffold the Page

- Copy `templates/issue-page.md` to `wiki/issues/<N>.md`.
- Fill every frontmatter field. Unknown fields take their documented
  default and are explained in a `[!gap]` callout in the body.
- Set `issue_id` to match the filename.
- Populate the **Report Metadata**, **Original Report**,
  **Environment Reported**, **Reproducer from Report**, and
  **Discussion** sections from the fetched content. These sections
  are *reporter-provided* — do not inject agent commentary here.

### 5. Identify the Culprit in the Source

- From the reporter's description — tool name, error message,
  screenshots, log excerpts — form a hypothesis about which
  `$FREESURFER_SOURCE` file(s) are implicated.
- Grep the source tree for stable strings from the error message or
  for the cited symbol names. Error messages are usually reliable
  anchors because they are printf-literal.
- Trace the suspect code path end-to-end; do not skim. Apply the same
  rigour as `schema/bug-reports.md` §3.
- Record the exact file / function / line range / commit SHA. Quote
  the excerpt verbatim. Use GitHub permalinks for every line
  reference (CLAUDE.md rule 10).
- If no plausible culprit can be located, document the search in the
  **Plausibility** section and set `verdict: needs-more-info` or
  `verdict: implausible`, whichever applies.

### 6. Assess Plausibility

For each candidate defect, ask:

1. **What does the code actually do at the reporter's version?** If
   the reporter stated a version, read the code at that tag.
2. **Does that behaviour match the reported symptom?** Cite the exact
   lines that cause (or rule out) the symptom.
3. **Has the code changed between the reporter's version and
   `$FREESURFER_VERSION`?** If yes, is the defect fixed, unchanged,
   or mutated? Record "already fixed in v{X}" where applicable.
4. **Is the reporter actually describing user error, documented
   gotcha, or unsupported input?** If yes, the verdict is
   `user-error` or a cross-link to the relevant gotcha / tool page.

### 7. Choose a Verdict

Set `verdict` (frontmatter) to exactly one of:

| Verdict              | When to use                                                        |
|----------------------|--------------------------------------------------------------------|
| `plausible`          | Code inspection corroborates the reported defect.                  |
| `implausible`        | Code inspection contradicts the report; explain why in the body.   |
| `needs-more-info`    | Report is compatible with a defect, but something essential is missing (version, input properties, platform). Enumerate what. |
| `duplicate`          | Same defect as another GitHub issue already ingested.              |
| `not-a-bug`          | Documented, intended behaviour; link the relevant tool/gotcha page.|
| `user-error`         | Reporter misused the tool; draft a polite reply.                   |
| `resolved-upstream`  | A commit in the repo fixes the defect after the report was filed. Cite the commit. |
| `feature-request`    | Report is an enhancement, not a defect.                            |

### 8. Write the Recommendation

- If `plausible`: write a concrete fix in the **Recommendation**
  section. Use unified diff or pseudo-diff. If a matching
  agent-authored bug page already exists in `wiki/bugs/`, do **not**
  re-derive the fix — link to the bug page and summarise. Update the
  bug page's `upstream_issue_url` to point to this issue page.
- If `needs-more-info` or `user-error`: include a short, courteous
  **Draft Reply to Reporter** subsection that a maintainer can paste
  into the GitHub thread.
- If `duplicate` or `resolved-upstream`: cite the canonical issue or
  fix commit; keep the recommendation section short.

### 9. Cross-Reference

- **To the affected tool page:** add a **Known Issues** subsection if
  it does not exist (placed immediately before **Related Tools**, and
  after any **Known Bugs** subsection). Link the issue page with a
  one-line summary and the verdict.
- **To any related bug page:** set `related_bugs` in frontmatter; set
  that bug page's `upstream_issue_url` to this issue's URL.
- **To any duplicate issue page:** link both ways. The canonical page
  is the one with the earliest `reported_date`.
- **To any related gotcha / FAQ page:** add a `[[wikilink]]` under
  **Related** when the verdict is `not-a-bug` or `user-error`.

### 10. Update `index.md`

- Add an entry to the **GitHub Issues** section of `index.md` (create
  the section if it does not exist, placed immediately after **Bugs**).
- Format (one row per issue):

  ```markdown
  ## GitHub Issues
  | Issue | Title | Affected | Verdict | State |
  |-------|-------|----------|---------|-------|
  | [[1234]] | short title | [[mri_convert]] | plausible | open |
  ```

### 11. Log the Operation

Append to `log.md`:

```markdown
## [YYYY-MM-DD] issue | <ID>
- Created wiki/issues/<ID>.md (<verdict>, <state>)
- Source: <file>:<lines> @ <commit>  (or "no culprit identified")
- Affected: [[tool]] (, [[tool]], ...)
- Reporter: <gh-username> (reported YYYY-MM-DD, FS v<X>)
- Related: [[wiki/bugs/NNNNN]] (if any)
```

If an issue page was **updated** rather than created, use:

```markdown
## [YYYY-MM-DD] issue | updated <ID>
- <what changed>
```

---

## Updating an Existing Issue Page

Issue pages are not immutable. Update them when any of the following
occurs:

1. **New comments arrive** on the GitHub thread. Append a new bullet
   to **Discussion**; do not overwrite. Update `last_activity_date`.
2. **The GitHub state changes** (open → closed, or vice versa). Update
   `state` and add a short note to **Discussion** with the closing
   reason. If closed by a fix commit, set `upstream_status:
   fixed-in-<VERSION>` and add a **Resolution** section at the bottom
   of the page.
3. **The agent's analysis is superseded** — a reproducer is now
   available, a version-specific finding was wrong, or a matching bug
   page was later written. Update **Agent Analysis** in place; add a
   short note at the top of the section citing the revision date.
4. **A matching bug page is created** in `wiki/bugs/` after this issue
   was ingested. Update `related_bugs` and the **Relation to Known
   Bugs** section.

When updating:

- Update `last_agent_update`, and `last_activity_date` where relevant.
- Preserve the original **Original Report** excerpt verbatim, even if
  the GitHub body was later edited. If GitHub has edited content, add
  a new subsection **Report — Revision (YYYY-MM-DD)** beneath it with
  the new text; do not overwrite.
- Preserve the original code excerpt and commit SHA under **Relevant
  Code**. If line numbers have shifted in a later commit, add a
  second block with the newer SHA — do not overwrite the old one.

---

## Interaction With Other Page Types

- **Tool pages** remain the canonical documentation of a tool's
  intended behaviour. They do not narrate individual issues; they
  link to issue pages under a **Known Issues** subsection (distinct
  from **Known Bugs**, which lists internal bug pages).
- **Bug pages** (`wiki/bugs/`) are the agent's own catalogue of
  defects. They may predate, postdate, or coincide with issue pages.
  Cross-link both ways; do not merge.
- **Gotcha pages** describe surprising-but-correct behaviour. An
  issue whose verdict is `not-a-bug` or `user-error` should link the
  relevant gotcha page (creating it if necessary) rather than
  inlining the explanation.
- **FAQ pages** may cite issue pages when answering "has anyone seen
  this?" questions. The FAQ entry paraphrases; the issue page remains
  the source of truth for the report.
- **Dialogue / mailing-list archives** capture non-GitHub discussion.
  They may reference the same defect; add `[[wikilinks]]` under
  **Related** in all directions.

---

## Output Contract for LLM Consumers

Because issue pages will be read by LLM agents answering "is this a
known report?" or "what is the verdict on issue NNNN?", the following
fields are a stable machine contract. Do not rename or repurpose them:

- Frontmatter: `type: issue`, `issue_id`, `issue_url`, `state`,
  `reporter`, `reported_date`, `reported_version`, `verdict`,
  `severity`, `affected_tools`, `source_files`, `symbols`,
  `related_bugs`, `upstream_status`.
- Body: the `[!issue] Synopsis` callout immediately under the H1.
- Body: the **Original Report**, **Agent Analysis**,
  **Recommendation**, and **Verdict** sections.

If a machine consumer needs only one block, it should be able to
extract the Synopsis callout verbatim and the `verdict` frontmatter
value.
