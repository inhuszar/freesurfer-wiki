---
title: "mri_fcili"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_fcili/mri_fcili.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_fieldsign]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source in attic/; tool purpose and algorithm not confirmed beyond header description"
  - "MRIfcIntrinsicLI() algorithm details unknown"
  - "Input/output specification incomplete"
tags:
  - fmri
  - laterality
  - legacy
---

# mri_fcili

## Summary

`mri_fcili` computes the Intrinsic Laterality Index (iLI) from paired left- and right-hemisphere functional connectivity waveforms. Given left and right hemisphere input volumes, it computes a per-voxel laterality index using `MRIfcIntrinsicLI()` and writes the result to an output directory. Author: Douglas Greve.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_fcili/mri_fcili.cpp`
- **Note:** Source is in `attic/`; likely legacy/experimental
- **Key dependencies:** `mri.h`

## Purpose and Context

Functional laterality (the degree to which a cognitive function is left- or right-hemisphere dominant) can be quantified from resting-state fMRI data by comparing connectivity waveforms from homologous left and right hemisphere regions. The `iLI` (intrinsic laterality index) is a measure of this asymmetry computed from the timecourse data without task activation.

## Inputs

- `lhfile`: Left hemisphere input volume
- `rhfile`: Right hemisphere input volume
- `outdir`: Output directory

Inferred from global variables: `lhfile`, `rhfile`, `outdir`.

## Outputs

- Output files written to `outdir`. Exact format and filenames not confirmed.

## Mathematical Foundations

The laterality index is computed by `MRIfcIntrinsicLI(lh, rh, DenThresh)`. The typical formula for iLI is:

$$\text{iLI}(v) = \frac{L(v) - R(v)}{L(v) + R(v)}$$

where $L(v)$ and $R(v)$ are left and right hemisphere functional connectivity values at vertex/voxel $v$.

The `DenThresh` parameter likely controls a minimum denominator to avoid division by near-zero values.

> [!gap] Algorithm not confirmed
> The body of `MRIfcIntrinsicLI()` is not in the visible source portion. The formula above is the standard iLI definition but may not match the actual implementation.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--lh <file>` | path | required | Left hemisphere input |
| `--rh <file>` | path | required | Right hemisphere input |
| `--o <dir>` | path | required | Output directory |
| `--fmt <ext>` | string | `nii.gz` | Output format extension |

> [!gap] Full flag list not confirmed
> The above is from global variable initializations. The `parse_commandline()` body was not read.

## Configuration Interactions

Unknown without reading the full source.

## Typical Use Cases

```bash
# Compute intrinsic laterality index
mri_fcili --lh lh_timecourse.mgz --rh rh_timecourse.mgz --o /output/dir/
```

## Pipeline Context

Not called by `[[recon-all]]`. Research tool for resting-state fMRI laterality analysis.

## Gotchas and Caveats

> [!gotcha] Source in attic/
> Legacy/experimental code; may not be actively maintained.

## Related Tools

- `[[mri_fieldsign]]` — computes retinotopic field sign maps (different functional analysis)

## Confidence and Gaps

**Low confidence:** Only header description and global variable declarations were read. Tool purpose is inferred. Full algorithm, arguments, and output format are unknown.
