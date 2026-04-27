---
title: "mri_glmfit — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 17
last_agent_update: 2026-04-27
tags:
  - faq
  - mri_glmfit
  - statistics
  - fsgd
  - contrasts
  - clustering
---

# mri_glmfit — Frequently Asked Questions

This FAQ collects recurring questions about [[mri_glmfit]] and its
companion tools that have been answered by the FreeSurfer developers
(primarily Douglas Greve and Martin Reuter) on the mailing list.
`mri_glmfit` performs vertex-wise / voxel-wise general linear modelling
on FreeSurfer surface or volume data; [[mri_glmfit-sim]] applies
clusterwise multiple-comparisons correction via Monte Carlo Z (MCZ)
simulation; [[mri_volcluster]] and the `vlrmerge` script summarise and
visualise the resulting clusters; [[mri_fdr]] applies FDR correction.
Designs are usually expressed via an FSGD file (see [[fsgd-format]])
plus one or more `.mtx` contrast files. The entries below cover design
specification, contrast construction, cluster correction, and
special-case designs (single-subject longitudinal, LME, custom ROIs).

> For tool reference, see [[mri_glmfit]], [[mri_glmfit-sim]],
> [[mri_volcluster]], [[mri_fdr]] and [[mri_segstats]]. For the FSGD
> file format itself, see [[fsgd-format]].

---

## Design matrices and FSGD

### qdec is missing or broken in my FreeSurfer install — how do I run a vertex-wise GLM now?

**Short answer:** `qdec` is deprecated and unsupported in FreeSurfer 7.x and 8.x; build the FSGD file by hand and run the [[mris_preproc]] -> [[mri_surf2surf]] -> [[mri_glmfit]] command-line workflow instead.

**Detail:** Greve was unambiguous: "It is worse — we do not support qdec anymore." There is no maintained replacement GUI, and any tutorial that still references qdec as a current tool is outdated. The variable-count limits that the old qdec GUI enforced (e.g. "two continuous variables and two discrete variables with two levels") never applied at the [[fsgd-format]] level — `mri_glmfit` itself accepts any number of covariates that fit in the design matrix. The current correct workflow is:

```bash
# 1. Stack per-subject data on fsaverage
mris_preproc \
  --fsgd subjects.fsgd \
  --cache-in thickness.fwhm10.fsaverage \
  --target fsaverage \
  --hemi lh \
  --out lh.thickness.sm10.mgh

# 2. (optional) extra smoothing
mri_surf2surf --hemi lh --s fsaverage \
  --sval lh.thickness.sm10.mgh --fwhm 10 \
  --tval lh.thickness.sm10.mgh

# 3. Fit the GLM
mri_glmfit \
  --y lh.thickness.sm10.mgh \
  --fsgd subjects.fsgd doss \
  --C contrast.mtx \
  --surf fsaverage lh --cortex \
  --glmdir lh.thickness.glm
```

**Provenance:** Mailing list, 2023-08-07 and 2023-10-12 (Greve). See `raw/mailing-list/2023-08-qdec-deprecated-fsgd-manual-creation.md` and `raw/mailing-list/2023-10-qdec-deprecated-mri-glmfit-fsgd-multiple-continuous-vars.md`.

**Related:** [[mri_glmfit]], [[mris_preproc]], [[mri_surf2surf]], [[fsgd-format]]

---

### Should I code group membership as a Class or as a numeric Variable in my FSGD file?

**Short answer:** Always use `Class` for group membership — encoding categories as numeric values silently imposes a linear/dose-response assumption that is almost always wrong.

**Detail:** Two FSGD files that look superficially equivalent are not. The Class form,

```
GroupDescriptorFile 1
Class Patients
Class Controls
Variables Age
Input sub-01 Patients 52
Input sub-02 Controls 48
```

gives each group its own intercept and makes no assumption about the ordering or scaling of groups. The numeric form,

```
GroupDescriptorFile 1
Class Main
Variables Group Age
Input sub-01 Main 1 52
Input sub-02 Main 2 48
```

