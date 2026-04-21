---
title: "mri_bc_sc_bias_correct"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_bc_sc_bias_correct/mri_bc_sc_bias_correct.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_nu_correct.mni]]"
  - "[[mri_normalize]]"
  - "[[mri_apply_bias]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Attic status — availability uncertain"
  - "BC/SC acronym meaning not explained in source"
  - "Algorithm not deducible from attic source alone without deeper reading"
tags:
  - bias-field
  - intensity-correction
  - attic
---

# mri_bc_sc_bias_correct

## Summary

`mri_bc_sc_bias_correct` is an MRI bias field correction tool found in the `attic/` directory of the FreeSurfer source tree. The tool name suggests "BC/SC bias correction," likely referring to a combination of "Bias Correction" and "Signal Correction" or "Sensitivity Correction," but the exact acronym is not explained in the source. Due to attic status, this tool is likely deprecated and not part of the active pipeline.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_bc_sc_bias_correct/mri_bc_sc_bias_correct.cpp`

> [!gotcha] Attic status
> This tool is in the `attic/` directory. It is almost certainly not compiled or distributed in standard FreeSurfer 8.2.0 installations. Use [[mri_nu_correct.mni]] or [[mri_normalize]] for bias correction.

## Purpose and Context

> [!gap] Purpose unclear
> Without being able to run the tool or read a description beyond the filename, the precise algorithm is unknown. The "BC_SC" prefix may refer to a specific bias correction method developed at MGH/Martinos Center. This page serves as a placeholder to document the tool's existence.

## Inputs

> [!gap] Unknown
> Inputs are not documented here. Read `attic/mri_bc_sc_bias_correct/mri_bc_sc_bias_correct.cpp` directly for command-line argument parsing.

## Outputs

> [!gap] Unknown

## Mathematical Foundations

> [!gap] Algorithm not documented
> The algorithm implemented in this tool is not described in available sources.

## Configuration Options

> [!gap] Unknown
> See source code for flag definitions.

## Pipeline Context

Not a standard [[recon-all]] stage. Tool is in attic and likely deprecated.

## Related Tools

- [[mri_nu_correct.mni]] — active N3 bias field correction
- [[mri_normalize]] — intensity normalization with bias correction
- [[mri_apply_bias]] — applies a pre-computed bias field

## Confidence and Gaps

> [!gap] Insufficient information
> This page is a stub. The tool is in `attic/` and may not be accessible. A full page requires reading the source and possibly running the tool.
