# Conventions

## YAML Frontmatter

Every wiki page MUST have YAML frontmatter:

```yaml
---
title: "mri_convert"
type: tool                    # tool | concept | pipeline | format | gotcha |
                              # internal | gui-application | gui-panel | faq
fs_version: "$FREESURFER_VERSION"
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
parent_application: "[[wiki/tools/freeview|freeview]]"  # for gui-panel pages
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

Default form is the bare filename (without `.md`). Both Obsidian and
Quartz (`markdownLinkResolution: "shortest"`) resolve a bare wikilink
to its file **only when that basename is unique across the vault**.

- Tool pages: `[[mri_info]]`
- Concept pages: `[[coordinate-systems]]`
- Format pages: `[[mgz]]`
- Pipeline pages: `[[recon-all-stages]]`
- Gotcha pages: `[[gotcha-talairach-vs-mni]]`
- Internal pages: `[[internal-mri-io]]`
- GUI sub-pages: `[[freeview-volumes]]`, `[[freeview-editing]]`

### Path-Qualified Wikilinks (Required for Colliding Basenames)

When the same basename exists in more than one folder under `wiki/`,
a bare `[[name]]` is **ambiguous**: Quartz silently emits a literal
`./name` href, which is a 404 on the published site. Always use the
path-qualified form for the colliding slug:

```
[[wiki/<folder>/<name>|<display-text>]]
```

The path is the slug under `content/` after `publish.sh` runs
(`wiki/<folder>/<name>`, no leading `/`, no `.md`). The alias keeps the
rendered text short.

Currently colliding basenames and their canonical targets:

| basename       | canonical target                       | also exists at      |
|----------------|----------------------------------------|---------------------|
| `recon-all`    | `[[wiki/pipelines/recon-all\|recon-all]]`   | `wiki/faq/recon-all.md`   |
| `freeview`     | `[[wiki/tools/freeview\|freeview]]`         | `wiki/faq/freeview.md`    |
| `mri_convert`  | `[[wiki/tools/mri_convert\|mri_convert]]`   | `wiki/faq/mri_convert.md` |
| `mri_glmfit`   | `[[wiki/tools/mri_glmfit\|mri_glmfit]]`     | `wiki/faq/mri_glmfit.md`  |
| `samseg`       | `[[wiki/tools/samseg\|samseg]]`             | `wiki/faq/samseg.md`      |

Default to the **tool/pipeline page**. Link to the FAQ explicitly only
when the surrounding text is about the FAQ entry itself
(`[[wiki/faq/recon-all|recon-all FAQ]]`).

When **adding a new page**, before choosing its filename run:

```bash
find wiki -name "<basename>.md"
```

If it returns any hit, either pick a different filename **or** be
prepared to migrate every existing `[[<basename>]]` to the
path-qualified form in the same change.

### FAQ Page References

FAQ pages live at `wiki/faq/<topic>.md`. Because their basename almost
always collides with a tool, pipeline, or concept page of the same
topic, FAQ wikilinks are **always** path-qualified:

- `[[wiki/faq/freeview|FreeView FAQ]]`
- `[[wiki/faq/coordinates|coordinates FAQ]]`
- `[[wiki/faq/recon-all|recon-all FAQ]]`

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
| [[wiki/tools/mri_convert|mri_convert]] | Format conversion and basic transforms | C | ✅ verified |

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
