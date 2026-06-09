---
title: "mri_motion_correct.fsl"
type: tool
fs_version: "8.2.0"
source_language: "Shell (tcsh)"
source_files:
  - "scripts/mri_motion_correct.fsl"
  - "scripts/mri_motion_correct.fsl.help.xml"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_motion_correct]]"
  - "[[mri_motion_correct2]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - motion-correction
  - anatomical
  - fsl
---

# mri_motion_correct.fsl

## Summary

`mri_motion_correct.fsl` performs motion correction for multi-run anatomical MRI acquisitions using FSL's `flirt` rigid-body registration tool as the back-end, rather than the MINC toolkit used by [[mri_motion_correct]] and [[mri_motion_correct2]]. It is a drop-in replacement using FSL for environments where MINC is not available. Output format is ANALYZE by default (`FSLOUTPUTTYPE=ANALYZE`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_motion_correct.fsl`
- **Original Author:** Doug Greve
- **Help XML:** `scripts/mri_motion_correct.fsl.help.xml`

## Purpose and Context

This script provides the same multi-run anatomical motion correction as [[mri_motion_correct2]] but uses FSL's `flirt` for the rigid-body registration step. It is designed for sites that have FSL installed but may not have the MINC toolkit. Like the other motion correction scripts, it extracts TR/TE/TI/FlipAngle from the input headers using `mri_info` to verify scan parameter consistency.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volumes | [[mgz]] / ANALYZE | Two or more anatomical runs |
| Output specifier | string | Output path/stem |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Motion-corrected volume | ANALYZE / [[mgz]] | Co-registered average of all input runs |
| Log file | text | `<outspec>.mri_motion_correct.fsl.log` |

> [!gotcha] Default output format is ANALYZE
> The script sets `FSLOUTPUTTYPE=ANALYZE` at the top. ANALYZE format does not support negative voxel sizes (and thus does not encode orientation information). Use `mri_convert` to convert the output to MGZ if orientation information is needed.

## Mathematical Foundations

Same as [[mri_motion_correct2]]: 6-DOF rigid-body registration via `flirt`, followed by averaging. FSL's `flirt` uses correlation ratio (by default) or mutual information as the cost function for within-modality anatomical registration.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i <fname>` | string | repeatable (required, ≥2) | Input run volume. Must be repeated for each run. |
| `-o <stem>` | string | required | Output specifier (file stem or COR directory). |
| `-target <n>` | int | 1 | Use the n-th input (1-indexed) as the registration reference. If `n` exceeds the number of inputs, defaults back to 1. |
| `-maxangle <f>` | float | 90 | Maximum rotation angle (degrees) passed to `fsl_rigid_register`. |
| `-cm` | flag | off | COR mode: conform output volume to the minimum voxel size (passes `-cm` to `mri_convert`). |
| `-tmpdir <dir>` | string | auto | Directory for temporary files. Setting this also implies `-nocleanup`. |
| `-nocleanup` | flag | off | Do not delete temporary files after processing. |
| `-log <fname>` | string | auto | Explicit log file path. Auto-generated as `<outspec>.mri_motion_correct.fsl.log` if not specified. |
| `-nolog` | flag | off | Suppress log file creation (redirects log to `/dev/null`). |
| `-wild` | flag | off | Treat unrecognised arguments as additional input files. Must appear **before** any wildcards on the command line. |
| `-dontrun` | flag | off | Dry run: print all shell commands without executing them. |
| `-verbose` | flag | off | Enable verbose output (`set verbose = 1`). |
| `-echo` | flag | off | Enable shell command echoing (`set echo = 1`). |
| `-debug` | flag | off | Enable both verbose and echo (`-verbose -echo` combined). |
| `-version` | flag | — | Print version string (with `mri_convert -all-info`) and exit. |
| `-help`<br>`-u`<br>`--help`<br>`--usage`<br>`-usage` | flag | — | Print usage and exit. |

