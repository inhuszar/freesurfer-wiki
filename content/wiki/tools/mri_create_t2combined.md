---
title: "mri_create_t2combined"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "scripts/mri_create_t2combined"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_coreg]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Exact blending/stitching algorithm for combining partial-brain T2* slabs: mri_concat --combine is used; voxel-wise maximum selection behaviour was not independently verified"
tags:
  - 7T
  - T2
  - stitching
  - registration
---

# mri_create_t2combined

## Summary

`mri_create_t2combined` combines two or three T2*-weighted 7T partial-brain volumes (upper, optional middle, lower) into a single whole-brain T2* volume registered to a FreeSurfer T1 anatomical. The resulting combined volume is in the same space as the anatomical reconstruction, enabling surface overlay of 7T T2* data.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_create_t2combined`

## Purpose and Context

Ultra-high field (7T) MRI scanners often have limited field-of-view for T2*-weighted acquisitions, requiring multiple partial-brain "slabs" to cover the whole brain. This tool automates the pipeline to:
1. Register the 7T T1 whole-brain to the 3T FreeSurfer anatomical (via `fslregister`)
2. Register each T2* slab to the 7T T1 using that registration as initialization
3. Stitch/combine the registered slabs into one whole-brain T2* volume

The output volume can be used as a T2* surface overlay in FreeSurfer visualization tools.

## Inputs

Positional arguments (6 required):
1. **`subjid`**: FreeSurfer subject ID (must have a complete `recon-all` reconstruction)
2. **`t1wb`**: 7T whole-brain T1-weighted volume (for registration anchor)
3. **`t2upper`**: T2* upper partial-brain slab
4. **`t2middle`**: T2* middle partial-brain slab (or `none` if only two slabs)
5. **`t2lower`**: T2* lower partial-brain slab
6. **`t2combined`**: output combined T2* volume path

Optional:
- **`show`** (last argument): if the string `show` is the last argument, print commands without executing them

## Outputs

- **`t2combined`**: registered and stitched T2* whole-brain volume
- **`mri_create_t2combined.log`**: log file in current working directory

## Mathematical Foundations

The registration chain uses:
1. `fslregister`: rigid-body registration of 7T T1 whole-brain to 3T T1 anatomical
2. Subsequent registrations propagate from the 7T T1 anchor to each T2* slab

The stitching of partial-brain volumes uses `mri_concat --combine`, which takes the voxel-wise maximum across the registered slab frames.

> [!gap] Stitching algorithm
> The script uses `mri_concat --combine` to merge the registered slabs. The `--combine` flag in `mri_concat` takes the maximum across frames at each voxel. The exact boundary/overlap behaviour of `mri_concat --combine` was not independently verified from its source.

## Configuration Options

This script accepts only positional arguments; it has no `--` style option flags of its own. All `--` flags visible in the script body are passed to sub-tools (`tkregister2`, `mri_segreg`, `mri_vol2vol`, `mri_concat`) and are not options of `mri_create_t2combined` itself.

| Argument | Description |
|----------|-------------|
| `subjid` | FreeSurfer subject ID |
| `t1wb` | 7T whole-brain T1 volume |
| `t2upper` | T2* upper slab |
| `t2middle` | T2* middle slab (`none` if not used) |
| `t2lower` | T2* lower slab |
| `t2combined` | Output combined T2* volume |
| `show` | Show commands without running (dry-run mode) |

## Configuration Interactions

- When `t2middle = none`, the middle slab is skipped.
- Requires `tkregister2` to be available (called during the script).
- `fslregister` requires FSL to be installed and configured.

> [!gotcha] Interactive tkregister2 step
> The script launches `tkregister2` interactively. The user must visually inspect the registration and click "Save Reg" before the script can continue. This prevents fully automated batch processing.

## Typical Use Cases

Combine T2* slabs with an intermediate slab:
```bash
mri_create_t2combined bert \
  t1-7t.nii.gz \
  t2upper.nii.gz \
  t2middle.nii.gz \
  t2lower.nii.gz \
  bert_t2combined.nii.gz
```

Combine without a middle slab:
```bash
mri_create_t2combined bert \
  t1-7t.nii.gz \
  t2upper.nii.gz \
  none \
  t2lower.nii.gz \
  bert_t2combined.nii.gz
```

Dry-run (show commands):
```bash
mri_create_t2combined bert t1-7t.nii.gz t2u.nii.gz none t2l.nii.gz out.nii.gz show
```

## Pipeline Context

Not part of [[wiki/pipelines/recon-all|recon-all]]. Used in 7T imaging workflows:
1. Complete standard `recon-all` on the 3T T1.
2. Acquire 7T T1 whole-brain and T2* partial-brain slabs.
3. Run `mri_create_t2combined` to produce a registered whole-brain T2* volume.
4. Use the output for laminar fMRI or cortical layer analysis.

## Gotchas and Caveats

> [!gotcha] Requires FSL
> `fslregister` (an FSL tool wrapped by FreeSurfer) must be available. The script will fail silently or with an obscure error if FSL is not installed.

> [!gotcha] Requires interactive intervention
> The tkregister2 step requires manual user input. This cannot be scripted without modifications.

## Related Tools

- [[mri_coreg]] — alternative registration tool for functional-to-anatomical registration

## Confidence and Gaps

Confidence is **medium**. The script's purpose and interface are clear from the usage text. The internal stitching logic was not fully confirmed.
