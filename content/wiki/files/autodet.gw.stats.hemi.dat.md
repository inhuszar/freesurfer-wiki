---
title: "autodet.gw.stats.hemi.dat"
type: file
fs_version: "8.2.0"
filename: "autodet.gw.stats.hemi.dat"
aliases:
  - "autodet.gw.stats.lh.dat"
  - "autodet.gw.stats.rh.dat"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "plain text (key-value pairs)"
binary: false
produced_by:
  - "[[mris_autodet_gwstats]]"
produced_in_stage: "autorecon2: AutoDetGWStats"
produced_at_source:
  - "[`scripts/recon-all:3899`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3899)"
inputs:
  - "[[hemi.orig]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wm.mgz]]"
siblings: []
consumed_by:
  - "[[mris_place_surface]]"
downstream_files:
  - "[[hemi.white.preaparc]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
mandatory_for:
  - "[[recon-all]] autorecon2: WhitePreAparc; autorecon3: White, Pial"
optional_for: []
editable: false
related:
  - "[[hemi.orig]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[mris_place_surface]]"
  - "[[hemi.white.preaparc]]"
  - "[[hemi.white]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# autodet.gw.stats.hemi.dat

> [!file] Glossary entry
> `autodet.gw.stats.lh.dat` / `autodet.gw.stats.rh.dat` are plain-text files containing automatically detected gray-white intensity boundary statistics for each hemisphere, computed by `mris_autodet_gwstats`. These statistics (intensity means, slopes, and thresholds for white matter and gray matter) guide [[mris_place_surface]] during white and pial surface placement in both autorecon2 and autorecon3.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/autodet.gw.stats.lh.dat`, `surf/autodet.gw.stats.rh.dat`
- **Format:** Plain text — key-value pairs, one per line. Contains intensity statistics used by [[mris_place_surface]] via `--adgws-in`.
- **Typical size:** Small (~1 KB); contains ~10–20 numerical parameters.

## What It Contains

Per-hemisphere intensity statistics computed from the intensity volume ([[brain.finalsurfs.mgz]]) and the white matter mask ([[wm.mgz]]), sampled at vertices of [[hemi.orig]]. Parameters include target white-matter intensity, gray-matter intensity, and slope values used by the surface placement cost function.

## How It Is Created

### Producing tool

`mris_autodet_gwstats` — samples intensities at the [[hemi.orig]] surface vertices from [[brain.finalsurfs.mgz]] and [[wm.mgz]], fits intensity statistics, and writes the result to the `.dat` file.

```bash
# AutoDetGWStats invocation (recon-all ~line 3899)
mris_autodet_gwstats \
  --o autodet.gw.stats.$hemi.dat \
  --i brain.finalsurfs.mgz \
  --wm wm.mgz \
  --surf ../surf/$hemi.orig
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3899`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3899)

### Pipeline stage

[[recon-all]] autorecon2, **AutoDetGWStats** stage (`-autodet-gw-stats`). Touch sentinel: `touch/$hemi.autodet.gw.stats.touch`.

### Inputs required

- [[hemi.orig]] — topology-corrected surface (vertex sampling locations).
- [[brain.finalsurfs.mgz]] — intensity reference volume.
- [[wm.mgz]] — WM mask.

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (WhitePreAparc, White, Pial) — reads the `.dat` file via `--adgws-in` to set intensity thresholds during surface placement.

### Downstream files derived from this one

- [[hemi.white.preaparc]] — preliminary white surface placed using these stats.
- [[hemi.white]] — final white surface placed using these stats.
- [[hemi.pial]] — pial surface placed using these stats.

## Related

- [[hemi.orig]] — surface used for intensity sampling.
- [[brain.finalsurfs.mgz]] — intensity reference.
- [[mris_place_surface]] — primary consumer.
- [[hemi.white.preaparc]], [[hemi.white]], [[hemi.pial]] — surfaces produced using these stats.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3880–3910.
- [[subject-directory]] — lists this file in the `surf/` section.
