---
title: "FreeSurfer Statistics File (.stats)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".stats"
produced_by:
  - "[[mris_anatomical_stats]]"
  - "[[mri_segstats]]"
  - "[[mri_brainvol_stats]]"
consumed_by:
  - "[[mri_segstats]]"
  - "[[aparcstats2table]]"
  - "[[asegstats2table]]"
related:
  - "[[parcellation-schemes]]"
  - "[[color-lut]]"
  - "[[ctab-format]]"
  - "[[subject-directory]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - format
  - statistics
  - segmentation
  - parcellation
---

# FreeSurfer Statistics File (.stats)

## Overview

FreeSurfer writes morphometric and intensity statistics to plain-text files in
the `<subject>/stats/` subdirectory. These `.stats` files are the primary output
format for quantitative brain measurements in FreeSurfer and are the de facto
standard for cortical parcellation and subcortical segmentation statistics used
in group-level neuroimaging analyses.

There are two main structural variants:

1. **Cortical stats** (`?h.aparc.stats`, `?h.aparc.a2009s.stats`,
   `?h.aparc.DKTatlas.stats`, `?h.aparc.pial.stats`, `?h.BA_exvivo.stats`) —
   written by [[mris_anatomical_stats]]; one row per parcellation region with
   vertex count, surface area, gray matter volume, thickness, and curvature measures.

2. **Segmentation stats** (`aseg.stats`, `wmparc.stats`, `lh.w-g.pct.stats`) —
   written by [[mri_segstats]]; one row per segmented structure with voxel count,
   volume, and intensity statistics from a reference volume.

A third, simplified variant:

3. **Brain volume stats** (`brainvol.stats`) — written by [[mri_brainvol_stats]];
   contains only global `# Measure` header lines with no data table; serves as
   a cache for whole-brain volume measures consumed by `mri_segstats` and
   `mris_anatomical_stats`.

All `.stats` files are:
- Plain ASCII text; one line per record
- Human-readable without special tools
- Machine-parseable with standard Unix text tools or dedicated FreeSurfer scripts
- Self-describing: column definitions are embedded in the comment header

---

## Cortical Stats File (`?h.aparc.stats`)

Written by [[mris_anatomical_stats]] when called with `-f <statsfile>` and
`-a <annotfile>`. Standard files produced per hemisphere per subject:

| File | Parcellation | Surface |
|------|-------------|---------|
| `lh.aparc.stats` | Desikan–Killiany (aparc) | white |
| `rh.aparc.stats` | Desikan–Killiany (aparc) | white |
| `lh.aparc.a2009s.stats` | Destrieux (aparc.a2009s) | white |
| `rh.aparc.a2009s.stats` | Destrieux (aparc.a2009s) | white |
| `lh.aparc.DKTatlas.stats` | DKT atlas | white |
| `rh.aparc.DKTatlas.stats` | DKT atlas | white |
| `lh.aparc.pial.stats` | Desikan–Killiany | pial |
| `rh.aparc.pial.stats` | Desikan–Killiany | pial |
| `lh.BA_exvivo.stats` | Brodmann areas (ex vivo) | white |
| `rh.BA_exvivo.stats` | Brodmann areas (ex vivo) | white |

### Header Block

Every line in the header block starts with `# ` (hash-space). Header lines appear
before the first data row. The header has two logical sections: a **provenance
block** and a **schema block**.

#### Provenance Lines

These document when, how, and where the file was created:

```
# Table of FreeSurfer cortical parcellation anatomical statistics 
# 
# CreationTime <YYYY/MM/DD-HH:MM:SS-TZ>
# generating_program mris_anatomical_stats
# cvs_version <version string>
# mrisurf.c-cvs_version <version string>
# cmdline <full command line used>
# sysname  <OS name>
# hostname <hostname>
# machine  <architecture>
# user     <username>
# 
# SUBJECTS_DIR <absolute path>
# anatomy_type surface
# subjectname <subject id>
# hemi <lh|rh>
# AnnotationFile <path to .annot file>
# AnnotationFileTimeStamp <YYYY/MM/DD HH:MM:SS>
```