treats `Group` as a continuous predictor: coding `Group=1` vs `Group=2` implicitly asserts that the effect of being in Group 2 is exactly twice that of Group 1. As Greve put it, this is like predicting "females will have twice the thickness as males" if sex were coded 1/2. Use a continuous Variable only when the variable genuinely has linear meaning (age, IQ, symptom severity).

**Provenance:** Mailing list, 2024-05-01 (Greve). See `raw/mailing-list/2024-05-fsgd-categorical-groups-class-not-continuous.md`.

**Related:** [[fsgd-format]], [[mri_glmfit]]

---

### My nuisance model has age, age-squared, age-by-sex, sex, site, and head size — can FSGD express that?

**Short answer:** No — FSGD only supports DOSS or DODS interaction patterns; for arbitrary mixtures (polynomials, partial interactions, multi-site crossed with sex), build the design matrix yourself and pass it to `mri_glmfit --X` instead of `--fsgd`.

**Detail:** FSGD natively offers two interaction structures: DOSS (different offsets, same slope) and DODS (different offsets, different slopes — full class-by-covariate interaction). It cannot express, for example, an `age^2` polynomial term, a single shared `age*sex` interaction column, or site crossed with sex while age is shared. Greve's recommended workaround is to bypass FSGD entirely:

```bash
mri_glmfit \
  --y lh.thickness.10.mgh \
  --X design_matrix.txt \
  --C contrast.mtx \
  --surf fsaverage lh \
  --glmdir glmdir/
```

The `--X` matrix is a plain-text file with one row per subject and one column per regressor — you control the layout exactly. A typical pattern for a sex-by-site ANCOVA with age and age-squared is one indicator column per (sex, site) cell, one column for `age^2` (demeaned), separate `age*Male` / `age*Female` columns (zero outside the relevant sex), and a column for ICV. Contrast vectors then index the columns of `X` directly.

**Provenance:** Mailing list, 2023-09-10 (Greve). See `raw/mailing-list/2023-09-mri-glmfit-custom-design-matrix-x-flag-complex-nuisance.md`. See also the FsgdExamples wiki page at `https://surfer.nmr.mgh.harvard.edu/fswiki/FsgdExamples`.

**Related:** [[mri_glmfit]], [[fsgd-format]]

---

### `mri_glmfit` truncates my output — large patches of cortex are zero in `mask.mgh`. Why?

**Short answer:** By default `mri_glmfit` prunes any vertex that is zero in *any* subject; the mask is the intersection of non-zero support across the input frames.

**Detail:** When `mri_glmfit` reads the stacked `--y` overlay it inspects every frame (subject) at every vertex. If a single subject has a zero value at a given vertex, that vertex is excluded from the analysis mask and zeroed in all output maps. The result is an output that looks "chopped" relative to the user's mental model. This is common in PETSurfer / ASL pipelines where one subject's projection (e.g. `mri_vol2surf --projfrac`) lands outside the cortex, or where partial-FOV data was zero-padded before `mris_preproc`. Diagnose by loading the stacked input as a multi-frame overlay in FreeView and scrolling through subjects to find the culprit. Workarounds: drop the offending subject and rerun, or pass a pre-computed common mask via `--mask`.

> [!gotcha] The pruning is silent — there is no warning that subjects are
> driving the mask. Always inspect `mask.mgh` against your expected
> cortical coverage before interpreting results.

**Provenance:** Mailing list, 2023-10-15 (Greve). See `raw/mailing-list/2023-10-mri-glmfit-mask-pruning-zero-subject-voxel.md`.

**Related:** [[mri_glmfit]], [[mris_preproc]]

---

## Contrasts (DOSS vs DODS)

### What's the difference between DOSS and DODS, and how does it change my contrast vector?

**Short answer:** DOSS estimates one slope per covariate shared across all classes; DODS estimates a separate slope per class — the contrast vector indexes a different number of columns in each case.

**Detail:** With *k* classes and *m* continuous covariates, the design matrix has

