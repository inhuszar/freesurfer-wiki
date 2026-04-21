---
title: "mri_motion_correct"
type: tool
fs_version: "8.2.0"
source_language: "Shell (bash)"
source_files:
  - "scripts/mri_motion_correct"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_motion_correct2]]"
  - "[[mri_motion_correct.fsl]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Registration algorithm used internally (minctracc vs FLIRT) not determined from header"
tags:
  - motion-correction
  - autorecon1
  - anatomical
---

# mri_motion_correct

## Summary

`mri_motion_correct` performs motion correction for anatomical MRI acquisitions consisting of multiple runs. It rigidly co-registers each input run to a reference (typically the first run), then averages the aligned volumes to produce a single motion-corrected output with improved SNR. This is the bash variant of the motion correction script, designed for multi-run anatomical data (not fMRI time-series).

## Source Information

- **Language:** bash shell script
- **Source file:** `scripts/mri_motion_correct`
- **Original Author:** Christian Haselgrove

## Purpose and Context

High-resolution structural MRI acquisitions often consist of multiple repetitions of the same sequence, each acquired in a separate run to allow subject rest between runs. Patient movement between runs introduces misalignment that degrades image quality when runs are averaged. `mri_motion_correct` aligns each run to a reference using rigid-body registration, then averages the registered runs.

This script is used in `recon-all` autorecon1 when multiple T1 input volumes are provided. The output is the motion-corrected average `rawavg.mgz`.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Output file | string | First positional argument: the output filename |
| Input volumes | [[mgz]] / COR | Two or more anatomical runs to co-register and average |

**Usage:** `mri_motion_correct <outfile> <infile1> [<infile2> ...]`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Motion-corrected average | [[mgz]] / COR | Co-registered and averaged volume |
| Transcript log | text | Detailed processing log (deleted unless `-no-clean`) |

## Mathematical Foundations

For $N$ input runs $I_1, \ldots, I_N$, let $T_i$ be the rigid-body transform aligning run $i$ to the reference (typically $I_1$). The output is:

$$I_{out}(\mathbf{x}) = \frac{1}{N} \sum_{i=1}^N I_i(T_i^{-1}(\mathbf{x}))$$

The registration is performed using an external tool (MINC's `minctracc` or similar); the script wraps the registration and averaging steps, handling format conversion and temporary file management via [[mri_convert]].

Volume geometry (dimensions, voxel size, type) is inspected using `mri_convert --in_info` to validate input consistency before processing.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (none documented) | — | — | All arguments are positional |

> [!gap] Command-line flags
> The script's internal functions (`usage()`, `get_size()`, etc.) are defined but no command-line flag parsing loop is visible in the first 100 lines. The script may accept additional flags (e.g., `-no-clean`, log redirection) implemented later in the script body.

## Configuration Interactions

The script uses internal subshell functions for cleanup and graceful signal handling (SIGINT, SIGTERM). Temporary files are created in a temporary directory and cleaned up on exit.

## Typical Use Cases

```bash
# Average two T1 runs
mri_motion_correct rawavg.mgz run1.mgz run2.mgz

# Average three runs
mri_motion_correct rawavg.mgz run1.mgz run2.mgz run3.mgz
```

In `recon-all`, this is invoked automatically when multiple `-i` arguments are provided.

## Pipeline Context

Invoked during `recon-all` autorecon1 when more than one input T1 is provided. The output `rawavg.mgz` is the input to subsequent conformation and normalization steps.

Workflow:
1. Multiple T1 runs → `mri_motion_correct` → `rawavg.mgz`
2. `rawavg.mgz` → `mri_convert --conform` → `orig.mgz`
3. `orig.mgz` → [[mri_nu_correct.mni]] → `nu.mgz`

## Gotchas and Caveats

> [!gotcha] Requires minctracc or equivalent registration tool
> The script depends on external tools from the MINC toolkit (`minctracc`, `mincresample`, `mincaverage`, `rawtominc`). These must be available in `$PATH`. If they are not installed, the script will fail.

> [!gotcha] All inputs must have the same dimensions and type
> The script checks volume dimensions using `mri_convert --in_info`. If input volumes differ in size or type, the script will exit with an error before performing any registration.

> [!gotcha] Not suitable for fMRI time-series
> This tool is designed for multi-run anatomical acquisitions. For fMRI motion correction, use dedicated tools (e.g., FSL `mcflirt`, SPM realignment, or FreeSurfer's own `mri_motion_correct2` in some contexts).

## Related Tools

- [[mri_motion_correct2]] — tcsh variant with same functionality, uses MINC tools
- [[mri_motion_correct.fsl]] — FSL `flirt`-based variant
- [[mri_convert]] — used internally for format conversion and info queries

## Confidence and Gaps

**Confident:** Purpose (multi-run averaging with registration), input/output structure, signal handling, pipeline placement.

**Less confident:** Complete flag list, exact registration tool called (minctracc assumed).
