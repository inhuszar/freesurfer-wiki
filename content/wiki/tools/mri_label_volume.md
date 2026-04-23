---
title: "mri_label_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label_volume/mri_label_volume.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mri_label_histo]]"
  - "[[mri_label_vals]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps: []
tags:
  - label
  - volume
  - morphometry
---

# mri_label_volume

## Summary

`mri_label_volume` computes the volume (in mm³) of one or more labelled regions in a segmentation volume. It supports computing volumes for individual labels, all labels simultaneously (`-all`), and can compute volumes as a percentage of total brain volume. Partial volume correction is also supported.

## Source Information

- **Language:** C++
- **Source file:** `mri_label_volume/mri_label_volume.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Computing the volume of brain structures is a fundamental morphometric measurement. `mri_label_volume` provides a simple interface to compute volumes from segmentation volumes such as `aseg.mgz`, either for individual labels or for all labels at once.

## Inputs

| Argument | Description |
|----------|-------------|
| `<seg>` | Segmentation volume (e.g., `aseg.mgz`) |
| `<label>` | Integer label value (or use `-all`) |

## Outputs

- Volume in mm³ printed to stdout (or log file).
- Optionally: a spreadsheet-compatible output (`-s <subject>`).
- Optionally: volume as percentage of total brain or ICV.

## Mathematical Foundations

Volume is computed as:

$$
V = N_\ell \cdot v_x \cdot v_y \cdot v_z
$$

where $N_\ell$ is the number of voxels with label $\ell$, and $v_x, v_y, v_z$ are the voxel dimensions in mm.

For partial volume estimation (`-pv <vals_vol>`), the volume is computed as:

$$
V_\text{PV} = \sum_{i : L_i = \ell} p_i \cdot v_x v_y v_z
$$

where $p_i \in [0, 1]$ is the partial volume fraction from the supplementary volume.

When `-b <vol>` is provided, the percentage is:

$$
\%V = 100 \cdot \frac{V_\ell}{V_\text{brain}}
$$

When `-icv <vol>` is provided or `-atlas_icv <xfm> <scale>` is specified, ICV-normalised volumes are computed.

## Configuration Options

Flags are parsed with single-dash stripping: the parser strips one leading `-` from `argv[N]` before comparison, so `-icv` and `--icv` are both accepted, but the canonical user-facing form is single-dash.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-icv` | `<fname>` | — | Read intracranial volume from `<fname>` and normalize by it. |
| `-pv` | `<fname>` | — | Compute partial volume effects using the intensity volume `<fname>`. |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable per-voxel debug output at voxel coordinates (x, y, z). |
| `-atlas_icv` | `<xfm> <scale>` | — | Estimate eTIV from atlas transform file and scale factor (Buckner et al. 2004). |
| `-etiv` | `<xfm> <scale>` | — | Same as `-atlas_icv`. |
| `-etiv_matdat` | `<xfm> <scale> <subj>` | — | Same as `-etiv`, and append MATLAB-readable data to `det_eTIV_matdat.m`. |
| `-c` | `<string>` | — | Append column string `<string>` to spreadsheet output; repeatable. |
| `-q` | — | off | Quiet mode: suppress per-label progress messages. |
| `-s` | `<subject>` | — | Spreadsheet output mode; includes `<subject>` name in the log file. |
| `-a` | — | off | Compute volume of all non-zero voxels (e.g., total brain volume). |
| `-t` | `<in> <out>` | — | Replace label `<in>` with label `<out>` before computing volume. Useful for combining sub-labels. |
| `-b` | `<brain_vol>` | — | Read brain volume from `<brain_vol>` and normalize label volumes by it. |
| `-l` | `<fname>` | — | Log results to `<fname>` (format string; `%d` is replaced by label number). |
| `-p` | — | off | Report volume as percentage of all non-zero labels. |
| `-brain` | — | — | Keyword used in place of a numeric label argument to compute the total volume across all brain labels (`IS_BRAIN()` mask). Not a flag; used as a positional label specifier. |

## Configuration Interactions

- `-a` and providing a specific label are mutually exclusive. With `-a`, the output reports the total volume of all non-zero voxels.
- `-b`, `-icv`, `-atlas_icv`/`-etiv`, and `-p` each enable proportional reporting; they are alternative normalisation strategies.
- `-t <in> <out>` replaces label values in the volume before counting, which is useful for merging sub-labels (e.g., combining hippocampal head and body into a single whole-hippocampus volume).

## Typical Use Cases

```bash
# Volume of hippocampus (label 17)
mri_label_volume aseg.mgz 17

# All non-zero voxels (total brain volume)
mri_label_volume aseg.mgz -a -l aseg_volumes.log

# As percentage of brain volume
mri_label_volume aseg.mgz 17 -b brain.mgz

# Spreadsheet output, log to file
mri_label_volume aseg.mgz 17 -s sub001 -l volumes_ss.log
```

## Pipeline Context

Not a direct `recon-all` stage, but closely related. The same computations are performed in `mris_anatomical_stats` as part of the morphometric statistics output. `mri_label_volume` provides a standalone interface for segmentation volumes.

## Gotchas and Caveats

- The tool reports in mm³; voxel size is read from the volume header, so the input must have correct spatial metadata.
- When using `-pv`, the partial volume fractions volume must be in the same voxel space as the segmentation.
- The `-t <in> <out>` label translation remaps voxel values in memory before counting, so the original file is unchanged.

## Related Tools

- [[mris_anatomical_stats]] — comprehensive morphometric statistics including volumes
- [[mri_label_histo]] — intensity histogram within labels
- [[mri_label_vals]] — intensity values at label locations
- [[mri_binarize]] — thresholding and binarisation

## Confidence and Gaps

**High confidence:** algorithm is straightforward; code and variable names are unambiguous.
