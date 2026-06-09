---
title: "Longitudinal Processing"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_robust_template]]"
  - "[[mri_add_new_tp]]"
  - "[[mri_robust_register]]"
  - "[[mri_fuse_segmentations]]"
  - "[[mri_normalize_tp2]]"
related_concepts:
  - "[[surface-representations]]"
  - "[[registration-overview]]"
  - "[[coordinate-systems]]"
related_formats:
  - "[[subject-directory]]"
  - "[[lta-format]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - longitudinal
  - pipeline
  - registration
---

# Longitudinal Processing

## Overview

FreeSurfer's longitudinal processing stream is a pipeline for analysing serial MRI scans of the same subject acquired at multiple time points (TPs). It was designed to address a fundamental problem with naive repeated application of cross-sectional processing: when each scan is processed independently, random algorithmic choices (e.g., seed-point selection, numerical initialisation) can introduce arbitrary scan-to-scan variability in derived measures that is unrelated to true biological change. This variability inflates measurement noise and reduces statistical power for detecting longitudinal effects.

The solution is to create a subject-specific, within-subject template — called the **base subject** — by robustly averaging all available scans of one individual into a single representative image. Each time-point scan is then reprocessed with its registration, skull strip, surface placement, and parcellation all initialised from this common template. Because all time points share the same starting point, the arbitrary variability introduced by independent initialisations is eliminated, and sensitivity to longitudinal change is substantially increased.

The longitudinal pipeline is applicable to ageing studies, disease-progression studies, and treatment-monitoring studies. It is appropriate whenever the same subject is scanned two or more times and the goal is to measure within-subject change rather than between-subject differences.

Key references (as cited in `recon-all --help`):
- Reuter & Fischl (2011), NeuroImage 51(1):19-21 — avoiding asymmetry-induced bias
- Reuter et al. (2012), NeuroImage 61(4):1402-1418 — within-subject template estimation

---

## The Three-Step Workflow

The workflow consists of three stages that must be executed in sequence:

```bash
# Step 1: Cross-sectional baseline — run once per time point
recon-all -s tp1 -i /path/to/tp1.nii.gz -all
recon-all -s tp2 -i /path/to/tp2.nii.gz -all

# Step 2: Create and process the unbiased base template
# tp1 and tp2 must already be cross-sectionally processed
recon-all -base longbase -tp tp1 -tp tp2 -all

# Step 3: Longitudinal runs — re-process each TP initialised from the base
recon-all -long tp1 longbase -all
recon-all -long tp2 longbase -all
```

The outputs of Step 3 are written to `SUBJECTS_DIR/tp1.long.longbase/` and `SUBJECTS_DIR/tp2.long.longbase/`. These longitudinal subject directories contain the final measurements used for statistical analysis.

> [!gotcha] `-all` is required at every stage
> The `-all` flag (or an equivalent work-directive flag such as `-autorecon2`) must be supplied to each `recon-all` call, including `-base` and `-long`. Without it, `recon-all` exits immediately without performing any work.

---

## Naming Conventions and Directory Layout

FreeSurfer enforces strict naming conventions for longitudinal processing:

| Stage | Subject directory |
|-------|-------------------|
| Cross-sectional TP | `SUBJECTS_DIR/tp1/` |
| Cross-sectional TP | `SUBJECTS_DIR/tp2/` |
| Base template | `SUBJECTS_DIR/longbase/` |
| Longitudinal TP1 | `SUBJECTS_DIR/tp1.long.longbase/` |
| Longitudinal TP2 | `SUBJECTS_DIR/tp2.long.longbase/` |

The naming pattern for longitudinal output directories is always `<tpNid>.long.<baseID>`. This pattern is **reserved and enforced** by `recon-all`:

- `recon-all` detects the `.long.` substring and raises an error if a user attempts to pass a directory with `.long.` in the name directly to `-s`, `-long`, or `-base`. This prevents accidental reprocessing of longitudinal output as if it were a cross-sectional subject.
- The base ID must be distinct from all time-point IDs. Passing a TP name as the base ID causes an immediate error.

