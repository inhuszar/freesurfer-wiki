---
title: "mri_align_long.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mri_align_long.csh"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_add_new_tp]]"
  - "[[mri_convert]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - longitudinal
  - alignment
  - base-template
---

# mri_align_long.csh

## Summary

`mri_align_long.csh` aligns all longitudinally processed time-point volumes (specifically `norm.mgz` and `aseg.mgz`) from a completed `recon-all -long` run to the base template space. It produces `norm-base.mgz` and `aseg-base.mgz` in each time-point's longitudinal subject directory, enabling direct comparison and visualisation of all time points in a common reference space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_align_long.csh`
- **Original author:** Martin Reuter

## Purpose and Context

After `recon-all -long` completes for each time point, the output volumes reside in each time point's own space. To compare longitudinal changes or visualise all time points simultaneously in a single viewer, it is necessary to bring all outputs into a common space — the base template. `mri_align_long.csh` applies the per-time-point transforms stored in the base's `mri/transforms/` directory to resample each time point's `norm.mgz` and `aseg.mgz` into the base space.

## Inputs

| Argument | Description |
|----------|-------------|
| `<base-id>` | Subject ID of the longitudinal base template |

The script reads:
- `$SUBJECTS_DIR/<base-id>/base-tps` — list of time-point subject IDs
- `$SUBJECTS_DIR/<base-id>/mri/transforms/<tp>_to_<base-id>.lta` — per-TP transforms
- `$SUBJECTS_DIR/<tp>.long.<base-id>/mri/norm.mgz` — time-point normalised volume
- `$SUBJECTS_DIR/<tp>.long.<base-id>/mri/aseg.mgz` — time-point segmentation

## Outputs

For each time point `<tp>`, written to `$SUBJECTS_DIR/<tp>.long.<base-id>/mri/`:

| File | Description |
|------|-------------|
| `norm-base.mgz` | Time-point `norm.mgz` resampled to base template space |
| `aseg-base.mgz` | Time-point `aseg.mgz` resampled to base template space (nearest-neighbour) |

## Mathematical Foundations

Each time-point volume is resampled into the base space by applying the affine LTA transform:

$$\mathbf{x}_\text{base} = T_{\text{tp}\to\text{base}} \cdot \mathbf{x}_\text{tp}$$

For `norm.mgz`, trilinear (or default) interpolation is used. For `aseg.mgz`, nearest-neighbour interpolation (`-rt nearest`) is used to preserve integer label values.

This is implemented via:
```
mri_convert -at <lta> -rl <base_norm> <src> <dst>
```

The `-rl` flag (resample like) ensures the output has the same geometry as the base `norm.mgz`.

## Configuration Options

| Argument | Description |
|----------|-------------|
| `<base-id>` | (positional) Longitudinal base subject ID |

No optional flags. `$SUBJECTS_DIR` must be set.

## Configuration Interactions

No configurable interactions. The script has no optional flags — it processes all time points listed in `base-tps`.

## Typical Use Cases

```bash
# After running recon-all -long for all time points
export SUBJECTS_DIR=/data/subjects
mri_align_long.csh sub01_base

# View aligned outputs for 2-TP study
tkmedit -f $SUBJECTS_DIR/tp1.long.sub01_base/mri/norm-base.mgz \
        -aux $SUBJECTS_DIR/tp2.long.sub01_base/mri/norm-base.mgz \
        -segmentation $SUBJECTS_DIR/tp1.long.sub01_base/mri/aseg-base.mgz \
        -aux-segmentation $SUBJECTS_DIR/tp2.long.sub01_base/mri/aseg-base.mgz
```

## Pipeline Context

This script is run after the full longitudinal pipeline has completed:

1. Cross-sectional `recon-all -s <tp>` for each time point
2. `recon-all -base <baseid> -tp <tp1> ... -all`
3. `recon-all -long <tp> <baseid> -all` for each time point
4. **`mri_align_long.csh <baseid>`** — align all outputs to base space for comparison

The script is not automatically invoked by `recon-all`; it must be run manually.

## Gotchas and Caveats

- The script requires all longitudinal subjects (`<tp>.long.<base-id>`) to exist and contain `mri/norm.mgz` and `mri/aseg.mgz`. Missing files cause an error and abort the loop.
- `$SUBJECTS_DIR` must be set and point to the directory containing both the base and the longitudinal subjects.
- The transforms directory in the base must contain `<tp>_to_<baseid>.lta` files. If the base was created with `recon-all -base`, these are generated automatically.
- The script prints a helpful `tkmedit` visualisation command when exactly 2 time points are present.

## Related Tools

- [[mri_add_new_tp]] — adds a new time point to an existing base
- [[mri_convert]] — underlying tool used for resampling
- [[recon-all]] — main pipeline

## Confidence and Gaps

**High confidence:** full script was read; behaviour is straightforward.
