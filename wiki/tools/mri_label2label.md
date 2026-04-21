---
title: "mri_label2label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label2label/mri_label2label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label2vol]]"
  - "[[mri_vol2surf]]"
  - "[[coordinate-systems]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Full flag enumeration not verified from help output"
  - "usepathfiles mode details"
tags:
  - label
  - registration
  - surface
  - mapping
  - intersubject
---

# mri_label2label

## Summary

`mri_label2label` converts a surface label defined in one subject's space to a corresponding label in another subject's space, using either spherical surface registration (via `sphere.reg`) or volumetric Talairach registration as the intermediate mapping. It is the standard tool for transferring manually drawn ROI labels, cortical regions of interest, or functional localizer labels between subjects in FreeSurfer.

## Source Information

- **Source language:** C++
- **Source file:** `mri_label2label/mri_label2label.cpp`
- **Original author:** Douglas Greve

## Purpose and Context

FreeSurfer analyses often require mapping anatomical regions of interest (ROIs) defined in one subject to another. This arises when:

- A region was manually labeled on one subject and needs to be applied to the group
- Functional localizer data defines a region in subject-specific space that must be transferred to a group template (e.g., fsaverage)
- Cross-subject ROI comparisons require common labels on each individual's surface

`mri_label2label` supports two registration strategies:

1. **Surface registration** (`--regmethod surface`): uses the spherical surface registration (`sphere.reg`) produced by `mris_register` to map label vertices from the source subject's sphere to the target subject's sphere, then finds the nearest vertices on the target surface. This is the recommended method for cortical labels.

2. **Volume registration** (`--regmethod volume`): uses Talairach/MNI305 space as an intermediate, mapping RAS coordinates from source to target via the Talairach transforms of each subject. This works for subcortical or cross-hemisphere mappings.

Cross-hemisphere mapping (lh → rh or rh → lh) is supported via `rh.lh.sphere.reg`.

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Source label | `--srclabel` | Label file in source subject's space |
| Source subject | `--srcsubject` | Source FreeSurfer subject name |
| Target subject | `--trgsubject` | Target FreeSurfer subject name |
| Hemisphere | `--hemi` | Hemisphere (`lh` or `rh`) for surface registration |

Optional:
- `--surfreg`: registration surface (default: `sphere.reg`)
- `--srcsurfreg` / `--trgsurfreg`: override source/target registration surfaces
- `--xfm` / `--reg`: volumetric transform file for volume-based registration
- `--srcmask`: mask to apply to source label before mapping
- `--trgsurface`: target surface for vertex coordinates (default: `white`)

## Outputs

| Output | Flag | Description |
|--------|------|-------------|
| Target label | `--trglabel` | Mapped label in target subject's space |
| Output mask | `--outmask` | Binary volume mask of the mapped label |

## Mathematical Foundations

**Surface registration method:**

For each source label vertex $v_s$ with surface coordinates $(x_s, y_s, z_s)$:

1. Find the corresponding location on the source `sphere.reg` surface: $(r_s, \theta_s, \phi_s)$
2. Map to the target subject's `sphere.reg` using the spherical coordinate correspondence established during `mris_register`
3. Find the nearest vertex $v_t$ on the target surface

The mapping uses a hash table (`MHT`) for efficient nearest-vertex lookup on the sphere. The search radius is controlled by `hashres = 16`.

**Volume registration method:**

For each source label vertex:
1. Map from source surface RAS to Talairach/MNI305 coordinates via the source subject's Talairach transform
2. Map from Talairach to target surface RAS via the inverse of the target subject's Talairach transform
3. Find the nearest vertex on the target surface

**Projection operators:**

