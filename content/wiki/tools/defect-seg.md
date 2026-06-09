---
title: "defect-seg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/defect-seg"
families: []                     # standalone topology-defect utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[defect2seg]]"
  - "[[mri_surfcluster]]"
  - "[[mri_surf2vol]]"
  - "[[mris_seg2annot]]"
  - "[[mri_surf2surf]]"
  - "[[mri_segstats]]"
  - "[[topology-correction]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The numeric field indices used in the awk that builds ?h.defect.summary (columns 1/3/8 of the mri_surfcluster summary) were read from the script but not cross-checked against a live mri_surfcluster summary file."
tags:
  - segmentation
  - topology
  - defects
  - surface
  - annotation
  - qa
---

# defect-seg

## Summary

`defect-seg` builds a rich set of visualization and analysis products from the
topological-defect labels (`?h.defect_labels`) created by the FreeSurfer
automatic topology fixer. For each hemisphere it: (1) writes a text summary of the
defects with [[mri_surfcluster]]; (2) projects the defect labels into a volume
segmentation `surface.defects.mgz` with [[mri_surf2vol]] (left offset by 1000,
right by 2000); (3) makes surface **annotations** on both the unfixed
(`orig.nofix`) and the fixed (`white.preaparc`) surfaces with
[[mris_seg2annot]]; (4) maps the defects from the unfixed onto the fixed surface
with [[mri_surf2surf]] and binarizes them; (5) measures per-defect area and
thickness with [[mri_segstats]]; and optionally (6) resamples the defect maps to
`fsaverage` for group analysis. It is a more comprehensive — but not
recon-all-integrated — alternative to [[defect2seg]].

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/defect-seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg)
- **Binary/script location:** `$FREESURFER_HOME/bin/defect-seg`
- **FreeSurfer tools invoked:** [`mri_surfcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L59) (defect text summary), [`mri_surf2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L78) (volume segmentation), [`mris_seg2annot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L91) (nofix and fix annotations), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L99) (nofix→fix resampling and fsaverage mapping), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L107) (binarized fixed-surface mask), and [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L122) (per-defect area/thickness stats). Uses the colour table `$FREESURFER_HOME/DefectLUT.txt` and the helper `fs_temp_file`.

## Purpose and Context

The same topology fixer described under [[topology-correction]] writes a
per-vertex defect-label overlay `?h.defect_labels` for each hemisphere of a
recon-all subject. `defect-seg` turns those labels into everything you would want
for **inspecting and quantifying** the corrected defects:

- a per-defect text list (ID, a representative vertex, vertex count),
- a volume segmentation to overlay on `orig.mgz`,
- annotations on the *unfixed* surface (where the defects originally were) and on
  the *fixed* `white.preaparc` surface (where they ended up after correction),
- and statistics (area, mean thickness) per defect, with an optional projection to
  `fsaverage` so defects can be compared or modelled across subjects (the help
  shows an [[wiki/tools/mri_glmfit|mri_glmfit]] group-analysis recipe).

It is **not** called by [[wiki/pipelines/recon-all|recon-all]]; it is a
stand-alone tool a user runs after reconstruction to study where and how badly the
surface topology had to be repaired — useful both for QC and for research into
defect distributions.

> [!gotcha] defect-seg vs. defect2seg — which to use
> Despite near-identical names they are different scripts. **[[defect2seg]]** (note
> the digit "2") is the lighter tool that recon-all actually runs: it makes only a
> volume segmentation (via [[mri_label2vol]]) and a pointset. **`defect-seg`**
> (this page) is the fuller tool: it adds the text summary, two surface
> annotations, the nofix→fix resampling, binarized masks, per-defect statistics,
> and optional fsaverage mapping — but it is run by hand, not by recon-all. They
> also differ in engine: `defect-seg` uses [[mri_surf2vol]] (surface value →
> volume) while `defect2seg` uses [[mri_label2vol]] (label → volume). Both apply
> the same 1000 (LH) / 2000 (RH) label offsets so `surface.defects.mgz` is
> consistent between them.

## Inputs

### Required Inputs

The only required argument is `--s <subject>`; everything else is read from the
recon-all subject directory.

- **Defect-label overlay** `surf/?h.defect_labels` — per-vertex integer defect
  IDs from the topology fixer ([`scripts/defect-seg:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L60)).
