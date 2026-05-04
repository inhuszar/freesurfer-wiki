---
title: "mri_relabel_nonwm_hypos"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_relabel_nonwm_hypos/mri_relabel_nonwm_hypos.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_relabel_hypointensities]]"
  - "[[mri_segment]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Default seg-id mapping (outsegidlist contents not read in full)"
tags:
  - segmentation
  - post-processing
  - hypointensities
  - autorecon2
---

# mri_relabel_nonwm_hypos

## Summary

`mri_relabel_nonwm_hypos` relabels voxels in a segmentation volume that are labeled as non-WM hypointensities (FreeSurfer labels 80, 81, 82 = left/right/bilateral non-WM-hypointensities) to anatomically more appropriate labels. The user specifies source label IDs and their replacement target labels (or uses a built-in default mapping), and the tool applies `MRIrelabelNonWMHypos()` to perform the remapping.

## Source Information

- **Language:** C++
- **Source file:** `mri_relabel_nonwm_hypos/mri_relabel_nonwm_hypos.cpp`
- **Original author:** Douglas Greve
- **Key function:** `MRIrelabelNonWMHypos(seg, segidlist, nsegs, outsegidlist)`
- **Key includes:** `mri.h`, `mri2.h`, `colortab.h`, `fsenv.h`

## Purpose and Context

The FreeSurfer segmentation pipeline identifies voxels that appear hypointense relative to surrounding white matter. Those within the white matter boundary are labeled as WM-hypointensities (label 77); those outside are labeled as non-WM-hypointensities (labels 80-82). The latter category typically represents dark-appearing structures in the grey matter or CSF that are not truly white matter lesions — they may be veins, partial-volume CSF, or other structures.

`mri_relabel_nonwm_hypos` reassigns these voxels to their correct anatomical labels based on spatial context. It is called after [[mri_relabel_hypointensities]] in the [[wiki/pipelines/recon-all|recon-all]] `autorecon2` stage.

## Inputs

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `inputseg` | — | Input segmentation volume containing non-WM-hypo labels (80, 81, 82) |
| `--o` | `outputseg` | — | Output segmentation with non-WM-hypos relabeled |

## Outputs

- **Relabeled segmentation:** Same geometry as input, with non-WM-hypointensity voxels reassigned to their replacement labels

## Mathematical Foundations

The relabeling is performed by `MRIrelabelNonWMHypos()` (in `mri2.c`). For each voxel with a label in `segidlist`, the label is replaced with the corresponding entry in `outsegidlist`. The mapping is applied globally (not context-dependent); spatial context determines the appropriate replacement via the `--seg-default` logic in the library function.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `inputseg` | — | Input segmentation with non-WM-hypo labels |
| `--o` | `outputseg` | — | Output segmentation path |
| `--seg` | `label_in label_out` | — | Add a source → destination label remapping |
| `--seg-default` | — | `off` | Use the built-in default mapping for labels 80, 81, 82 |
| `--debug` | — | `off` | Enable debug output |
| `--checkopts` | — | `off` | Check options and exit without processing |

## Configuration Interactions

- `--seg` and `--seg-default` can be combined: `--seg-default` loads the default mappings and `--seg` adds or overrides individual entries.
- `--seg` can be specified multiple times to build a custom mapping list.
- Without either `--seg` or `--seg-default`, no relabeling is performed (the output equals the input).

## Typical Use Cases

```bash
# Apply default relabeling for labels 80-82
mri_relabel_nonwm_hypos --i aseg.mgz --o aseg_relabeled.mgz --seg-default

# Custom relabeling: replace label 80 with 42 (Right-Cerebral-Cortex)
mri_relabel_nonwm_hypos --i aseg.mgz --o aseg_relabeled.mgz --seg 80 42
```

## Pipeline Context

`mri_relabel_nonwm_hypos` is called during [[wiki/pipelines/recon-all|recon-all]] `autorecon2`, immediately after [[mri_relabel_hypointensities]]. Together these two tools clean up the aseg segmentation before surface tessellation:

1. [[mri_relabel_hypointensities]] — fixes WM-hypointensity labels near surfaces
2. `mri_relabel_nonwm_hypos` — fixes non-WM-hypointensity labels 80, 81, 82
3. [[mri_pretess]] / [[mri_tessellate]] — surface extraction from cleaned aseg

## Gotchas and Caveats

> [!gotcha] Labels 80, 81, 82 must be present
> If the input segmentation does not contain any voxels labeled 80, 81, or 82 (e.g., in subjects without white matter lesions), the tool will still run successfully but produce no changes.

> [!gotcha] Default mapping depends on library function
> The `--seg-default` behavior is implemented in `MRIrelabelNonWMHypos()` in `mri2.c`. The exact default remapping is defined there, not in the main program. The full mapping was not read.

## Related Tools

- [[mri_relabel_hypointensities]] — Companion tool for WM-hypointensity relabeling
- [[mri_segment]] — Produces the hypointensity labels refined by this tool
- [[wiki/pipelines/recon-all|recon-all]] — Calls this tool in autorecon2

## Confidence and Gaps

**High confidence:** Source language, file, flags, usage syntax, pipeline stage, relationship to `MRIrelabelNonWMHypos`.

**Medium confidence:** Default mapping contents (in external library function).

> [!gap] Default label mapping
> The exact default `segidlist` / `outsegidlist` used by `--seg-default` is defined in `MRIrelabelNonWMHypos()` in `mri2.c`. This needs to be read to document the full default behaviour.
