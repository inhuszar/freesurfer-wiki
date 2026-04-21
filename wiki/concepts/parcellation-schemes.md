---
title: "Cortical Parcellation Schemes"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mris_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[mris_anatomical_stats]]"
  - "[[mri_segstats]]"
  - "[[mri_label2vol]]"
  - "[[freeview]]"
related_concepts:
  - "[[surface-representations]]"
  - "[[registration-overview]]"
  - "[[coordinate-systems]]"
  - "[[color-lut]]"
related_formats:
  - "[[annotation-format]]"
  - "[[ctab-format]]"
  - "[[gcsa-format]]"
  - "[[subject-directory]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - parcellation
  - cortex
  - atlas
  - segmentation
---

# Cortical Parcellation Schemes

## Overview

A cortical parcellation assigns each vertex on the reconstructed cortical surface
to a named anatomical region. The result is stored as an annotation file
(`?h.*.annot`; see [[annotation-format]]) in which every vertex carries an
integer label that indexes a colour table. Parcellations serve as the primary
basis for morphometric reporting: [[mris_anatomical_stats]] computes surface
area, cortical thickness, and grey-matter volume per parcel; [[mri_aparc2aseg]]
(and its successor `mri_surf2volseg` in recon-all 8.x) projects those labels
into a 3D volumetric space for voxel-based analyses.

FreeSurfer ships **three standard cortical parcellation schemes**, each covering
a different grain of anatomical detail and each associated with its own Gaussian
Classifier Surface Atlas (GCSA, `.gcs` file). All three are run automatically
by `recon-all` during the autorecon3 stage. The labelling engine for all three
is [[mris_ca_label]], and volumetric projection is performed by `mri_surf2volseg`
(called via the `-aparc2aseg` recon-all flag).

The GCSA atlas classifier works entirely in the spherical surface domain: it
reads the subject's registered sphere (`?h.sphere.reg`) produced by
[[mris_register]], and looks up per-vertex geometric features (curvature, sulcal
depth) in the atlas to assign the most probable anatomical label. The label
quality therefore depends critically on the quality of spherical registration.

---

## The Three Standard Schemes

### a. Desikan-Killiany (DK40 / `aparc`)

| Property | Value |
|----------|-------|
| Full name | Desikan-Killiany atlas |
| Common abbreviation | DK40, `aparc` |
| Original publication | Desikan et al. (2006) *NeuroImage* 31(3):968–980 |
| Lead PI | Rahul Desikan, Bruce Fischl |
| Labels per hemisphere | 35 named gyral regions + 1 unknown (index 0) |
| Surface annotation | `label/?h.aparc.annot` |
| GCS atlas file | `$FREESURFER_HOME/average/?h.DKaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs` |
| Volumetric output | `mri/aparc+aseg.mgz` |
| Stats output | `stats/?h.aparc.stats` |
| recon-all stage flag | `-cortparc` |
| Volume label base | LH cortex +1000, RH cortex +2000 |

The DK40 scheme parcellates the cortex into 35 gyral units per hemisphere,
defining boundaries along major sulci. The regions are macroscopic and
correspond to landmarks familiar from classical neuroanatomy. This scheme is the
default FreeSurfer parcellation and the most widely used for clinical reporting
and between-cohort comparisons in the neuroimaging literature.

The 36-entry colour table (index 0 = unknown through index 35 = insula) is
shipped as `$FREESURFER_HOME/average/colortable_desikan_killiany.txt`. In
`FreeSurferColorLUT.txt`, left hemisphere cortical labels span **1000–1035** and
right hemisphere cortical labels span **2000–2035**. White matter labels span
**3000–3035** (LH) and **4000–4035** (RH).

