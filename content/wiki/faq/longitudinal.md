---
title: "Longitudinal Processing — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 13
last_agent_update: 2026-06-09
tags:
  - faq
  - longitudinal
  - base-template
  - timepoint
  - recon-all
---

# Longitudinal Processing — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's longitudinal
streams that have been answered by FreeSurfer developers on the mailing
list. It covers the standard three-step recon-all longitudinal pipeline
(cross → unbiased base / SST → long), the longitudinal SAMSEG stream
(`run_samseg_long`), and the longitudinal subregion segmentations
(`segmentHA_long` / `segment_subregions --long-base`). For tool reference
see [[wiki/pipelines/recon-all|recon-all]] and [[wiki/tools/samseg|samseg]]; for concepts see
[[longitudinal-processing]].

> [!gotcha] [[recon-all-clinical.sh]] has **no** longitudinal mode and
> its outputs cannot be plugged into the standard longitudinal pipeline
> either. See the [[recon-all-clinical]] FAQ for the developer-recommended
> workarounds (cross-sectional measurements per timepoint, fed into an
> LME model; or run [[mri_synthsr]] first and then standard recon-all).

---

## Base template construction

### How is the longitudinal base template built, and is it biased when timepoints are unevenly spaced in time?

**Short answer:** Yes — the median-based robust averaging used to build
the base pulls the template toward the cluster of more-frequent
timepoints. For adult brains without major atrophy this is generally
acceptable; for paediatric or neurodegenerative cohorts a workaround is
to build the base from only the first and last timepoints.

**Detail:** `recon-all -base` registers all timepoints to one another
and then computes a robust mean (approximating the spatial median) of
the aligned scans. When timepoints are temporally uneven (e.g. months 0,
1, 2, 24), the median is dragged toward the dense early cluster, so the
template represents anatomy near month 0–2 rather than the true midpoint.
Severity by cohort:

| Cohort | Severity of base-template bias |
|--------|--------------------------------|
| Adult, no major atrophy | Low |
| Paediatric / adolescent | High (brain growth) |
| Neurodegenerative | High (progressive atrophy) |
| Dense early + sparse late sampling | Medium |

The standard call uses every timepoint:

```bash
recon-all -base SUB_BASE -tp SUB_TP1 -tp SUB_TP2 -tp SUB_TP3 -tp SUB_TP4 \
          -sd $SUBJECTS_DIR -all
```

Reuter's recommended workaround for biased designs is to build the base
from only the first and last timepoints, accepting a blurrier template
in exchange for an unbiased temporal midpoint:

```bash
recon-all -base SUB_BASE -tp SUB_TP1 -tp SUB_TPn -sd $SUBJECTS_DIR -all
```

**Provenance:** Mailing list, 2023-09-26 (Reuter). See
`raw/mailing-list/2023-09-longitudinal-base-template-bias-uneven-timepoints.md`.

**Related:** [[longitudinal-processing]], [[wiki/pipelines/recon-all|recon-all]], [[mri_robust_template]]

---

### My subject has multiple scans at one timepoint and only one at another — does that bias the base toward the over-sampled timepoint?

**Short answer:** No, as long as you average the scans at the
cross-sectional stage rather than passing them all directly to `-base`.
Each cross-sectional run produces one averaged anatomy per timepoint, so
the base sees one image per timepoint regardless of how many scans went
into each cross.

**Detail:** Greve's recommendation: pass all scans at a given timepoint
to that timepoint's cross-sectional `recon-all` via multiple `-i` flags.
FreeSurfer motion-corrects and averages them internally, so the
cross-sectional subject directory represents one anatomy per timepoint.
The base then weights every timepoint equally:

