---
title: "recon-all-exvivo"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/recon-all-exvivo"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[recon-all]]"
  - "[[mri_synthseg]]"
  - "[[mris_make_surfaces]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full list of pipeline stages run by this script not documented (script body not fully read)."
  - "The SAMSEG integration for ex vivo segmentation not documented in detail."
tags:
  - pipeline
  - ex-vivo
  - tissue
  - MRI
---

# recon-all-exvivo

## Summary

`recon-all-exvivo` is a FreeSurfer pipeline script for processing ex vivo (post-mortem) brain tissue MRI. It adapts the standard `recon-all` processing stream for the characteristics of ex vivo tissue scans, which differ significantly from in vivo MRI in contrast, resolution, and geometry. The script supports both standard reconstruction and a SAMSEG-based segmentation path, and can process a single hemisphere or both hemispheres.

## Source Information

- **Language:** tcsh (shell script)
- **Source file(s):** `scripts/recon-all-exvivo`
- **Binary/script location:** `$FREESURFER_HOME/bin/recon-all-exvivo`

## Purpose and Context

Ex vivo MRI of post-mortem brain tissue is increasingly used for histological validation, laminar analysis, and detailed anatomical characterization. Key differences from in vivo MRI include:

- Higher resolution (sub-millimetre voxels).
- Different tissue contrast (T1/T2 characteristics change with fixation).
- Absence of surrounding head tissue in some preparations.
- Possible deformation or tissue distortion from post-mortem handling.

`recon-all-exvivo` adapts the FreeSurfer pipeline to these characteristics, providing hemisphere-specific processing, optional cerebellum exclusion, optional BET skull stripping, and SAMSEG-based segmentation.

## Inputs

### Required Inputs

(Positional argument: `-s <subject>`)

- **`-s <subject>`** — FreeSurfer subject ID.

`SUBJECTS_DIR` must be set.

### Optional Inputs

- **`-lh`** / **`-rh`** — process left or right hemisphere only (default: both).
- **`-samseg <samseg_fname> <vol_fname>`** — use SAMSEG segmentation output instead of standard GCA-based segmentation.
- **`-mask <mask_fname>`** — provide an explicit brain mask volume.
- **`-bet`** / **`-run_bet`** — run BET (FSL Brain Extraction Tool) for skull stripping.
- **`-nocerebellum`** — exclude the cerebellum from processing.
- **`-norecon`** — skip surface reconstruction (run preprocessing only).
- **`-sd <dir>`** — override subjects directory.
- **`-no-recon`** / **`-no_recon`** — skip reconstruction stages.

### Input Assumptions

> [!assumption] Input must already be in the subject directory
> Unlike `recon-all -i <input>`, the ex vivo pipeline expects the input to already be placed in the standard subject MRI directory structure.

> [!assumption] Ex vivo tissue characteristics
> The pipeline assumes tissue characteristics appropriate for post-mortem fixed tissue. Applying this to in vivo MRI without modification will likely produce suboptimal results.

## Outputs

Standard FreeSurfer subject directory output, similar to `recon-all`, but adapted for ex vivo data:

- `surf/lh.white`, `surf/rh.white` — white matter surfaces.
- `surf/lh.pial`, `surf/rh.pial` — pial surfaces (if reconstruction completed).
- `mri/aseg.mgz` — subcortical segmentation.

## Mathematical Foundations

The ex vivo pipeline uses the same underlying algorithms as standard `recon-all` but with adapted parameters for:

1. Surface deformation (different intensity thresholds for ex vivo tissue).
2. Skull stripping (BET option for tissue preparations without skull).
3. Segmentation (SAMSEG integration for flexible multi-contrast segmentation).

> [!gap] Specific parameter adaptations
> The exact parameter differences between in vivo and ex vivo processing (e.g., different GCA models, surface deformation weights) are not documented from the script body (not fully read).

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s <subject>` | string | required | Subject ID. |
| `-lh` | boolean | false | Process only left hemisphere. |
| `-rh` | boolean | false | Process only right hemisphere. |
| `-samseg <seg> <vol>` | pair | — | Use SAMSEG segmentation output. |
| `-mask <file>` | string | — | Explicit brain mask. |
| `-bet` / `-run_bet` | boolean | false | Run BET skull stripping. |
| `-nocerebellum` | boolean | false | Exclude cerebellum. |
| `-norecon` | boolean | false | Skip surface reconstruction. |
| `-sd <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |

### Configuration Interactions

- `-lh` and `-rh` are mutually exclusive; omitting both processes both hemispheres.
- `-samseg` requires two arguments (segmentation file + volume file).
- `-norecon` is useful for running only the volumetric preprocessing stages.

## Typical Use Cases

### Use Case 1: Process ex vivo hemisphere

```bash
export SUBJECTS_DIR=/data/exvivo_subjects
recon-all-exvivo -s exvivo_case01 -lh
```

### Use Case 2: Process with SAMSEG segmentation

```bash
recon-all-exvivo -s exvivo_case01 \
  -samseg /path/to/samseg_output.mgz /path/to/exvivo.mgz
```

### Use Case 3: Process with BET skull stripping

```bash
recon-all-exvivo -s exvivo_case01 -bet -nocerebellum
```

## Pipeline Context

`recon-all-exvivo` is independent of standard `recon-all`. It is used for specialized ex vivo analysis pipelines, often in conjunction with histological validation studies or laminar MRI analysis.

## Gotchas and Caveats

> [!gotcha] Not equivalent to standard recon-all outputs
> Ex vivo surfaces and segmentations are not directly comparable to in vivo `recon-all` outputs due to fundamental differences in tissue characteristics and processing parameters.

> [!gotcha] BET may be needed for tissue blocks
> For isolated tissue preparations without a skull, the default skull stripping may fail. Use `-bet` or provide an explicit mask with `-mask`.

> [!gotcha] No input specification flag
> Unlike `recon-all -i`, this script does not accept a raw input volume via a flag. The input must already be placed in the subject directory.

## Related Tools

- [[recon-all]] — standard in vivo cortical reconstruction pipeline
- [[recon-all-clinical.sh]] — rapid clinical scan pipeline
- [[mri_synthseg]] — SAMSEG-related deep learning segmentation

## Confidence and Gaps

Confidence is **medium**. The command-line interface and overall purpose are clearly read from the script. The detailed processing stages and parameter adaptations for ex vivo data were not fully traced.

> [!gap] Full pipeline stage list
> Read the full body of `scripts/recon-all-exvivo` to enumerate all processing stages and their ex vivo-specific parameter adaptations.