**Full DK40 label list (surface indices 0–35):**

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | unknown | 18 | parsopercularis |
| 1 | bankssts | 19 | parsorbitalis |
| 2 | caudalanteriorcingulate | 20 | parstriangularis |
| 3 | caudalmiddlefrontal | 21 | pericalcarine |
| 4 | corpuscallosum | 22 | postcentral |
| 5 | cuneus | 23 | posteriorcingulate |
| 6 | entorhinal | 24 | precentral |
| 7 | fusiform | 25 | precuneus |
| 8 | inferiorparietal | 26 | rostralanteriorcingulate |
| 9 | inferiortemporal | 27 | rostralmiddlefrontal |
| 10 | isthmuscingulate | 28 | superiorfrontal |
| 11 | lateraloccipital | 29 | superiorparietal |
| 12 | lateralorbitofrontal | 30 | superiortemporal |
| 13 | lingual | 31 | supramarginal |
| 14 | medialorbitofrontal | 32 | frontalpole |
| 15 | middletemporal | 33 | temporalpole |
| 16 | parahippocampal | 34 | transversetemporal |
| 17 | paracentral | 35 | insula |

Source: `$FREESURFER_HOME/average/colortable_desikan_killiany.txt`

**Typical use cases:** Reporting ROI-averaged cortical thickness, surface area,
or grey-matter volume in clinical and large-scale epidemiological studies; input
to downstream parcellation-based connectivity analyses.

---

### b. Destrieux 2009 (`aparc.a2009s`)

| Property | Value |
|----------|-------|
| Full name | Destrieux sulco-gyral atlas (2009 update) |
| Common abbreviation | `a2009s`, Destrieux |
| Original publication | Destrieux et al. (2010) *NeuroImage* 53(1):1–15 |
| Lead PI | Christophe Destrieux |
| Labels per hemisphere | 75 named sulco-gyral regions + 1 unknown (index 0) |
| Surface annotation | `label/?h.aparc.a2009s.annot` |
| GCS atlas file | `$FREESURFER_HOME/average/?h.CDaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs` |
| Volumetric output | `mri/aparc.a2009s+aseg.mgz` |
| Stats output | `stats/?h.aparc.a2009s.stats` |
| recon-all stage flag | `-cortparc2` |
| Volume label base | LH cortex +11100, RH cortex +12100 |

The Destrieux scheme distinguishes sulci and gyri as separate anatomical
entities, yielding approximately twice the spatial resolution of DK40. Each of
the 75 named regions per hemisphere is designated as either a gyrus (`G_`) or a
sulcus (`S_`), with a small number of combined structures (`G_and_S_`). This
makes the atlas suitable for studies of cortical folding, where sulcal and gyral
characteristics are biologically distinct.

The label table is in `$FREESURFER_HOME/Simple_surface_labels2009.txt`
(76 entries, indices 0–75). In `FreeSurferColorLUT.txt`, left hemisphere
volumetric labels span **11100–11175** and right hemisphere labels span
**12100–12175**. The suffix "a2009s" stands for "atlas 2009 sulci," denoting the
2009 revision of the Destrieux sulcal atlas that separately labels sulcal floors.

> [!gotcha] Destrieux volume label offset is different from DK40
> The DK40 volumetric labels are `annotationIndex + 1000` (LH) and `+ 2000` (RH).
> The Destrieux volumetric labels are `annotationIndex + 11100` (LH) and `+ 12100`
> (RH). This is set in `recon-all` as `lhbase=11100 / rhbase=12100` when calling
> `mri_surf2volseg --label-cortex`. The old `mri_aparc2aseg --a2009s` flag used
> `baseoffset=10100`, which adds to the per-hemisphere offsets of 1000/2000,
> arriving at the same 11100/12100 result. These are distinct ranges from the DK40
> labels and require the appropriate LUT section in `FreeSurferColorLUT.txt` to be
> named correctly.

**Selected Destrieux labels (surface index, name):**

The 75 named regions include structures such as:
- Gyri: `G_front_sup` (16), `G_precentral` (29), `G_postcentral` (28),
  `G_parietal_sup` (27), `G_temporal_middle` (38), `G_occipital_sup` (20)
- Sulci: `S_central` (46), `S_front_sup` (55), `S_postcentral` (68),
  `S_temporal_sup` (74), `S_calcarine` (45)
- Combined: `G_and_S_frontomargin` (1), `G_and_S_paracentral` (3),
  `G_and_S_cingul-Ant` (6), `G_and_S_cingul-Mid-Ant` (7)

Full label list: `$FREESURFER_HOME/Simple_surface_labels2009.txt`