Note: `CreationTime` is absent in segmentation stats files.

#### Global Measures Block (`# Measure` lines)

These lines carry whole-hemisphere and whole-brain volumes. They appear before
the column definitions and are the primary source for normalization covariates
in group analyses. Each line follows the format:

```
# Measure <Category>, <ShortName>, <LongName>, <value>, <units>
```

For **cortical stats** produced by `mris_anatomical_stats` (white surface run),
the standard set of `# Measure` lines is:

| ShortName | LongName | Units | Notes |
|-----------|----------|-------|-------|
| `NumVert` | Number of Vertices | unitless | Total cortex vertex count (excluding medial wall, `unknown`, `corpuscallosum`) |
| `WhiteSurfArea` | White Surface Total Area | mm² | Total white surface area of cortex label |
| `MeanThickness` | Mean Thickness | mm | Mean across cortex-labeled vertices |
| `BrainSegVol` | Brain Segmentation Volume | mm³ | Read from cached `brainvol.stats` |
| `BrainSegVolNotVent` | Brain Segmentation Volume Without Ventricles | mm³ | |
| `BrainSegVolNotVentSurf` | Brain Segmentation Volume Without Ventricles from Surf | mm³ | Surface-based estimate |
| `CortexVol` | Total cortical gray matter volume | mm³ | TH3 method; both hemispheres |
| `SupraTentorialVol` | Supratentorial volume | mm³ | |
| `SupraTentorialVolNotVent` | Supratentorial volume | mm³ | Excluding ventricles |
| `eTIV` | Estimated Total Intracranial Volume | mm³ | Derived from `talairach.xfm` determinant |

When run on the pial surface (`-b` flag, surface name = `pial`), `WhiteSurfArea`
is replaced by `PialSurfArea` (Pial Surface Total Area, mm²).

#### Schema Block

These lines define the data table columns in a structured way for programmatic
parsing:

```
# BrainVolStatsFixed-NotNeeded because voxelvolume=1mm3
# NTableCols 10
# TableCol  1 ColHeader StructName
# TableCol  1 FieldName Structure Name
# TableCol  1 Units     NA
# TableCol  2 ColHeader NumVert
# TableCol  2 FieldName Number of Vertices
# TableCol  2 Units     unitless
# ...
# ColHeaders StructName NumVert SurfArea GrayVol ThickAvg ThickStd MeanCurv GausCurv FoldInd CurvInd
```

The `# BrainVolStatsFixed-NotNeeded because voxelvolume=1mm3` line indicates
that raw voxel counts equal mm³ volumes (standard 1 mm isotropic data). For
non-isotropic data, a `# BrainVolStatsFixed see <url>` line appears instead and
volume stats may require a correction factor.

### Data Block

One row per parcellation region, space-delimited. Regions named `unknown`,
`corpuscallosum`, `Medial_wall`, and `Unknown` are **excluded** by the code
(they are not cortex). The columns are fixed and ordered as follows:

| Col | ColHeader | FieldName | Units | Description |
|-----|-----------|-----------|-------|-------------|
| 1 | `StructName` | Structure Name | NA | Anatomical label string from the [[color-lut|color table]] |
| 2 | `NumVert` | Number of Vertices | unitless | Count of vertices assigned to this label (`dofs[i]` in source) |
| 3 | `SurfArea` | Surface Area | mm² | Sum of face areas / 3 per vertex, over the specified surface (white or pial) |
| 4 | `GrayVol` | Gray Matter Volume | mm³ | TH3 prism-based volume by default; see below |
| 5 | `ThickAvg` | Average Thickness | mm | Mean of `v->imag_val` (the thickness overlay) across label vertices |
| 6 | `ThickStd` | Thickness StdDev | mm | Standard deviation of per-vertex thickness within the label |
| 7 | `MeanCurv` | Integrated Rectified Mean Curvature | mm⁻¹ | $\frac{1}{4\pi} \sum_i A_i |H_i|$ where $H_i$ is mean curvature and $A_i$ is vertex area |
| 8 | `GausCurv` | Integrated Rectified Gaussian Curvature | mm⁻² | $\frac{1}{4\pi} \sum_i A_i |K_i|$ where $K_i > 0$ |
| 9 | `FoldInd` | Folding Index | unitless | $\frac{1}{4\pi} \sum_i A_i \cdot k_{1,i}(k_{1,i} - k_{2,i})$ where $k_1 \geq k_2$ are principal curvatures; integer-rounded in output |
| 10 | `CurvInd` | Intrinsic Curvature Index | unitless | $\frac{1}{4\pi} \sum_{\{i: K_i > 0\}} A_i K_i$; reported with one decimal place |

