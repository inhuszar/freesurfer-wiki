---
title: "mris_ca_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_ca_label/mris_ca_label.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_register]]"
  - "[[mri_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[mris_anatomical_stats]]"
  - "[[recon-all]]"
status: review
confidence: medium
last_agent_update: 2026-04-14
gaps:
  - "GCSAlabel() / GCSAreclassifyUsingGibbsPriors() / GCSArelabelIslands() implementations live in libgcsa and were not traced in detail"
  - "Exact feature normalisation used for curvature/sulcal-depth inputs (which_norm = NORM_MEAN) not traced beyond the constant"
tags:
  - surface
  - parcellation
  - atlas
  - cortex
  - autorecon3
---

# mris_ca_label

## Summary

`mris_ca_label` performs **cortical parcellation** by labeling each surface
vertex with a gyral/sulcal anatomical region according to a Gaussian
Classifier Surface Atlas (GCSA). Given a subject's registered sphere
(`?h.sphere.reg`) and the atlas (`.gcs` file), it classifies each vertex using
a probabilistic model of curvature and sulcal depth and writes the result as
an [[annotation-format|annotation file]] (`?h.aparc.annot`).

## Source Information

- **Language:** C++
- **Source file(s):** `mris_ca_label/mris_ca_label.cpp` (615 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_ca_label`
- **References:**
  - Fischl et al. (2004), Cerebral Cortex 14:11–22
  - Desikan et al. (2006), NeuroImage 31(3):968–80

## Purpose and Context

`mris_ca_label` is the cortical parcellation step. It assigns each vertex of
the cortical surface to one of 34 (Desikan–Killiany) or other atlas-defined
parcels. The parcellation is stored as a surface annotation file
(`?h.aparc.annot`) that maps vertex index → label name → RGB color.

The annotation is used for:
- [[mri_aparc2aseg]] — projecting cortical labels back into volume space
- [[mris_anatomical_stats]] — computing per-parcel morphometric statistics
- [[mris_ca_label]] (second call) — generating the a2009s parcellation
- Many surface-based group analysis tools

The tool reads a GCSA ([[gcsa-format|.gcs]]) atlas which encodes the
probability distribution of curvature and sulcal depth features at each
spherical location across a training population.

## Inputs

### Required Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `subject` | 1 | Subject name (used to locate surfaces and label directory) |
| `hemi` | 2 | Hemisphere (`lh` or `rh`) |
| `sphere.reg` | 3 | Registered sphere surface (e.g., `surf/lh.sphere.reg`) |
| `atlas.gcs` | 4 | GCSA atlas file (e.g., `$FREESURFER_HOME/average/lh.curvature.buckner40.filled.desikan_killiany.gcs`) |
| `outannot` | 5 | Output annotation file (e.g., `label/lh.aparc.annot`) |

### Input Assumptions

> [!assumption] sphere.reg must be registered to the same atlas space as gcs
> The `.gcs` atlas was created by training on surfaces aligned to a specific
> atlas. The `sphere.reg` must be registered to the same atlas (via
> [[mris_register]] / `rca-surfreg`). Mixing atlas registrations produces
> garbage parcellations. See [[registration-overview]] and
> [[surface-representations]].

> [!assumption] smoothwm is read as the original surface for metric properties
> The tool reads `smoothwm` (default `orig_name = "smoothwm"`) to obtain
> original surface metric properties. This must exist.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `label/?h.aparc.annot` | FreeSurfer annotation | Per-vertex parcellation label (Desikan–Killiany or other atlas) |
| (optional) `prob_fname` | — | Per-vertex classification probabilities |

The annotation assigns each vertex one of the atlas labels plus `unknown`
(label 0) for vertices not confidently classified. The annotation is
color-coded using the atlas's [[color-lut|color table]].

## Mathematical Foundations

### GCSA Classification

Each GCSA atlas node (at a spherical location) stores a Gaussian mixture model
over the feature space (curvature and sulcal depth). Classification uses MAP
assignment:

$$l^*(v) = \arg\max_l \; p(l | \theta_{\text{atlas}(\phi(v))}) \cdot p(\mathbf{f}(v) | l, \theta_{\text{atlas}(\phi(v))})$$

where:
- $\phi(v)$ = spherical coordinates of vertex $v$ in `sphere.reg`
- $\mathbf{f}(v)$ = feature vector at $v$ (curvature on inflated surface, sulcal depth)
- $\theta_{\text{atlas}(\phi(v))}$ = GCSA parameters at that spherical location

> [!gap] Full GCSAclassify() algorithm not traced
> The MAP classification inside `GCSAclassify()` is in the shared `gcsa` library.
> The exact feature normalisation and mixing model were not traced.

### Small-region filtering

After Gibbs reclassification, `GCSArelabelIslands(gcsa, mris, 5, MIN_AREA_PCT)`
dissolves connected components whose area fraction is below `MIN_AREA_PCT`
(default `0.1` = 10% of mean parcel area, configurable via `-minarea`) into
the surrounding majority label. The hard-coded `5` is the minimum island size
in vertices. Finally `MRISmodeFilterAnnotations(mris, filter)` applies
`filter` (default 10, configurable via `-f`) passes of mode filtering for
spatial smoothness.

### Unknown relabeling with cortex label (`-l`)

When `-l cortex.label` is provided, `relabel_unknowns_with_cortex_label` runs
after mode filtering. The local function (lines 537–614 of
`mris_ca_label.cpp`) does:

1. Look up the annotation IDs for `Medial_wall`, `unknown`, and
   `corpuscallosum` in the colour table; collect the ones that exist into an
   `exclude_list`.
2. Mark every vertex of the cortex label using `LabelMark`.
3. For each vertex:
   - If it is **not** in the cortex label, force its annotation to `0`
     (transparent / no label).
   - If it **is** in the cortex label and currently carries an annotation in
     `exclude_list` (or `<= 0`), mark it `MARK_RELABEL`.
4. Call `GCSAreclassifyMarked(gcsa, mris, MARK_RELABEL, exclude_list, nexcluded)`
   which re-runs the GCSA classifier on the marked vertices, forbidding any
   label in `exclude_list`. This yields a cortical (non-medial-wall) label
   for every cortex-label vertex.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `subject` | positional | — | Subject directory name (resolved against `SUBJECTS_DIR`) |
| `hemi` | positional | — | `lh` or `rh` |
| `sphere.reg` | positional | — | Canonical (spherical) surface name read via `MRISreadCanonicalCoordinates` (e.g. `sphere.reg`) |
| `atlas.gcs` | positional | — | GCSA atlas file (read with `GCSAread`) |
| `outannot` | positional | — | Output annotation file path |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override SUBJECTS_DIR for this run |
| `-aseg <vol>` | string | unset | Read an aseg volume (any MRI format) and call `GCSArelabelWithAseg` to correct vertices that fall on the medial wall using subcortical labels |
| `-surf_dir <name>` | string | `surf` | Subject subdirectory containing the input surface (instead of `surf`) |
| `-orig <name>` | string | `smoothwm` | Basename of the original (white-matter) surface read for metric properties (`<subject>/<surf_dir>/<hemi>.<name>`) |
| `-nbrs <n>` | int | `2` | Neighbourhood ring size set via `MRISresetNeighborhoodSize` before classification |
| `-novar` | bool | OFF | Replace all GCSA covariance matrices with the identity (`GCSAsetCovariancesToIdentity`); equivalent to using mean-only matching |
| `-minarea <pct>` | float [0,1] | `0.1` | Minimum area fraction passed to `GCSArelabelIslands` (parcels smaller than this fraction are dissolved into neighbours); aborts if outside [0,1] |
| `-seed <n>` | long | unset | Seed the random-number generator (`setRandomSeed`) for reproducible Gibbs reclassification |
| `-l <label>` | string | unset | Read a `.label` file (typically `?h.cortex.label`) and run `relabel_unknowns_with_cortex_label` after classification: vertices outside the label are forced to `unknown`, vertices inside the label whose annotation is `unknown`/`Medial_wall`/`corpuscallosum` are reclassified by `GCSAreclassifyMarked` |
| `-long` | bool | OFF | Longitudinal refine mode: sets `refine=1`. Combined with `-r`, the input annotation read from `-r` is refined by one Gibbs reclassification + island relabelling pass instead of being relabelled from scratch |
| `-r <annot>` | string | unset | Skip fresh classification and instead read a precomputed annotation as starting point. Without `-long` the annotation is just mode-filtered and written; with `-long` it is refined |
| `-p <file>` | string | unset | Write per-vertex classification posterior probabilities (output of `GCSAlabel`) as an MRI file |
| `-f <n>` | int | `10` | Number of `MRISmodeFilterAnnotations` passes applied before writing the output |
| `-t <annot>` | string | unset | Load a named annotation/colour table via `read_named_annotation_table` (overrides the one packaged in the `.gcs`) |
| `-v <vno>` | int | unset | Set `Gdiag_no` to print diagnostic information about a single vertex through the pipeline |
| `-w <iters> <fname>` | int + string | unset | Write GCSA snapshot annotations every `<iters>` Gibbs iterations to files prefixed by `<fname>` (sets `gcsa_write_iterations` and `gcsa_write_fname`) |
| `-ml-annot <gcs> <icoorder> <outannot>` | string + int + string | — | Standalone mode: load the named GCSA from `$FREESURFER_HOME/average/<gcs>`, build the most-likely labelling on an icosahedral mesh of order `<icoorder>` (typically 7) via `GCSAbuildMostLikelyLabels`, mode-filter twice and write `<outannot>`. The tool exits without touching the positional arguments |
| `-help`, `--help`, `-usage`, `--usage`, `-h`, `-u` | bool | — | Print XML-formatted help and exit |
| `-version`, `--version` | bool | — | Print version string and exit |

Flag names are matched case-insensitively by the parser (`stricmp`), so `-NOVAR`, `-novar`, and `-NoVar` are equivalent.

### Configuration Interactions

> [!gotcha] `-aseg` and `-l` flags both used in recon-all
> recon-all uses both `-l ../label/$hemi.cortex.label` and
> `-aseg ../mri/$AsegForSurf`. The cortex label constrains which vertices
> are labeled (forcing non-cortex vertices to `unknown`); the aseg provides
> subcortical/midline information used by `GCSArelabelWithAseg` to correct
> the labelling near the medial wall. The two are independent and can be
> used together or separately.

> [!gotcha] `-long` only acts when combined with `-r`
> `-long` sets the internal `refine` flag, but the refinement branch is only
> entered when an existing annotation is read in via `-r <annot>`. Used alone,
> `-long` has no effect because the code falls through to the normal
> `GCSAlabel` → Gibbs → island-relabel path. In recon-all longitudinal mode
> the call is `-long -R $longbasedir/label/$hemi.aparc.annot`.

> [!gotcha] `-r` short-circuits fresh classification
> When `-r` is supplied, `GCSAlabel` and the initial Gibbs pass are skipped
> entirely; the code only mode-filters the loaded annotation (and refines it
> if `-long` is also set). This means `-r` alone produces a cleaned-up copy
> of the input annotation, not a fresh parcellation.

> [!gotcha] `-ml-annot` is a standalone subcommand
> `-ml-annot` ignores the five positional arguments and exits after writing
> its own output. It cannot be combined with normal classification options.

## Typical Use Cases

### Use Case 1: Standard cortical parcellation (recon-all)

```bash
mris_ca_label \
    -l ../label/lh.cortex.label \
    -aseg ../mri/aseg.presurf.mgz \
    subjid lh \
    ../surf/lh.sphere.reg \
    $FREESURFER_HOME/average/lh.curvature.buckner40.filled.desikan_killiany.gcs \
    ../label/lh.aparc.annot
```

### Use Case 2: Destrieux (a2009s) parcellation

```bash
mris_ca_label \
    -l ../label/lh.cortex.label \
    -aseg ../mri/aseg.presurf.mgz \
    subjid lh \
    ../surf/lh.sphere.reg \
    $FREESURFER_HOME/average/lh.CDaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs \
    ../label/lh.aparc.a2009s.annot
```

## Pipeline Context

**autorecon3 — Cortical Parcellation stage** ([[recon-all]] lines 4339–4375)

```
rca-surfreg → lh.sphere.reg
                    ↓
  mris_ca_label subjid lh sphere.reg $CPAtlas label/lh.aparc.annot
                    ↓
            label/lh.aparc.annot
                    ↓
    mri_aparc2aseg → mri/aparc+aseg.mgz
    mris_anatomical_stats → stats/lh.aparc.stats
```

**recon-all exact command (lines 4350–4359):**

```bash
mris_ca_label [$-l ../label/$hemi.cortex.label] [$-aseg ../mri/$AsegForSurf] \
    [$-seed $RngSeed] [$-long -R $longbasedir/label/$hemi.aparc.annot] \
    $subjid $hemi ../surf/$hemi.sphere.reg $CPAtlas ../label/$hemi.aparc.annot
```

Default atlas (`$GCS`): `lh.curvature.buckner40.filled.desikan_killiany.gcs`

Multiple parcellation schemes are produced in sequence (aparc, a2009s,
DKTatlas40) by calling `mris_ca_label` with different atlas files.

## Gotchas and Caveats

> [!gotcha] Result depends on sphere.reg quality
> Poor spherical registration (due to unusual folding patterns, low-quality
> data, or skull-stripping failures) directly degrades parcellation quality.
> `?h.aparc.annot` quality should be checked in [[freeview]] before proceeding.

> [!gotcha] Three parcellation schemes in autorecon3
> recon-all runs `mris_ca_label` three times per hemisphere: once for
> `aparc` (Desikan–Killiany), once for `aparc.a2009s` (Destrieux), and once
> for `aparc.DKTatlas` (DKT atlas). All use the same registered sphere but
> different GCS atlas files.

## Related Tools

- [[mris_register]] — produces `?h.sphere.reg` (registration input)
- [[mri_ca_label]] — volumetric subcortical segmentation (complementary)
- [[mri_aparc2aseg]] — projects cortical labels to volume space
- [[mris_anatomical_stats]] — computes morphometric statistics per parcel

## Confidence and Gaps

Confidence **medium** — recon-all call sites and flags confirmed; GCSA
classification algorithm not fully traced.

## References

- Fischl, B., van der Kouwe, A., Destrieux, C., Halgren, E., Ségonne, F.,
  Salat, D.H., Busa, E., Seidman, L.J., Goldstein, J., Kennedy, D., et al.
  (2004). *Automatically Parcellating the Human Cerebral Cortex.* Cerebral
  Cortex, 14:11–22.
- Desikan, R.S., Ségonne, F., Fischl, B., Quinn, B.T., Dickerson, B.C.,
  Blacker, D., Buckner, R.L., Dale, A.M., Maguire, R.P., Hyman, B.T., et al.
  (2006). *An automated labeling system for subdividing the human cerebral
  cortex on MRI scans into gyral based regions of interest.* NeuroImage,
  31(3):968–980.