**Typical use cases:** Studies explicitly targeting sulcal morphology; cortical
thickness analyses where gyral and sulcal tissue are expected to have different
developmental or disease-related trajectories.

---

### c. DKT Atlas (`aparc.DKTatlas`)

| Property | Value |
|----------|-------|
| Full name | Mindboggle-101 DKT cortical labeling protocol |
| Common abbreviation | DKTatlas, DKT |
| Original publication | Klein & Tourville (2012) *Frontiers in Neuroscience* 6:171 |
| Lead PI | Arno Klein, Jason Tourville |
| Labels per hemisphere | 31 named gyral regions |
| Surface annotation | `label/?h.aparc.DKTatlas.annot` |
| GCS atlas file | `$FREESURFER_HOME/average/?h.DKTaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs` |
| Volumetric output | `mri/aparc.DKTatlas+aseg.mgz` |
| Stats output | `stats/?h.aparc.DKTatlas.stats` |
| recon-all stage flag | `-cortparc3` |
| Volume label base | LH cortex +1000, RH cortex +2000 |

The DKT atlas is a curated subset of the DK40 labels, retaining 31 of the
35 named gyral regions. It was defined by Klein and Tourville as part of the
Mindboggle project to promote consistent cortical labelling across software
packages. Because it uses a subset of DK40 regions and the same +1000/+2000
volumetric offset scheme, its volumetric label integers partially overlap with
the DK40 range — but they are populated by a different atlas classifier.

> [!gotcha] DKTatlas is NOT a subset of DK40 in the volumetric output
> Although the DKTatlas uses the same 1000/2000 base offsets as DK40, the
> two parcellations produce different `aparc+aseg.mgz` volumes because the
> atlas classifiers are trained separately and the 31-label set does not include
> all 35 DK40 regions. Do not compare DK40's `aparc+aseg.mgz` with DKTatlas's
> `aparc.DKTatlas+aseg.mgz` by label integer alone — the same integer can
> correspond to different regions if the ctab ordering differs. Always use the
> colour table embedded in the annotation or in `FreeSurferColorLUT.txt` to look
> up names.

Also available is the `?h.DKTatlas100.gcs` and `?h.DKTatlas40.gcs` in
`$FREESURFER_HOME/average/`. The default in recon-all 8.x is
`?h.DKTaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs` (or the 2020 update if
the `-use-new-dkt` flag is passed).

**Typical use cases:** Cross-software compatibility with Mindboggle, ANTs
cortical thickness pipelines, and any analysis targeting the 31-label DKT
protocol; interoperability studies comparing FreeSurfer outputs with other
parcellation tools trained on the same protocol.

---

## Label Integer Encoding

### Surface annotation representation

In the `.annot` binary format (see [[annotation-format]]), each vertex stores a
packed RGB integer: the annotation value is `R + G*2^8 + B*2^16`. The colour
table (ctab) embedded in the file maps each unique annotation integer to a
label name and index. The surface index (ctab row number, 0-based) is what the
atlas classifier assigns and what appears in [[stats-format|stats files]]. It is **not** the
same as the volumetric label integer.

### Volumetric label offsets

When the surface annotation is projected into volumetric space by
`mri_surf2volseg --label-cortex` (or the legacy `mri_aparc2aseg`), each surface
annotation index `i` is mapped to a volume voxel integer by adding a
hemisphere- and scheme-specific base:

$$\text{volume\_label} = i + \text{base}$$

The bases for each scheme and hemisphere are defined in `recon-all` lines
5074–5080 and confirmed in `include/cma.h`:

| Scheme | LH cortex base | RH cortex base | LH WM base | RH WM base |
|--------|---------------|---------------|-----------|-----------|
| `aparc` (DK40) | 1000 | 2000 | 3000 | 4000 |
| `aparc.DKTatlas` | 1000 | 2000 | 3000 | 4000 |
| `aparc.a2009s` (Destrieux) | 11100 | 12100 | — | — |

WM labels for the Destrieux scheme are not generated by default recon-all; the
WM parcellation (`wmparc.mgz`) is always based on `aparc` (DK40), using bases
3000/4000.