Example data rows (from `lh.aparc.stats`, subject bert):

```
bankssts                                   1212    826   2311  2.812 0.445     0.106     0.019        9     0.9
caudalanteriorcingulate                     971    605   1576  2.398 0.535     0.103     0.011        9     0.5
caudalmiddlefrontal                        2767   1818   5759  2.793 0.516     0.108     0.020       23     2.3
```

The `StructName` field is left-padded to 40 characters (`%-40s` format). Numeric
fields use formats `%5d`, `%5.0f`, `%5.0f`, `%5.3f`, `%5.3f`, `%8.3f`, `%8.3f`,
`%7.0f`, `%6.1f`.

#### GrayVol: the TH3 Method

`GrayVol` (gray matter volume per parcel) is computed by the TH3 method by
default (`-th3` flag; default since at least FS 6). TH3 decomposes the
obliquely truncated trilateral prism between corresponding white and pial surface
triangles into three tetrahedra using scalar triple products, then sums the
signed volumes. This is implemented in `MRISvolumeTH3()` in
`utils/mrisutils.cpp`, based on Anderson M. Winkler's `srf2vol` MATLAB script.

> [!gotcha] GrayVol is NOT area × thickness
> `GrayVol` uses the TH3 prismatic integration between white and pial surfaces,
> not `SurfArea × ThickAvg`. The product `SurfArea × ThickAvg` underestimates
> true cortical volume because it ignores folding geometry. TH3 is geometrically
> exact for the triangulated surface representation.

When the legacy `-no-th3` flag is used (sometimes seen in recon-all for
compatibility), `GrayVol` is computed as:
$V_i = \frac{1}{2} \sum_{f \in \text{label}_i} A_f \cdot \bar{T}_f$
where $A_f$ is triangle area and $\bar{T}_f$ is the mean of three vertex
thicknesses — this is the "old" method and produces lower values.

> [!gotcha] SurfArea is white surface area, not pial area
> `SurfArea` in `?h.aparc.stats` reflects the white matter surface, not the
> outer (pial) cortical surface. The pial surface area is larger. Use
> `?h.aparc.pial.stats` if pial area is needed; in that file `SurfArea` reports
> `PialSurfArea`.

---

## Segmentation Stats File (`aseg.stats`)

Written by [[mri_segstats]] when called with `--seg mri/aseg.mgz --sum stats/aseg.stats`.
Covers subcortical structures, ventricles, cerebellum, and brain stem from the
`aseg.mgz` segmentation volume.

### Header Block

```
# Title Segmentation Statistics 
# 
# generating_program mri_segstats
# cvs_version <version>
# cmdline <full command line>
# sysname  <OS>
# hostname <host>
# machine  <arch>
# user     <user>
# anatomy_type volume
# 
# SUBJECTS_DIR <path>
# subjectname <subject>
# BrainVolStatsFixed-NotNeeded because voxelvolume=1mm3
```

Note: `CreationTime` is **not** present in segmentation stats files. The title
line is `# Title Segmentation Statistics` (not the cortical parcellation title).
The `anatomy_type` is `volume` (not `surface`).

#### Global Measures in `aseg.stats`

All `# Measure` lines from the actual `aseg.stats` file for subject bert
(verified on disk, FreeSurfer 8.2.0):

