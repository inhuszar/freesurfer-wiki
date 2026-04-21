---
title: "mri_segcentroids"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_segcentroids/mri_segcentroids.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_seg_overlap]]"
  - "[[mri_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Output format details for --o (text table) not fully documented from source read."
tags:
  - segmentation
  - centroid
  - morphometry
  - pointset
---

# mri_segcentroids

## Summary

`mri_segcentroids` computes the spatial centroid (centre of mass) of each label in a segmentation volume. The output is a text table or a FreeSurfer pointset file with the (x, y, z) coordinates of each region's centroid in surface RAS or scanner RAS space. Optionally, a weight volume can be used so that centroids are intensity-weighted (e.g., probability-weighted centroids).

## Source Information

- **Language:** C++
- **Source file:** `mri_segcentroids/mri_segcentroids.cpp`
- **Key types used:** `fsPointSet::Point`, `MRI`

## Purpose and Context

Centroid computation is used in registration, atlas construction, and visualisation workflows. For example, centroids of `aseg.mgz` labels can be used as seed points for tractography or as fiducial markers for comparing across subjects. The `--reg` flag allows centroids to be reported in a target volume's coordinate frame.

## Inputs

| Flag | Description |
|------|-------------|
| `--i <seg>` | Input segmentation volume (required) |
| `--weights <vol>` | Optional weight volume for weighted centroid |
| `--reg <lta>` | Optional LTA transform to convert centroids to a different space |
| `--ctab <file>` | Colour lookup table mapping label IDs to names |
| `--ctab-default` | Use `$FREESURFER_HOME/FreeSurferColorLUT.txt` as the lookup table |
| `--include-zero` | Include label 0 (background) in output |

## Outputs

| Flag | Description |
|------|-------------|
| `--o <file>` | Output text table (CSV-style) with centroid coordinates |
| `--p <file>` | Output pointset file (fsPointSet JSON format) viewable in `freeview` |

## Mathematical Foundations

For a label $\ell$ with voxel set $\mathcal{V}_\ell$, the centroid is:

**Unweighted:**
$$
\bar{x}_\ell = \frac{1}{|\mathcal{V}_\ell|} \sum_{v \in \mathcal{V}_\ell} x_v
$$

**Intensity-weighted** (with weight volume $w$):
$$
\bar{x}_\ell = \frac{\sum_{v \in \mathcal{V}_\ell} w(v) \cdot x_v}{\sum_{v \in \mathcal{V}_\ell} w(v)}
$$

Coordinates are reported in surface RAS by default. When `--reg` is supplied, the LTA transform is applied:

$$
\bar{x}'_\ell = T_{\text{LTA}} \cdot \bar{x}_\ell
$$

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<seg>` | — | Input segmentation volume (required) |
| `--o` | `<file>` | — | Output text table of centroids |
| `--p` | `<file>` | — | Output pointset file |
| `--weights` | `<vol>` | — | Weight volume for weighted centroids |
| `--reg` | `<lta>` | — | LTA transform to apply to output coordinates |
| `--ctab` | `<file>` | — | Colour lookup table |
| `--ctab-default` | — | off | Use FreeSurfer default colour LUT |
| `--include-zero` | — | off | Include label 0 in output |
| `--precision` | `<int>` | default | Decimal precision for output coordinates |

## Configuration Interactions

- `--ctab` and `--ctab-default` are mutually exclusive; both set the `ctabfile` variable.
- `--o` and `--p` can both be specified to write the output in two formats simultaneously.
- `--reg` requires `--i`; the LTA transform is applied to convert centroid coordinates into the target space.
- `--weights` and the unweighted path are mutually exclusive (if `--weights` is provided, weighted centroid is computed; otherwise unweighted).

## Typical Use Cases

```bash
# Compute centroids of all aseg regions
mri_segcentroids --i aseg.mgz --ctab-default --o aseg_centroids.txt

# Compute centroids as pointset for freeview
mri_segcentroids --i aseg.mgz --ctab-default --p aseg_centroids.json

# Probability-weighted centroids with transform
mri_segcentroids --i aseg.mgz --weights wmparc_prob.mgz --reg aseg2mni.lta --o centroids_mni.txt
```

## Pipeline Context

Not called by `recon-all`. Used in post-processing workflows alongside [[mri_segstats]] (which computes volumes and intensities) and [[mri_ca_label]] (which produces the input segmentations).

## Gotchas and Caveats

> [!gotcha] Coordinate system
> Centroid coordinates are in the volume's native coordinate system. Without `--reg`, this is the surface RAS (tkregister RAS) of the input volume. See [[coordinate-systems]] for details.

> [!gotcha] Background label
> Label 0 (background) is excluded by default. Use `--include-zero` to include it, but the resulting centroid for a whole-brain background will be near the image centre.

## Related Tools

- [[mri_segstats]] — volume and intensity statistics per label
- [[mri_seg_overlap]] — overlap measures between two segmentations
- [[mri_ca_label]] — produces aseg-style segmentations

## Confidence and Gaps

**Confident (from source):** All flags, weighted/unweighted centroid formula, `--reg` LTA support, pointset output.

**Uncertain:** Exact text format of `--o` output (column names, separator).
