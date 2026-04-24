# Page Types and Templates

This file defines every page type in the FDP wiki. Use the corresponding
template from `templates/` when creating a new page.

## Command-Line Tool Pages (`wiki/tools/<tool-name>.md`)

Template: `templates/tool-page.md`

Every user-facing command or script gets a page. Required sections:

1. **Summary** — one-paragraph description
2. **Source info** — language, source file(s) relative to FS source tree
3. **Purpose and context** — why this tool exists, where it fits
4. **Inputs** — data types, formats, required files, assumptions
5. **Outputs** — data types, formats, files created/modified
6. **Mathematical foundations** — key algorithms, equations, transformations
   (LaTeX: `$...$` inline, `$$...$$` display)
7. **Configuration options** — complete enumeration of all flags/parameters
8. **Configuration interactions** — mutually exclusive flags, intended
   vs. nonsensical combinations, contradictory flag behaviour
9. **Typical use cases** — concrete examples with full command lines
10. **Pipeline context** — recon-all stage(s), predecessor/successor tools
11. **Gotchas and caveats** — edge cases, error compensation, undocumented features
12. **Related tools** — `[[wikilinks]]`
13. **Confidence and gaps** — `[!gap]` callouts for unknowns

## Concept Pages (`wiki/concepts/<concept>.md`)

Template: `templates/concept-page.md`

Cross-cutting topics: coordinate systems, registration, surface
representations, atlas spaces, segmentation labels, statistical methods.

## Pipeline Pages (`wiki/pipelines/<pipeline>.md`)

Template: `templates/pipeline-page.md`

Multi-tool workflows (recon-all stages). Shows sequence of tools,
data flow, and decision points.

## Format Pages (`wiki/formats/<format>.md`)

Template: `templates/format-page.md`

File formats: mgz/mgh, surface files, annotation files, label files,
transform files (.lta, .xfm, .reg), etc.

## Gotcha Pages (`wiki/gotchas/<topic>.md`)

Standalone pitfall documentation that doesn't belong to a single tool.
Cross-reference from tool pages. Based on source code comments,
undocumented behaviour, or user reports.

## Internal Pages (`wiki/internals/<module>.md`)

Brief descriptions of shared code, libraries, and internal utilities
that are NOT user-facing but contain important logic. Referenced from
tool pages when the internal code contains mathematically or conceptually
important information.

## GUI Application Pages (`wiki/tools/<app-name>.md`)

Template: `templates/gui-application-page.md`

Hub page for interactive GUI applications (FreeView, etc.). Replaces
`tool-page.md` for graphical tools. See `schema/gui-documentation.md`
for the full specification.

## GUI Panel Pages (`wiki/tools/<app-name>-<panel>.md`)

Template: `templates/gui-panel-page.md`

One page per data type / panel / mode within a GUI application.
See `schema/gui-documentation.md` for the full specification.

## FAQ Pages (`wiki/faq/<topic>.md`)

Template: `templates/faq-page.md`

Curated Q&A entries built from mailing list mining and archived developer
dialogue. See `schema/faq-and-learning.md` for the full specification.

## Bug Pages (`wiki/bugs/<bug-slug>.md`)

Template: `templates/bug-page.md`

One page per identified defect, or per single defect that manifests in
multiple call sites. A bug page is a report written for both human
developers and LLM consumers — it must include a synopsis, a detailed
description, an unambiguous code reference (file, function, line range,
commit SHA, verbatim excerpt), and a concrete recommended fix. See
`schema/bug-reports.md` for the full specification and the workflow to
follow when the user issues a bug search.

Bug pages are distinct from gotcha pages: a **gotcha** documents
surprising-but-correct behaviour; a **bug** documents behaviour a
developer would agree is wrong.

## GitHub Issue Pages (`wiki/issues/<github-issue-id>.md`)

Template: `templates/issue-page.md`

One page per ingested GitHub issue from the upstream FreeSurfer
repository. The filename is the bare GitHub issue number (no padding,
no slug), so maintainers can map a thread URL to a wiki file directly.
An issue page is a durable archive of the report (GitHub threads can be
edited or deleted) plus the agent's independent code-anchored analysis
and a verdict. It must include: metadata (reporter, date, reported
version, state, labels, URL), the original report quoted verbatim, any
reporter-supplied reproducer, a summary of the discussion, the agent's
source-code investigation with the same rigour as a bug page, a
plausibility assessment, a concrete recommendation, and a one-word
verdict. See `schema/issues.md` for the full specification and the
workflow.

Issue pages are distinct from bug pages: a **bug page** is the agent's
own defect catalogue, authored from source audit; an **issue page**
mirrors an external GitHub report and adds agent analysis. The same
underlying defect may be described by both — in that case they
cross-link.

## File Pages (`wiki/files/<filename>.md`)

Template: `templates/file-page.md`

One page per canonical output file produced by any FreeSurfer tool,
pipeline, or script. File pages are the project's **glossary** — a
per-artefact reference for what each file contains, which tool created
it, what inputs were required, what other outputs were written
alongside it, what downstream tools read it, and any aliases,
duplicates, or variants. The page name equals the literal on-disk
filename (with extension); hemispheric pairs like `lh.white` /
`rh.white` share a single page named `hemi.white.md` with both
expansions listed as frontmatter aliases. See `schema/files.md` for
the full specification, filename conventions, and the ingestion
workflow.

File pages are distinct from format pages and from `[[subject-directory]]`:
a **format page** specifies the byte layout of a file type
(`[[mgz]]`, `[[surface-format]]`, `[[annotation-format]]`, …);
**`[[subject-directory]]`** is the single-page inventory of the
`$SUBJECTS_DIR/<subj>/` tree; a **file page** is the glossary entry
for one specific artefact and is linked from both. Format pages and
`[[subject-directory]]` remain canonical for their scopes; file pages
answer "what is this file, and how does it fit in the dependency
graph?".
