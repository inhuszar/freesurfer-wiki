# Starter Package and Documentation Priorities

## Tier 1 — Core Pipeline (recon-all and its stages)

1. `recon-all` (the orchestrator — shell script)
2. `mri_convert` (format conversion)
3. `mri_nu_correct.mni` (bias field correction)
4. `talairach_avn` / `mri_em_register` (Talairach registration)
5. `mri_normalize` (intensity normalization)
6. `mri_watershed` / `mri_synthstrip` (skull stripping)
7. `mri_segment` (white matter segmentation)
8. `mri_tessellate` / `mri_pretess` (surface tessellation)
9. `mris_smooth` (surface smoothing)
10. `mris_inflate` (surface inflation)
11. `mris_sphere` (spherical mapping)
12. `mris_register` (spherical registration to atlas)
13. `mris_ca_label` / `mri_ca_label` (cortical/subcortical parcellation)
14. `mri_aparc2aseg` (parcellation to volume mapping)
15. `mris_anatomical_stats` (morphometric statistics)

## Tier 2 — Essential Utilities

16. `mri_info` (volume metadata)
17. `mri_vol2surf` (volume to surface projection)
18. `mri_surf2vol` (surface to volume)
19. `mri_label2vol` (label to volume)
20. `mri_binarize` (thresholding and binarization)
21. `mris_calc` (surface calculator)
22. `mri_concat` (volume concatenation)
23. `freeview` (GUI visualization)

## Tier 3 — Concepts (create alongside tools)

- Coordinate systems (dedicated deep-dive — see below)
- Surface representations (white, pial, inflated, sphere)
- Talairach space vs. MNI305 vs. MNI152
- The `recon-all` processing stream (pipeline page)
- FreeSurfer file formats overview

## Special: Coordinate Systems Deep Dive

The coordinate systems concept page (`wiki/concepts/coordinate-systems.md`)
should be an academic-level integrative document covering:

1. **Voxel coordinates** (CRS: column-row-slice) — zero-indexed, integer
2. **Scanner RAS** (Right-Anterior-Superior) — from the vox2ras matrix in the
   volume header; tied to the scanner's physical coordinate system
3. **Surface RAS** (also called "tkRAS" or "tkregister RAS") — the coordinate
   system used by FreeSurfer surfaces; offset from Scanner RAS by the
   center of the volume bounding box
4. **Talairach coordinates** — FreeSurfer's "Talairach" is actually MNI305
   with a non-linear Brett transform applied; this is a common source of
   confusion
5. **MNI305 space** — what FreeSurfer calls "Talairach MNI"
6. **MNI152 space** — used by FSL/SPM; not native to FreeSurfer but
   convertible

For each coordinate system:
- Formal definition (origin, axes, units)
- Which tools produce/consume coordinates in this system
- The transformation matrices between systems (with derivations)
- The vox2ras, vox2ras-tkr, ras2ras, Talairach transforms
- How `.lta`, `.xfm`, `.dat`, `.reg` files encode transforms
- Surface vertex coordinates: what system are they in?
- What `.reg` files mean for surface-to-volume registration
- Common errors and misunderstandings

This page should be written for a scientifically trained user who has
never used FreeSurfer but can follow mathematical notation and systematic
definitions.