The base subject's directory contains a plain-text file `base-tps` listing all time-point subject IDs, one per line. This file is read by `recon-all -long` to validate that the requested TP is known to the base.

Source: `scripts/recon-all` lines 6219–6532; `scripts/rca-long-tp-init`; `scripts/rca-base-init`.

---

## Step 2 in Detail: The Base Subject (`-base`)

### What `recon-all -base` does

When `recon-all -base <baseID> -tp <tp1> -tp <tp2> ... -all` is invoked, it:

1. Calls [[rca-base-init]], which runs [[mri_robust_template]] to create the unbiased template image from the cross-sectional norm volumes of all time points.
2. Creates inverse transforms from the base space to each TP's native space using `mri_concatenate_lta -invert1`.
3. Runs a full FreeSurfer cross-sectional reconstruction on the synthetic template image (skull stripping, normalisation, segmentation, surface extraction, parcellation).

The base subject is therefore a complete FreeSurfer subject directory, but its `orig.mgz` is a **synthetic average** of the registered TP inputs, not a real scan.

### Template creation (the `rca-base-init` script)

The `rca-base-init` script (sourced from `scripts/rca-base-init`) calls `mri_robust_template` on the `norm.mgz` volumes from all cross-sectional runs:

```tcsh
mri_robust_template \
  --mov tp1/mri/norm.mgz tp2/mri/norm.mgz \
  --template longbase/mri/norm_template.mgz \
  --lta longbase/mri/transforms/tp1_to_longbase.lta \
        longbase/mri/transforms/tp2_to_longbase.lta \
  --average 1 \
  --sat 4.685
```

Key parameters set by `rca-base-init`:
- `--average 1` — construct the template as the **median** across aligned inputs (not the mean). This is the default in `rca-base-init` (`robust_template_avg_arg = 1`).
- `--sat 4.685` — saturation constant for the M-estimator (see algorithm section below).

For a **single time point**, [[make_upright]] is called instead: it creates an upright-orientation image (RAS-aligned) from the single TP, rather than calling [[mri_robust_template]].

For `recon-all -base-affine`, an additional affine registration step is first performed on the full-head `T1.mgz` images before the rigid registration on `norm.mgz`, to account for image-geometry differences between scans (e.g., from scanner recalibration).

After template creation, `rca-base-init` creates the fused brainmask:

```tcsh
mri_robust_template \
  --mov tp1/mri/brainmask.mgz tp2/mri/brainmask.mgz \
  --average 0 \
  --ixforms <registered LTAs> \
  --noit \
  --finalnearest \
  --template longbase/mri/brainmask_template.mgz
```

Here `--average 0` means the **mean** (logical OR, because nearest-neighbour interpolation of a binary mask followed by averaging is effectively a union), and `--noit` skips the iterative template refinement step — the transforms from norm registration are reused directly.

The `base-tps` file is written during this step listing all TP IDs.

> [!gotcha] T2 and FLAIR cannot be used with `-base`
> `recon-all` explicitly rejects `-T2` and `-FLAIR` flags when `-base` is specified (line 8372 of `scripts/recon-all`). The base image is a synthetic average; enhanced pial surface fitting on a synthetic image is not meaningful.

---

## Step 3 in Detail: The Longitudinal Run (`-long`)

### Directory setup and initialisation (`rca-long-tp-init`)

When `recon-all -long tpN longbase -all` is called, the output subject directory `tpN.long.longbase` is created and initialised by [[rca-long-tp-init]] (sourced from `scripts/rca-long-tp-init`). This script copies or links the following from the base subject directory:

| Asset | Source (base subject) | Destination (long TP subject) |
|-------|-----------------------|-------------------------------|
| Base TP list | `longbase/base-tps` | `tpN.long.longbase/scripts/long.base-tps` |
| Base ID record | — | `tpN.long.longbase/scripts/long.base` |
| Cross-section ID record | — | `tpN.long.longbase/scripts/long.cross` |
| Brain mask | `longbase/mri/brainmask.mgz` | `tpN.long.longbase/mri/brainmask_<longbase>.mgz` |
| Talairach LTA | `longbase/mri/transforms/talairach.lta` | `tpN.long.longbase/mri/transforms/talairach.lta` |
| Aseg | `longbase/mri/aseg.mgz` | `tpN.long.longbase/mri/aseg_<longbase>.mgz` |
| White surface | `longbase/surf/?h.white` | `tpN.long.longbase/surf/?h.orig` and `?h.orig_white` |
| Pial surface | `longbase/surf/?h.pial` | `tpN.long.longbase/surf/?h.orig_pial` |
| Sphere | `longbase/surf/?h.sphere` | `tpN.long.longbase/surf/?h.sphere` |

The `orig.mgz` for the long TP is produced by [[longmc]] (the longitudinal motion-correction script), which registers and averages all original runs of that TP using transforms anchored to the base space, rather than recomputing from scratch.

Control points, if present in the cross-sectional TP, are mapped to the base space using `mri_map_cpdat`.

### Stages that differ from cross-sectional processing

The following `recon-all` stages behave differently in the `-long` stream:

| Stage | Cross-sectional | Longitudinal |
|-------|-----------------|--------------|
| Motion correction / orig.mgz | Average runs in native space | `longmc`: average runs via base-anchored transforms |
| Talairach registration | Run `talairach_avi` / `mri_nu_correct.mni` | **Copied** from base (`talairach.xfm` or `talairach.auto.xfm`) |
| Skull stripping | Run `mri_watershed` or SynthStrip | **Copied** from base brainmask; applied to TP's T1 |
| GCA registration (EM registration) | Run `mri_em_register` | **Copied** `talairach.lta` from base |
| Intensity normalisation | `mri_normalize` auto-selects control points | `mri_normalize` with base-derived `ctrl_vol.mgz` (if `-uselongbasectrlvol`) or standard stream; TP's `orig_nu.mgz` is created explicitly because the Talairach step (which normally creates it) is skipped |
| CA normalisation (second normalisation pass) | `mri_ca_normalize` with own aseg | `mri_ca_normalize -long aseg_<longbase>.mgz` — base aseg used as initialisation |
| CA registration (non-linear warp to MNI atlas) | `mri_ca_register -T talairach.lta` | `mri_ca_register -levels 2 -A 1 -l <longbase>/transforms/talairach.m3z identity.nofile` — initialised with base's 3D warp |
| Aseg fusion | Not applicable | `mri_fuse_segmentations` fuses aseg from all cross-sectional TPs (mapped to base space) to create `aseg.fused.mgz` for CA label initialisation |
| CA labelling (aseg) | `mri_ca_label` | `mri_ca_label -r aseg.fused.mgz` or `-r <longbase>/aseg.auto_noCCseg.mgz` |
| Tessellation | `mri_pretess` + `mri_tessellate` | **Skipped** — `?h.orig` (= base white surface) is used directly |
| Smooth 1 | `mris_smooth` | **Skipped** |
| Inflate 1 | `mris_inflate` | **Skipped** |
| Q-sphere | `mris_sphere` | **Skipped** — base sphere is copied |
| Topology fix | `mris_fix_topology` | **Skipped** |
| Surface registration | [[rca-surfreg]] | `rca-surfreg --long <longbase>` — initialised from base sphere |
| White surface placement | `mris_place_surface --white` | Same tool but `--max-cbv-dist 3.5` and initialised from `?h.orig_white` (= base white) |
| Pial surface placement | `mris_place_surface --pial` | Same tool but `--max-cbv-dist 3.5` and initialised from `?h.orig_pial` (= base pial) |
| Cortical parcellation | `mris_ca_label` | `mris_ca_label -long -R <longbase>/label/?h.aparc.annot` — base annotation used as regulariser |
| WM edits | Mapped from cross TP | Default: mapped from cross TP via `tpNtobase_regfile`; with `-uselongbasewmedits`: transferred from base |
| Fill | `mri_fill` | **Skipped** — base `filled.mgz` is copied if absent |