```bash
# tp1 has one scan
recon-all -s sub01_tp1 -i tp1_mprage.nii.gz -all

# tp2 has five scans — pass all with multiple -i; FS motion-corrects + averages
recon-all -s sub01_tp2 \
    -i tp2_mprage1.nii.gz \
    -i tp2_short1.nii.gz -i tp2_short2.nii.gz \
    -i tp2_short3.nii.gz -i tp2_short4.nii.gz \
    -all

# Base from cross-sectional dirs (one anatomy per timepoint)
recon-all -base sub01_base -tp sub01_tp1 -tp sub01_tp2 -all

# Long for each timepoint
recon-all -long sub01_tp1 sub01_base -all
recon-all -long sub01_tp2 sub01_base -all
```

> [!gotcha] If you instead pass all 6 scans directly into a single base
> run, the base **is** biased toward the over-sampled timepoint
> (5/6 images from tp2 in this example). Always average within each
> timepoint via the cross stage first. Greve also recommends keeping
> acquisition parameters as similar as possible across timepoints; large
> sequence differences appear as residual change in the longitudinal
> measurements.

**Provenance:** Mailing list, 2024-01-01 (Greve). See
`raw/mailing-list/2023-12-longitudinal-multiple-scans-per-timepoint-averaged-for-base.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]], [[mri_robust_template]]

---

### My `base-tps` file has a spurious entry like `<subject>_<subject>` and `recon-all -long` fails with `cannot stat ..._to_<base>.lta` — what happened?

**Short answer:** A bash glob picked up the base-template directory
itself alongside the timepoint directories and passed it as a phantom
`-tp`; tighten the glob so it matches only timepoint directories.

**Detail:** During step 3, `recon-all -long` reads `base-tps` to find
the timepoint list and constructs expected LTA names of the form
`<tpid>_to_<baseid>.lta`. If the base-tps file contains a stray entry
(e.g. `6008_6008` because the directory `6008/` was matched by the glob
that was supposed to find `6008_tp*`), no `6008_6008_to_6008.lta` exists
and step 3 dies with `cp: cannot stat`. The fix is a more specific glob:

```bash
# Buggy: also matches the base directory 6008/
timepoints=`ls -d1 ${subid}* | cut -d'_' -f2`

# Correct: matches only timepoint directories
timepoints=`ls -d1 ${subid}_tp* | cut -d'_' -f2`
```

For reference, the canonical longitudinal naming convention is:

```bash
# Step 1 — cross
recon-all -all -s 6008_tp1 -i ...
recon-all -all -s 6008_tp2 -i ...
recon-all -all -s 6008_tp3 -i ...

# Step 2 — base (output: 6008/)
recon-all -base 6008 -tp 6008_tp1 -tp 6008_tp2 -tp 6008_tp3 -all

# Step 3 — long (output: 6008_tp1.long.6008/)
recon-all -long 6008_tp1 6008 -all
```

**Provenance:** Mailing list, 2023-06-13 (Huang). See
`raw/mailing-list/2023-06-longitudinal-base-tps-spurious-entry-bash-glob.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

## Timepoints — adding, excluding, and editing

### I want to add new timepoints to a subject I already processed. Do I have to re-run anything?

**Short answer:** Yes — both the base step and every long step must be
re-run with all timepoints (old and new) included.

**Detail:** The base subject is an unbiased average of all the
timepoints fed into it; adding a new timepoint changes the base, and
because each long subject is registered and reconstructed relative to
that base, every long output must be regenerated as well. Previously
completed long subjects from the smaller base are not reusable.

```bash
# Re-run base with the full timepoint list
recon-all -base SUB_BASE \
  -tp SUB_TP1 -tp SUB_TP2 -tp SUB_TP3 -tp SUB_TP4_NEW -all

# Re-run long for every timepoint, old and new
recon-all -long SUB_TP1 SUB_BASE -all
recon-all -long SUB_TP2 SUB_BASE -all
recon-all -long SUB_TP3 SUB_BASE -all
recon-all -long SUB_TP4_NEW SUB_BASE -all
```