The `unknown` label (surface index 0) maps to 1000 (LH) or 2000 (RH) in the
volume. These values indicate cortex with no valid parcellation assignment; they
do not appear in the FreeSurfer colour LUT as named regions.

### Complete volumetric integer ranges

**DK40 / DKTatlas (`aparc`, `aparc.DKTatlas`):**

| Range | Contents |
|-------|----------|
| 1000 | ctx-lh-unknown |
| 1001–1035 | ctx-lh-`<regionname>` (LH cortex) |
| 2000 | ctx-rh-unknown |
| 2001–2035 | ctx-rh-`<regionname>` (RH cortex) |
| 3000 | wm-lh-unknown |
| 3001–3035 | wm-lh-`<regionname>` (LH white matter, aparc only) |
| 4000 | wm-rh-unknown |
| 4001–4035 | wm-rh-`<regionname>` (RH white matter, aparc only) |

**Destrieux (`aparc.a2009s`):**

| Range | Contents |
|-------|----------|
| 11100 | ctx\_lh\_Unknown |
| 11101–11175 | ctx\_lh\_`<regionname>` (LH cortex, 75 regions) |
| 12100 | ctx\_rh\_Unknown |
| 12101–12175 | ctx\_rh\_`<regionname>` (RH cortex, 75 regions) |

Note the underscore separator in Destrieux volume labels (`ctx_lh_`) vs.
hyphen in DK40 volume labels (`ctx-lh-`). This is a historical artifact visible
in `FreeSurferColorLUT.txt` (lines 597–743 for DK40, lines 1669–1745 for
Destrieux).

### Relationship to subcortical (aseg) labels

The subcortical labels in `aseg.mgz` (e.g., Left_Caudate = 11, Left_Hippocampus
= 17) occupy entirely separate integer ranges and are defined in `cma.h`. The
aparc+aseg volumes are produced by replacing the aseg cortex label
(Left_Cerebral_Cortex = 3, Right_Cerebral_Cortex = 42) with the parcellation
integers from the table above. All other aseg labels are preserved unchanged.
This means `aparc+aseg.mgz` simultaneously contains parcellated cortical labels
(≥1000) and subcortical structure labels (<1000) in the same volume.

---

## The GCSA Classification Process

`mris_ca_label` implements the classification in four phases. See [[mris_ca_label]]
for full detail; a brief summary is provided here.

1. **Atlas loading.** The `.gcs` file (see [[gcsa-format]]) is read. It stores
   per-node Gaussian classifiers over the feature space {curvature, sulcal depth}
   in a spherical atlas parameterisation.

2. **Feature loading.** The subject's smoothwm surface curvature and sulcal depth
   (`?h.sulc`) are loaded and normalised. These are the same features the atlas
   was trained on.

3. **MAP labelling.** For each vertex, the tool identifies the atlas node at the
   corresponding `sphere.reg` location and selects the label with maximum
   posterior probability (`GCSAlabel()`).

4. **Gibbs reclassification and island removal.** The initial labelling is
   refined using a Markov Random Field (Gibbs) prior on label smoothness
   (`GCSAreclassifyUsingGibbsPriors()`), then small isolated label patches
   below `MIN_AREA_PCT` (default 0.1) of the mean parcel area are relabelled to
   their neighbourhood majority (`GCSArelabelIslands()`).

5. **Mode filter.** A spatial mode filter (default 10 iterations) smooths any
   remaining noise.

The GCSA atlas files in `$FREESURFER_HOME/average/` follow the naming pattern
`?h.<schemename>.atlas.acfb40.noaparc.i12.<date>.gcs`. The `acfb40` component
indicates the curvature-based feature set; `noaparc` indicates the atlas was
built without priors from a previous parcellation.

---

## Output Files in the Subject Directory

All paths are relative to `$SUBJECTS_DIR/<subject>/`.

