---
title: "mri_motion_correct2"
type: tool
fs_version: "8.2.0"
source_language: "Shell (tcsh)"
source_files:
  - "scripts/mri_motion_correct2"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_motion_correct]]"
  - "[[mri_motion_correct.fsl]]"
  - "[[mri_convert]]"
  - "[[mri_info]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - motion-correction
  - anatomical
  - minc
---

# mri_motion_correct2

## Summary

`mri_motion_correct2` performs motion correction for multi-run anatomical MRI acquisitions using the MINC toolkit (`minctracc`, `mincresample`, `mincaverage`). It is functionally equivalent to [[mri_motion_correct]] but implemented in tcsh, offering more configurability including a high-resolution mode, custom target selection, and format control. The output is compatible with all subsequent `recon-all` steps.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_motion_correct2`
- **Original Author:** Doug Greve

## Purpose and Context

`mri_motion_correct2` was written as a more configurable alternative to [[mri_motion_correct]], maintaining compatibility with the same MINC-based registration pipeline. It uses `mri_info` to extract TR/TE/TI/FlipAngle from each input run and validates consistency across runs, which `mri_motion_correct` does not do. It also supports saving per-run registration transforms (`SaveXFM = 1` by default).

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volumes | [[mgz]] / COR | Two or more anatomical runs |
| Output specifier | string | Output path/stem |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Motion-corrected volume | [[mgz]] / COR | Co-registered average of all input runs |
| Transform files | text | Per-run rigid-body transforms (saved by default) |
| Log file | text | `<outspec>.mri_motion_correct2.log` |

## Mathematical Foundations

Identical to [[mri_motion_correct]]: each run $I_i$ is registered to a target (first run by default, or user-specified) via 6-DOF rigid-body registration using `minctracc`. The registered runs are averaged with `mincaverage`:

$$
I_{out} = \frac{1}{N} \sum_{i=1}^{N} I_i \circ T_i^{-1}
$$

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i <fname>` | string | repeatable | Input run volume |
| `-o <stem>` | string | required | Output specifier |
| `-target <fname>` | string | first input | Use this volume as registration target |
| `-hires` | flag | off | High-resolution mode |
| `-fmt <format>` | string | auto | Output format (e.g., `COR`, `mgz`) |
| `-no-save-xfm` | flag | off | Do not save per-run transforms |
| `-tmp <dir>` | string | auto | Temporary directory |
| `-no-cleanup` | flag | off | Keep temporary files |
| `-log <fname>` | string | auto | Log file path |
| `-wild` | flag | off | Allow wildcard expansion for input files |

## Configuration Interactions

- `-target` selects a specific run as the registration reference. Without this, the first input is used.
- `-hires` adjusts MINC registration parameters for high-resolution data; the specific parameter changes are internal to the script.
- `-no-save-xfm` disables the default behaviour of writing per-run transform files alongside the output.
- `-fmt COR` forces the output to COR directory format; otherwise the format matches the input.

## Typical Use Cases

```bash
# Standard two-run average
mri_motion_correct2 -i run1.mgz -i run2.mgz -o rawavg.mgz

# Three runs, high-res mode
mri_motion_correct2 -hires -i r1.mgz -i r2.mgz -i r3.mgz -o rawavg.mgz

# Custom target, preserve temp files for debugging
mri_motion_correct2 -i r1.mgz -i r2.mgz -target r2.mgz \
  -no-cleanup -tmp /tmp/mc_debug -o rawavg.mgz
```

## Pipeline Context

Can be used as an alternative to [[mri_motion_correct]] in the `recon-all` autorecon1 preprocessing step. Not invoked by default in `recon-all`; the user would need to call it manually before running `recon-all`.

## Gotchas and Caveats

> [!gotcha] Requires full MINC toolkit
> Depends on `rawtominc`, `minctracc`, `mincresample`, and `mincaverage` from the MINC toolkit. These may not be installed on all systems.

> [!gotcha] Scan parameter consistency check
> Uses `mri_info` to extract TR, TE, TI, and flip angle from each input. If these differ across runs (e.g., runs acquired with different protocols), the tool may exit with a consistency error.

> [!gotcha] Log file overwrites previous log
> If the auto-generated log file already exists (from a previous run), it is renamed with `.old` suffix before the new log is created. Old logs beyond the most recent are not preserved.

## Related Tools

- [[mri_motion_correct]] — bash variant with simpler interface
- [[mri_motion_correct.fsl]] — FSL `flirt`-based variant
- [[mri_info]] — used internally for scan parameter extraction

## Confidence and Gaps

**Confident:** Flags, output structure, MINC dependency, scan parameter validation, transform saving.