Source: `scripts/recon-all` (numerous longitudinal conditionals); `scripts/rca-long-tp-init`.

> [!gotcha] `NoRandomness` is set for all longitudinal runs
> When `-long` or `-base` is specified, `recon-all` sets `NoRandomness = 1` and passes a fixed random seed (`-seed $RngSeed`) to all stochastic tools. This ensures that re-running the same command produces bit-identical output, which is important for reproducibility in longitudinal studies.

---

## The `mri_robust_template` Algorithm

`mri_robust_template` (C++, source: `mri_robust_register/mri_robust_template.cpp`, implemented in `mri_robust_register/MultiRegistration.cpp`) is the core tool that creates the unbiased within-subject template.

### Inputs and outputs

- **Inputs**: $N \geq 2$ volumes (e.g., `norm.mgz` from each TP), optional initial transform LTAs.
- **Outputs**: A template volume (mean or median of aligned inputs), plus one rigid-body LTA transform per input volume mapping that TP to the template space.
- **Template type**: Controlled by `--average`:
  - `--average 0` — intensity mean of aligned voxels
  - `--average 1` — intensity median of aligned voxels (default in `rca-base-init`)

### Algorithm overview

The algorithm alternates between:
1. Registering each input volume to the current template estimate (parallel if OpenMP is available).
2. Updating the template by (robustly) averaging all inputs mapped to the current template space.

Registration uses a robust M-estimator with iteratively reweighted least-squares (IRLS). For each pair (input, template), a per-voxel weight $w_i \in [0, 1]$ is computed based on the residual between the intensity-transformed input and the template. Voxels with large residuals (outliers, e.g., lesions, motion artefacts) receive low weight and do not contribute to the registration or the template.

The objective for aligning movable image $M$ to template $T$ with transform $\Phi$ and per-voxel weights $w_i$ is:

$$
E(\Phi) = \sum_i w_i \bigl(M(\Phi(\mathbf{x}_i)) - T(\mathbf{x}_i)\bigr)^2
$$

where weights are updated iteratively using a Geman-McClure or similar M-estimator with saturation parameter `--sat` (default 4.685, chosen for Gaussian noise). The saturation parameter determines the breakpoint beyond which residuals are down-weighted: voxels with $|r_i| > \text{sat} \cdot \sigma$ receive near-zero weight.

The template iteration terminates when the maximum change in any transform across global iterations falls below `--epsit` (default 0.03 for $N \geq 3$ inputs), or when `--maxit` iterations are exhausted (default 6).

For exactly $N = 2$ inputs, the template is computed after a single pass of cross-registration (no iterative template refinement is needed, as the midpoint between two images is exact).

The `--noit` flag skips the iterative refinement entirely — it simply averages the inputs using any provided initial transforms. This is used in `rca-base-init` to create `orig.mgz` from the TP `orig.mgz` volumes (after transforms from the norm-based registration are known).

> [!math] Random initialisation and symmetry
> When no initial transforms are provided, `mri_robust_template` randomly selects one TP as the initial registration target (`--inittp`). However, when called from `recon-all -base`, `NoRandomness = 1` causes a deterministic seed to be used. The choice of initial target does not affect the final template if the algorithm converges — it affects only the intermediate halfway space, which is why the `--sat` parameter is important for robustness.

Source: `mri_robust_register/mri_robust_template.cpp` (main + parseCommandLine); `mri_robust_register/MultiRegistration.cpp` (computeTemplate).

---

## Intensity Normalisation in the Longitudinal Stream

Standard FreeSurfer cross-sectional processing uses `mri_normalize` to automatically find control points (white matter voxels that should be at intensity 110 in the normalised volume) independently for each scan. In the longitudinal stream, this independence can introduce intensity normalisation differences across TPs that are not due to biology.

To reduce this, the longitudinal stream offers two options:

1. **Default** (no extra flag): `mri_normalize` runs normally on the TP's `nu.mgz`, finding control points independently. The base aseg is used to guide the mask, but control points are TP-specific.
2. **`-uselongbasectrlvol`**: The control point volume (`ctrl_vol.mgz`) and bias volume (`bias_vol.mgz`) are taken from the base subject. If these do not yet exist in the base, `mri_normalize` is first run on the base `nu.mgz` to generate them. The TP `T1.mgz` is then normalised using these base-derived control points.

The longitudinal stream also skips the Talairach step (which normally produces `orig_nu.mgz` as a side effect during bias correction for `talairach_avi`). To compensate, `recon-all` explicitly runs `mri_nu_correct.mni` to create `orig_nu.mgz` for the longitudinal TP before the normalisation step.

Source: `scripts/recon-all` lines 2128–2210.

---

## Segmentation Initialisation: Aseg Fusion

In the `-long` stream, initialising `mri_ca_label` with the base's aseg alone could propagate base-specific errors. Instead, FreeSurfer defaults to **aseg fusion**: it collects the `aseg.presurf.mgz` from every cross-sectional TP that was used to build the base, maps each to the base/template space using the stored LTAs, and fuses them using `mri_fuse_segmentations`:

```tcsh
mri_fuse_segmentations \
  -a tp1/mri/aseg.presurf.mgz tp2/mri/aseg.presurf.mgz \
  -c tp1/mri/aseg.auto_noCCseg.mgz tp2/mri/aseg.auto_noCCseg.mgz \
  -n tp1/mri/norm.mgz tp2/mri/norm.mgz \
  -t longbase/mri/transforms/tp1_to_longbase.lta \
     longbase/mri/transforms/tp2_to_longbase.lta \
  norm.mgz aseg.fused.mgz
```

The fused aseg is then passed to `mri_ca_label -r aseg.fused.mgz` as a prior for the TP's subcortical segmentation.

Fusion can be disabled with `-noasegfusion`, in which case the base's own `aseg.auto_noCCseg.mgz` is used directly via `-asegbase`. Both options are inferior to the default fusion for most use cases.

Source: `scripts/recon-all` lines 2965–2999, 3012–3023.

---

## Adding a New Time Point (`mri_add_new_tp`)

If a subject is scanned again **after** the base has already been created and all existing longitudinals have been run, there are two approaches:

### Option 1: Rerun the base (recommended)

Re-run with all TPs including the new one:

```bash
recon-all -s tp3 -i /path/to/tp3.nii.gz -all          # cross-sectional first
recon-all -base longbase -tp tp1 -tp tp2 -tp tp3 -all  # rebuild base
recon-all -long tp1 longbase -all                        # rerun all longs
recon-all -long tp2 longbase -all
recon-all -long tp3 longbase -all
```

This is the gold-standard approach but requires rerunning all longitudinal subjects.

### Option 2: Patch the base with `mri_add_new_tp` (expedient but biased)

`mri_add_new_tp <baseID> <newtpID>` (source: `scripts/mri_add_new_tp`) adds a new TP to an existing base without recomputing the full template:

1. Registers the new TP's `norm.mgz` to the base using `mri_robust_register --sat 4.685`.
2. Runs `mri_robust_template --noit` with the stored LTAs and the new TP to create an updated norm template (stored as `norm.with_<newtpid>.mgz`).
3. Appends the new TP ID to `base-tps`.
4. Creates the inverse LTA (`base_to_newtpid.lta`).

After patching, only the new TP needs to be processed longitudinally:

```bash
recon-all -long tp3 longbase -addtp -all
```

The `-addtp` flag tells `recon-all` to call `mri_add_new_tp` before starting the longitudinal initialisation.

> [!gotcha] `mri_add_new_tp` introduces a bias toward earlier time points
> The script's own help text warns: "you introduce a bias towards the earlier time points." The template was computed without the new TP, so the base space is anchored to the centroid of the original TPs, not the centroid of all TPs including the new one. The bias grows with the number of TPs added this way. The tool itself computes the sum of squared differences between the old and new template norms and stores it in `norm.with_<newtpid>.ssd.txt`, but there is currently no automatic threshold to decide when the base must be fully recomputed.
>
> The tool's authors are explicit: "we are currently not sure what influence this has on your analysis." Use Option 1 when possible. Option 2 is acceptable when (a) at least 3–4 TPs are already in the base, (b) the new TP is similar to the existing ones, and (c) only a small number of TPs are added this way.

