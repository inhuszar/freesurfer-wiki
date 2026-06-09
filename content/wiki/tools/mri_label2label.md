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
last_agent_update: 2026-06-09
gaps:
  - "usepathfiles (tksurfer path file) format and behaviour not fully verified"
  - "--paint mode exact distance metric not traced"
audit_fixes:
  - "C2 2026-04-21: added Default column to Configuration Options table (52 flags)"
  - "C1 2026-04-21: --annot-trg, --reg2, --regdiff not found in source — not added; added --hashres (was in source but missing from table)"
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

Flag list verified against `mri_label2label/mri_label2label.cpp` (`parse_commandline()`, lines 914–1249).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--srclabel` | `<file>` | *(required)* | Source label file |
| `--srcsubject` | `<subject>` | *(required)* | Source subject name |
| `--trglabel` | `<file>` | *(required)* | Output target label file |
| `--trgsubject` | `<subject>` | *(required)* | Target subject name |
| `--s` | `<subject>` | — | Use the same subject as both source and target |
| `--regmethod` | `surface` or `volume` | *(required)* | Registration method (`surf` and `vol` are accepted aliases) |
| `--hemi` | `lh` or `rh` | — | Hemisphere (for surface method; sets both `--srchemi` and `--trghemi`) |
| `--srchemi` | `lh` or `rh` | *(from `--hemi`)* | Source hemisphere (for cross-hemi mapping) |
| `--trghemi` | `lh` or `rh` | *(from `--hemi`)* | Target hemisphere (for cross-hemi mapping) |
| `--surfreg` | `<surf>` | `sphere.reg` | Registration surface name for both source and target |
| `--srcsurfreg` | `<surf>` | *(from `--surfreg`)* | Source registration surface name override |
| `--trgsurfreg` | `<surf>` | *(from `--surfreg`)* | Target registration surface name override |
| `--srcsurfreg-file` | `<path>` | — | Full path to source registration surface (bypasses name construction) |
| `--trgsurfreg-file` | `<path>` | — | Full path to target registration surface (bypasses name construction) |
| `--trgsurface`<br>`--trgsurf` | `<surf>` | `white` | Target coordinate surface for output label xyz |
| `--projabs` | `<mm>` | — | Project along surface normal by absolute distance (mm) |
| `--projfrac` | `<frac>` | — | Project along surface normal by fraction of cortical thickness |
| `--xfm` | `<file>` | — | Volumetric transform file (for volume method; mutually exclusive with `--reg`) |
| `--reg` | `<file>` | — | Registration `.dat` file (for volume method; sets regmethod to volume) |
| `--xfm-invert` | — | off | Invert the volumetric transform or reg file |
| `--src-invert` | — | off | Invert source label (surface method only) |
| `--trg-invert` | — | off | Invert target label (surface method only) |
| `--srcmask` | `<file> <thresh> [fmt]` | — | Mask for source label; removes vertices below threshold |
| `--srcmasksign` | `abs`, `pos`, or `neg` | `abs` | Sign convention for source mask threshold |
| `--srcmaskframe` | `<N>` | `0` | 0-based frame index for source mask |
| `--outmask` | `<file>` | — | Output binary mask of mapped label (surface method only) |
| `--outstat` | `<file>` | — | Output label statistics as a mask (sets `DoOutMaskStat=1`) |
| `--srcicoorder` | `<N>` | `-1` | Source icosahedral order (required when `--srcsubject ico`) |
| `--trgicoorder` | `<N>` | `-1` | Target icosahedral order (required when `--trgsubject ico`) |
| `--usepathfiles` | — | off | Read/write from tksurfer path files instead of label files |
| `--erode` | `<N>` | `0` | Erode result label by N vertices after mapping |
| `--dilate` | `<N>` | `0` | Dilate result label by N vertices after mapping |
| `--open` | `<N>` | `0` | Morphological open (erode N then dilate N) after mapping |
| `--close` | `<N>` | `0` | Morphological close (dilate N then erode N) after mapping |
| `--ring` | `<N>` | `0` | Dilate N times then remove original (boundary ring) after mapping |
| `--direct` | `<src_annot> <trg_annot>` | — | Direct surface-to-surface mapping using xyz coords; takes source and target annotation filenames |
| `--sample` | `<surf>` | — | Sample label onto output subject's surface after mapping |
| `--paint` | `<maxdist> <surfname>` | — | Map to closest vertex on source surface if distance < maxdist; sets `DoRescale=0`, `reversemap=0` |
| `--dminmin` | `<file>` | — | Save binary mask at vertex of closest label point (for `--paint`) |
| `--revmap` | — | on | Use reverse mapping for nearest-vertex search (`reversemap=1`) |
| `--norevmap` | — | — | Disable reverse mapping (`reversemap=0`) |
| `--hash` | — | on | Use hash table for nearest-vertex lookup (`usehash=1`) |
| `--nohash` | — | — | Disable hash table (`usehash=0`) |
| `--hashres` | `<float>` | `16` | Hash table resolution for nearest-vertex lookup |
| `--scanner` | — | off | Set output coordinate type label to `scanner` (changes label metadata string only) |
| `--to-scanner` | `<vol>` | — | Convert label coordinates to scanner RAS before operations |
| `--to-tkr` | `<vol>` | — | Convert label coordinates to tkr RAS before operations |
| `--surf-label2mask` | `<label> <surf> <mask>` | — | Standalone: convert a label to a binary mask; exits immediately |
| `--label-cortex` | `<surf> <aseg> <KeepHipAmyg01> <outlabel>` | — | Standalone: create a cortex label like `?h.cortex.label`; exits immediately |
| `--baryfill` | `<surf> <label> <delta> <outlabel>` | — | Standalone: fill label using barycentric interpolation; exits immediately |
| `--annot-fill-holes` | `<surf> <inannot> <outannot>` | — | Standalone: fill holes in an annotation/parcellation overlay; exits immediately |
| `--sd` | `<dir>` | `$SUBJECTS_DIR` | Override SUBJECTS_DIR |
| `--debug` | — | off | Enable debug output |
| `--Gdiag_no` | `<n>` | — | Set Gdiag_no diagnostic number for selective debug output |

## Configuration Interactions

- `--regmethod surface` requires `--hemi` and both subjects to have `sphere.reg` surfaces.
- --regmethod volume does not require `--hemi` but requires valid Talairach transforms for both subjects.
- Cross-hemisphere mapping (e.g., `--srchemi lh --trghemi rh`) uses `rh.lh.sphere.reg` as the registration surface; this surface must exist in the target subject directory.
- `--projabs` and `--projfrac` are mutually exclusive projection modes.
- `--erode`, `--dilate`, `--open`, `--close`, `--ring` are morphological operations applied to the target label after mapping.
- `--srcmask` takes the threshold inline as its second argument (`--srcmask <file> <thresh>`); use `--srcmasksign` and `--srcmaskframe` to control which values and frames are used.
- `--xfm-invert` inverts the transform provided by `--xfm` or `--reg`. `--src-invert` and `--trg-invert` apply to the surface-method inversion; these cannot be used with volume registration.
- `--direct` takes two arguments (source annotation, target annotation) and performs direct xyz-coordinate lookup rather than sphere-based registration.
- `--paint` sets `DoRescale=0` and `reversemap=0` internally; these cannot be independently overridden when `--paint` is active.
- `--surf-label2mask`, `--label-cortex`, `--baryfill`, and `--annot-fill-holes` are standalone operations that exit immediately after completing their task, ignoring all other flags.

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
- **Downstream:** [[mri_label2vol]] (to map the label back to volume), [[wiki/tools/mri_glmfit|mri_glmfit]] (for ROI analyses)

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
- [[label-cortex]] — thin wrapper that drives `mri_label2label --label-cortex` to build `?h.cortex.label`
- [[map_all_labels]] — small driver that maps the standard average sulcal labels onto a subject via `mri_label2label`
- [[labels_union]] — set union of two surface labels (label-manipulation sibling)
- [[labels_intersect]] — set intersection of two surface labels
- [[labels_disjoint]] — set difference (relative complement) of two surface labels

## Confidence and Gaps

**Confident (from source):** Both registration methods (surface and volume), spherical nearest-vertex mapping via hash tables, all morphological operations (`--erode`, `--dilate`, `--open`, `--close`, `--ring`), cross-hemisphere support, projection along normals, all flag names verified against `parse_commandline()`.

**Uncertain:** Exact usepathfiles (tksurfer path file) format and behaviour; `--paint` distance metric details.