| ShortName | LongName | Units | Description |
|-----------|----------|-------|-------------|
| `BrainSegVol` | Brain Segmentation Volume | mm³ | Total volume of all non-zero labels in `aseg.mgz` |
| `BrainSegVolNotVent` | Brain Segmentation Volume Without Ventricles | mm³ | Excluding ventricle labels |
| `VentricleChoroidVol` | Volume of ventricles and choroid plexus | mm³ | Sum of lateral ventricles and choroid plexus labels |
| `lhCortexVol` | Left hemisphere cortical gray matter volume | mm³ | Surface-based TH3 estimate |
| `rhCortexVol` | Right hemisphere cortical gray matter volume | mm³ | |
| `CortexVol` | Total cortical gray matter volume | mm³ | lh + rh |
| `lhCerebralWhiteMatterVol` | Left hemisphere cerebral white matter volume | mm³ | Surface-based estimate |
| `rhCerebralWhiteMatterVol` | Right hemisphere cerebral white matter volume | mm³ | |
| `CerebralWhiteMatterVol` | Total cerebral white matter volume | mm³ | lh + rh |
| `SubCortGrayVol` | Subcortical gray matter volume | mm³ | From `aseg.mgz` labels |
| `TotalGrayVol` | Total gray matter volume | mm³ | Cortex + SubCortGray |
| `SupraTentorialVol` | Supratentorial volume | mm³ | |
| `SupraTentorialVolNotVent` | Supratentorial volume | mm³ | Excluding ventricles |
| `MaskVol` | Mask Volume | mm³ | Number of voxels in brainmask × voxel volume |
| `BrainSegVol-to-eTIV` | Ratio of BrainSegVol to eTIV | unitless | Dimensionless ratio |
| `MaskVol-to-eTIV` | Ratio of MaskVol to eTIV | unitless | |
| `lhSurfaceHoles` | Number of defect holes in lh surfaces prior to fixing | unitless | Derived from Euler number: $(1 - e/2)$ |
| `rhSurfaceHoles` | Number of defect holes in rh surfaces prior to fixing | unitless | |
| `SurfaceHoles` | Total number of defect holes in surfaces prior to fixing | unitless | lh + rh |
| `eTIV` | Estimated Total Intracranial Volume | mm³ | See below |
| `sTIV` | Segmented Total Intracranial Volume | mm³ | From SynthSeg; when `--stiv` flag used |

Additional provenance lines appear in `aseg.stats` but not `aparc.stats`:

```
# SegVolFile mri/aseg.mgz 
# SegVolFileTimeStamp  <timestamp>
# ColorTable <path to ASegStatsLUT.txt>
# ColorTableTimeStamp <timestamp>
# InVolFile  mri/norm.mgz 
# InVolFileTimeStamp  <timestamp>
# InVolFrame 0 
# PVVolFile  mri/norm.mgz 
# PVVolFileTimeStamp  <timestamp>
# Excluding Cortical Gray and White Matter
# ExcludeSegId 0 2 3 41 42 
# VoxelVolume_mm3 1 
```

### Data Block Column Schema

```
# NRows 45 
# NTableCols 10 
# ColHeaders  Index SegId NVoxels Volume_mm3 StructName normMean normStdDev normMin normMax normRange
```

| Col | ColHeader | FieldName | Units | Description |
|-----|-----------|-----------|-------|-------------|
| 1 | `Index` | Index | NA | Sequential row number (1-based) |
| 2 | `SegId` | Segmentation Id | NA | Integer label value from the segmentation volume (from `ASegStatsLUT.txt`) |
| 3 | `NVoxels` | Number of Voxels | unitless | Count of voxels with this label in `aseg.mgz` |
| 4 | `Volume_mm3` | Volume | mm³ | Partial-volume corrected volume; uses PV volume (`--pv mri/norm.mgz`) when provided |
| 5 | `StructName` | Structure Name | NA | Anatomical label name from the color table |
| 6 | `normMean` | Intensity normMean | MR | Mean intensity in `norm.mgz` within this label |
| 7 | `normStdDev` | Intensity normStdDev | MR | Standard deviation of intensity |
| 8 | `normMin` | Intensity normMin | MR | Minimum intensity value in label |
| 9 | `normMax` | Intensity normMax | MR | Maximum intensity value in label |
| 10 | `normRange` | Intensity normRange | MR | `normMax - normMin` |

