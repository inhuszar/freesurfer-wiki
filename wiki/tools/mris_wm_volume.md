---
title: "mris_wm_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_volume/mris_wm_volume.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_volume]]"
  - "[[mris_anatomical_stats]]"
  - "[[mri_segment]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Resolution parameter default of 0.25mm and its effect on computation time vs accuracy needs empirical documentation."
tags:
  - surface
  - morphometry
  - white-matter
  - volume
---

# mris_wm_volume

## Summary

`mris_wm_volume` computes the volume of white matter interior to the `?h.white` surface for a given subject and hemisphere, excluding subcortical structures (as defined by `aseg.mgz`). It uses both the white surface geometry and the aseg segmentation to mask out non-WM interior structures, providing a cortical white matter volume estimate.

## Source Information

- **Language:** C++
- **Source file:** `mris_volume/mris_wm_volume.cpp`
- **Original author:** Bruce Fischl (MGH)
- **Key variables:** `resolution = 1.0/4.0` (0.25mm internal resolution for volume sampling)

## Purpose and Context

The simple `mris_volume` tool computes the total volume enclosed by the white surface, including subcortical gray matter structures (thalamus, putamen, etc.) that happen to be inside the white matter mesh. `mris_wm_volume` refines this by using the aseg segmentation to subtract subcortical volumes, giving a purer estimate of cortical white matter volume.

The computation:
1. Loads `?h.white` surface
2. Checks topology (Euler number must be 2)
3. Loads `aseg.mgz`
4. Samples a volumetric grid at 0.25mm resolution
5. Marks voxels inside the white surface but NOT part of subcortical structures
6. Reports the total WM volume in mm³

## Inputs

| Input | Description |
|---|---|
| Positional arg 1 | Subject name |
| Positional arg 2 | Hemisphere (`lh` or `rh`) |

Optional:
| Flag | Description |
|---|---|
| `-sdir dir` | Override SUBJECTS_DIR |
| `-white surfname` | Alternative white surface name (default: `white`) |
| `-aseg asegname` | Alternative aseg name (default: `aseg.mgz`) |
| `-res resolution` | Internal sampling resolution in mm (default: 0.25) |

Reads:
- `$SUBJECTS_DIR/<subject>/surf/<hemi>.white`
- `$SUBJECTS_DIR/<subject>/mri/aseg.mgz`

## Outputs

Prints total white matter volume in mm³ to stdout as a single number:
```
234567.891234
```

## Mathematical Foundations

The volume is computed by sampling a dense grid at `resolution` mm spacing inside the white surface bounding box, checking which sample points are inside the white surface (using ray casting or similar), and excluding points whose nearest aseg voxel label corresponds to a subcortical structure.

> [!math] Volume estimate
> $$V_{WM} = \text{resolution}^3 \times \#\{(x,y,z) : \text{inside white surface} \wedge \text{aseg}(x,y,z) \notin \text{subcortical labels}\}$$
> The default resolution of 0.25mm gives a dense sampling (8× finer than 1mm aseg voxels) for accuracy.

## Configuration Options

| Flag | Argument | Description |
|---|---|---|
| `-sdir` | dir | Override SUBJECTS_DIR |
| `-white` | surfname | White surface name (default: `white`) |
| `-aseg` | asegname | Aseg volume name (default: `aseg.mgz`) |
| `-res` | mm | Sampling resolution (default: 0.25) |

Usage:
```
mris_wm_volume [options] <subject> <hemi>
```

## Typical Use Cases

**1. Compute LH white matter volume for subject bert:**
```bash
mris_wm_volume bert lh
```

**2. Compute RH white matter volume:**
```bash
mris_wm_volume bert rh
```

**3. With custom SUBJECTS_DIR:**
```bash
mris_wm_volume -sdir /data/subjects bert lh
```

## Pipeline Context

Not called directly by `recon-all`. Used as a post-processing morphometric tool for group studies comparing white matter volumes.

## Gotchas and Caveats

> [!gotcha] Resolution and computation time
> The default 0.25mm resolution creates a very dense sampling grid (64× more points than 1mm). For a typical 256³ volume, this is approximately 256³ × 64 = ~1 billion sample points, which may be slow. Consider increasing resolution for exploratory work.

> [!gotcha] Topology requirement
> Like `mris_volume`, the white surface must have Euler number = 2. If topology correction has not been run, this tool will exit with an error.

> [!gotcha] Both hemispheres separately
> There is no option to compute both hemispheres at once; run the tool twice with `lh` and `rh`.

## Related Tools

- [[mris_volume]] — total enclosed volume (including subcortical)
- [[mris_anatomical_stats]] — per-parcel statistics
- [[mri_segment]] — white matter segmentation

## Confidence and Gaps

Source code read completely. Confidence is **high**.
