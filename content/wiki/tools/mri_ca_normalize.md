---
title: "mri_ca_normalize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ca_normalize/mri_ca_normalize.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_normalize]]"
  - "[[mri_ca_register]]"
  - "[[mri_em_register]]"
  - "[[mri_ca_label]]"
  - "[[recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - normalization
  - GCA
  - atlas
  - intensity-normalization
---

# mri_ca_normalize

## Summary

`mri_ca_normalize` normalizes one or more MRI volumes by using a [[gca-format|Gaussian Classifier Atlas]] (GCA) to identify reliable white matter control points and fitting a smooth bias field to bring WM intensities to a target value. It is the atlas-guided intensity normalization step in the FreeSurfer [[recon-all]] pipeline, running after [[mri_em_register]] produces the Talairach transform and after an initial [[mri_normalize]] pass.

## Source Information

- **Language:** C++
- **Source file:** `mri_ca_normalize/mri_ca_normalize.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Accurate cortical reconstruction requires that white matter voxels have a consistent intensity across the brain, typically normalized to ~110 in FreeSurfer's convention. While [[mri_normalize]] uses a histogram-based approach with control points, `mri_ca_normalize` improves on this by:

1. Using the registered GCA to identify anatomically reliable WM control points (avoiding WM hyperintensities and atypical regions).
2. Dividing each structure into sub-regions (default 3×3×3) to allow spatially adaptive normalization.
3. Optionally accepting manually specified control points.

The output normalized volume feeds into [[mri_ca_register]] for the nonlinear atlas registration step.

## Inputs

Positional arguments (interleaved input/output with atlas and transform in the middle):
```
mri_ca_normalize [options] <in1> [<in2>...] <atlas.gca> <transform> <out1> [<out2>...]
```
- `<in1>, <in2>, ...` — input normalized volume(s) (one per GCA input channel)
- `<atlas.gca>` — GCA atlas file (at position `1 + ninputs`)
- `<transform>` — LTA/XFM/M3D transform (subject→atlas) at position `2 + ninputs`
- `<out1>, <out2>, ...` — output normalized volume(s)

Number of inputs = number of outputs = `(argc - 2) / 2`

## Outputs

- Normalized volume(s) with consistent WM intensity (~110).
- Optionally: a control point volume (`--ctrl_vol`) and/or sample diagnostics.

## Mathematical Foundations

**Control point selection:** For each normalization structure (by default: lh/rh cerebral WM, lh/rh cerebellar WM, brainstem), the atlas node probabilities identify voxels where the prior $p(k | x, y, z) > p_{\min}$ (default $p_{\min} = 0.6$). Within each $N \times N \times N$ region (default $N = 3$), a fraction `ctl_point_pct` (default 25%) of the most atlas-consistent voxels become control points.

**Bias field estimation:** The bias field $B(x)$ is estimated as the ratio of the observed WM intensity to the target value at each control point, then Gaussian-smoothed with $\sigma = 4$ mm (default):

$$
B(x) = G_\sigma * \frac{V_{\text{target}}}{V_{\text{obs}}(x_{\text{ctrl}})}
$$

**Normalization:** $V_{\text{norm}}(x) = V_{\text{in}}(x) \cdot B(x)$

The default normalization structures are:
- Left/Right Cerebral White Matter
- Left/Right Cerebellum White Matter
- Brain Stem

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-sigma <val>` | float | 4.0 | Gaussian smoothing sigma for bias field (mm) |
| `-min_prior <val>` | float | 0.6 | Minimum atlas prior probability for control point selection |
| `-novar` | flag | off | Unify variance in GCA (ignore per-node variance) |
| `-noedit` | flag | off | Do not use manually placed control points |
| `-norm_samples <file>` | string | — | File for normalized sample output (diagnostic) |
| `-ctrl_vol <file>` | string | — | Write control point volume |
| `-read_ctrl_vol <file>` | string | — | Read pre-computed control points from volume |
| `-mask <file>` | string | — | Brain mask volume; apply before normalization |
| `-T2mask <file> <thresh>` | string+float | — | T2 mask to remove bright CSF voxels |
| `-aparc_aseg <file>` | string | — | aparc+aseg for additional masking |
| `-seg <file>` | string | — | Use segmentation instead of GCA for control point selection |
| `-long_seg <file>` | string | — | Longitudinal segmentation for control point derivation |
| `-renorm <file>` | string | — | Per-label renormalization file (label-intensity pairs) |
| `-tissue <file>` | string | — | Tissue parameter file |
| `-ex_T1 <T1> <seg>` | string×2 | — | Example T1/segmentation pair for initialization |
| `-TR <val>` | float | 0 | T1 map TR (ms) |
| `-TE <val>` | float | 0 | T1 map TE (ms) |
| `-alpha <val>` | float | 0 | T1 map flip angle (degrees) |
| `-extra_norm_range <val>` | float | 0 | Extend normalization bias search range |
| `-dilate_mask` | flag | off | Dilate brain mask before masking |
| `-remove_cerebellum` | flag | off | Remove cerebellar labels from GCA normalization |
| `-remove_lh` | flag | off | Remove left hemisphere from GCA |
| `-remove_rh` | flag | off | Remove right hemisphere from GCA |
| `-nregions <N>` | int | 3 | Divide each structure into N×N×N sub-regions |
| `-file_only` | flag | off | Use only precomputed control points from file |
| `-aseg <file> <thresh>` | string+float | — | Use aseg-based control points at given threshold |

