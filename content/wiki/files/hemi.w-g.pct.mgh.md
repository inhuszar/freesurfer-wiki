---
title: "hemi.w-g.pct.mgh"
type: file
fs_version: "8.2.0"
filename: "hemi.w-g.pct.mgh"
aliases:
  - "lh.w-g.pct.mgh"
  - "rh.w-g.pct.mgh"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "MGH (surface overlay)"
binary: true
produced_by:
  - "[[pctsurfcon]]"
produced_in_stage: "autorecon3: WM/GM Contrast"
produced_at_source:
  - "[`scripts/pctsurfcon:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L128)"
  - "[`scripts/recon-all:4975`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4975)"
inputs:
  - "[[rawavg.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.cortex.label]]"
siblings:
  - "[[hemi.w-g.pct.stats]]"
consumed_by: []
downstream_files:
  - "[[hemi.w-g.pct.stats]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: WM/GM Contrast (run by default)"
editable: false
related:
  - "[[rawavg.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.w-g.pct.stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.w-g.pct.mgh

> [!file] Glossary entry
> `lh.w-g.pct.mgh` / `rh.w-g.pct.mgh` are per-vertex white-matter/gray-matter percent contrast maps, produced by the `pctsurfcon` script in the WM/GM Contrast stage. Each vertex value is `100 × (WM − GM) / ((WM + GM) / 2)`, where WM and GM intensities are sampled from [[rawavg.mgz]] at 1 mm inside and 0 mm outside the white surface respectively. Non-cortical vertices (medial wall) are zeroed via the [[hemi.cortex.label]] mask.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.w-g.pct.mgh`, `surf/rh.w-g.pct.mgh`
- **Format:** MGH surface overlay. Values are dimensionless percent contrast (positive = brighter WM than GM, as expected).

## How It Is Created

### Producing tool

`pctsurfcon --s $subjid` — a wrapper script that:
1. Samples [[rawavg.mgz]] at 1 mm inside white surface (WM sample) using `mri_vol2surf`.
2. Samples [[rawavg.mgz]] at the white surface (GM sample) using `mri_vol2surf`.
3. Computes `pct = 100 × (WM − GM) / ((WM + GM) / 2)` using `mri_concat --paired-diff-norm --mul 100`.
4. Writes the result to `surf/$hemi.w-g.pct.mgh`.
5. Computes per-parcel stats and writes [[hemi.w-g.pct.stats]].

```bash
# WM/GM Contrast invocation (recon-all line 4975)
pctsurfcon --s $subjid --lh-only   # or --rh-only
```

```bash
# Key step inside pctsurfcon (line 128)
mri_concat $wm $gm --paired-diff-norm --mul 100 --o surf/$hemi.w-g.pct.mgh
```

### Source reference

- **Write call:** [`scripts/pctsurfcon:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L128) — `mri_concat ... --o $out`
- **Pipeline invocation:** [`scripts/recon-all:4975`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4975)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **WM/GM Contrast** (`-pctsurfcon`). Run by default; skippable with `-nopctsurfcon`. Also skipped in the longitudinal base template. Touch sentinel: `touch/$hemi.pctsurfcon.touch`.

### Inputs required

- [[rawavg.mgz]] — unconformed raw average (retains native MRI intensities).
- [[hemi.white]] — white surface for sampling depth.
- [[hemi.cortex.label]] — used via `--cortex` flag to mask out medial wall.

### Siblings (co-produced outputs)

- [[hemi.w-g.pct.stats]] — per-parcellation stats summary, produced in the same `pctsurfcon` run.

## Related

- [[rawavg.mgz]] — source intensity volume.
- [[hemi.white]] — reference surface for WM/GM sampling.
- [[hemi.w-g.pct.stats]] — stats file produced from this overlay.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/pctsurfcon` lines 97–140; `scripts/recon-all` lines 4962–4993.
- [[subject-directory]] — lists this file in the `surf/` section.