**Provenance:** Mailing list, 2025-01-17 (Huang). See
`raw/mailing-list/2025-01-longitudinal-rerun-when-adding-timepoints.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

### One of my timepoints has a corrupted scan or a bad cross-sectional segmentation. Can I just exclude that segmentation from the longitudinal analysis, or do I have to drop the whole timepoint?

**Short answer:** You must drop the entire timepoint — and re-run base
+ long. The cross-sectional segmentations are fused into the base
segmentation, so a bad cross can leak into otherwise good long outputs.

**Detail:** Greve confirms three points: (1) a motion-corrupted scan
should be excluded from the base because it degrades the average
geometry; (2) a poor cross-sectional segmentation contaminates the
fused base segmentation, which then initialises every long
segmentation, so the bad cross can leak into a non-bad long; (3)
"You can't exclude just the segmentation from the long analysis. You'd
have to exclude the entire time point." Removing one timepoint
therefore requires re-running base and all remaining long timepoints
from scratch:

```bash
# After removing bad_tp from your subject list
recon-all -base SUB_BASE -tp good_tp1 -tp good_tp2 -tp good_tp3 -all
recon-all -long good_tp1 SUB_BASE -all
recon-all -long good_tp2 SUB_BASE -all
recon-all -long good_tp3 SUB_BASE -all
```

> [!gotcha] This is the same kind of full re-run required when **adding**
> a new timepoint — anything that changes the base requires re-running
> every long. There is no per-timepoint surgical exclusion mechanism.

**Provenance:** Mailing list, 2025-04-23 (Greve). See
`raw/mailing-list/2025-04-longitudinal-bad-timepoint-exclude-entire-timepoint.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

## Mixed cohorts and study design

### My cohort has some participants with one scan and others with multiple timepoints. Should single-timepoint subjects go through the longitudinal pipeline too?

**Short answer:** Yes — for consistency, run every subject through the
longitudinal pipeline (cross → single-TP base → long), even those with
only one scan. Single-TP subjects can then be included in the same LME
model as the multi-TP subjects.

**Detail:** Reuter recommends uniform processing: if some subjects are
processed only cross-sectionally and others through the longitudinal
stream, the systematic difference between the two pipelines (different
regularisation, template-based reprocessing, etc.) inflates or deflates
the estimated between-subject variance. The cleanest approach is to
construct a single-timepoint base for single-TP subjects and run them
through the full three-step workflow:

```bash
# Single-TP subject
recon-all -s sub01_tp1 -i T1.mgz -all
recon-all -base sub01_base -tp sub01_tp1 -sd $SUBJECTS_DIR -all
recon-all -long sub01_tp1 sub01_base -sd $SUBJECTS_DIR -all

# Multi-TP subject
recon-all -s sub02_tp1 -i T1_tp1.mgz -all
recon-all -s sub02_tp2 -i T1_tp2.mgz -all
recon-all -base sub02_base -tp sub02_tp1 -tp sub02_tp2 \
          -sd $SUBJECTS_DIR -all
recon-all -long sub02_tp1 sub02_base -sd $SUBJECTS_DIR -all
recon-all -long sub02_tp2 sub02_base -sd $SUBJECTS_DIR -all
```

In the LME model, single-TP subjects contribute only to intercept
(cross-subject) variance, not to within-subject slope estimation; this
is handled correctly as long as random effects are specified properly.

**Provenance:** Mailing list, 2023-08-01 (Reuter). See
`raw/mailing-list/2023-08-longitudinal-single-timepoint-in-mixed-cohort.md`.

**Related:** [[longitudinal-processing]], [[wiki/pipelines/recon-all|recon-all]]

---

### Is the longitudinal pipeline still available in FreeSurfer 7.x and 8.x? The wiki said "up to 6.0".

**Short answer:** Yes — the standard longitudinal pipeline is fully
supported in FS 6.0 and every later version, including 7.x and 8.x.
The "up to 6.0" wording in the historical wiki was incorrect.

**Detail:** Huang confirmed in 2023-08 that the longitudinal stream is
"available in FS 6.0 and up". The three-step `recon-all` workflow
(cross → base → long) is identical in 7.x and 8.x:

```bash
recon-all -s tp1 -i tp1.mgz -all
recon-all -s tp2 -i tp2.mgz -all
recon-all -base base -tp tp1 -tp tp2 -all
recon-all -long tp1 base -all
recon-all -long tp2 base -all
```

**Provenance:** Mailing list, 2023-08-17 (Huang). See
`raw/mailing-list/2023-08-longitudinal-pipeline-available-fs7x-not-limited-to-fs6.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

### I started my longitudinal study on FS 7.1 and want to upgrade to FS 7.4 to add new timepoints. Will my outputs still be comparable?

**Short answer:** Yes within the 7.x line, provided you keep exactly
the same recon-all options. Cross-major-version upgrades (e.g. 7.x → 8.x)
are a different question because 8.x replaces several core algorithms.

**Detail:** Greve confirmed in 2024-11 that 7.1 → 7.4 outputs are
unchanged "if you change the options" — i.e. as long as command-line
flags are identical. New timepoints can therefore be added under 7.4
without re-processing earlier 7.1 timepoints. Be strict about flag
parity: even adding or removing a single flag (e.g. `-T2`,
`-mprage`, `-3T`, `-cm`) can change reconstruction.

> [!gotcha] FS 8.x introduces fundamentally different algorithms
> ([[mri_synthseg]], SynthStrip, SynthMorph) for several recon-all
> stages. Upgrading from 7.x to 8.x mid-study will change outputs
> systematically and is not a drop-in upgrade for an ongoing
> longitudinal cohort.

**Provenance:** Mailing list, 2024-11-23 (Greve). See
`raw/mailing-list/2024-11-freesurfer-7x-version-upgrade-safe-for-longitudinal.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

## Statistics on longitudinal output

### Is the two-stage LME model still appropriate when I have 4 or more timepoints per subject?

**Short answer:** Yes. The two-stage model is valid for any number of
timepoints; more timepoints per subject add statistical power and
robustness, not a need for a different model.

**Detail:** The two stages are (1) subject-level reconstruction via the
longitudinal recon-all pipeline and (2) group-level mixed-effects
modelling. Adding timepoints increases the within-subject DF available
for the random slope, making the model more — not less — robust. Greve
confirms the two-stage model is appropriate with 4 timepoints
(baseline, 6 mo, 1 yr, 1.5 yr).

**Provenance:** Mailing list, 2025-01-23 (Greve). See
`raw/mailing-list/2025-01-longitudinal-rerun-when-adding-timepoints.md`.

**Related:** [[longitudinal-processing]], [[wiki/tools/mri_glmfit|mri_glmfit]]

---

### Can I run a longitudinal GLM on a single subject? My two-stage model fails with DOF=0.

**Short answer:** Not with the standard two-stage model — there is no
group variance with one subject. Use [[wiki/tools/mri_glmfit|mri_glmfit]] with an FSGD file
that has one class and a continuous mean-centred TimePoint variable,
and contrast `0 1` to test the slope.

**Detail:** Greve's recipe for single-subject longitudinal change uses
a one-class FSGD with TimePoint as a continuous covariate. The
TimePoint values must be **mean-centred** (sum = 0 across timepoints)
so the intercept and slope are orthogonal:

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

Run the GLM:

```bash
mri_glmfit --y stacked_thickness.mgh \
           --fsgd single_subject.fsgd dods \
           --C slope.mtx \
           --surf fsaverage lh \
           --glmdir glm_out/
```

with `slope.mtx` containing `0 1` (zero for the intercept, one for the
TimePoint coefficient). This tests linear thickness change over time.
If you have already run the standard longitudinal recon-all pipeline,
[[long_mris_slopes]] is the dedicated tool for slope extraction.

**Provenance:** Mailing list, 2025-04-18 (Greve). See
`raw/mailing-list/2025-04-single-subject-longitudinal-glm-fsgd-timepoint-slope.md`.

