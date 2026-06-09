---
title: "make_average_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_average_subject"
families: []
recon_all_stage: null
related:
  - "[[make_average_volume]]"
  - "[[make_average_surface]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_aparc2aseg]]"
  - "[[make_folding_atlas]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - average-subject
  - atlas
  - template
  - surface
  - volume
---

# make_average_subject

## Summary

`make_average_subject` builds a complete FreeSurfer "average subject" (an
[[fsaverage]]-like template directory) from a set of
already-reconstructed individual subjects. It is a thin orchestrator: it calls
[[make_average_volume]] to create cross-subject average volumes (in Talairach /
MNI305 space) and [[make_average_surface]] to create cross-subject average
surfaces (on an icosahedral sphere), then optionally runs a short
[[wiki/pipelines/recon-all|recon-all]] step to build the cortical ribbon and
`aparc+aseg`. The result is a self-contained subject directory that can be used
as a common registration target for group analysis.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_average_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_average_subject`
- **Original author:** Doug Greve
- **Tools invoked:** [`make_average_volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L92), [`make_average_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L103), [`recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L114) (for `-cortribbon -aparc2aseg`), and `fs_temp_file`.

## Purpose and Context

Group surface- and volume-based analysis in FreeSurfer needs a **common target
space**. The distributed `fsaverage` is exactly such a target, built once from
40 Buckner subjects. `make_average_subject` is the tool that builds an analogous
template from *your own* cohort, so that subject-to-template surface
registration and resampling are anchored to a population that matches your data
(e.g. a paediatric, non-human-primate, or disease-specific sample).

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; each input subject
must already have been fully reconstructed (it reads their `surf/`, `mri/`,
`label/`, and `mri/transforms/talairach.xfm`). `make_average_subject` is run
once, by hand, after all individuals are done. It is also the per-iteration
workhorse called by [[make_folding_atlas]] when building an iteratively refined
folding template.

> [!gotcha] This is a dispatcher — read the children for the real work
> Almost all behaviour lives in [[make_average_volume]] and
> [[make_average_surface]]. `make_average_subject` simply forwards **all** of its
> command-line arguments verbatim to both children
> ([`scripts/make_average_subject:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L92),
> [`:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L103)),
> so flags that only one child understands are silently ignored by the other.

## Inputs

### Required Inputs

