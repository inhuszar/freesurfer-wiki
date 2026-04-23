---
title: "mri_edit_segmentation_with_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_edit_segmentation_with_surfaces/mri_edit_segmentation_with_surfaces.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mri_edit_segmentation]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - segmentation
  - editing
  - surface-constrained
  - autorecon3
---

# mri_edit_segmentation_with_surfaces

## Summary

`mri_edit_segmentation_with_surfaces` refines a volumetric segmentation (aseg) by correcting voxels that are geometrically inconsistent with the reconstructed cortical surfaces. It relabels voxels inside/outside the white matter and pial surfaces that have been incorrectly assigned to gray matter, white matter, hypointensity, or cerebellum classes. Original author: Bruce Fischl.

## Source Information

- **Source language:** C++
- **Source file:** `mri_edit_segmentation_with_surfaces/mri_edit_segmentation_with_surfaces.cpp`
- **Key dependencies:** `mrisurf.h`, `mri.h`, `cma.h`, `mrishash.h`, `gca.h`, `mrisegment.h`

## Purpose and Context

After cortical surface reconstruction, the aseg volume can contain voxels whose label is inconsistent with the surface geometry. For example, a voxel lying inside the white surface may be labeled as cortical gray matter, or a voxel outside the pial surface may be labeled as white matter. This tool uses the reconstructed white and pial surfaces as anatomical constraints to correct such inconsistencies.

It performs four categories of edits, controlled by bitmask flags:
- `HYPO_EDITS` (0x0001) — correct hypointensity labels
- `CEREBELLUM_EDITS` (0x0002) — correct cerebellar mislabeling
- `CORTEX_EDITS` (0x0004) — correct cortical GM labels using surface geometry
- `WM_EDITS` (0x0008) — correct WM labels using surface geometry

By default all four are applied (`which_edits = 0xF`).

## Inputs

Positional arguments (order from source `main()`):
1. `<aseg_name>` — input aseg volume (e.g., `aseg.mgz`)
2. `<surf_dir>` — directory containing reconstructed surfaces (e.g., `surf/`)
3. `[<norm_vol> …]` — one or more intensity volumes (e.g., `norm.mgz`); 0 or more, counted as `argc−4`
4. `<out_aseg>` — output aseg volume path (last positional argument)

Optional inputs loaded via flags:
- `-GCA <gca_file> <xform_file>`: GCA atlas and transform for probabilistic relabelling of hypointensities
- `--annot <annotation_name>`: Annotation file (default: `aparc.annot`)
- `-l <label_file>`: Label file for limiting computations to one region
- `--config <config_file>`: Configuration file for WMSA halo settings

## Outputs

- Edited aseg volume at the specified output path.

## Mathematical Foundations

For each voxel in the segmentation, the tool determines whether the voxel is:
1. **Interior to the white surface** — should be white matter or subcortical structure
2. **Exterior to the pial surface** — should not be labeled as brain tissue
3. **Between white and pial surfaces** — cortical gray matter

The `relabel_gray_matter()` function uses a surface hashing structure (`mrishash`) to efficiently compute which side of each surface a given voxel lies on.

The `relabel_hypointensities()` function additionally uses GCA probabilistic information when a GCA atlas and transform are provided.

A "WMSA" (White Matter Signal Abnormality) edit mode is supported via the `-config` file, and a `Halo` parameter controls dilation of edits.

## Configuration Options

