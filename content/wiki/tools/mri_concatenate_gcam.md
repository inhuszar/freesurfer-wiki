---
title: "mri_concatenate_gcam"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_concatenate_gcam/mri_concatenate_gcam.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_concatenate_lta]]"
  - "[[mri_cvs_register]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - transforms
  - gcam
  - morph
  - registration
---

# mri_concatenate_gcam

## Summary

`mri_concatenate_gcam` concatenates two or more transform files (`.m3z`/`.gcam` nonlinear morphs or linear `.lta` transforms) into a single composite transform. It processes inputs in right-to-left order (last input applied first) to produce a combined transform mapping the source space of the first transform to the destination space of the last. It also supports inverting and downsampling the output morph.

## Source Information

- **Language:** C++
- **Source file:** `mri_concatenate_gcam/mri_concatenate_gcam.cpp`
- **Help:** XML-embedded help in `mri_concatenate_gcam.help.xml.h`

## Purpose and Context

When constructing multi-step registration pipelines (e.g., subject → MNI space via an intermediate atlas), the individual transforms must be composed into a single warp for efficient application. This tool handles both linear (LTA) and nonlinear (GCAM/m3z) transforms and any mix thereof, using FreeSurfer's generic `TRANSFORM` interface (`TransformConcat()`).

It is particularly useful in the CVS (Combined Volumetric and Surface) registration pipeline ([[mri_cvs_register]]) where multiple warp fields are chained.

## Inputs

- **Two or more transform files** as positional arguments (in left-to-right order on the command line)
- The **last positional argument** is the **output** file
- All preceding positional arguments are **input transforms** (applied right-to-left, i.e., input N applied first, input 1 applied last)
- Optional: `--change-source` / `-s` and `--change-target` / `-t` to provide reference volumes whose geometry is used to update the morph's volume geometry headers

## Outputs

A single composite transform file (format determined by output filename extension: `.m3z`, `.m3d`, `.lta`, etc.)

## Mathematical Foundations

Transform composition:
$$
T_\text{out} = T_1 \circ T_2 \circ \cdots \circ T_N
$$

where $T_1$ is the first positional argument and $T_N$ is the last input (second-to-last positional argument). The output maps from the source space of $T_1$ to the destination space of $T_N$.

Internally uses `TransformConcat(trxArray, 2)` iteratively from right to left. For GCAMs (3D morphs), if `--change-source` or `--change-target` are provided, `GCAMchangeVolGeom()` is called to update the embedded volume geometry before concatenation.

The concatenation order is:
```
result = ... ∘ T[2] ∘ T[1]  (last positional input = T[1] = applied first)
```

> [!gap] Exact concatenation order
> The source pops from the back of the file list first (`fileList.back()`), meaning the last input on the command line is read first and treated as the "innermost" (first applied) transform. This is the reverse of the positional order. Callers must be careful about ordering.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reduce`<br>`-r` | — | off | Reduce LTA to a single transform (call `LTAreduce`) |
| `--invert`<br>`-i` | — | off | Invert the output transform |
| `--downsample`<br>`-d` | — | off | Downsample output GCAM if spacing==1 (calls `GCAMdownsample2`) |
| `--change-source`<br>`-s` | volume | none | Update source volume geometry from this file's header |
| `--change-target`<br>`-t` | volume | none | Update target volume geometry from this file's header |

## Configuration Interactions

- `--invert` is applied after `--change-source`/`--change-target` and after concatenation, so it inverts the final composed transform.
- `--reduce` applies only if the output is an LTA (not GCAM).
- `--downsample` applies only if the output is a GCAM with spacing == 1; if spacing > 1, a message is printed but no downsampling is done.
- `--change-source` and `--change-target` only affect GCAM outputs (type `MORPH_3D_TYPE`); they are ignored for LTA outputs.

## Typical Use Cases

Concatenate two morphs (applying `warp2.m3z` first, then `warp1.m3z`):
```bash
mri_concatenate_gcam warp1.m3z warp2.m3z combined.m3z
```

Concatenate and invert:
```bash
mri_concatenate_gcam --invert warp1.m3z warp2.m3z combined_inv.m3z
```

Update geometry and concatenate:
```bash
mri_concatenate_gcam -s source.mgz -t target.mgz warp1.m3z warp2.m3z combined.m3z
```

## Pipeline Context

Used in advanced registration pipelines:
- [[mri_cvs_register]]: combines elastic, volumetric, and surface-based morphs
- Multi-subject normalization pipelines composing subject-to-atlas morphs

## Gotchas and Caveats

> [!gotcha] Argument order is reversed
> The concatenation reads inputs from the back of the argument list. The last input on the command line is applied first. This is counterintuitive — check documentation carefully when chaining asymmetric transforms.

> [!gotcha] Geometry check threshold
> The code sets `vg_isEqual_Threshold = 10e-4` at startup. Volume geometry mismatches below this threshold are silently ignored. For very different volume geometries, concatenation may fail with a geometry mismatch error regardless.

## Related Tools

- [[mri_concatenate_lta]] — same concept but only for linear (LTA) transforms
- [[mri_cvs_register]] — uses GCAM concatenation internally

## Confidence and Gaps

Confidence is **high**. Source is concise and logic is clear.