- DOSS: *k* class-intercept columns + *m* covariate columns (one shared slope each) -> *k + m* columns total
- DODS: *k* class-intercept columns + *k * m* class-by-covariate columns (a separate slope per class per covariate) -> *k + k*m* columns total

For a 2-class design with one covariate, the contrast that tests "main effect of covariate, averaged across both classes" is `0 0 1` under DOSS but `0 0 0.5 0.5` under DODS (averaging the two per-class slopes). For Greve's worked 4-class example (Female/Male x CU/CI) with two covariates (age, biomarker) under DOSS, a contrast like `0 0 0 0 0.5 -0.5 0.5 -0.5 0 0 ...` tests a difference in the biomarker effect between the diagnostic groups. Use DOSS when biology says all groups share one slope and you only want to test that shared slope; use DODS when slopes can plausibly differ between groups.

**Provenance:** Mailing list, 2023-08-20 and 2023-11-02 (Greve). See `raw/mailing-list/2023-08-mri-glmfit-doss-partial-correlation-3-groups.md` and `raw/mailing-list/2023-11-mri-glmfit-doss-dods-contrast-construction.md`.

**Related:** [[mri_glmfit]], [[fsgd-format]]

---

### How do I do a partial correlation between thickness and a covariate while controlling for 3-group membership?

**Short answer:** Use a DOSS design with three classes and one continuous covariate, then test the shared slope with a contrast that is zero on the class intercepts and one on the covariate column.

**Detail:** This is the canonical "one factor, three levels, one covariate" setup. The FSGD file declares three classes and one Variable:

```
GroupDescriptorFile 1
Title ThreeGroupAgeDesign
Class Controls
Class Patients1
Class Patients2
Variables Age

Input sub-001 Controls 45.2
Input sub-002 Patients1 48.3
Input sub-003 Patients2 51.7
```

Run `mri_glmfit` with the `doss` modifier:

```bash
mri_glmfit \
  --y lh.thickness.sm10.mgh \
  --fsgd subjects.fsgd doss \
  --C age_effect.mtx \
  --surf fsaverage lh --cortex \
  --glmdir lh.thickness.glm
```

The DOSS design matrix has 4 columns (intercept_C1, intercept_C2, intercept_C3, age). The contrast for testing the shared age slope is:

```
0 0 0 1
```

This is the "partial correlation" answer: it tests whether age predicts thickness once the three group means have been removed. If you suspect that the age slope itself differs between groups, use DODS (or a custom `--X`) and contrast the per-group slope estimates instead.

**Provenance:** Mailing list, 2023-08-20 (Greve). See `raw/mailing-list/2023-08-mri-glmfit-doss-partial-correlation-3-groups.md`.

**Related:** [[mri_glmfit]], [[fsgd-format]]

---

### `MatrixReadTxT: could not scan value [1][1]` — what's wrong with my contrast file?

**Short answer:** Contrast `.mtx` files must contain only plain decimal numbers separated by whitespace; brackets, fractions, and word-processor artifacts cause the parser to fail.

**Detail:** The `MatrixReadTxT` reader does not evaluate expressions. A contrast written as `[1 1 1 -1 -1 -1 0 0 0 0]/3` will not parse — replace it with the evaluated decimal values:

```
.333 .333 .333 -.333 -.333 -.333 0 0 0 0
```

Other common causes of the same error:

- Square brackets: `[1 -1 0]` -> write `1 -1 0`.
- Word-processor save: MS Word, Google Docs, LibreOffice, etc. silently insert smart quotes, non-breaking spaces, or em-dashes when saving "plain text". Always create `.mtx` files in a code editor or from the shell, e.g. `echo ".333 .333 .333 -.333 -.333 -.333 0 0 0 0" > contrast.mtx`.
- Trailing punctuation, comments, or row labels.

To diagnose hidden characters:

```bash
file contrast.mtx
cat -A contrast.mtx     # shows hidden chars as ^X / M- sequences
od -c contrast.mtx      # full octal dump
```