**Related:** [[wiki/tools/mri_glmfit|mri_glmfit]], [[fsgd-format]], [[fsaverage]],
[[longitudinal-processing]]

---

## Compatibility with downstream tools

### Do I have to run cross-sectional `segmentHA` (or `segment_subregions`) on every timepoint before I can run the longitudinal version?

**Short answer:** No. `segmentHA_long` (and the modern
`segment_subregions --long-base`) requires only that the main
longitudinal recon-all pipeline has completed — it does **not** require
prior cross-sectional subregion segmentation. Cross and long output
files have different names and coexist without conflict.

**Detail:** Iglesias confirmed that the longitudinal subregion script
"requires that you've run the main FreeSurfer longitudinal pipeline";
nothing more. If a user has already produced cross-sectional
hippocampal-subfield outputs (e.g. `lh.hippoAmygLabels-T1.v22.mgz`),
the longitudinal outputs (`lh.hippoAmygLabels-T1.v22.long.<base>.mgz`,
or analogous names depending on script version) are written alongside
them with distinct filenames; nothing is overwritten.

**Provenance:** Mailing list, 2023-07-03 (Iglesias). See
`raw/mailing-list/2023-07-segmentha-long-does-not-require-cross-segmentation-first.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

### How do I prepare multi-contrast (T1 + FLAIR) data for longitudinal SAMSEG?

**Short answer:** First longitudinally register the T1s across
timepoints with `mri_robust_template`, then for each timepoint
co-register the FLAIR to the **already-registered** T1 of that
timepoint with [[mri_coreg]] + [[mri_vol2vol]]. Pass the registered
T1+FLAIR pair per timepoint to `run_samseg_long`.

**Detail:** Cerri's three-step workflow:

```bash
# 1. Longitudinally register T1s across timepoints
mri_robust_template --mov tp0_t1.nii tp1_t1.nii \
  --template template.mgz --satit \
  --lta tp0_t1_to_template.lta tp1_t1_to_template.lta
mri_vol2vol --mov tp0_t1.nii --lta tp0_t1_to_template.lta \
  --o tp0_t1_reg.mgz --targ template.mgz
mri_vol2vol --mov tp1_t1.nii --lta tp1_t1_to_template.lta \
  --o tp1_t1_reg.mgz --targ template.mgz

# 2. For EACH timepoint, co-register the FLAIR to that timepoint's
#    REGISTERED T1 (intra-session, in the longitudinal common space)
mri_coreg --mov tp0_flair.nii --ref tp0_t1_reg.mgz --reg tp0_FLAIRtoT1.lta
mri_vol2vol --mov tp0_flair.nii --reg tp0_FLAIRtoT1.lta \
  --o tp0_flair_reg.mgz --targ tp0_t1_reg.mgz
mri_coreg --mov tp1_flair.nii --ref tp1_t1_reg.mgz --reg tp1_FLAIRtoT1.lta
mri_vol2vol --mov tp1_flair.nii --reg tp1_FLAIRtoT1.lta \
  --o tp1_flair_reg.mgz --targ tp1_t1_reg.mgz

# 3. Longitudinal SAMSEG on the registered pairs
run_samseg_long \
  --timepoint tp0_t1_reg.mgz tp0_flair_reg.mgz \
  --timepoint tp1_t1_reg.mgz tp1_flair_reg.mgz \
  --output outputDir/
```

> [!gotcha] The FLAIR must be co-registered to the **longitudinally
> registered** T1 of the same timepoint, not to the original native-space
> T1. This is what differs from cross-sectional multi-contrast SAMSEG,
> which simply resamples additional contrasts onto the T1 grid in the
> subject's native space.

**Provenance:** Mailing list, 2023-06-12 (Cerri). See
`raw/mailing-list/2023-06-samseg-longitudinal-multicontrast-flair-coreg-workflow.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_coreg]], [[mri_vol2vol]],
[[mri_robust_template]], [[longitudinal-processing]]

