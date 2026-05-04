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
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
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
| `-t <fname>` | string | first input | Use this volume as registration target |
| `-tmp <dir>`<br>`-tmpdir <dir>` | string | auto | Temporary directory; also disables cleanup |
| `-umask <mask>` | string | system default | Set umask for file creation |
| `-nocleanup` | flag | off | Keep temporary directory after completion |
| `-verbose` | flag | off | Enable verbose output |
| `-cm` | flag | off | High-resolution (`-cm`) mode for `minctracc` |
| `-wild` | flag | off | Allow wildcard expansion for input files |

## Configuration Interactions

- `-t` selects a specific run as the registration reference. Without this, the first input is used.
- `-cm` passes the `-cm` flag to `minctracc`, enabling the high-resolution centres-of-mass cost function. This is the equivalent of the `-hires` concept; the flag name comes from `minctracc`'s option name.
- `-tmp`/`-tmpdir` both set the temporary directory and implicitly disable cleanup (`CleanUp = 0`). Use `-nocleanup` alone if you want the default auto-generated temp dir but kept after completion.
- Transform files are saved by default (`SaveXFM = 1` is hardcoded); there is no flag to suppress this behaviour in the current source.

## Typical Use Cases

```bash
# Standard two-run average
mri_motion_correct2 -i run1.mgz -i run2.mgz -o rawavg.mgz

# Three runs, high-res minctracc mode
mri_motion_correct2 -cm -i r1.mgz -i r2.mgz -i r3.mgz -o rawavg.mgz

# Custom target, preserve temp files for debugging
mri_motion_correct2 -i r1.mgz -i r2.mgz -t r2.mgz \
  -nocleanup -tmp /tmp/mc_debug -o rawavg.mgz
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
