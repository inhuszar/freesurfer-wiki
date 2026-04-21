---
title: "mri_ca_tissue_parms"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ca_tissue_parms/mri_ca_tissue_parms.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: null
related:
  - "[[mri_ca_train]]"
  - "[[mri_ca_normalize]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - atlas
  - tissue-parameters
  - FLASH
  - T1
  - GCA
---

# mri_ca_tissue_parms

## Summary

`mri_ca_tissue_parms` computes average biophysical tissue parameters (T1 relaxation time, proton density PD) for each label in a GCA atlas by accumulating statistics from co-registered FLASH (Fast Low Angle SHot) T1 and PD maps across a training cohort of subjects. The resulting parameters are stored in the GCA's `tissue_parms` structure, enabling physics-based signal modeling.

## Source Information

- **Language:** C++
- **Source file:** `mri_ca_tissue_parms/mri_ca_tissue_parms.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

The GCA atlas typically stores intensity statistics calibrated to a specific acquisition protocol. For quantitative MRI applications using FLASH sequences, tissue T1 and PD can be estimated from multi-echo/multi-flip-angle data. `mri_ca_tissue_parms` populates the atlas's tissue parameter table by, for each subject, reading T1 and PD maps alongside a parcellation and computing label-mean biophysical values.

These tissue parameters allow the atlas to synthesize expected MRI signals at arbitrary TR/TE/flip-angle combinations, enabling protocol-independent atlas registration.

## Inputs

Positional arguments:
1. `<atlas.gca>` — the GCA to update with tissue parameters
2. `<subject1> <subject2> ...` — list of subject names

Per subject (read from `$SUBJECTS_DIR/<subject>/mri/`):
- `parc/` — parcellation volume (configurable via internal `parc_dir`)
- `flash/T1.mgh` — T1 relaxation map (configurable)
- `flash/PD.mgh` — proton density map (configurable)
- Optional: a transform file named `<xform_name>` in `mri/`

`SUBJECTS_DIR` must be set in the environment.

## Outputs

- Updates the GCA's `tissue_parms` table (T1_mean, PD_mean per label) in memory.
- If `-w` (write flag) is set, writes the updated GCA back to `<atlas.gca>`.
- If `-log <file>` is set, writes a text table of label → T1_mean, PD_mean.

## Mathematical Foundations

For each subject and each label $k$, the tool accumulates:

$$
\bar{T1}_k = \frac{1}{N_k} \sum_{v \in k} T1(v)
$$
$$
\bar{PD}_k = \frac{1}{N_k} \sum_{v \in k} PD(v)
$$

via `GCAhistogramTissueStatistics()`. After processing all subjects, `GCAnormalizeTissueStatistics()` normalizes the accumulated sums by the training count.

For FLASH sequences, the signal model at each voxel enables computing expected intensities:
$$
S(v) = M_0 \cdot \sin\alpha \cdot \frac{1 - e^{-TR/T1}}{1 - \cos\alpha \cdot e^{-TR/T1}} \cdot e^{-TE/T2^*}
$$

where $M_0 \propto PD$.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-sd <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory |
| `-w` | flag | off | Write updated GCA back to `<atlas.gca>` |
| `-log <file>` | string | — | Write T1/PD per label to ASCII file |
| `-histo <file>` | string | — | Pass histogram parameter file to `GCAhistogramTissueStatistics` |
| `-T1 <name>` | string | `flash/T1.mgh` | Override T1 map filename within subject's mri/ |
| `-PD <name>` | string | `flash/PD.mgh` | Override PD map filename |
| `-parc <name>` | string | `parc` | Override parcellation directory/file name |
| `-xform <name>` | string | — | Transform file to align FLASH maps to parcellation space |

## Typical Use Cases

**Populate GCA tissue parameters from FLASH data:**
```bash
mri_ca_tissue_parms -w -log tissue_params.txt \
  $FREESURFER_HOME/average/RB_all.gca \
  subject1 subject2 subject3
```

## Pipeline Context

Not a standard [[recon-all]] stage for typical T1-weighted pipelines. Used when building a FLASH-compatible GCA atlas, as part of multi-parametric MRI atlas construction workflows at MGH.

## Gotchas and Caveats

> [!gotcha] Requires FLASH data
> The tool requires separate T1 and PD map volumes derived from multi-flip-angle FLASH acquisitions. It cannot be used with standard T1-weighted MPRAGE data.

> [!gotcha] No write by default
> Without `-w`, the GCA is not written to disk even after computing tissue parameters. The `-log` option only writes the ASCII table; the GCA itself is updated only in memory unless `-w` is specified.

## Related Tools

- [[mri_ca_train]] — builds the GCA atlas; `mri_ca_tissue_parms` augments it with biophysical parameters
- [[mri_ca_normalize]] — uses tissue parameters for protocol-independent normalization

## Confidence and Gaps

Source code fully read. Confidence is high for interface. The internal GCA tissue parameter format (`GCA_TISSUE_PARMS`) is defined in `gca.h`.
