# Bug Reports

This schema governs what the agent does when the user issues a
**bug search** — any request to audit code, investigate a suspected
defect, or compile a bug report. It also defines how bug pages are
written so they can be consumed both by human developers and by other
LLM agents answering questions about FreeSurfer.

Template: `templates/bug-page.md`
Page location: `wiki/bugs/<bug-slug>.md`
Page type: `bug` (see `schema/page-types.md` and `schema/conventions.md`)

---

## What Counts as a Bug Search

The agent should follow this schema when the user says, paraphrased:

- "Search for bugs in `<tool>` / `<module>` / `<pipeline>`."
- "Audit `<file>` for defects."
- "Check whether `<tool>` has the problem described in this mailing-list thread."
- "Investigate this crash / NaN / mis-registration / wrong output."
- "Is this a known bug? Write it up."
- "Lint the source for buffer overruns / sign errors / off-by-ones / etc."

It does **not** apply to routine ingestion of a tool (use
`schema/operations.md` for that) unless the ingestion itself surfaces
something that looks like a defect — in which case the agent creates a
bug page as a side effect and continues ingestion.

---

## Guiding Principles

1. **Code is truth.** Every bug page must cite the source unambiguously:
   file path, function, line range, and the git commit SHA at which
   those line numbers are valid. Paraphrased code excerpts are not
   acceptable — quote verbatim.
2. **One bug, one page.** A bug page documents a single defect, or a
   single defect that manifests in multiple call sites. Do not bundle
   unrelated defects on the same page.
3. **Flag uncertainty loudly.** If the agent believes it has found a
   bug but cannot construct a reproducer, say so with a `[!gap]`
   callout. A suspected-but-unconfirmed bug is still worth recording,
   but it must be labelled as such.
4. **Do not confabulate.** If the recommended fix depends on developer
   intent that cannot be inferred from the code, do not guess. Record
   the ambiguity and ask for confirmation.
5. **Preserve provenance.** If the bug was surfaced by a mailing-list
   thread or developer dialogue, archive that source in
   `raw/mailing-list/` or `raw/dialogue/` before writing the bug page,
   and cite the archive.
6. **Stay local to the defect.** Bug pages describe defects; they do
   not rewrite the tool's documentation. If fixing the bug requires
   broader documentation changes, note them as `related` and handle
   them in a separate operation.

---

## Workflow: Responding to a Bug Search

### 1. Scope the Search

- Identify the artefact(s) under audit: a single file, a tool, a
  pipeline stage, a library module.
- Confirm the version of record: `$FREESURFER_VERSION` (default) or a
  specific commit the user provides.
- If the user's request is vague ("find bugs in recon-all"), propose
  a concrete scope before starting: list candidate files and ask
  whether to proceed with that scope.

### 2. Gather Context Before Reading Code

- Read the existing wiki page(s) for the tool/pipeline under audit.
- Grep `wiki/bugs/` and `raw/dialogue/` for prior mentions of the
  same symptom — avoid duplicate bug pages.
- Check `raw/mailing-list/` for threads discussing the same symptom.
- Check the upstream FreeSurfer GitHub issue tracker, if relevant and
  the user has granted web access.

### 3. Read the Code

