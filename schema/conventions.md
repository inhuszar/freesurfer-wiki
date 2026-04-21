# Conventions

## YAML Frontmatter

Every wiki page MUST have YAML frontmatter:

```yaml
---
title: "mri_convert"
type: tool                    # tool | concept | pipeline | format | gotcha |
                              # internal | gui-application | gui-panel | faq
fs_version: "8.2.0"
source_language: "C"          # for tool/internal pages
source_files:                 # for tool/internal pages
  - "mri_convert/mri_convert.cpp"
families:                     # tool families this belongs to
  - "mri_*"
recon_all_stage: null         # or "autorecon1", "autorecon2", "autorecon3"
related:                      # wikilinks to related pages
  - "[[mri_info]]"
  - "[[mgz]]"
status: draft                 # draft | review | verified
confidence: high              # high | medium | low
last_agent_update: 2026-04-13
gaps: []                      # list of unresolved questions
tags:
  - conversion
  - formats
---
```

### Additional Frontmatter for GUI Pages

```yaml
type: gui-application            # or gui-panel
replaces:                        # legacy tools this supersedes
  - "[[tkmedit]]"
parent_application: "[[freeview]]"  # for gui-panel pages
data_formats_supported:             # for gui-panel pages
  - "[[mgz]]"
related_panels:                     # for gui-panel pages
  - "[[freeview-volumes]]"
```

### Frontmatter for FAQ Pages

```yaml
type: faq
entry_count: 0
sources:                         # what feeds this FAQ page
  - mailing-list
  - dialogue
```

## Wikilink Conventions

- Tool pages: `[[mri_convert]]`
- Concept pages: `[[coordinate-systems]]`
- Format pages: `[[mgz]]`
- Pipeline pages: `[[recon-all-stages]]`
- Gotcha pages: `[[gotcha-talairach-vs-mni]]`
- Internal pages: `[[internal-mri-io]]`
- FAQ pages: `[[faq-freeview]]`, `[[faq-coordinates]]`
- GUI sub-pages: `[[freeview-volumes]]`, `[[freeview-editing]]`

All wikilinks use the filename (without `.md`). Obsidian resolves them
automatically regardless of subdirectory.

## Callout Conventions

```markdown
> [!gap] Unresolved question
> The interaction between `-conform` and `-voxsize` when both are specified
> is unclear from the code. Needs developer input.

> [!contradiction] Wiki vs. code mismatch
> The FreeSurfer wiki states X, but the source code does Y.
> Code is authoritative; wiki may be outdated.

> [!gotcha] Counterintuitive behaviour
> Despite the flag name, `-no-isrunning` does not prevent the isrunning
> check — it removes the isrunning file from a previous failed run.

> [!math] Mathematical detail
> The surface inflation energy functional is:
> $$E = \sum_i (A_i - \bar{A})^2 + \lambda \sum_{(i,j)} \|v_i - v_j\|^2$$

> [!assumption] Input data assumption
> Expects a 1mm isotropic T1-weighted volume. Non-isotropic data is
> automatically conformed unless `-notal-check` is specified.

> [!internal] References internal code
> The actual transform computation lives in `[[internal-lta-utils]]`.
> See the `LTAchangeType()` function.
```

## Index Structure

`index.md` is the master inventory, organised by tool family:

```markdown
## Volumetric Tools (`mri_*`)
| Tool | Summary | Source | Status |
|------|---------|--------|--------|
| [[mri_convert]] | Format conversion and basic transforms | C | ✅ verified |

## Surface Tools (`mris_*`)
...
```

## Log Format

```markdown
## [2026-04-13] ingest | mri_convert
- Created wiki/tools/mri_convert.md (draft)
- Updated index.md
- Created wiki/formats/mgz.md (referenced by mri_convert)

## [2026-04-13] lint | full
- Found 3 orphan pages, 2 dead wikilinks
```

## Tool Family Classification

- `mri_*` — volumetric operations
- `mris_*` — surface operations
- `mri_ca_*` — atlas / computational anatomy
- `mri_em_*` — expectation maximization
- `mri_robust_*` — robust estimation
- `tkmedit`, `tksurfer`, `freeview` — GUI tools
- `recon-all` — master pipeline script
- Shell scripts (`.sh`, `.csh`) — pipeline wrappers
- Python scripts (`.py`) — newer utilities
- MATLAB scripts (`.m`) — legacy analysis tools
