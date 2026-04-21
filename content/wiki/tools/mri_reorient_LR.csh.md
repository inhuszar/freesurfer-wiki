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
last_agent_update: 2026-04-15
gaps:
  - "Exact FSL FLIRT call parameters used for the LR flip registration"
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
| Input volume (`-i`) | MRI volume to reorient (any format; will be converted to NIfTI if not `.nii`/`.nii.gz`) |
| Output volume (`-o`) | Reoriented output volume path |

## Outputs

- **Reoriented volume:** The input volume reoriented in the L-R direction
- **Registration file (`-r`):** Optional output file containing the computed reorientation transform

## Mathematical Foundations

The reorientation is computed by FSL FLIRT rigid-body registration. The registration computes a 6-DOF (translation + rotation) transform that aligns the input to a reference orientation. The L-R flip is detected and corrected by comparing the registration matrix diagonal to identify sign flips along the x-axis.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-i` | `<inputvol>` | Input volume |
| `-o` | `<outputvol>` | Output reoriented volume |
| `-r` | `<outreg>` | Output registration/transform file (optional) |
| `-nocleanup` / `-cleanup` | (none) | Whether to remove temporary NIfTI conversion files |
| `--help` | (none) | Print help |
| `--version` | (none) | Print version |

## Configuration Interactions

- If the input is not `.nii` or `.nii.gz`, a temporary NIfTI file is created. `-cleanup` (default: off) controls whether this temporary file is deleted after processing.
- `-r` is optional; if not specified, only the reoriented volume is written.

## Typical Use Cases

```bash
# Reorient a neonatal brain scan
mri_reorient_LR.csh -i baby_brain.mgz -o baby_brain_LR.mgz

# Reorient and save the registration transform
mri_reorient_LR.csh -i baby_brain.nii.gz -o baby_brain_reoriented.nii.gz -r LR_reg.mat
```

## Pipeline Context

`mri_reorient_LR.csh` is not called by [[recon-all]]. It is used in specialized infant/neonatal neuroimaging workflows before running the standard pipeline, to ensure correct L-R orientation.

## Gotchas and Caveats

> [!gotcha] FSL dependency
> The script requires FSL's `flirt` to be installed and in the PATH. If FSL is not available, the script will fail silently (or with a command-not-found error).

> [!gotcha] Temporary NIfTI files
> If the input is in `.mgz` or another non-NIfTI format, a temporary `.nii.gz` file is created. With `-cleanup` off (default), this file persists after the script completes and must be manually deleted.

> [!gotcha] tcsh dependency
> This script uses tcsh-specific syntax and must be run with `tcsh` (or sourced from a tcsh environment). It will not work with bash.

> [!gotcha] Infant imaging only
> This script was designed for pediatric/infant scans where L-R orientation is uncertain. For standard adult scans with reliable DICOM headers, this step is unnecessary.

## Related Tools

- [[mri_convert]] — Used internally for MGZ-to-NIfTI conversion
- [[coordinate-systems]] — Background on RAS coordinate conventions

## Confidence and Gaps

**High confidence:** Source language, file location, dependencies (FSL, mri_convert), purpose (L-R reorientation for infant scans), flag structure.

**Medium confidence:** Exact FLIRT call parameters (the section of the script using FLIRT was not read in full).