The intensity column names (`normMean`, etc.) are not hardcoded; they are
constructed from the `--in-intensity-name` argument (default: `norm`) and
`--in-intensity-units` argument (default: `MR`). When run with a different
intensity volume, the column headers change accordingly.

Format string for data rows: `%3d %3d  %8d %10.1f  %-30s %10.4f %10.4f %10.4f %10.4f %10.4f`

Example rows (subject bert):

```
  1   4      8303     8436.8  Left-Lateral-Ventricle            40.6134    15.2677    17.0000   100.0000    83.0000 
  2   5       553      581.2  Left-Inf-Lat-Vent                 65.5732    12.7424    25.0000    94.0000    69.0000 
  5  10      8218     7940.1  Left-Thalamus                     90.1603     7.6566    49.0000   108.0000    59.0000 
```

> [!gotcha] NVoxels vs. Volume_mm3
> `NVoxels` is the raw voxel count; `Volume_mm3` is the partial-volume corrected
> estimate. When the PV correction volume (`--pv`) is provided (as in the default
> `recon-all` call), `Volume_mm3` will differ from `NVoxels × VoxelVolume_mm3`
> because partial-volume voxels at boundaries are given fractional weight based
> on their intensity relative to the expected tissue intensity.

---

## The Global Measures Block in Detail

The `# Measure` lines serve as the primary interface for group-level analyses.
They are parsed by `asegstats2table` and `aparcstats2table` when generating
cross-subject tables. The format is:

```
# Measure <Category>, <ShortName>, <LongDescription>, <value>, <units>
```

- `<Category>` — groups related measures (e.g., `BrainSeg`, `Cortex`, `SupraTentorial`)
- `<ShortName>` — the token used by `--meas` flag in `asegstats2table`/`aparcstats2table`
- `<LongDescription>` — human-readable description
- `<value>` — floating-point value (format `%f` = 6 decimal places in `mri_segstats`; `%g` in `mris_anatomical_stats` for surface measures)
- `<units>` — `mm^3`, `mm^2`, `mm`, or `unitless`

### Estimated Total Intracranial Volume (eTIV)

eTIV is computed by `MRIestimateTIV()` as:

$$
\text{eTIV} = k \cdot |\det(\mathbf{M}_\text{tal})|
$$

where $\mathbf{M}_\text{tal}$ is the linear portion of the Talairach transform
read from `mri/transforms/talairach.xfm`, and $k = 1948.106$ (empirically
calibrated scale factor for `talairach.xfm`; a different value, 2150, was used
with [[lta-format|`talairach_with_skull.lta`]]). The Talairach transform maps subject space to
MNI305, so its determinant encodes the subject's head size relative to the atlas.

> [!gotcha] eTIV is not a direct measurement
> eTIV is an estimate derived from the affine Talairach registration determinant,
> not a direct segmentation of the intracranial cavity. It correlates with head
> size but is sensitive to registration quality. Subjects with poor Talairach
> registration will have unreliable eTIV. The SynthSeg-based `sTIV`
> (`SegmentedTotalIntraCranialVol`) is a direct segmentation and is generally
> more accurate when available.

---

## Other Stats Files

### `brainvol.stats`

Written by [[mri_brainvol_stats]] (a very simple wrapper around
`ComputeBrainVolumeStats2()`). Contains **only** `# Measure` lines with no data
table. This file acts as a cache: `mri_segstats` and `mris_anatomical_stats` read
it via `ReadCachedBrainVolumeStats()` to populate their own global measure
headers without recomputing. The measures it writes are identical in name and
meaning to those in `aseg.stats`, but with higher floating-point precision
(`%f` = 12 decimal places).

There is no header title line, no schema block, and no `ColHeaders` line. The
entire file is `# Measure` lines.

### `wmparc.stats`