All flags are case-insensitive. The full `get_option()` has been read.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--help` | — | — | Print help and exit |
| `--version` | — | — | Print version string and exit |
| `--annot <name>` | string | `aparc.annot` | Annotation file name to load from `surf_dir` (sets `annot_name`); note: `nargs` is incorrectly set to 2 in the source — see gotcha |
| `--config <file>` | path | none | Configuration file path (sets `config_file`); same nargs=2 bug as `--annot` |
| `-halo1` | — | off | Use WMSA halo mode 1 (sets `Halo=1`); applies a single-ring halo around WMSA voxels |
| `-halo2` | — | off | Use WMSA halo mode 2 (sets `Halo=2`); applies a more aggressive multi-tissue WMSA dilation using `WMSAalloc()` |
| `-hypo <1\|0>` | int | on (default `which_edits` includes `HYPO_EDITS`) | Enable (1) or disable (0) hypointensity editing; toggles `HYPO_EDITS` bit in `which_edits` |
| `-cortex <1\|0>` | int | on | Enable (1) or disable (0) cortical GM editing; toggles `CORTEX_EDITS` bit in `which_edits` |
| `-white <1\|0>` | int | on | Enable (1) or disable (0) WM editing; toggles `WM_EDITS` bit in `which_edits` |
| `-cerebellum <1\|0>` | int | on | Enable (1) or disable (0) cerebellar mislabelling editing; toggles `CEREBELLUM_EDITS` bit in `which_edits` |
| `-debug_voxel <x> <y> <z>` | int×3 | disabled | Enable per-voxel diagnostic output; sets `Ggca_x`, `Ggca_y`, `Ggca_z`, `Gx`, `Gy`, `Gz` |
| `-MRI <file>` | path | none | Load an auxiliary MRI volume for use in editing decisions (sets `mri_vals`) |
| `-GCA <gca_file> <xform_file>` | 2 paths | none | Load a GCA atlas and associated transform for probabilistic relabelling; sets `gca` and `transform` |
| `-l <label_file>`<br>`-L <label_file>` | path | none | Limit editing computations to the region specified by the label file (sets `label_name`) |
| `-a <annot_file>`<br>`-A <annot_file>` | path | none | Compute per-label statistics using the named annotation file (sets `annotation_name`) |
| `-u`<br>`-?` | — | — | Print usage and exit |

> [!gotcha] `--annot` and `--config` consume one extra argument due to nargs=2 bug
> Both `--annot` and `--config` set `nargs=2` in the source, but they only read `argv[2]` (one extra argument). This means the argument parser will skip an extra argument after the flag value, effectively consuming the argument following the filename as if it were a flag argument. In practice, this makes these flags unusable in the middle of a flag list unless the next argument is also intended to be skipped. This is a source-level bug.

## Configuration Interactions

- All four edit categories (`HYPO_EDITS`, `CEREBELLUM_EDITS`, `CORTEX_EDITS`, `WM_EDITS`) are enabled by default (`which_edits = 0xF`); each can be disabled individually with the corresponding flag set to 0.
- `-GCA` and the second argument (transform file) must always be provided together.
- `-halo1` and `-halo2` are mutually exclusive in intent but the code allows both to be set; the last one wins.
- The surface used for geometric constraints is hard-coded to `white` (via `surf_name = "white"`); there is no command-line flag to change the surface name in this version.

## Typical Use Cases

```bash
# Standard usage in recon-all context
# positional order: <aseg> <surf_dir> [<norm_vol>] <out_aseg>
mri_edit_segmentation_with_surfaces \
  aseg.mgz surf/ norm.mgz aseg.presurf.mgz

# Disable WM edits
mri_edit_segmentation_with_surfaces -white 0 \
  aseg.mgz surf/ norm.mgz aseg_no_wm_edits.mgz

# Disable hypointensity and cerebellum edits
mri_edit_segmentation_with_surfaces -hypo 0 -cerebellum 0 \
  aseg.mgz surf/ norm.mgz aseg_edited.mgz
```

## Pipeline Context

This tool is called during `autorecon3` in `[[recon-all]]`, after cortical surface reconstruction is complete. The surfaces must already exist in the subject's `surf/` directory. It produces a refined aseg that is consistent with the reconstructed surfaces, which is required for downstream statistics (`[[mris_anatomical_stats]]`) and parcellation-to-volume mapping (`[[mri_aparc2aseg]]`).

## Gotchas and Caveats

> [!gotcha] Surfaces must exist before running
> This tool requires the reconstructed `lh.white` and `rh.white` (and optionally `lh.pial`, `rh.pial`) to already be present. It cannot be run before surface reconstruction.

> [!assumption] Expects aseg in FreeSurfer CMA label space
> The tool uses `IS_RH_CLASS`, `IS_LH_CLASS`, and other CMA label predicates. Custom label maps with non-standard values are not supported.

## Related Tools

- `[[mri_edit_segmentation]]` — intensity-based segmentation editing (no surface constraint)
- `[[mri_edit_wm_with_aseg]]` — edits WM volume using aseg
- `[[mri_ca_label]]` — produces the aseg input for this tool
- `[[mri_aparc2aseg]]` — uses the edited aseg downstream

## Confidence and Gaps

**High confidence (flags):** All flags confirmed from complete reading of `get_option()` in source. The `nargs=2` bug for `--annot` and `--config`, the `which_edits` bitmask defaults, and the hard-coded `surf_name="white"` are all verified from source.

**High confidence (positional args):** Argument order confirmed from `main()`: `<aseg> <surf_dir> [<norm_vols>...] <out_aseg>` — note this differs from the description in the tool's own help text.

> [!note] Audit noise: single-dash stripping parser and comment separator
> An automated audit may report `--annot` and `--config` as C3 invalid. This is a false positive: `get_option()` uses `option = argv[1] + 1` to strip the leading dash, then compares with `!stricmp(option, "-annot")` and `!stricmp(option, "-config")`. Double-dash forms are correctly accepted. The audit finds only `"-annot"` (single-dash) in source. Additionally, `--end` may be flagged as C1 missing; it is extracted from the C comment `//--------------------END EMILY'S SECTION` (the regex captures `--END` from within the separator dashes). There is no `--end` flag in this tool.