- **Unfixed surface** `surf/?h.orig.nofix` — used for clustering and the "nofix"
  annotation ([`scripts/defect-seg:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L61)).
- **Fixed surfaces** `surf/?h.orig` and `surf/?h.white.preaparc` — targets of the
  nofix→fix resampling and the "fix" annotation ([`scripts/defect-seg:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L101), [`scripts/defect-seg:116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L116)).
- **Template volume** `mri/orig.mgz` — grid for the volume segmentation
  ([`scripts/defect-seg:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L79)).
- **Thickness map** `surf/?h.thickness` — the per-vertex measure averaged over
  each defect in the statistics step ([`scripts/defect-seg:123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L123)).
- **Colour table** `$FREESURFER_HOME/DefectLUT.txt` — verified to exist
  ([`scripts/defect-seg:217-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L217-L221)).

### Input Assumptions

> [!assumption] A fully (or partially) reconstructed subject
> `defect-seg` assumes a standard `$SUBJECTS_DIR/<subj>` directory in which
> topology fixing **and** at least the preaparc white-surface step have run, so
> that `?h.orig.nofix`, `?h.defect_labels`, `?h.orig`, `?h.white.preaparc`, and
> `?h.thickness` all exist. It `cd`s into the subject directory and uses relative
> paths throughout ([`scripts/defect-seg:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L37)). With `--fsaverage`, the
> `fsaverage` subject must be present in `$SUBJECTS_DIR`.

### Required Inputs (none beyond the subject)

There are no input volumes/files to pass explicitly other than the subject ID.

## Outputs

### Files Created

Per hemisphere (`?h` = `lh`/`rh`):

| File | Where | Contents |
|------|-------|----------|
| `?h.defect.summary` | `scripts/` | text table: DefectNo, a representative Vertex, NVertices (built from the [[mri_surfcluster]] summary via awk, [`scripts/defect-seg:66-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L66-L74)) |
| `surface.defects.mgz` | `mri/` | volume segmentation; LH defect *N* → `1000+N`, RH → `2000+N` (load with `DefectLUT.txt`) |
| `?h.defects.nofix.annot` | `label/` | annotation of the defects on the **unfixed** `orig.nofix` surface |
| `?h.defects.fix.annot` | `label/` | annotation of the defects on the **fixed** `white.preaparc` surface |
| `?h.defect_labels.fix.mgz` | `surf/` | defect labels resampled from `orig.nofix` onto the fixed surface ([[mri_surf2surf]] `--mapmethod nnf`) |
| `?h.defect_labels.fix.bin.mgz` | `surf/` | binarized (≥0.5) version of the above ([[mri_binarize]]) |
| `?h.defect.stats` | `stats/` | per-defect area (mm²) and mean thickness ([[mri_segstats]] `--annot ... defects.fix`) |
| `?h.defect_labels.fix.fsaverage.mgz` | `surf/` | (only with `--fsaverage`) defect map resampled to `fsaverage` |
| `defect-seg.log` | `scripts/` | command log (previous run rotated to `.bak`, [`scripts/defect-seg:39-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L39-L40)) |

The `BEGINHELP` block lists these outputs as well
([`scripts/defect-seg:262-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L262-L269)).