**Provenance:** Mailing list, 2023-11-17 (Greve). See `raw/mailing-list/2023-11-mri-glmfit-contrast-file-no-math-brackets.md`.

**Related:** [[mri_glmfit]]

---

### Do I need separate contrasts for the positive and negative directions of an effect?

**Short answer:** No — a single signed contrast already produces both directions; positive effects show as red/yellow and negative effects as blue/cyan in the resulting significance map.

**Detail:** `mri_glmfit` writes signed `-log10(p)` significance maps, where the sign carries the direction of the effect. There is no need to run two separate analyses with opposite contrasts. When the signed significance map is rendered (in FreeView, [[mri_glmfit-sim]] cluster overlays, or `tksurfer`):

- Red/yellow = positive effect, `-log10(p)` above threshold
- Blue/cyan = negative effect, `-log10(p)` below the negated threshold

If you want only one direction shown, threshold or mask post-hoc.

**Provenance:** Mailing list, 2023-11-02 (Greve). See `raw/mailing-list/2023-11-mri-glmfit-doss-dods-contrast-construction.md`.

**Related:** [[mri_glmfit]], [[mri_glmfit-sim]]

---

## Cluster correction with mri_glmfit-sim

### Why did raising the cluster-forming threshold make my cluster *more* significant rather than less?

**Short answer:** Clusterwise p-values are not monotonic in the cluster-forming threshold — they depend on how rare the observed cluster size is in the null distribution at that threshold, which can shift in either direction.

**Detail:** Raising the vertex-level threshold shrinks clusters in both the real data and the Monte Carlo null. The clusterwise p-value is determined by how often the null produces a cluster of the observed size at that same threshold. If at threshold 2.0 your real cluster is moderately large and the null also commonly produces moderately large clusters, the cluster p-value is unimpressive; at threshold 2.3 your real cluster may be smaller, but if the null almost never produces a cluster that small *at that threshold*, the cluster p-value becomes more significant. Greve's caveat: this is expected behaviour, not a bug, and it makes post-hoc threshold shopping a serious researcher-degrees-of-freedom problem. Choose the cluster-forming threshold *a priori* on statistical grounds (e.g. `--cache 2.0 abs` for p<0.01 two-tailed), not by sweeping for the most significant outcome.

> [!gotcha] Sweeping `--cache` thresholds and reporting the best-looking
> result inflates type I error. Pick the threshold before looking at
> the cluster table.

**Provenance:** Mailing list, 2023-10-15 (Greve). See `raw/mailing-list/2023-10-mri-glmfit-sim-clusterwise-nonmonotonic-pvalue-threshold.md`.

**Related:** [[mri_glmfit-sim]], [[mri_glmfit]]

---

### `mri_glmfit-sim` rejects my custom threshold with `thresh = 1.6, must be 1.3, 2.0, 2.3, 3.0, 3.3, 4.0`. How do I add custom thresholds?

**Short answer:** Generate Monte Carlo simulation tables for the desired threshold with [[mri_mcsim]], then point `mri_glmfit-sim` at them via `--mczsim-dir`.

**Detail:** FreeSurfer ships pre-computed MCZ cluster tables in `$FREESURFER_HOME/average/mult-comp-cor/fsaverage/` for the standard threshold set (1.3, 2.0, 2.3, 3.0, 3.3, 4.0 in `-log10(p)` units). For non-standard thresholds (e.g. 1.6, equivalent to p ~ 0.025), the lookup fails and you get the error above. Two fixes:

1. Pass an explicit table directory (preferred — keeps installation clean):

```bash
mri_glmfit-sim --glmdir mydir/ \
  --cache 1.6 abs --cwpvalthresh 0.05 --2spaces \
  --mczsim-dir /path/to/custom/mcsim/tables
```

2. Drop the custom tables into the default location:

```bash
cp /path/to/custom/tables/* $FREESURFER_HOME/average/mult-comp-cor/fsaverage/
```

Either way, the tables themselves must first be produced by [[mri_mcsim]] for the relevant target subject (e.g. fsaverage), smoothing kernel, and threshold.