Source: `scripts/mri_add_new_tp`.

---

## Statistical Analysis of Longitudinal Data

The longitudinal pipeline produces per-subject directories (`tpN.long.baseID`) that contain morphometric measures (`mris_anatomical_stats` outputs in `stats/`, thickness maps in `surf/`) with reduced scan-to-scan variability compared to independent cross-sectional runs.

These outputs feed into downstream longitudinal statistical analysis. FreeSurfer provides several helper scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| [[long_stats_slopes]] | Compute per-subject rates of change (slopes) from longitudinal stats |
| [[long_stats_combine]] | Combine per-subject slope estimates across a group |
| [[long_stats_tps]] | Compute subject-level time-point statistics |
| [[long_qdec_table]] | Construct a QDEC-compatible table from longitudinal outputs |
| [[long_mris_slopes]] | Per-vertex slope maps on the surface |
| [[long_submit_jobs]] | Cluster job submission for longitudinal runs |

Common statistical approaches for longitudinal neuroimaging data include:
- **Paired t-tests** for two time points.
- **Linear mixed-effects (LME) models** for multiple time points with covariates. FreeSurfer's QDEC interface supports LME analysis. The within-subject template reduces measurement variance and thereby increases the effective degrees of freedom for detecting longitudinal effects.

> [!gap] Comparison with cross-sectional measures
> Longitudinal and cross-sectional measurements of the same subject are **not directly comparable**, because the longitudinal TP directories (`tpN.long.baseID`) and the cross-sectional directories (`tpN`) were processed with different initialisations and (for some stages) different algorithms. Do not mix longitudinal and cross-sectional outputs in the same statistical model.

---

## Gotchas and Caveats

> [!gotcha] `-long` requires a completed `-base`
> `recon-all -long` reads the `base-tps` file from the base subject directory and verifies that the requested TP is listed. If the `-base` run has not completed or the `base-tps` file is missing, `recon-all -long` exits with an error immediately. Always complete the `-base` run (including `-autorecon3`) before running any `-long` jobs.

> [!gotcha] The base subject is not a real scan
> The base subject's `orig.mgz` is a synthetic median image created by `mri_robust_template`. Its morphometric measures (thickness, volume, etc.) should not be used in between-subject analyses alongside real cross-sectional subjects. The base is an internal processing artefact.

> [!gotcha] Acquisition parameter changes across time points
> `rca-base-init` checks whether the image geometry (field of view, voxel size) differs across time points by calling `mri_diff --notallow-pix --notallow-geo`. If a mismatch is found, the script prints a prominent warning and pauses for 10 seconds before continuing. Consistent changes (e.g., upgrading from 1 mm to 0.8 mm isotropic voxels) can introduce systematic bias. Use `-base-affine` to include an affine registration step when scanner calibration is known to have changed.

> [!gotcha] Memory requirements scale with number of time points
> `mri_robust_template` loads all input volumes simultaneously and maintains per-voxel weight maps. For large datasets (many TPs or high-resolution inputs) this can require substantial RAM. The `--subsample` flag can be used to reduce memory at the cost of registration accuracy, but is not set by default in the longitudinal pipeline.

> [!gotcha] Longitudinal runs cannot be used as input to a new `-base`
> The `.long.` substring in a directory name is a reserved pattern. Attempting to pass a longitudinal TP directory as input to `-base` will cause an error.

> [!gotcha] T2/FLAIR enhancement disabled for base creation
> The `-T2` and `-FLAIR` flags are incompatible with `-base`. They can be used in standard `-long` runs (where the actual TP scan is processed), but not in base creation.

---

## Relationship to Other Concepts