`--projabs` and `--projfrac` allow projecting the label along the surface normal by an absolute distance or a fraction of cortical thickness, useful for projecting surface labels to specific cortical layers.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--srclabel` | `<file>` | Source label file |
| `--srcsubject` | `<subject>` | Source subject name |
| `--trglabel` | `<file>` | Output target label file |
| `--trgsubject` | `<subject>` | Target subject name |
| `--regmethod` | `surface` or `volume` | Registration method |
| `--hemi` | `lh` or `rh` | Hemisphere (for surface method) |
| `--srchemi` | `lh` or `rh` | Source hemisphere (for cross-hemi mapping) |
| `--trghemi` | `lh` or `rh` | Target hemisphere (for cross-hemi mapping) |
| `--surfreg` | `<surf>` | Registration surface (default: `sphere.reg`) |
| `--srcsurfreg` | `<surf>` | Source registration surface override |
| `--trgsurfreg` | `<surf>` | Target registration surface override |
| `--trgsurface` | `<surf>` | Target coordinate surface (default: `white`) |
| `--projabs` | `<mm>` | Project along normal by absolute distance |
| `--projfrac` | `<frac>` | Project along normal by fraction of thickness |
| `--xfm` | `<file>` | Volumetric transform (for volume method) |
| `--reg` | `<file>` | Registration file (for volume method) |
| `--invertxfm` | — | Invert the volumetric transform |
| `--srcmask` | `<file>` | Mask for source label |
| `--srcmaskthresh` | `<val>` | Threshold for source mask |
| `--outmask` | `<file>` | Output binary mask |
| `--srcicoorder` | `<N>` | Source icosahedral order (if source is on ico) |
| `--trgicoorder` | `<N>` | Target icosahedral order |
| `--usepathfiles` | — | Read/write from tksurfer path files |
| `--label-erode` | `<N>` | Erode result label by N vertices |
| `--label-dilate` | `<N>` | Dilate result label by N vertices |
| `--label-open` | `<N>` | Morphological open (erode then dilate) |
| `--label-close` | `<N>` | Morphological close (dilate then erode) |
| `--label-ring` | `<N>` | Ring around label boundary |
| `--direct` | — | Direct surface-to-surface mapping without sphere |
| `--scanner` | — | Use scanner RAS coordinates |
| `--to-scanner` | `<vol>` | Convert label coordinates to scanner RAS |
| `--to-tkr` | `<vol>` | Convert label coordinates to tkr RAS |
| `--paint` | `<surf> <maxdist>` | Paint label onto surface (nearest vertex within maxdist) |
| `--no-rescale` | — | Disable coordinate rescaling |
| `--src-annot` | `<file>` | Source annotation file |
| `--trg-annot` | `<file>` | Target annotation file |
| `--debug` | — | Enable debug output |

## Configuration Interactions

- `--regmethod surface` requires `--hemi` and both subjects to have `sphere.reg` surfaces.
- `--regmethod volume` does not require `--hemi` but requires valid Talairach transforms for both subjects.
- Cross-hemisphere mapping (e.g., `--srchemi lh --trghemi rh`) uses `rh.lh.sphere.reg` as the registration surface; this surface must exist in the target subject directory.
- `--projabs` and `--projfrac` are mutually exclusive projection modes.
- `--label-erode`, `--label-dilate`, `--label-open`, `--label-close`, `--label-ring` are morphological operations applied to the target label after mapping.
- `--srcmask` with `--srcmaskthresh` removes vertices from the source label that don't meet the mask threshold.

## Typical Use Cases

**Map a surface label from one subject to fsaverage:**
```bash
mri_label2label \
  --srclabel broca-fred.label \
  --srcsubject fred \
  --trglabel broca-fsaverage.label \
  --trgsubject fsaverage \
  --regmethod surface \
  --hemi lh
```

**Map a label from fsaverage to an individual subject:**
```bash
mri_label2label \
  --srclabel V1-fsaverage.label \
  --srcsubject fsaverage \
  --trglabel V1-sally.label \
  --trgsubject sally \
  --regmethod surface \
  --hemi lh
```

**Volume (Talairach) registration method:**
```bash
mri_label2label \
  --srclabel broca-fred.label \
  --srcsubject fred \
  --trglabel broca-sally.label \
  --trgsubject sally \
  --regmethod volume
```

**Cross-hemisphere (LH to RH) mapping:**
```bash
mri_label2label \
  --srclabel lh-roi.label --srcsubject fsaverage --srchemi lh \
  --trglabel rh-roi.label --trgsubject fsaverage --trghemi rh \
  --regmethod surface
```

## Pipeline Context

`mri_label2label` is not called by `recon-all`. It is used in group analysis workflows:

- **Upstream:** `mris_register` (produces `sphere.reg`), `recon-all -all`
- **Downstream:** [[mri_label2vol]] (to map the label back to volume), [[mri_glmfit]] (for ROI analyses)

## Gotchas and Caveats

> [!gotcha] sphere.reg must exist
> Surface registration requires that `?h.sphere.reg` exists in both the source and target subject directories. This is produced by [[mris_register]] during `recon-all`. If registration failed or was not run, the mapping cannot proceed.

> [!gotcha] Label vertex coordinates are in tkRAS
> FreeSurfer label files store vertex coordinates in surface RAS (tkRAS), not scanner RAS. The conversion between coordinate systems is handled internally but must be understood when importing labels from external sources.

> [!gotcha] Cross-hemisphere mapping requires rh.lh.sphere.reg
> When mapping from lh to rh, the target subject must have `rh.lh.sphere.reg` in their surf/ directory. This is not always produced by default and may require additional processing.

> [!gotcha] Reverse mapping is on by default
> The `reversemap = 1` default means the mapping is applied in reverse (from target sphere back to source) for the nearest-vertex search. This is typically correct behavior but may confuse users who expect a forward-only mapping.

## Related Tools

- [[mri_label2vol]] — convert a surface label to a volumetric binary mask
- [[mri_vol2surf]] — project volumetric data onto a surface
- [[mris_register]] — spherical registration that produces `sphere.reg`
- [[coordinate-systems]] — RAS, tkRAS, and surface coordinate systems

## Confidence and Gaps

**Confident (from source):** Both registration methods (surface and volume), spherical nearest-vertex mapping via hash tables, morphological operations on labels, cross-hemisphere support, projection along normals.

**Uncertain:** Exact usepathfiles (tksurfer path file) format and behavior; `--paint` mode details; complete set of all flags.