Produced by `mri_segstats --seg mri/wmparc.mgz`. Uses the same format as
`aseg.stats` (segmentation variant). Parcellates white matter by proximity to
cortical parcellation regions. Uses `WMParcStatsLUT.txt` as its color table.
Global measures include `VentricleChoroidVol`, `lhCerebralWhiteMatterVol`,
`rhCerebralWhiteMatterVol`, `CerebralWhiteMatterVol`, `MaskVol`, `eTIV`, and
`sTIV`.

### `?h.BA_exvivo.stats` and `?h.BA_exvivo.thresh.stats`

Produced by [[mris_anatomical_stats]] using the Brodmann area ex vivo atlas
[[annotation-format|annotation]] (`?h.BA_exvivo.annot`). Identical format to `?h.aparc.stats`. The
`.thresh` variant applies a probability threshold to the atlas labels.

### `?h.w-g.pct.stats`

Produced by `mri_segstats` operating on the white–gray contrast map
(`surf/?h.w-g.pct.mgh`) projected onto the surface via the parcellation
annotation. Uses the **surface** variant of the schema (columns 3–4 become
`NVertices` and `Area_mm2` instead of `NVoxels` and `Volume_mm3`). Also includes
intensity statistics from the w-g contrast map (mean, std, min, max, range, and
SNR).

### `?h.curv.stats`

**Different format** — not a standard `.stats` table. Written by `mris_curvature_stats`
(a separate tool). Contains free-form text with raw curvature statistics
(surface integrals, vertex counts, area-normalized integrals). Not parseable by
`aparcstats2table` or `asegstats2table`.

### `entowm.stats` and `vsinus.stats`

Produced by `mri_segstats` with specialized segmentation volumes. Same format
as `aseg.stats`.

---

## Parsing Stats Files

### Shell one-liners

Extract structure name and volume from `aseg.stats`:
```bash
grep -v "^#" aseg.stats | awk '{print $5, $4}'
```

Extract a specific global measure (e.g., eTIV) from any stats file:
```bash
grep "^# Measure EstimatedTotalIntraCranialVol" aseg.stats | awk -F', ' '{print $4}'
```

Extract column headers (to know column positions):
```bash
grep "^# ColHeaders" lh.aparc.stats
```

### FreeSurfer tabulation scripts

`asegstats2table` and `aparcstats2table` are the standard tools for converting
multiple subjects' stats files into a cross-subject table suitable for
statistical modelling:

```bash
# Subcortical volumes for a group of subjects
asegstats2table --subjects sub-01 sub-02 sub-03 \
  --meas volume --tablefile aseg_volumes.txt

# Cortical thickness for a group of subjects  
aparcstats2table --subjects sub-01 sub-02 sub-03 \
  --hemi lh --meas thickness --tablefile lh_thickness.txt

# Extract a global measure (e.g., eTIV) alongside cortical measures
aparcstats2table --subjects sub-01 sub-02 sub-03 \
  --hemi lh --meas thickness \
  --common-parcs --tablefile lh_thickness.txt
```

Both scripts support `--meas` values that correspond to the `ColHeader` names
in the data block (`volume`, `thickness`, `area`, `meancurv`, etc.) and also
the `ShortName` tokens from `# Measure` lines when using `--all-segs` or similar
flags.

---

## Gotchas and Caveats

> [!gotcha] Column ordering is tool- and version-dependent
> Never parse stats files by fixed column position across different tools or
> FreeSurfer versions. Always check `# ColHeaders` or `# TableCol` definitions
> in the file being parsed. `mri_segstats` conditionally adds or removes columns
> depending on flags (`--in`, `--snr`, surface vs. volume mode).

> [!gotcha] `# Measure` units differ from data-row units
> Both blocks may contain volumes in mm³, but the `# Measure` lines for cortical
> thickness use mm and are scalars, while data rows contain both mm and mm²
> quantities in the same row. Do not apply a single unit assumption across all
> columns.

> [!gotcha] Excluded regions in cortical stats
> `mris_anatomical_stats` silently excludes four label names from the output:
> `unknown`, `corpuscallosum` (Desikan labels), `Medial_wall`, and `Unknown`
> (Destrieux labels). These are not errors or missing data — they represent
> non-cortical surface regions. The vertex and area counts for these regions are
> also excluded from the `# Measure Cortex, NumVert` and `WhiteSurfArea` global
> measures.

