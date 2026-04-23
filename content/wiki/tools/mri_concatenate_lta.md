---
title: "mri_concatenate_lta"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_concatenate_lta/mri_concatenate_lta.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_concatenate_gcam]]"
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - transforms
  - lta
  - registration
  - linear
---

# mri_concatenate_lta

## Summary

`mri_concatenate_lta` concatenates two linear transform files (`.lta`) into a single combined LTA that maps the source of `lta_1` to the destination of `lta_2`. The combination is computed as $M_\text{out} = M_2 \cdot M_1$ in RAS space. Supports inverting individual inputs and the output, handling MNI `.xfm` format for `lta_2`, and computing RMS difference between two transforms.

## Source Information

- **Language:** C++
- **Source file:** `mri_concatenate_lta/mri_concatenate_lta.cpp`
- **Original author:** Xiao Han

## Purpose and Context

Linear registration often involves multi-step pipelines: e.g., subject → template requires combining a subject-to-atlas LTA with an atlas-to-MNI LTA. `mri_concatenate_lta` chains two LTAs into one, avoiding the need to apply transformations sequentially. The second transform can be a Talairach `.xfm` file (MNI format).

In FreeSurfer workflows this is used when:
- Composing a within-subject functional-to-structural LTA with a structural-to-atlas LTA.
- Inverting or combining transforms for resampling in one step.

## Inputs

- **`lta_1`**: first LTA file (maps src1 → dst1)
- **`lta_2`**: second LTA file (maps dst1/src2 → dst2); can be `identity.nofile` to write `lta_1` directly
- **`lta_final`**: output LTA file path

Optional:
- `-tal src_file dst_file`: if `lta_2` is an `.xfm` Talairach file with missing volume geometry, provide the source and destination volumes to fill in geometry info.
- `-subject subjectname`: override subject name in output LTA.

## Outputs

A single [[lta-format]] file `lta_final` containing the composed transform $M_2 \cdot M_1$ as a `LINEAR_RAS_TO_RAS` transform with:
- Source geometry from `lta_1`
- Destination geometry from `lta_2`
- Subject name copied from `lta_1` (or `lta_2` if `lta_1` has none)

If the output filename ends in `.xfm`, the combined transform is written in MNI format.

## Mathematical Foundations

The composition converts both inputs to RAS-to-RAS form, then multiplies:

$$
M_\text{out}^\text{RAS} = M_2^\text{RAS} \cdot M_1^\text{RAS}
$$

For vox-to-vox LTAs, conversion to RAS-to-RAS uses:
$$
M^\text{RAS} = I_\text{dst} \cdot M^\text{vox} \cdot V_\text{src}^{-1}
$$

where $V_\text{src}$ is the vox-to-RAS matrix of the source volume and $I_\text{dst}$ is the same for the destination.

The output is always stored as `LINEAR_RAS_TO_RAS`. If a different type is requested via `-out_type`, it is converted back using `LTAchangeType()`.

**RMS difference mode** (`-rmsdiff`):
$$
\text{RMS} = \sqrt{\frac{1}{N} \sum_{v} \|M_1 v - M_2 v\|^2}
$$
where $v$ ranges over points on a sphere of radius `RMSDiffRad` mm. This uses `RMSregDiffMJ()`.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-invert1` | — | off | Invert `lta_1` before composition |
| `-invert2` | — | off | Invert `lta_2` before composition |
| `-invertout` | — | off | Invert the composed output LTA |
| `-out_type N` | int | 0 (VOXEL_VOXEL) | Output LTA type (0=vox-to-vox, 1=RAS-to-RAS) |
| `-tal src dst` | two files | none | Specify src/dst volumes for MNI `.xfm` geometry |
| `-subject name` | string | from lta_1 | Override subject name in output |
| `-rmsdiff radius file` | float, path | off | Compute and save RMS transform difference instead of concatenating |

## Configuration Interactions

- `-invert1` and `-invert2` apply before composition; `-invertout` applies to the result.
- If `lta_2` is `identity.nofile`, the tool writes `lta_1` (possibly inverted or type-converted) directly to `lta_final` and exits without reading `lta_2`.
- `-rmsdiff` is mutually exclusive with the concatenation workflow: it reads `lta_1` and `lta_2` but writes an RMS scalar to a file rather than a combined LTA.
- `-tal` is only meaningful when `lta_2` is an MNI `.xfm` file with no embedded volume geometry.

> [!gotcha] Volume geometry mismatch warning
> If the dst geometry of `lta_1` does not match the src geometry of `lta_2`, the tool prints a warning but continues. The resulting LTA may be geometrically inconsistent.

## Typical Use Cases

Compose two LTAs into one:
```bash
mri_concatenate_lta func2struct.lta struct2mni.lta func2mni.lta
```

Invert the second LTA before composing:
```bash
mri_concatenate_lta -invert2 lta1.lta lta2.lta combined.lta
```

Write `lta_1` without combining (type conversion only):
```bash
mri_concatenate_lta lta1.lta identity.nofile output.lta
```

Compute RMS difference between two transforms:
```bash
mri_concatenate_lta -rmsdiff 100 rms.txt lta1.lta lta2.lta
```

Handle Talairach `.xfm` as second transform:
```bash
mri_concatenate_lta struct2func.lta talairach.xfm \
  -tal orig.mgz mni305.mgz \
  func2tal.lta
```

## Pipeline Context

Not called by [[recon-all]] directly but used internally by wrapper scripts. Common use cases:
- Combining registration steps in functional MRI preprocessing
- Inverting or type-converting transforms before passing to [[mri_convert]] or `mri_vol2vol`

## Gotchas and Caveats

> [!gotcha] Output defaults to VOXEL_VOXEL (type 0)
> Even though the composition is computed in RAS space, the output is converted back to vox-to-vox by default. Pass `-out_type 1` if a RAS-to-RAS LTA is required.

> [!gotcha] Inversion warning for unknown geometry
> When `-invert1` or `-invert2` is used and the LTA has invalid src/dst volume geometry (`valid == 0`), the tool prints a warning that the inverse is likely wrong. Check LTA geometry before inverting.

## Related Tools

- [[mri_concatenate_gcam]] — same concept for nonlinear (GCAM/m3z) transforms
- [[lta-format]] — description of the LTA file format

## Confidence and Gaps

Confidence is **high**. Source is fully readable and logic is straightforward.