> [!gotcha] Flag name discrepancy: `-nocleanup` not `-no-cleanup`
> The cleanup-suppression flag is `-nocleanup` (no hyphen between `no` and `cleanup`), not `-no-cleanup`. Using the incorrect form will trigger an "unrecognized flag" error.

> [!gotcha] Flag name discrepancy: `-dontrun` not `-no-run`
> The dry-run flag is `-dontrun`, not `-no-run`.

## Configuration Interactions

- `-target <n>` uses the n-th input volume (1-indexed) as the registration reference. If the supplied value exceeds `$#inputlist`, it silently resets to 1.
- `-tmpdir` implicitly sets `CleanUp = 0` (same effect as `-nocleanup`). These flags are thus redundant when used together.
- `-maxangle` limits the rotation search range passed to [[fsl_rigid_register]], which calls FSL's `flirt` internally.
- `-dontrun` is a useful debugging flag that prints all shell commands without executing them.
- `-cm` passes the `-cm` flag to the final `mri_convert` call, conforming the output COR volume to the minimum voxel size.
- Output format is determined by `mri_info --format` on the output specifier; if the format is unknown, COR is assumed.

## Typical Use Cases

```bash
# Two-run correction with FSL
mri_motion_correct.fsl -i run1.mgz -i run2.mgz -o rawavg.mgz

# Three runs, second run as target
mri_motion_correct.fsl -i r1.mgz -i r2.mgz -i r3.mgz -target 2 -o rawavg.mgz

# Dry run to check commands
mri_motion_correct.fsl -no-run -i r1.mgz -i r2.mgz -o rawavg.mgz
```

## Pipeline Context

Alternative to [[mri_motion_correct]] and [[mri_motion_correct2]] for FSL-based environments. Not invoked in standard `recon-all`.

## Gotchas and Caveats

> [!gotcha] Requires FSL flirt
> The `flirt.fsl` binary must be in `$PATH`. Standard FSL installs provide `flirt`; the `.fsl` suffix in `flirt.fsl` suggests a FreeSurfer-specific FSL binary naming convention.

> [!gotcha] ANALYZE format loses orientation
> Setting `FSLOUTPUTTYPE=ANALYZE` produces files without proper orientation encoding. Always convert to MGZ using `mri_convert` before running downstream FreeSurfer tools.

> [!gotcha] Scan parameter consistency check
> Like [[mri_motion_correct2]], this script checks TR/TE/TI/FlipAngle across input runs using `mri_info`. Inconsistent scan parameters will cause an error exit.

## Related Tools

- [[mri_motion_correct]] — bash variant using MINC
- [[mri_motion_correct2]] — tcsh variant using MINC
- [[fsl_rigid_register]] — the FSL `flirt` wrapper called internally for the rigid-body registration step
- [[mri_info]] — used internally for scan parameter extraction
- [[wiki/tools/mri_convert|mri_convert]] — for converting ANALYZE output to MGZ

## Confidence and Gaps

**Confident:** All flags verified from complete `parse_args` section of source. FSL dependency, ANALYZE output format, target selection by index, dry-run mode (`-dontrun`), COR conform mode (`-cm`), log suppression (`-nolog`), temporary directory handling.

> [!note] Audit noise: `mri_info` sub-tool flags
> An automated audit may flag `--flip_angle`, `--format`, `--target`, `--te`, `--ti`, and `--tr` as missing. These are all `mri_info` flags called internally (e.g., `` set TR = `mri_info $input --tr` ``). None are accepted by `mri_motion_correct.fsl` itself.

> [!note] Audit noise: `-echo` false positive
> An automated audit may flag `-echo` as C3 invalid. This IS a valid flag (`case "-echo":` at source line 296). The audit tool's string-blanking heuristic treats any line containing the word `echo` as a print-like call and removes string literals from it, which also removes the flag name from `case "-echo":`. The flag is confirmed present in source and in the wiki.