- **[[coordinate-systems]]**: The base subject has its own coordinate space. All TP-to-base LTA transforms are stored in `<baseID>/mri/transforms/<tpID>_to_<baseID>.lta`. The longitudinal TP subjects work in the base coordinate space for most volumetric operations.
- **[[surface-representations]]**: The longitudinal TP's `?h.orig` surface is initialised from the base's `?h.white` surface, not tessellated from scratch. Surface placement (`mris_place_surface`) refines this initialisation using the TP's own intensity data.
- **[[registration-overview]]**: Both the within-subject template registration and the TP-to-base registration use robust M-estimator methods implemented in `mri_robust_register` / `mri_robust_template`.
- **[[lta-format]]**: The TP-to-base and base-to-TP transforms are stored as `.lta` files in `<baseID>/mri/transforms/`.

---

## See also

Additional tools in the longitudinal stream not covered above:

- [[map_to_base]] — resamples a single volume or surface from one timepoint into the base (template) space, reusing the `<tp>_to_<base>.lta` created by the longitudinal stream.
- [[long_submit_postproc]] — cluster submission of per-subject longitudinal post-processing jobs (drives `long_stats_slopes` / `long_stats_tps` per `fsid-base`); a companion to the `long_submit_jobs` script above.
- [[thickdiffmap]] — computes a within-subject cortical-thickness difference map between two scans of the same person and accumulates group-wise change statistics.

---

## Confidence and Gaps

The information on this page is derived directly from:
- `scripts/recon-all` (FreeSurfer 8.2.0)
- `scripts/rca-base-init` (FreeSurfer 8.2.0)
- `scripts/rca-long-tp-init` (FreeSurfer 8.2.0)
- `scripts/mri_add_new_tp` (FreeSurfer 8.2.0)
- `mri_robust_register/mri_robust_template.cpp` (FreeSurfer 8.2.0)
- `mri_robust_register/MultiRegistration.cpp` (FreeSurfer 8.2.0)
- `mri_normalize_tp2/mri_normalize_tp2.cpp` (FreeSurfer 8.2.0)

Confidence is **high** for: the three-step workflow, naming conventions, the list of stages that are skipped or modified in `-long`, the `mri_robust_template` algorithm structure, and the `mri_add_new_tp` logic.

> [!gap] Exact M-estimator loss function
> The precise mathematical form of the M-estimator (Geman-McClure, Tukey biweight, or other) used in `mri_robust_template` / `mri_robust_register` is not read from the top-level files consulted here. It is implemented inside `RegRobust` in `mri_robust_register/`. The saturation parameter 4.685 matches the standard Tukey biweight value for Gaussian noise, but this should be verified from the `RegRobust` source.

> [!gap] `mri_normalize_tp2` usage in the current pipeline
> The file `mri_normalize_tp2/mri_normalize_tp2.cpp` exists and performs longitudinal normalisation using the base's control point volume mapped to the TP space. However, `mri_normalize_tp2` does not appear in the main longitudinal conditionals of `scripts/recon-all` in v8.2.0 — the equivalent functionality appears to have been absorbed into the standard `mri_normalize` call with the `-l` (long base ctrl vol) flag. The relationship between `mri_normalize_tp2` and the current pipeline should be verified against the v8.2.0 binary list and a full trace of the `-uselongbasectrlvol` code path.

> [!gap] `long_create_base_sigma` and `long_create_orig`
> Two scripts named [[long_create_base_sigma]] and [[long_create_orig]] exist in `scripts/` but were not read for this page. Their role in the longitudinal pipeline is not documented here.

---

## References

1. Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach*. NeuroImage 53(4), 1181–1196, 2010. https://dx.doi.org/10.1016/j.neuroimage.2010.07.020

2. Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing*. NeuroImage 51(1), 19–21, 2011. https://dx.doi.org/10.1016/j.neuroimage.2011.02.076

3. Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis*. NeuroImage 61(4), 1402–1418, 2012. https://dx.doi.org/10.1016/j.neuroimage.2012.02.084

4. FreeSurfer wiki — LongitudinalProcessing: http://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing (URL referenced in `recon-all` source; not scraped for this page).
