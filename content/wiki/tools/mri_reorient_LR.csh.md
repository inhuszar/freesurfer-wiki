---
title: "mri_reorient_LR.csh"
type: tool
fs_version: "8.2.0"
source_language: "csh"
source_files:
  - "scripts/mri_reorient_LR.csh"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - reorientation
  - coordinate-systems
  - preprocessing
  - baby-brain
  - csh
---

# mri_reorient_LR.csh

## Summary

`mri_reorient_LR.csh` is a tcsh script that reorients a brain MRI volume in the left-right direction. It was originally designed for pediatric/neonatal brain scans where the L-R orientation may be ambiguous or inconsistent. The script converts the input to NIfTI format if needed (since FSL FLIRT cannot handle `.mgz`), calls FSL FLIRT to estimate a rigid registration that flips the L-R axis, and writes the reoriented volume and an optional registration file.

## Source Information

- **Language:** tcsh (csh script)
- **Source file:** `scripts/mri_reorient_LR.csh`
- **Original author:** Lilla Zollei
- **Created:** 2010-07-16
- **Dependencies:** FSL (`flirt`), [[mri_convert]]

## Purpose and Context

In neonatal and pediatric MRI, the left-right orientation may not be reliably encoded in the image header (especially in early-generation scanners or when data has been transferred without header corrections). `mri_reorient_LR.csh` automates the process of detecting and correcting L-R orientation by:
1. Converting the input to NIfTI (if not already in NIfTI format) using [[mri_convert]]
2. Calling FSL FLIRT to register the input against a left-right flipped version of itself (or a template)
3. Writing the reoriented result

This is a utility script intended for specialized preprocessing workflows; it is not part of the standard [[recon-all]] pipeline.

> [!assumption] Input data assumption
> FSL must be installed and available in the PATH. The script sources `$FREESURFER_HOME/sources.csh` for FreeSurfer environment setup.

## Inputs

| Input | Description |
|-------|-------------|
| Input volume (`--i`) | MRI volume to reorient (any format; will be converted to NIfTI if not `.nii`/`.nii.gz`) |
| Output volume (`--o`) | Reoriented output volume path |

## Outputs

- **Reoriented volume:** The input volume reoriented in the L-R direction
- **Registration file (`--outreg`):** Optional output file containing the computed reorientation transform

## Mathematical Foundations

The reorientation is computed by FSL FLIRT rigid-body registration. The registration computes a 6-DOF (translation + rotation) transform that aligns the input to a reference orientation. The L-R flip is detected and corrected by comparing the registration matrix diagonal to identify sign flips along the x-axis.

## Configuration Options

### Complete Flag Reference

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<inputvol>` | required | Input volume to reorient. Any format accepted by [[mri_convert]]; if not `.nii` or `.nii.gz`, a temporary NIfTI is created before calling FSL FLIRT. |
| `--o` | `<outputvol>` | required | Output path for the reoriented volume. If the extension is not `.nii`/`.nii.gz`, the result is converted from NIfTI before writing. |
| `--outreg` | `<outreg>` | — | Write the computed reorientation transform to this file. Extension determines format: `.lta` produces an LTA file (via `tkregister2_cmdl`); any other extension is treated as an FSL `.mat` file (copied directly). |
| `--disp` | `<0\|1>` | `1` | If `1`, open FreeView after processing to display the original and reoriented volumes side by side. Set to `0` to suppress the display. |
| `--clean` | `<0\|1>` | `0` | If `1`, delete all auxiliary files created during processing (the LR-flipped NIfTI, FLIRT output, FSL matrix, `avscale.txt`, and the half-angle transform file). The temporary NIfTI for a non-NIfTI input is always removed regardless of this flag. |
| `--version` | (none) | — | Print the version string and exit. |
| `--help` | (none) | — | Print usage information and exit. |

## Configuration Interactions

- If the input is not `.nii` or `.nii.gz`, a temporary NIfTI file is always created and always deleted after processing, regardless of `--clean`. The `--clean` flag controls only the larger set of auxiliary files (LR-flipped NIfTI, FLIRT outputs, avscale.txt, half-angle matrix).
- `--outreg` is optional; if not specified, only the reoriented volume is written.
- `--disp 1` (the default) launches FreeView interactively — in automated/scripted use, always pass `--disp 0`.

## Typical Use Cases

```bash
# Reorient a neonatal brain scan (suppress the FreeView display for scripted use)
mri_reorient_LR.csh --i baby_brain.mgz --o baby_brain_LR.mgz --disp 0

# Reorient and save the registration transform
mri_reorient_LR.csh --i baby_brain.nii.gz --o baby_brain_reoriented.nii.gz \
    --outreg LR_reg.mat --disp 0
```

## Pipeline Context

`mri_reorient_LR.csh` is not called by [[recon-all]]. It is used in specialized infant/neonatal neuroimaging workflows before running the standard pipeline, to ensure correct L-R orientation.

## Gotchas and Caveats

> [!gotcha] FSL dependency
> The script requires FSL's `flirt` to be installed and in the PATH. If FSL is not available, the script will fail silently (or with a command-not-found error).

> [!gotcha] Auxiliary files accumulate by default
> The script creates several intermediate files: a left-right-flipped NIfTI, FLIRT outputs, the FSL matrix, `avscale.txt`, and the half-angle transform. With `--clean 0` (the default), all of these persist after the script completes and must be manually deleted. Pass `--clean 1` to remove them automatically. The temporary NIfTI for non-NIfTI inputs is always deleted regardless.

> [!gotcha] tcsh dependency
> This script uses tcsh-specific syntax and must be run with `tcsh` (or sourced from a tcsh environment). It will not work with bash.

> [!gotcha] Infant imaging only
> This script was designed for pediatric/infant scans where L-R orientation is uncertain. For standard adult scans with reliable DICOM headers, this step is unnecessary.

## Related Tools

- [[mri_convert]] — Used internally for MGZ-to-NIfTI conversion
- [[coordinate-systems]] — Background on RAS coordinate conventions

## Confidence and Gaps

**High confidence:** Full source read. All flags, FLIRT call parameters, auxiliary file handling, and registration-to-LTA conversion path confirmed from source.

**Confirmed FLIRT call:** `flirt.fsl -dof 6 -in <inputvol> -ref <LR-flipped vol> -out <flirtoutput> -omat <fslmat>` — 6 DOF rigid body registration between the input and its own left-right-reversed copy. The resulting FSL matrix is halved using `avscale` to extract the "forward half transform", which is then applied with `flirt -applyxfm`.