> [!gotcha] The `?h.defect.stats` "volume" column is actually area
> [[mri_segstats]] writes a generic header that labels the measured quantity
> "volume", but because the input is a surface-based `--annot` with a per-vertex
> thickness, the value is really **Area_2mm** — area in mm² (the help spells this
> out, [`scripts/defect-seg:292-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L292-L294)). Read the column as area, not volume.

### Output Specifications

- `surface.defects.mgz` is on the `orig.mgz` geometry (conformed 256³ 1 mm —
  see [[mgz]]); voxel values are offset defect IDs (`1000+ID` LH, `2000+ID` RH).
- Annotations follow the [[annotation-format]] and reference `DefectLUT.txt`;
  defects render magenta/"purple" (every DefectLUT entry is RGB 255 0 255).
- The `.fix.mgz` / `.fix.bin.mgz` overlays are per-vertex surface scalars
  ([[mgz]]-wrapped curv/overlay).

## Mathematical Foundations

`defect-seg` performs **no numerical computation of its own**; it is a
coordinating script that chains FreeSurfer surface/volume tools and reshapes their
text output with `grep`/`awk`. The substantive operations are:

> [!internal] Clustering, resampling, and statistics live in the called tools
> Defect clustering and the summary table come from [[mri_surfcluster]]
> (threshold 0.5, [`scripts/defect-seg:59-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L59-L61)); surface→volume projection from
> [[mri_surf2vol]]; the nofix→fix vertex correspondence from [[mri_surf2surf]]
> using **nearest-neighbour-on-fixed** mapping (`--mapmethod nnf`,
> [`scripts/defect-seg:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L101)); and the per-defect area/thickness from
> [[mri_segstats]]. See those pages for the underlying math.

The only in-script arithmetic is the hemisphere label offset (`--add 1000` for lh,
`--add 2000` for rh, with `--merge` to combine them, [`scripts/defect-seg:81-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L81-L85))
and the awk reformatting of the cluster summary.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/defect-seg:160-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L160-L199)). This is a deliberately small interface.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID. All inputs/outputs are resolved under `$SUBJECTS_DIR/<subj>`. |
| `--lh-only` | bool | off (both) | Process the left hemisphere only ([`scripts/defect-seg:173-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L173-L176)). |
| `--rh-only` | bool | off (both) | Process the right hemisphere only ([`scripts/defect-seg:178-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L178-L181)). |
| `--fsaverage` | bool | off | Additionally resample each hemisphere's fixed defect map to `fsaverage` (`?h.defect_labels.fix.fsaverage.mgz`) for group analysis ([`scripts/defect-seg:131-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L131-L140)). |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print the version string and exit. |
| `--help` | bool | — | Print help and exit. |

### Configuration Interactions

This tool has very few options and therefore few interactions.

- **`--lh-only` and `--rh-only` are last-wins.** They are independent assignments
  to `DoLH`/`DoRH` ([`scripts/defect-seg:173-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L173-L181)); the parser does not
  forbid passing both, in which case the later flag's effect prevails. The
  intended use is to pass at most one.
- **Two-hemisphere volume merge.** When both hemispheres run, the LH
  [[mri_surf2vol]] writes `surface.defects.mgz`, and the RH call adds 2000 and
  **merges into** that same file (`--merge mri/surface.defects.mgz`) only when
  both `DoLH` and `DoRH` are set ([`scripts/defect-seg:81-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L81-L85)). With
  `--rh-only`, the RH segmentation is written without a merge, so it is a clean
  RH-only volume.

> [!gotcha] No mutually-exclusive errors — most "configuration" is hard-coded
> Unlike many FreeSurfer scripts, `defect-seg` exposes almost nothing to tune:
> surface names (`orig.nofix`, `orig`, `white.preaparc`), the cluster threshold
> (0.5), the binarize threshold (0.5), the colour table, the smoothing in the
> group-analysis recipe — all are fixed in the source. To change them you must
> edit the script.

## Typical Use Cases

### 1. Full defect QC for one subject

```bash
# Summaries, segmentation, annotations, and stats for both hemispheres
defect-seg --s subj01

# Inspect the volume segmentation with surfaces:
tkmedit subj01 orig.mgz -lh-defects
# (lh.orig.nofix yellow, lh.white green, defects purple)

# Inspect the annotations:
tksurfer subj01 lh smoothwm.nofix -annot defects.nofix.annot
tksurfer subj01 lh white.preaparc  -annot defects.fix.annot
```

### 2. One hemisphere

```bash
defect-seg --s subj01 --lh-only
```

### 3. Prepare for a cross-subject defect analysis

```bash
# Per subject: also push the fixed defect map to fsaverage
defect-seg --s subj01 --fsaverage
defect-seg --s subj02 --fsaverage

# Then (from the help) aggregate and model on the surface:
mris_preproc --out lh.defects.mgh --target fsaverage --hemi lh \
  --meas defect_labels.fix.bin.mgz --fsgd your.fsgd
mri_glmfit --y lh.defects.mgh --surf fsaverage lh --no-prune \
  --glmdir glm.lh.sm05 --fwhm 5 --fsgd your.fsgd
```

