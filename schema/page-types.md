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