- **A subject list** — supplied one of three ways
  ([`scripts/make_average_subject:303-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L303-L306)):
  `--subjects s1 s2 …`, the `SUBJECTS` environment variable, or
  `--fsgd file.fsgd` / `--f listfile`. **Note:** these three are documented in
  the usage text and handled by the *children's* parsers; `make_average_subject`
  itself recognises none of them in its own `switch` and relies on passing them
  through (see Gotchas).
- **An output name** — `--out <name>` (the template subject directory created
  under `SUBJECTS_DIR`, or under `--sd-out`).
- **Fully reconstructed input subjects** — each must contain the per-subject
  volumes, surfaces, registrations, and `mri/transforms/talairach.xfm` that the
  children consume.

### Input Assumptions

> [!assumption] Subjects are recon-complete and Talairach-accurate
> Each input subject must have run through [[wiki/pipelines/recon-all|recon-all]]
> with a **correct `talairach.xfm`** (unless `--xform`/`--mni152` selects a
> different volume transform). Surface vertex coordinates in the average are
> averaged in Talairach space, so a bad Talairach in any subject corrupts the
> template. Surface-based averaging itself uses the spherical surface atlas, not
> Talairach (see [[make_average_surface]]).

## Outputs

### Files Created

A new subject directory `SUBJECTS_DIR/<out>/` (or `<sd-out>/<out>/` with a
symbolic link back into `SUBJECTS_DIR`), populated by the two children and the
`recon-all` finishing step. The principal artefacts are:

| File (under `<out>/`) | Produced by | Contents |
|-----------------------|-------------|----------|
| `mri/{nu,norm,orig,T1,brain,brainmask}.mgz` | [[make_average_volume]] | average intensity volumes in template space |
| `mri/aseg.mgz`, `mri/p.aseg.mgz` | [[make_average_volume]] | voted average segmentation and its voxelwise probability |
| `mri/transforms/talairach.xfm` | [[make_average_volume]] | identity transform (template **is** the Talairach space) |
| `surf/?h.{white,pial,inflated,smoothwm,sphere,sphere.reg}` | [[make_average_surface]] | average surfaces on the icosahedron |
| `surf/?h.{sulc,curv,thickness,area,…}` | [[make_average_surface]] | average per-vertex measures |
| `label/?h.{aparc,aparc.a2009s,…}.annot`, `label/?h.cortex.label` | [[make_average_surface]] | average parcellations and cortex label |
| `mri/ribbon.mgz`, `mri/aparc+aseg.mgz` | `recon-all -cortribbon -aparc2aseg` | cortical ribbon and surface-derived segmentation |
| `scripts/make_average_subject.log` | this script | top-level log |

### Output Specifications

The geometry and coordinate system of every output are set by the children:
volumes are 1 mm isotropic conformed MGZ in MNI305/Talairach space, surfaces are
7th-order icosahedral tessellations (default ~163 842 vertices/hemi). See
[[make_average_volume]] and [[make_average_surface]] for exact specifications and
[[coordinate-systems]] for the spaces involved.

## Mathematical Foundations

None in this script — it performs no numerical computation. The averaging
mathematics (intensity averaging and majority voting for volumes; spherical
resampling and coordinate averaging for surfaces) live in the children and in the
binaries they call.

> [!internal] Averaging math lives downstream
> Volume averaging and label voting: see [[make_average_volume]] →
> [[mri_average]] / [[mri_concat]]. Surface coordinate averaging: see
> [[make_average_surface]] → [[mris_make_average_surface]].

## Configuration Options

### Complete Flag Reference

Flags handled by `make_average_subject`'s own parser
([`scripts/make_average_subject:138-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L138-L235)).
Every flag is also passed through to the children, which is where the
subject-list and transform flags are actually consumed.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--out` | string | *(required)* | Name of the output average-subject directory. |
| `--sd`<br>`--sdir` | string | `$SUBJECTS_DIR` | Use this `SUBJECTS_DIR` instead of the environment value. |
| `--sd-out` | string | `$SUBJECTS_DIR` | Write the output under this directory and create a symlink to it from `SUBJECTS_DIR` (turns `--link` on). Useful when the `SUBJECTS_DIR` disk is full. |
| `--link` / `--no-link` | bool | off (on with `--sd-out`) | Create / suppress the symlink from `SUBJECTS_DIR/<out>` to the `--sd-out` location. |
| `--ico` | int | `7` | Icosahedron order for the surfaces (passed to [[make_average_surface]]). |
| `--surf-reg`<br>`--surf_reg` | string | `sphere.reg` | Per-subject registration surface used to resample onto the template. |
| `--threads` | int | `1` | Threads; also sets `--rca-threads`. |
| `--rca-threads` | int | `1` | Threads passed to the finishing `recon-all` step. |
| `--lh` / `--rh` | bool | both | Restrict to a single hemisphere. |
| `--no-surf` | bool | surfaces on | Skip [[make_average_surface]]. |
| `--no-vol` | bool | volumes on | Skip [[make_average_volume]]. |
| `--no-ribbon` | bool | ribbon on | Skip the `recon-all -cortribbon -aparc2aseg` finishing step. |
| `--force` | bool | off | Overwrite an existing output directory (also disables `--link`). |
| `--keep-all-orig` | bool | off | Forward `--keep-all-orig` to [[make_average_volume]] (concatenate per-subject orig volumes). |
| `--debug`<br>`--echo` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

**Pass-through flags** documented in the usage text but parsed by the children,
not by this script's own `switch` (they reach the children because `$cmdargs` is
forwarded): `--subjects`, `--fsgd`, `--f`, `--xform`, `--mni152`, `--meas`,
`--annot`, `--no-annot`, `--no-cortex-label`, `--template-only`, `--no-surf2surf`,
`--no-symlink`, `--no-aseg`, `--ctab`, `--ctab-default`. See
[[make_average_surface]] and [[make_average_volume]] for their semantics.

### Configuration Interactions

> [!gotcha] Unknown flags are silently ignored, not rejected
> The `default:` case of this script's parser is an empty `breaksw`
> ([`scripts/make_average_subject:233-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L233-L234)),
> so any unrecognised argument (including misspelled flags) is dropped without
> error. The children, however, *do* reject unknown flags — so a typo's effect
> depends on which child sees it first. Check the logs.

> [!gotcha] `--no-surf` and `--no-vol` together is an error
> Turning off both surfaces and volumes leaves nothing to do, and the script
> exits with an error
> ([`scripts/make_average_subject:285-289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L285-L289)).

> [!gotcha] The ribbon step needs *both* surfaces and volumes
> `recon-all -cortribbon -aparc2aseg` runs only when surfaces, volumes, **and**
> `--no-ribbon` is not set
> ([`scripts/make_average_subject:112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L112)).
> With `--no-vol` or `--no-surf`, no ribbon/`aparc+aseg` is produced even without
> `--no-ribbon`.