**Provenance:** Mailing list, 2024-11-07 (Greve). See `raw/mailing-list/2024-11-mri-glmfit-sim-custom-threshold-mczsim-dir.md`.

**Related:** [[mri_glmfit-sim]], [[mri_mcsim]], [[fsaverage]]

---

### Where are the per-subject mean values inside each significant cluster?

**Short answer:** `mri_glmfit-sim` writes them to `csdbase.y.ocn.dat` inside the contrast directory — one row per subject, one column per significant cluster.

**Detail:** Users frequently try to extract per-subject cluster averages by running `mri_cor2label` on the cluster mask and then `mris_anatomical_stats`, which gives empty or zero results because anatomical_stats expects parcellation labels with proper headers, not arbitrary cluster masks. The simpler path is the file `mri_glmfit-sim` already wrote: `csdbase.y.ocn.dat` is a plain-text matrix where each row is a subject (in the same order as the input `--y` frames) and each column is a cluster (ordered by the cluster table). Each value is the mean of the input measurement (e.g. cortical thickness) for that subject within that cluster — exactly what you need for downstream correlation with behaviour, plotting, or follow-up tests.

```bash
# After:
mri_glmfit-sim --glmdir glm_out/ --cwp 0.05 --2spaces --sim mc-z 5000 3 glm_out/sim
# the per-subject per-cluster matrix is at:
cat glm_out/<contrast>/csdbase.y.ocn.dat
```

The naming reflects the internals: `csdbase` = cluster simulation distribution base name, `y` = the input data, `ocn` = output cluster number map.

**Provenance:** Mailing list, 2023-08-21 (Greve). See `raw/mailing-list/2023-08-mri-glmfit-sim-csdbase-y-ocn-dat-cluster-subject-averages.md`.

**Related:** [[mri_glmfit-sim]], [[mri_glmfit]], [[mri_segstats]]

---

### Can `mri_fdr` be applied to a `-log10(p)` overlay that wasn't produced by `mri_glmfit`?

**Short answer:** Yes — [[mri_fdr]] is a standalone post-processing tool; it needs only a `-log10(p)` surface overlay and does not require any `.glmdir` companion files.

**Detail:** A common misconception is that `mri_fdr` needs the full `mri_glmfit` directory structure (design matrix, mask, contrast files). It doesn't. The tool reads a signed `-log10(p)` overlay, computes the FDR threshold from the p-value distribution, prints the threshold to stdout, and (optionally) writes a thresholded overlay. It works equally well on `mri_glmfit` output or on a map produced by an external analysis tool (e.g. AFNI, FSL, custom scripts), provided the values are in `-log10(p)` units and the geometry matches the surface (typically fsaverage):

```bash
mri_fdr \
  --i any_pvals_in_log10.mgh \
  --fdr 0.05 \
  --o any_pvals.fdr05.mgh
```

Two-sided maps with positive/negative signs are supported.

**Provenance:** Mailing list, 2023-08-02 (Greve). See `raw/mailing-list/2023-08-mri-fdr-independent-of-mri-glmfit.md`.

**Related:** [[mri_fdr]], [[mri_glmfit]], [[mri_glmfit-sim]]

---

## Workflow with mri_volcluster and vlrmerge

### Can FreeView display GLM results across both hemispheres and subcortex at once, and how do I get a cluster summary table?

**Short answer:** Use the `vlrmerge` script to combine lh + rh + subcortex into one map for FreeView, and chain `mri_glmfit-sim` -> [[mri_segstats]] (or `mri_volcluster --sum`) to produce a per-cluster statistics table.

**Detail:** `mri_glmfit` itself does not produce a "cluster table" — only the maps `gamma.mgh`, `F.mgh` / `z.mgh`, and `sig.mgh` per contrast directory. To get a table of cluster size, peak coordinate, peak `-log10(p)`, and (optionally) anatomical names, you need a second step. The two complementary tools:

- `vlrmerge` — a FreeSurfer shell script that merges left-hemisphere, right-hemisphere, and subcortical maps into a single representation suitable for joint visualisation in FreeView. Run with `--help` for current syntax.
- `mri_glmfit-sim` (clusterwise correction) followed by [[mri_segstats]] on the resulting cluster mask:

```bash
# 1. clusterwise correction
mri_glmfit-sim --glmdir glm_out/ \
  --cache 2.0 abs --cwpvalthresh 0.05 --2spaces

# 2. per-cluster stats
mri_segstats \
  --seg glm_out/<contrast>/cache.th20.abs.sig.cluster.mgh \
  --i glm_out/<contrast>/sig.mgh \
  --sum cluster_stats.txt
```

Equivalently, `csdbase.y.ocn.dat` already contains per-subject cluster means (see the entry above).

**Provenance:** Mailing list, 2023-08-09 to 2023-08-10 (Greve). See `raw/mailing-list/2023-08-mri-glmfit-vlrmerge-bilateral-cluster-stats-workflow.md`.

**Related:** [[mri_glmfit]], [[mri_glmfit-sim]], [[mri_segstats]], [[mri_volcluster]]

---

### `mri_volcluster` runs but the anatomical-name column in the cluster summary is blank — why?

**Short answer:** When the input volume is in MNI305 (2 mm) space, [[mri_volcluster]] cannot infer the registration to fsaverage anatomy on its own; pass `--reg $SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat` so it can look up region names.

**Detail:** `mri_volcluster` labels cluster peaks by querying the [[fsaverage]] `aseg.mgz` segmentation and/or the Talairach atlas at the peak coordinate. That requires a registration that maps the input volume's voxel grid to the fsaverage subject's anatomy. For `mri_glmfit` output written on the 2 mm MNI305 grid (a common output of group volume-based analyses), the registration is not implicit and the look-up silently produces empty names. The fix is the pre-shipped registration that lives inside the fsaverage subject:

```bash
mri_volcluster \
  --in sig.mgh \
  --thmin 2.0 \
  --reg $SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat \
  --sum cluster_summary.txt
```

If `$SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat` is missing, copy fsaverage from `$FREESURFER_HOME/subjects/fsaverage/`.

**Provenance:** Mailing list, 2023-11-25 (Greve). See `raw/mailing-list/2023-11-mri-volcluster-roi-names-mni305-reg-2mm.md`.

**Related:** [[mri_volcluster]], [[fsaverage]], [[coordinate-systems]]

---

## Special-case designs

### How do I compute mean cortical thickness for a custom group of parcels (e.g. a self-defined "frontal" composite)?

**Short answer:** Either split the annotation into per-parcel labels with [[mri_annotation2label]], merge the chosen ones with [[mri_mergelabels]], and run [[mris_anatomical_stats]] on the result; or compute a vertex-count-weighted average of per-parcel `ThickAvg` values from the existing `.stats` file.

**Detail:** Greve's two methods:

Method 1 — full label pipeline (produces a proper stats file with thickness, area, and volume; reusable as a mask in [[mri_glmfit]]):

```bash
mri_annotation2label --subject SUBJECT --hemi lh \
  --annotation aparc --outdir /tmp/labels/

mri_mergelabels \
  -i /tmp/labels/lh.parsopercularis.label \
  -i /tmp/labels/lh.parstriangularis.label \
  -i /tmp/labels/lh.parsorbitalis.label \
  -o /tmp/labels/lh.custom_frontal.label

mris_anatomical_stats \
  -l /tmp/labels/lh.custom_frontal.label \
  -f /tmp/lh.custom_frontal.stats \
  SUBJECT lh
```

Method 2 — vertex-count weighted average of existing per-parcel means (simpler, no extra files):

```python
import pandas as pd
stats = pd.read_csv('lh.aparc.stats', comment='#', sep=r'\s+',
    names=['StructName','NumVert','SurfArea','GrayVol',
           'ThickAvg','ThickStd','MeanCurv','GausCurv',
           'FoldInd','CurvInd'])
parcels = ['parsopercularis', 'parstriangularis', 'parsorbitalis']
sub = stats[stats['StructName'].isin(parcels)]
weighted_thick = (sub['ThickAvg'] * sub['NumVert']).sum() / sub['NumVert'].sum()
```