## Configuration Interactions

- `-seg` and GCA (`<atlas.gca>`) are mutually exclusive: if `-seg` is provided, the GCA is not loaded.
- `-long_seg` creates a control point volume from the longitudinal segmentation; implies the GCA is still needed for the atlas transform.
- `-novar` sets all GCA node variances to 1.0, making the classifier use only the mean.
- `-remove_cerebellum`, `-remove_lh`, `-remove_rh` modify which structures contribute control points; useful for partial-brain or ex-vivo scans.
- `-T2mask` erases voxels brighter than the threshold from the input before normalization (useful for bright CSF near the skull strip boundary).

## Typical Use Cases

**Standard autorecon2 normalization:**
```bash
mri_ca_normalize \
  $SUBJECTS_DIR/bert/mri/nu.mgz \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  $SUBJECTS_DIR/bert/mri/transforms/talairach.lta \
  $SUBJECTS_DIR/bert/mri/norm.mgz
```

**With brain mask:**
```bash
mri_ca_normalize -mask brainmask.mgz \
  nu.mgz RB_all.gca transforms/talairach.lta norm.mgz
```

## Pipeline Context

In [[recon-all]], `mri_ca_normalize` is called in the autorecon2 stage, between [[mri_em_register]] (which produces `talairach.lta`) and [[mri_ca_register]] (which uses the output `norm.mgz`). The sequence is:

1. [[mri_normalize]] → rough `nu.mgz`
2. [[mri_em_register]] → `transforms/talairach.lta`
3. **`mri_ca_normalize`** → `norm.mgz`
4. [[mri_ca_register]] → `transforms/talairach.m3z` ([[m3z-format]])
5. [[mri_ca_label]] → `aseg.mgz`

## Gotchas and Caveats

> [!gotcha] Positional argument order is unusual
> Unlike most tools where inputs come before options, the argument order here interleaves inputs with the atlas and transform in the middle. The number of inputs equals `(argc-2)/2` — inputs and outputs must be equal in count.

> [!gotcha] WM bias range constraint
> The code applies `MIN_WM_BIAS_PCT = 0.8` and `MAX_WM_BIAS_PCT = 1.2` clamps on the bias ratio. This means the estimated bias field cannot deviate more than ±20% from the target. Severely biased data may not be fully corrected.

> [!gotcha] Bright CSF near skull-strip boundary
> If bright CSF voxels near the skull-strip edge are not masked, they can be selected as false WM control points and corrupt the normalization. Use `-T2mask` or `-mask` to address this.

## Related Tools

- [[mri_normalize]] — the initial histogram-based normalization (runs before this)
- [[mri_em_register]] — produces the affine Talairach transform used here
- [[mri_ca_register]] — nonlinear atlas registration that uses the output of this tool
- [[mri_ca_label]] — segmentation step that follows normalization

## Confidence and Gaps

Source code fully read. Confidence is high.

> [!gap] Multi-channel (multi-input) normalization
> When multiple input volumes are specified (e.g., for FLASH multi-echo data), the normalization channels interact via the GCA's `ninputs` parameter. The exact multi-channel handling in `GCAcomputeRenormalization` is not fully documented here.