> [!gotcha] `aseg.stats` and `wmparc.stats` exclude cortical gray and white matter
> The default `recon-all` call to `mri_segstats` uses `--excl-ctxgmwm`, which
> excludes labels 2, 3, 41, 42 (cerebral white matter and cortex) from the data
> table. This is documented in the header as:
> `# Excluding Cortical Gray and White Matter` and `# ExcludeSegId 0 2 3 41 42`.
> The volumes of these regions are still reported in the `# Measure` lines.

> [!gotcha] Non-isotropic input requires `BrainVolStatsFixed`
> For subjects processed from non-1mm isotropic data, the raw voxel counts
> undercount volumes by a factor equal to the voxel volume. The header line
> `# BrainVolStatsFixed see surfer.nmr.mgh.harvard.edu/fswiki/BrainVolStatsFixed`
> indicates that a correction has been applied. When the line reads
> `# BrainVolStatsFixed-NotNeeded because voxelvolume=1mm3`, no correction is
> needed (the standard case).

> [!gotcha] Stats files from different FreeSurfer versions may differ
> The set of `# Measure` lines written by `mri_segstats` is conditional on
> command-line flags (`--brain-vol-from-seg`, `--surf-wm-vol`, `--surf-ctx-vol`,
> `--totalgray`, `--supratent`, `--euler`, `--etiv`, `--stiv`). Different
> FreeSurfer versions may change the default flags passed by `recon-all`, so the
> presence or absence of individual `# Measure` lines is not guaranteed across
> versions. Always check the `# cmdline` header to understand exactly which
> options were used.

> [!gotcha] `sTIV` requires SynthSeg and may not be present in older runs
> `SegmentedTotalIntraCranialVol` (`sTIV`) is only written when `mri_segstats`
> is called with `--stiv <file>`, pointing to a SynthSeg TIV estimate file
> (`stats/synthseg.tiv.dat`). This was introduced after FreeSurfer 7.3. Older
> stats files will not have this measure.

---

## Related Tools

- [[mris_anatomical_stats]] — writes cortical parcellation stats
- [[mri_segstats]] — writes segmentation stats
- [[mri_brainvol_stats]] — writes `brainvol.stats` cache
- [[aparcstats2table]] — tabulates cortical stats across subjects
- [[asegstats2table]] — tabulates segmentation stats across subjects
- [[mri_ca_label]] — produces the subcortical segmentation consumed by `mri_segstats`
- [[mris_ca_label]] — produces the cortical annotation consumed by `mris_anatomical_stats`

---

## Confidence and Gaps

**High confidence (verified from source code and on-disk examples):**
- All header line names and formats for both cortical and segmentation variants
- Column names, units, and ordering for both variants
- TH3 volume computation method and its use as the default
- eTIV formula and scale factor
- Conditional column presence in `mri_segstats` (surface vs. volume mode)
- Exclusion logic for medial wall and corpus callosum regions
- The `BrainVolStatsFixed` mechanism

> [!gap] `FoldInd` and `CurvInd` units in header vs. semantics
> The `# TableCol` headers declare both `FoldInd` and `CurvInd` as `unitless`,
> but the mathematical definitions involve integration against vertex area (mm²)
> and curvature (mm⁻¹ or mm⁻²), making the normalized result dimensionless only
> because of the $4\pi$ normalization. The physical interpretation of these indices
> in terms of surface geometry has not been confirmed against primary literature.
> Koenderink (1990) is the original reference for curvature indices.

> [!gap] Partial-volume correction details in `mri_segstats`
> The exact algorithm used to compute `Volume_mm3` when `--pv` is provided has
> not been traced to source. The code calls internal PV correction routines but
> the precise model (e.g., linear intensity model, mixture model) is not
> documented here.

> [!gap] `lh.curv.stats` format
> The `lh.curv.stats` file produced by `mris_curvature_stats` uses a completely
> different free-form text format. That tool has not been analyzed here.