| File | Scheme | Description |
|------|--------|-------------|
| `label/lh.aparc.annot` | DK40 | LH surface annotation (35 regions) |
| `label/rh.aparc.annot` | DK40 | RH surface annotation (35 regions) |
| `label/lh.aparc.a2009s.annot` | Destrieux | LH annotation (75 regions) |
| `label/rh.aparc.a2009s.annot` | Destrieux | RH annotation (75 regions) |
| `label/lh.aparc.DKTatlas.annot` | DKT | LH annotation (31 regions) |
| `label/rh.aparc.DKTatlas.annot` | DKT | RH annotation (31 regions) |
| `label/aparc.annot.ctab` | DK40 | Colour table written alongside annotation |
| `label/aparc.annot.a2009s.ctab` | Destrieux | Colour table |
| `label/aparc.annot.DKTatlas.ctab` | DKT | Colour table |
| `stats/lh.aparc.stats` | DK40 | Per-parcel morphometrics (area, thickness, volume) |
| `stats/rh.aparc.stats` | DK40 | |
| `stats/lh.aparc.a2009s.stats` | Destrieux | |
| `stats/rh.aparc.a2009s.stats` | Destrieux | |
| `stats/lh.aparc.DKTatlas.stats` | DKT | |
| `stats/rh.aparc.DKTatlas.stats` | DKT | |
| `mri/aparc+aseg.mgz` | DK40 | Surface parcellation projected to volume + subcortical aseg |
| `mri/aparc.a2009s+aseg.mgz` | Destrieux | |
| `mri/aparc.DKTatlas+aseg.mgz` | DKT | |
| `mri/wmparc.mgz` | DK40 only | WM parcellation based on DK40 nearest-cortex assignment |

Note: `wmparc.mgz` is generated only from the DK40 (`aparc`) annotation. There
is no corresponding WM parcellation for the Destrieux or DKT schemes in the
standard recon-all pipeline.

---

## Working with Parcellations

| Tool | Operation |
|------|-----------|
| [[mris_ca_label]] | Assigns parcel labels to surface vertices from a GCSA atlas |
| [[mri_aparc2aseg]] | Projects surface parcellation to volumetric voxels (legacy; replaced by `mri_surf2volseg` in recon-all 8.x) |
| [[mris_anatomical_stats]] | Computes per-parcel surface area, mean cortical thickness, and grey-matter volume |
| [[mri_segstats]] | Computes per-label volume statistics from `aparc+aseg.mgz` |
| [[mri_label2vol]] | Converts a `.annot` or `.label` file to a volumetric mask |
| [[mri_annotation2label]] | Splits a `.annot` into individual per-region `.label` files |
| [[freeview]] | Displays annotation overlay on the surface |
| `mris_ca_train` | Trains a new GCSA atlas from manually labelled subjects |

---

## Gotchas and Critical Misunderstandings

> [!gotcha] Surface indices are 0-based; volume labels have offsets added
> The annotation colour table assigns each region a 0-based index (e.g.,
> DK40 `bankssts` = 1). In the volumetric aparc+aseg.mgz, `bankssts` in
> the left hemisphere has integer label **1001** (= 1 + 1000). Stats files
> from [[mris_anatomical_stats]] report the surface index; stats from
> [[mri_segstats]] on the aparc+aseg volume report the volumetric integer.
> These are different numbers for the same region.