The group-analysis recipe is reproduced from the help block
([`scripts/defect-seg:315-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L315-L321)).

## Pipeline Context

`defect-seg` is **not** part of [[wiki/pipelines/recon-all|recon-all]] (a grep of
`recon-all` for `defect-seg` returns nothing; recon-all instead calls the sibling
[[defect2seg]]). It is a post-hoc, user-invoked QC/analysis tool.

**Predecessor:** the topology-fixing step ([[topology-correction]],
`mris_fix_topology`) that writes `?h.defect_labels`, plus the preaparc
white-surface step that writes `?h.white.preaparc`/`?h.thickness` →
**defect-seg** → **Successor:** visual QC in tkmedit/tksurfer/[[wiki/tools/freeview|freeview]],
or a surface group analysis with `mris_preproc` + [[wiki/tools/mri_glmfit|mri_glmfit]].

## Gotchas and Caveats

> [!gotcha] Requires the fixed white surface, not just the defect labels
> Because it annotates `white.preaparc` and averages `?h.thickness`, `defect-seg`
> needs the white-surface stages to have completed — running it on a subject that
> only got as far as topology fixing will fail at the "fix" annotation or
> statistics step.

> [!gotcha] "purple" defects and the auxiliary loads in tkmedit
> The `-lh-defects`/`-rh-defects` tkmedit shortcuts (referenced in the help,
> [`scripts/defect-seg:297-305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L297-L305)) auto-load `wm.mgz` as an auxiliary volume and
> draw the nofix surface yellow and `white` green; the defect segmentation itself
> is magenta because every `DefectLUT.txt` entry is RGB 255 0 255.

> [!gotcha] Previous log is rotated, previous summary is deleted
> Each run moves the old `defect-seg.log` to `defect-seg.log.bak`
> ([`scripts/defect-seg:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L40)) and `rm -f`s the old `?h.defect.summary` before
> rebuilding it ([`scripts/defect-seg:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L67)). Only one previous log is kept.

## Error Compensation and Guard Rails

- **Subject and LUT existence checks.** `check_params` verifies a subject ID was
  given, that `$SUBJECTS_DIR/<subj>` exists, and that `DefectLUT.txt` is present
  ([`scripts/defect-seg:207-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L207-L221)).
- **Fail-fast.** Every called tool's exit status is checked and the script exits 1
  on any failure ([`scripts/defect-seg:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L64), [`scripts/defect-seg:88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L88), [`scripts/defect-seg:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L96), [`scripts/defect-seg:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L104), [`scripts/defect-seg:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L111), [`scripts/defect-seg:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L119), [`scripts/defect-seg:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L128)).
- It does **not** auto-create or auto-conform any input; missing prerequisites
  surface as errors from the called tools rather than being silently patched.

## Related Tools

- [[defect2seg]] — the lighter, recon-all-integrated sibling (segmentation + pointset only). See the [comparison callout](#purpose-and-context).
- [[mri_surfcluster]] — clusters the defect labels for the text summary.
- [[mri_surf2vol]] — projects the defect labels into the volume segmentation.
- [[mris_seg2annot]] — builds the nofix and fix surface annotations.
- [[mri_surf2surf]] — resamples defects from the unfixed to the fixed surface and to fsaverage.
- [[mri_binarize]] — binarizes the fixed-surface defect map.
- [[mri_segstats]] — measures per-defect area and thickness.
- [[topology-correction]] — the step that produces `?h.defect_labels`.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — group surface analysis of defects (from the help recipe).

## Confidence and Gaps

**High confidence:** complete (small) flag set, the per-hemisphere processing
chain, the 1000/2000 offsets and the merge condition, the full list of output
files and their locations, the "area-labelled-as-volume" quirk, and the fact that
recon-all does **not** call this script — all read directly from
[`scripts/defect-seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg).

> [!gap] awk field indices in the summary
> The `?h.defect.summary` table is built by `awk '{print ...$1...$3...$8}'` over
> the [[mri_surfcluster]] summary ([`scripts/defect-seg:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L74)); the mapping of
> those columns to (DefectNo, Vertex, NVertices) was taken from the header the
> script writes but not verified against a live `mri_surfcluster` summary file.

## References

- FreeSurfer source: [`scripts/defect-seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg) (v8.2.0).
- Built-in help: `defect-seg --help` (the `BEGINHELP` block, [`scripts/defect-seg:256-322`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect-seg#L256-L322)), which includes example tkmedit/tksurfer commands and an `mris_preproc`/`mri_glmfit` group recipe.
- Colour table: `$FREESURFER_HOME/DefectLUT.txt` (all defect entries magenta).
