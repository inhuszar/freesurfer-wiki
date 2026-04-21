---
title: "mri_add_new_tp"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mri_add_new_tp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[recon-all]]"
  - "[[mri_align_long.csh]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - longitudinal
  - base-template
---

# mri_add_new_tp

## Summary

`mri_add_new_tp` adds a new cross-sectionally processed time point to an existing longitudinal base (template) subject, without requiring the base to be reconstructed from scratch. This allows a newly acquired scan to be incorporated into an ongoing longitudinal study and then processed using `recon-all -long`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_add_new_tp`
- **Original author:** Martin Reuter

## Purpose and Context

In FreeSurfer's longitudinal pipeline, a base (template) subject is first created from all available time points (`recon-all -base`), then each time point is processed longitudinally relative to this base (`recon-all -long`). When a new time point becomes available after the base has already been built, re-running the full base reconstruction is computationally expensive. `mri_add_new_tp` provides a workaround: it registers the new time point to the existing base and adds its transform to the base's time-point list, so that `recon-all -long <newtpid> -long <baseid>` can be run without rebuilding the base.

> [!gotcha] Statistical bias
> The FreeSurfer development team explicitly notes (in the script header) that this approach introduces a bias toward the earlier time points that contributed to the original base. The magnitude of this bias is not well-characterised. The approach is only recommended when: (a) enough time points already exist in the base (3–4+), (b) the new time point is not very different from the existing ones, and (c) this technique is used sparingly.

## Inputs

| Argument | Description |
|----------|-------------|
| `<base-id>` | Subject ID of the existing longitudinal base |
| `<newtp-id>` | Subject ID of the new time point (must be fully processed with `recon-all` cross-sectionally) |

Both subject directories must exist under `$SUBJECTS_DIR`.

The new time point's `mri/norm.mgz` must exist, as it is used for registration.

## Outputs

Modifies the existing base directory:

- Updates `$SUBJECTS_DIR/<base-id>/base-tps` to include the new time point ID.
- Writes a registration transform: `$SUBJECTS_DIR/<base-id>/mri/transforms/<newtpid>_to_<baseid>.lta` (or the affine variant if the base was created with affine registration).

## Mathematical Foundations

The new time point is registered to the base volume (`norm.mgz`) using `mri_robust_register`, producing an LTA transform. This transform is then stored alongside the existing per-time-point transforms so that the longitudinal processing stream can use it.

The registration uses the same robust registration approach as the original base creation:

$$T^* = \arg\min_{T} \rho\left(\sum_i w_i \|I_1(\mathbf{x}_i) - I_2(T\mathbf{x}_i)\|^2\right)$$

where $\rho$ is a robust cost function and $w_i$ are per-voxel weights.

> [!internal] Registration parameters (from full source)
> The script calls `mri_robust_register --mov <newtpvol> --dst <basevol> --sat 4.685` (with `--lta <output.lta>` for the non-affine case). The saturation parameter `4.685` is the standard Tukey bisquare robust estimator value used throughout the FreeSurfer longitudinal pipeline. For affine bases, a two-stage registration is performed: first a rigid registration on `norm.mgz` (`--lta lta1form`), then an affine registration on `T1.mgz` (`--affine --ixform lta1form`), and finally a fine-tuning rigid registration initialized from the affine result (`--lta newtplta --ixform ltaAform`).

## Configuration Options

| Argument | Description |
|----------|-------------|
| `<base-id>` | (positional) Existing longitudinal base subject ID |
| `<newtp-id>` | (positional) New cross-sectionally processed time-point subject ID |

No optional flags. Both `$FREESURFER_HOME` and `$SUBJECTS_DIR` must be set.

## Configuration Interactions

- The script auto-detects whether the base was created with an affine or non-affine registration by checking for the existence of `<baseid>/mri/transforms/<firsttp>_to_<baseid>_affine.lta`.
- If the new TP is already in the base's time-point list, the script exits with an error.

## Typical Use Cases

```bash
# Add new time point TP4 to existing base
export SUBJECTS_DIR=/data/subjects
mri_add_new_tp sub01_base sub01_tp4

# Then run longitudinal processing for the new time point
recon-all -long sub01_tp4 sub01_base -all
```

## Pipeline Context

This script is used within the FreeSurfer longitudinal processing workflow:

1. `recon-all -s <tp1>`, `recon-all -s <tp2>`, ... (cross-sectional processing)
2. `recon-all -base <baseid> -tp <tp1> -tp <tp2> -all` (create base template)
3. `recon-all -long <tp1> <baseid> -all`, etc. (longitudinal processing)
4. **(If new TP arrives later):** `mri_add_new_tp <baseid> <newtp>` then `recon-all -long <newtp> <baseid> -all`

See also: [[mri_align_long.csh]] for aligning all time-point outputs to the base space after longitudinal processing.

## Gotchas and Caveats

- The new time point must be fully cross-sectionally processed before this script is run — `mri/norm.mgz` must exist.
- The bias introduced by this approach is toward the earlier time points in the base; this may affect longitudinal change estimates.
- The script does not reprocess the base template; downstream tools will see a slightly inconsistent template relative to what would have been created had the new TP been included from the start.
- `$SUBJECTS_DIR` must be set and must point to the directory containing both `<base-id>` and `<newtp-id>`.

## Related Tools

- [[recon-all]] — main pipeline; runs `recon-all -long` after this script
- [[mri_align_long.csh]] — aligns longitudinal outputs to base space

## Confidence and Gaps

**High confidence:** Usage, workflow, and full script body read. Registration parameters (`--sat 4.685`), affine base detection logic, two-stage registration for affine bases, template update via `mri_robust_template --noit`, inverse LTA creation via `mri_concatenate_lta -invert1`, and SSD-based change assessment via `mri_diff --pix-only --ssd` are all confirmed from source.