- Start from the documented entry point (usually `main()` or the
  tool's Python entry function).
- Trace the suspected code path end-to-end. Do not skim.
- For each candidate defect, ask:
  1. **What is the code intended to do?** (Contract from comments,
     surrounding invariants, docs, callers.)
  2. **What does it actually do?** (Line-by-line reading.)
  3. **Is the difference observable?** (Does it change output, leak
     resources, crash, trigger UB, mis-handle an edge case?)
  4. **Is it reachable?** (Dead code is not a bug worth a page.)

### 4. Attempt Reproduction

- Construct a minimal command line or input that should trigger the
  defect, if the environment allows it.
- If `$FREESURFER_HOME` is available and the tool is installed, run
  the reproducer and compare observed vs. expected output.
- If reproduction is not possible (missing data, GUI-only tool,
  requires hardware), mark `reproducible: no` or `unknown` in the
  frontmatter and explain in a `[!gap]` callout.

### 5. Decide Whether to Write a Page

Write a bug page if **any** of these hold:

- The defect is **confirmed** by reproduction or by an unambiguous
  reading of the code (e.g., a provably unreachable `free()`).
- The defect is **strongly suspected** and warrants developer review,
  even without reproduction.
- A **mailing-list thread or developer dialogue** attests to the
  defect, and code reading locates the likely site.

Do **not** write a bug page for:

- Stylistic complaints, unless they encode a real latent defect
  (e.g., a missing `volatile` that actually matters).
- "This could be faster" — that is a performance note, not a bug.
- Documentation gaps — those go to the relevant tool page's
  `gaps` frontmatter, not to a bug page.
- Behaviour that is merely surprising but correct — that is a
  `[!gotcha]` on the tool page.

### 6. Write the Bug Page

- Copy `templates/bug-page.md` into `wiki/bugs/<bug-slug>.md`.
- `bug-slug` is kebab-case: `<tool>-<short-symptom>`, e.g.,
  `mri_convert-voxsize-overwrite` or
  `recon-all-talairach-register-silent-fail`.
- Fill every frontmatter field. Unknown fields take their schema
  default and are explained in a `[!gap]` callout in the body.
- The **Synopsis** block (the `[!bug]` callout at the top) is what
  downstream LLM agents will quote. Write it so it stands alone.
- The **Code Reference** section is mandatory. Include:
  - Exact file path relative to `$FREESURFER_SOURCE`.
  - Function (and class, if any).
  - Line range that fits on a screen.
  - Git commit SHA at which those line numbers are valid.
  - A verbatim, syntax-highlighted excerpt.
- The **Recommended Fix** section should be concrete enough that a
  developer can act without re-reading the file. A unified diff or
  pseudo-diff is preferred.
- If any section is genuinely not applicable (e.g., "Workarounds" for
  a silent-corruption bug with no safe mitigation), keep the heading
  and write a single sentence saying none exists. Do not delete
  headings — consistency aids machine parsing.

### 7. Cross-Reference

- Add a `[[wikilinks]]` reference to the bug page from the affected
  tool/pipeline/concept page, under a **Known Bugs** subsection (add
  the subsection if it does not exist, placed immediately before
  **Related Tools**).
- Update the bug page's `affected_tools` and `related` frontmatter.
- If the bug was surfaced by a dialogue archive, link both ways.

### 8. Update `index.md`

- Add an entry to the **Bugs** section of `index.md`.
- Format (one row per bug):

  ```markdown
  ## Bugs
  | Bug | Affected | Severity | Status |
  |-----|----------|----------|--------|
  | [[mri_convert-voxsize-overwrite]] | [[wiki/tools/mri_convert|mri_convert]] | high | open |
  ```

### 9. Log the Operation

Append to `log.md`:

```markdown
## [YYYY-MM-DD] bug-report | <bug-slug>
- Created wiki/bugs/<bug-slug>.md (<severity>, <status>)
- Source: <file>:<lines> @ <commit>
- Affected: [[tool]] (, [[tool]], ...)
- Reproducer: <yes|no|unknown>
- Evidence: <dialogue/mailing-list/source-audit>
```

If a bug page was **updated** rather than created (e.g., a new
reproducer was constructed, or the upstream status changed), use:

```markdown
## [YYYY-MM-DD] bug-report | updated <bug-slug>
- <what changed>
```

---

## Updating an Existing Bug Page

Bug pages are not immutable. Update them when:

- A reproducer is constructed for a previously-suspected bug.
- The upstream project patches or declines the bug.
- A further code site is implicated in the same defect (add it to
  the Code Reference section, don't create a new page).
- A revised recommendation supersedes the original.

When updating:

1. Update the affected frontmatter fields, including
   `last_agent_update` and `upstream_status`.
2. Preserve the original Code Reference excerpt and commit SHA. If
   the line numbers have shifted in a later commit, add a second
   Code Reference block with the newer SHA; do not overwrite the
   old one.
3. If the bug is resolved upstream, set `status: resolved` and
   `upstream_status: fixed-in-<VERSION>`, and add a **Resolution**
   section at the bottom of the page describing the fix commit.

---

## Interaction With Other Page Types

- **Tool pages** remain the canonical documentation of a tool's
  intended behaviour. They do not narrate bugs; they link to bug
  pages under a **Known Bugs** subsection.
- **Gotcha pages** describe surprising-but-correct behaviour. If the
  line between "gotcha" and "bug" is unclear, ask: _does a developer
  reading this agree the code is wrong?_ If yes → bug page. If no →
  gotcha page.
- **FAQ pages** may cite bug pages when answering capability or
  known-issue questions. The FAQ entry paraphrases; the bug page
  remains the source of truth.
- **Dialogue / mailing-list archives** feed bug pages with
  provenance. Never inline the archive text into the bug page —
  cite the archive file path.

---

## Severity Scoring (1–5)

Every bug page carries an integer **severity** score from 1 (trivial)
to 5 (critical). The score is what the development team uses to
triage; pick it deliberately and justify it in the body if the score
is not obvious from the synopsis.

| Score | Label | Criteria |
|-------|-------|----------|
| **5** | critical | Silent wrong output or crash in a **default user-facing pipeline** (e.g. [[wiki/pipelines/recon-all|recon-all]], [[infant-recon-all]], [[trac-all]], [[long_mris_slopes]]) — i.e. fires on the default invocation path of a multi-tool workflow that users routinely run end-to-end. Biases or invalidates published results from default usage. |
| **4** | high | Wrong output or crash in an **individual user-facing auxiliary tool that is not part of a larger pipeline** (e.g. `mri_convert`, `mri_glmfit`, `mri_gtmpvc`, `mri_volcluster`, `mri_dct_align`). Fires on the tool's default invocation, but the tool is run standalone rather than as a pipeline stage. |
| **3** | medium | Wrong output or crash **gated behind specific flag combinations** in any tool or pipeline. The default path is unaffected; the bug fires only when the user opts into a particular mode (`--remove-islands`, `-rt vote`, `--paired-*`, multi-frame input, etc.). |
| **2** | low | **Latent under typical conditions** — fires only on inputs no caller exercises, on edge cases that are not reached in practice, or only in diagnostic / QA / verbose-mode / logging output. The user's primary results are unaffected. |
| **1** | trivial | Dead code; technical debt; defects with **no in-tree callers**; redundant checks; cosmetic. Worth recording for cleanup but not actionable for triage. |

Picking a score:

- Default to the lowest score that fits. If a bug straddles two
  levels, pick the lower and explain in the **Impact** section why
  it does not warrant the higher.
- Latency matters. A theoretically catastrophic defect that fires
  only when no caller exercises it is a 1, not a 5.
- Reach matters. A defect in `recon-all`'s default chain outranks
  the same defect in a tool that requires a specific flag.
- The **frontmatter** field is `severity_score: <1..5>`. The legacy
  `severity:` label (`critical`/`high`/`medium`/`low`/`trivial`) is
  retained for compatibility and must agree with the score.

---

## Title and Tag Conventions

Every bug page's `title` (frontmatter), H1 heading, and `index.md`
entry begin with a fixed, machine-parseable prefix:

```
[severity-N] [bug-NNNNN] <existing descriptive title>
```

- `N` is the severity score, `1`–`5`.
- `NNNNN` is the zero-padded five-digit bug ID matching the filename
  (e.g., `00044.md` → `bug-00044`).
- The descriptive title that follows is the same phrasing the agent
  would have written without the prefix.

Tags must include both axes for filtering:

```yaml
tags:
  - bug
  - severity-N         # numeric score
  - bug-NNNNN          # canonical ID, matches filename
  - <other tags>       # category, subsystem, etc.
```

The numeric `severity-N` tag is canonical. Word-form tags (e.g.,
`high`, `critical`) may be added in addition for human searches but
are not required.

When updating an existing page's severity, update **all** of: the
`severity_score` frontmatter field, the legacy `severity:` label,
the `[severity-N]` prefix in the `title` and H1, and the
`severity-N` tag. Drift between these is a lint failure.

---

## Output Contract for LLM Consumers

Because bug pages will be read by LLM agents answering FreeSurfer
questions, the following fields are treated as a stable machine
contract. Do not rename or repurpose them:

- Frontmatter: `type: bug`, `severity_score` (1–5), `severity`
  (legacy label), `status`, `upstream_status`, `affected_tools`,
  `source_files`, `symbols`, `first_seen_commit`,
  `last_confirmed_commit`.
- Frontmatter `title` field begins with `[severity-N] [bug-NNNNN] `.
- Tags include `severity-N` and `bug-NNNNN`.
- Body: the `[!bug] Synopsis` callout immediately under the H1.
- Body: the **Code Reference**, **Root Cause**, and
  **Recommended Fix** sections.

Other sections may evolve. If a machine consumer needs only one block,
it should be able to extract the Synopsis callout verbatim.
