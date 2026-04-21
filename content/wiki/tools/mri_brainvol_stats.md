---
title: "mri_brainvol_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_brainvol_stats/mri_brainvol_stats.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mri_segstats]]"
  - "[[mris_anatomical_stats]]"
  - "[[recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - brain-volume
  - statistics
  - morphometry
---

# mri_brainvol_stats

## Summary

`mri_brainvol_stats` computes a standardized set of whole-brain volume statistics for a given subject and writes them to a cache file (`stats/brainvol.stats`) for later retrieval by [[mri_segstats]] and [[mris_anatomical_stats]]. The statistics include brain volume, intracranial volume (ICV/eTIV), and related measures. These values appear in the header of [[mris_anatomical_stats]] output tables and the `stats/aseg.stats` file.

## Source Information

- **Language:** C++
- **Source file:** `mri_brainvol_stats/mri_brainvol_stats.cpp`

The core computation is delegated to `ComputeBrainVolumeStats2()` defined in `cma.h`/`cma.cpp`.

## Purpose and Context

FreeSurfer reports brain volume statistics in multiple output files. To avoid redundant computation, `mri_brainvol_stats` pre-computes these values and caches them in `<subjects_dir>/<subject>/stats/brainvol.stats`. This cache is read by [[mri_segstats]] (when generating `aseg.stats`) and by [[mris_anatomical_stats]] (to populate the headers of `?h.aparc.stats`).

This tool is typically called as part of the [[recon-all]] autorecon3 stage to populate the stats cache before final morphometric reports are generated.

## Inputs

- Subject name (`--subject` / `-s`)
- Subjects directory (`--sd`, or `$SUBJECTS_DIR` environment variable)
- All required data is read from the subject's directory tree:
  - `mri/aseg.mgz`
  - `mri/brainmask.mgz`
  - `mri/orig.mgz`
  - `surf/lh.white`, `surf/rh.white`
  - `surf/lh.pial`, `surf/rh.pial`

## Outputs

- `<subjects_dir>/<subject>/stats/brainvol.stats` — a text cache file containing a vector of brain volume statistics

## Mathematical Foundations

The computation (`ComputeBrainVolumeStats2` with `KeepCSF=1`) computes multiple measures:

**Brain volume** — total non-zero voxels in `brainmask.mgz` × voxel volume

**Estimated Total Intracranial Volume (eTIV)** — computed from the determinant of the talairach transform (a proxy for head size):
$$\text{eTIV} = \frac{V_{\text{atlas}}}{\det(M_{\text{talairach}})}$$

where $V_{\text{atlas}}$ is the atlas brain volume and $M_{\text{talairach}}$ is the affine transform from subject to Talairach space.

**Gray matter volume** — voxel count of cortical GM label voxels × voxel volume

**White matter volume** — voxel count of WM label voxels × voxel volume

See `ComputeBrainVolumeStats2()` in `cma.cpp` for the complete definition of all returned statistics.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subject <s>` / `-s <s>` | string | required | Subject name |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Subjects directory |

The interface is intentionally minimal. No per-statistic options are exposed.

## Typical Use Cases

**Compute and cache brain volume stats for a subject:**
```bash
mri_brainvol_stats --subject bert
```

**With explicit subjects directory:**
```bash
mri_brainvol_stats -s bert --sd /data/subjects/
```

## Pipeline Context

Called by [[recon-all]] as part of autorecon3, before [[mri_segstats]] and [[mris_anatomical_stats]] generate the final output tables. The cache file it creates is essential for correct eTIV normalization in those downstream tools.

## Gotchas and Caveats

> [!gotcha] Cache must exist before segstats
> If `brainvol.stats` is absent when [[mri_segstats]] runs, the eTIV field in `aseg.stats` will be missing or zero. Always run `mri_brainvol_stats` before generating stats.

> [!gotcha] CBVSVersion selection
> The source contains code for two versions of the computation (`CBVSVersion == 1` vs `2`). Version 2 (`ComputeBrainVolumeStats2`) is hardcoded as the active version. Version 1 is present but inactive.

## Related Tools

- [[mri_segstats]] — reads the cache to report eTIV in aseg.stats
- [[mris_anatomical_stats]] — reads the cache to populate stats table headers
- [[recon-all]] — calls this tool in autorecon3

## Confidence and Gaps

Source code (main function) fully read. Core computation in `cma.cpp`. Confidence is high for interface; medium for internal statistics definitions.

> [!gap] Exact statistics vector layout
> The specific indices and meanings of the values in the returned stats vector from `ComputeBrainVolumeStats2` are defined in `cma.cpp`, not documented here.