> [!gotcha] DKTatlas is NOT a synonym for DK40
> Both the DK40 ("Desikan-Killiany") atlas and the DKTatlas ("Desikan-Killiany-
> Tourville") atlas originate from the same group, use gyral nomenclature, and
> share the same volumetric base offsets (1000/2000). However, the DKT atlas
> has **31** regions (not 35), is trained from a different reference dataset
> (Mindboggle-101), and uses a different `.gcs` classifier file. Do not use the
> two interchangeably.

> [!gotcha] mri_segstats requires the full FreeSurfer colour LUT
> Running `mri_segstats` on `aparc+aseg.mgz` without specifying
> `--ctab $FREESURFER_HOME/FreeSurferColorLUT.txt` will produce output with
> unlabelled integer codes. The LUT maps the volumetric integers (1001, 2001,
> etc.) to human-readable region names.

> [!gotcha] Parcellation quality depends on sphere.reg quality
> `mris_ca_label` classifies vertices by looking up their position in
> `?h.sphere.reg`. If spherical registration ([[mris_register]]) to the [[fsaverage]]
> atlas failed or converged poorly, the parcellation will be inaccurate regardless
> of which scheme is used. Inspect `sphere.reg` overlay on `fsaverage` in
> [[freeview]] if parcellation results look anatomically implausible.

> [!gotcha] The `.a2009s` suffix does not mean "year 2009 atlas"
> The suffix stands for "atlas 2009 **sulci**" — it is the Destrieux scheme
> from the 2010 paper that explicitly labels sulcal floors as separate regions,
> distinguishing them from the gyri. The 2009 date in the suffix refers to the
> update year of the underlying sulcal labelling protocol, not the GCS file date.

> [!gotcha] Destrieux label naming: underscores vs. hyphens
> In `FreeSurferColorLUT.txt`, DK40 volumetric labels use hyphens as separators
> (e.g., `ctx-lh-bankssts`), while Destrieux volumetric labels use underscores
> (e.g., `ctx_lh_G_front_sup`). This historical inconsistency can cause
> confusion when parsing the LUT programmatically.

> [!gotcha] aparc+aseg.mgz is generated by mri_surf2volseg in recon-all 8.x
> Despite the recon-all flag name `-aparc2aseg` and the legacy tool
> `mri_aparc2aseg`, the actual command executed in recon-all 8.x is
> `mri_surf2volseg --label-cortex`. The `mri_aparc2aseg` binary is still
> available and still uses the `baseoffset` mechanism, but recon-all no longer
> calls it directly for this purpose.

---

## Adding a Custom Parcellation

To train a new cortical parcellation atlas for a novel labelling scheme or
a non-standard subject population, use `mris_ca_train`. The workflow requires:

1. A set of manually labelled training subjects, each with a registered sphere
   (`?h.sphere.reg`) and an annotation file (`?h.<yourscheme>.annot`) following
   the target label set.
2. `mris_ca_train` builds the GCSA atlas from those subjects.
3. The resulting `.gcs` file is passed to `mris_ca_label` via the atlas argument
   to label new subjects.

See the [[mris_ca_train]] wiki page for the full invocation syntax and options.

---

## Confidence and Gaps

**High-confidence information (from source code and on-disk files):**
- Atlas file names and locations verified from `recon-all` variable definitions
  (lines 290–308) and `$FREESURFER_HOME/average/` directory listing.
- Volumetric label offsets verified from `mri_aparc2aseg.cpp` (lines 836–839)
  and `recon-all` (lines 5074–5080 for `mri_surf2volseg` invocation).
- DK40 label list (36 entries, 0–35) verified from
  `$FREESURFER_HOME/average/colortable_desikan_killiany.txt`.
- Destrieux label count (76 entries, 0–75) verified from
  `$FREESURFER_HOME/Simple_surface_labels2009.txt`.
- DKT atlas region count (31 labels) verified from `wiki/formats/subject-directory.md`
  (cross-references `annotation-format.md`).
- Destrieux volumetric offsets (11100/12100) verified from `recon-all` lines
  5079–5080 and `FreeSurferColorLUT.txt` line 1663.
- `wmparc.mgz` uses DK40 only, confirmed from `recon-all` lines 5118–5131.

**Medium-confidence / gaps:**

> [!gap] DKT atlas exact label set not enumerated here
> The 31 DKT labels are a subset of DK40's 35, but the exact 4 labels
> excluded from DK40 to form the DKT set were not verified from source code in
> this session. Klein & Tourville (2012) Table 1 is the authoritative reference.
> Human verification recommended.

> [!gap] Destrieux WM parcellation
> Whether `mri_surf2volseg --label-wm` can produce WM labels for the Destrieux
> scheme (analogous to `wmparc.mgz` for DK40) was not confirmed. The standard
> recon-all pipeline does not do this. Needs developer confirmation.

> [!gap] mris_ca_train training subjects for shipped atlases
> The number and identity of the training subjects used to build
> `?h.DKaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs` and related files is
> not documented in the source code examined. The `buckner40` tag in some older
> atlas names suggests 40 training subjects; the `acfb40` in the current atlas
> names has a different meaning. Provenance of the shipped atlases needs
> confirmation from FreeSurfer documentation or developers.