---

## Known bugs and quirks

### `recon-all -long` fails or hangs when I add `-parallel`. Should I just remove the flag?

**Short answer:** Yes — do not use `-parallel` with longitudinal
processing. Use `-threads N` (equivalently `-openmp N` or `-nthreads N`)
instead, which parallelises *within* individual programs and is safe.

**Detail:** Huang explicitly recommends against `-parallel`: it tells
recon-all to run multiple pipeline stages concurrently, and these
stages can collide on shared intermediate files. The collisions are
especially likely in the longitudinal stream because of implicit
dependencies between the long/base stages and autorecon stages — for
example, autorecon3 surface registration may try to read a surface
file that another concurrent stage is still writing. Use the
intra-program threading flags instead:

```bash
# Safe: parallelism inside individual programs
recon-all -sd $SUBJECTS_DIR -threads 8 -openmp 8 \
          -long IMAGEID TEMPLATE_ID -all
```

For across-subject parallelism, use a job scheduler (SLURM, PBS, LSF)
to launch one recon-all per subject, each with its own `-threads N`.

**Provenance:** Mailing list, 2023-11-08 (Huang). See
`raw/mailing-list/2023-11-recon-all-parallel-flag-collisions-longitudinal.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

### Longitudinal SAMSEG crashes in FS 8.0.0 with `TypeError: transform() got an unexpected keyword argument 'affine'`. What's the fix?

**Short answer:** This is a known FS 8.0.0 bug (a `surfa`-API mismatch
in `SamsegLongitudinal.py`), fixed in FS 8.2.0 and patched by
`fs8_updates.sh`. On 8.0.0, replace
`$FREESURFER_HOME/python/packages/gems/SamsegLongitudinal.py` with the
corrected version from the FreeSurfer GitHub dev branch.

**Detail:** In FS 8.0.0, `SamsegLongitudinal.py` calls
`image0.transform(affine=self.tpToBaseTransforms[0])`, but the bundled
`surfa` release does not accept an `affine` keyword on
`image.transform()` — the parameter name had changed between surfa
versions. Cross-sectional SAMSEG is unaffected; only the longitudinal
run hits the failing call path during subject-specific template
generation. Two fixes:

- Apply the official `fs8_updates.sh` patch (released ~Apr 2025), or
- Drop in the corrected `SamsegLongitudinal.py` from the FreeSurfer
  GitHub dev branch:

```bash
# macOS install path; adjust for Linux
cp SamsegLongitudinal.py \
   /Applications/freesurfer/8.0.0/python/packages/gems/SamsegLongitudinal.py
```

FS 8.2.0 ships the fixed file and the bug does not recur there. The
issue is not specific to lesion segmentation — it triggers on any
`run_samseg_long` invocation in 8.0.0.

**Provenance:** Mailing list, 2025-03-10 (Huang). See
`raw/mailing-list/2025-03-samseg-longitudinal-transform-affine-typeerror-fix.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[longitudinal-processing]]

---

## See also

Component scripts of the longitudinal stream (beyond the three-step
`recon-all -cross/-base/-long` workflow):

- [[long_submit_jobs]] — submits all three longitudinal stages for an
  entire study to a compute cluster, driven by a longitudinal QDEC table.
- [[long_create_base_sigma]] / [[long_create_orig]] — internal helpers
  used during base-template construction (joint cross-time intensity
  normalisation; building base-space `orig.mgz` / `rawavg.mgz`).
- [[long_qdec_table]] — manipulates the longitudinal QDEC table
  (`fsid` / `fsid-base` columns) that drives the stats and submission
  tools.
- [[long_stats_slopes]] — fits a within-subject linear model to a
  longitudinal stats measure and derives per-subject rate-of-change.
- [[long_stats_combine]] / [[long_stats_tps]] — harvest per-time-point
  ROI stats into a longitudinal QDEC table, or extract one time point's
  stats stacked across subjects.