This matches what [[mris_anatomical_stats]] computes for the merged label, because per-parcel `ThickAvg` is itself vertex-count weighted within each parcel. Use Method 1 if you also need area or volume, or if you intend to reuse the label as a mask in a downstream GLM.

**Provenance:** Mailing list, 2025-02-12 (Greve). See `raw/mailing-list/2025-02-custom-grouped-roi-cortical-thickness-workflow.md`.

**Related:** [[mri_annotation2label]], [[mri_mergelabels]], [[mris_anatomical_stats]], [[parcellation-schemes]], [[label-format]]

---

### What does "group effect" actually mean in an LME longitudinal model versus "group-by-time"?

**Short answer:** A group main effect is a vertical offset between the regression lines of the two groups (different intercepts); a group-by-time interaction is a difference in slope (different rates of change). The two are mathematically independent.

**Detail:** A standard FreeSurfer LME model for longitudinal cortical measurements (`lme_mass_univariate` / `lme_stats`) typically has the design terms intercept, time (slope), group (binary indicator), and group x time. Geometrically:

| Term | Geometric meaning |
|------|-------------------|
| Group | Vertical offset between the two group regression lines |
| Group x Time | Different slopes — one group changes faster or slower |

In a balanced design these effects are orthogonal: a significant group main effect does not imply a significant interaction, and vice versa. A common misinterpretation is to read a significant group effect as "the groups change differently over time" — that is the interaction term, not the main effect. The main effect alone says only that the groups differ in overall level (at the centred time point).

**Provenance:** Mailing list, 2025-04-16 (Reuter). See `raw/mailing-list/2025-03-lme-group-differences-vertical-offsets-group-time-slope.md`.

**Related:** [[longitudinal-processing]], [[mri_glmfit]]

---

### Standard longitudinal GLM gives me DOF=0 for one subject — how do I get a per-vertex slope from a single subject's repeated scans?

**Short answer:** Drop the two-stage longitudinal design and use a single-class FSGD with timepoint as a continuous Variable; test the slope with the contrast `0 1`.

**Detail:** The two-stage longitudinal pipeline (subject-level + group-level) has no group variance to estimate when there is only one subject, so the upper-level GLM is under-identified and `mri_glmfit` reports DOF = 0. Greve's recommended single-subject formulation is to fit the within-subject linear trend directly:

```
GroupDescriptorFile 1
Title SingleSubject
Class Subject1
Variables TimePoint

Input tp1_thickness.mgh Subject1 -1.5
Input tp2_thickness.mgh Subject1 -0.5
Input tp3_thickness.mgh Subject1  0.5
Input tp4_thickness.mgh Subject1  1.5
```

Notes:

- One class only.
- `TimePoint` is continuous and **mean-centred** (sum to zero across timepoints). For scans at years 0, 1, 2, 3 the mean is 1.5, so the centred values are -1.5, -0.5, 0.5, 1.5.

```bash
mri_glmfit \
  --y stacked_thickness.mgh \
  --fsgd single_subject.fsgd dods \
  --C slope.mtx \
  --surf fsaverage lh \
  --glmdir glm_out/
```

with `slope.mtx`:

```
0 1
```

The `0` zeros out the intercept; the `1` selects the TimePoint coefficient — i.e. it tests whether thickness is changing linearly over time. If a full longitudinal pipeline run already exists, `long_mris_slopes` extracts slope maps directly from longitudinal subject directories without going through `mri_glmfit`.

**Provenance:** Mailing list, 2025-04-18 (Greve). See `raw/mailing-list/2025-04-single-subject-longitudinal-glm-fsgd-timepoint-slope.md`.

**Related:** [[mri_glmfit]], [[longitudinal-processing]], [[fsgd-format]]