- `--sd-out` automatically enables `--link`; `--force` disables it; and if
  `--sd-out` equals the current `SUBJECTS_DIR`, linking is turned off
  ([`scripts/make_average_subject:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L278)).
- `--threads` is a convenience that also sets `--rca-threads`; use
  `--rca-threads` alone to thread only the finishing `recon-all`.

## Typical Use Cases

### 1. Build a cohort-specific template

```bash
make_average_subject --out mystudy_avg --subjects subj01 subj02 subj03 subj04
```

Creates `$SUBJECTS_DIR/mystudy_avg` with average volumes, surfaces, parcellations,
ribbon, and `aparc+aseg` — usable as a registration target like `fsaverage`.

### 2. Use the SUBJECTS environment variable

```bash
setenv SUBJECTS (subj01 subj02 subj03 subj04)
make_average_subject --out mystudy_avg
```

### 3. Store output off the main disk

```bash
make_average_subject --out mystudy_avg --subjects subj01 subj02 subj03 \
  --sd-out /big/scratch/avg
# data written to /big/scratch/avg/mystudy_avg, symlinked into $SUBJECTS_DIR
```

### 4. Surfaces only (no volumes / ribbon)

```bash
make_average_subject --out surfonly_avg --subjects subj01 subj02 --no-vol
```

### 5. Verify alignment (from the built-in help)

```bash
tkregisterfv --fstal --s mystudy_avg --mgz   # average vol vs. Talairach
tkmedit mystudy_avg orig.mgz lh.white        # average surfaces vs. volume
```

## Pipeline Context

`make_average_subject` is a stand-alone, post-recon tool. It is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]]; rather it consumes finished recon-all
output and itself calls recon-all once for the ribbon/`aparc+aseg` finishing
step. It is the per-iteration engine inside [[make_folding_atlas]]
([`scripts/make_folding_atlas:209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L209)),
and is also referenced by [[xhemireg]] for symmetric-template construction.

**Predecessor:** N× [[wiki/pipelines/recon-all|recon-all]] (one per subject) →
**make_average_subject** → **Successors:** group analysis with
[[mris_preproc]] / [[mri_glmfit|mri_glmfit]] targeted at the new template, or
iterative atlas building via [[make_folding_atlas]].

## Gotchas and Caveats

> [!gotcha] Volumes are built before surfaces on purpose
> Volumes run first so that a volume-geometry template (`orig.mgz`) exists for the
> surface step ([`scripts/make_average_subject:90-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L90-L100)).
> Running `--no-vol` removes that template; [[make_average_surface]] then
> synthesises one from the first subject's orig (see that page).

> [!gotcha] Output directory must not already exist
> Unless `--force` is given, an existing `SUBJECTS_DIR/<out>` (or `<sd-out>/<out>`)
> aborts the run ([`scripts/make_average_subject:273-277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L273-L277)).

> [!gotcha] The finishing recon-all forces `mri_aparc2aseg --no-relabel`
> The script writes an expert-options file forcing
> [[mri_aparc2aseg]] to run with `--no-relabel`
> ([`scripts/make_average_subject:116-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L116-L117)),
> so the average `aparc+aseg` is not post-hoc relabeled the way a normal subject's
> would be.

## Error Compensation and Guard Rails

- `REQUIRE_FS_MATCH=0` is exported
  ([`scripts/make_average_subject:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L40)),
  so input subjects reconstructed with a *different* FreeSurfer version do not
  abort the run. This is convenient for pooling legacy data but means
  version-mismatch artefacts are not flagged — verify your inputs are compatible.
- Existence of `SUBJECTS_DIR`, `FREESURFER_HOME`, and the symlink target are all
  checked before any work
  ([`scripts/make_average_subject:247-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L247-L284)).
- Each child invocation's exit status is checked; a failure aborts immediately
  ([`scripts/make_average_subject:96-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L96-L99),
  [`:107-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L107-L109)).

## Related Tools

- [[make_average_volume]] — builds the average volumes and segmentation (called first).
- [[make_average_surface]] — builds the average surfaces, measures, and parcellations (called second).
- [[fsaverage]] — the canonical distributed average subject this tool reproduces for arbitrary cohorts.
- [[make_folding_atlas]] — iterative atlas builder that calls this script once per iteration.
- [[mri_aparc2aseg]] — produces the surface-based `aparc+aseg` in the finishing step.
- [[wiki/pipelines/recon-all|recon-all]] — produces the per-subject inputs and is reused for the ribbon/`aparc+aseg` finishing step.

## Confidence and Gaps

**High confidence:** the orchestration logic, the own-parser flag set, the
pass-through behaviour, the mutual-exclusion rules, and the finishing recon-all
invocation — all read directly from
[`scripts/make_average_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject).
The exact set of output files is sourced from the children's logic
([[make_average_volume]], [[make_average_surface]]).

## References

- FreeSurfer source: [`scripts/make_average_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject) (v8.2.0).
- Built-in help: `make_average_subject --help`.
- Related concept: [[fsaverage]].
