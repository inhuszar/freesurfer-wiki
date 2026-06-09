---
title: "process_exvivo_diff_data_bay3.sh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/process_exvivo_diff_data_bay3.sh"
families: []                     # site-specific ex vivo diffusion script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_concat]]"
  - "[[mri_binarize]]"
  - "[[mri_info]]"
  - "[[xfmrot]]"
  - "[[orientLAS]]"
  - "[[trac-all]]"
  - "[[dmri_paths]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Heavily site-specific (MGH/Martinos Bay 3 SSFP ex vivo diffusion): hard-codes absolute paths to MRtrix, FSL 6.0.4, ANTs, DTK, and the MGH cluster job submitters (pbsubmit/fsl_sub_mgh). It will not run unmodified off-site."
  - "Behaviour depends entirely on a user-supplied config file whose variable set is only discoverable by reading this script; no schema or template is shipped."
  - "Several stages call external MATLAB (fix_exvivo_dwi_drift) and third-party binaries whose internal behaviour is out of scope here."
tags:
  - exvivo
  - diffusion
  - dmri
  - tractography
  - site-specific
  - ssfp
---

# process_exvivo_diff_data_bay3.sh

## Summary

`process_exvivo_diff_data_bay3.sh` is a **site-specific** tcsh pipeline that
processes **ex vivo (post-mortem) diffusion MRI** acquired with the **SSFP
(steady-state free precession) diffusion sequence on the MGH/Martinos "Bay 3"
scanner**. Driven entirely by a user-supplied configuration file, it runs a
configurable sequence of stages: DICOM conversion and concatenation, MRtrix
denoising, temperature-drift correction (via a MATLAB helper), Gibbs-ringing
removal, ex-vivo-specific reorientation of the volume header and gradient table,
brain masking, FSL `eddy` distortion correction, ANTs bias-field correction, FSL
tensor fitting, DTK q-ball ODF reconstruction and tractography, and FSL
bedpostx + probtrackx probabilistic tractography. Each stage is independently
switched on or off by a `do*` variable in the config file, so in practice it is
run repeatedly, one or a few stages at a time.

> [!gotcha] Site-specific, derived from an internal "do,qbi" script
> The header comment states this is a version of the original `do,qbi` script
> adapted for Bay 3 SSFP diffusion data, with later edits by L. Zollei and
> C. Maffei ([`scripts/process_exvivo_diff_data_bay3.sh:4-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L4-L19)). It is
> installed only as an optional NMR-lab component
> (`COMPONENT nmr EXCLUDE_FROM_ALL`, [`scripts/CMakeLists.txt:355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L355)) and is
> **not** a general-purpose tool. It hard-codes absolute paths to MRtrix, FSL
> 6.0.4, ANTs, DTK, and MGH cluster job submitters and will not run unmodified on
> another system.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/process_exvivo_diff_data_bay3.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh)
- **Binary/script location:** `$FREESURFER_HOME/bin/process_exvivo_diff_data_bay3.sh`
- **FreeSurfer tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L202), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L216), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L342) (`--ras2vox`, `--cdc/--rdc/--sdc`, `--cras`, `--nslices`, `--cres`), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L546), [`xfmrot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L355) (rotate b-vectors by a matrix), [`orientLAS`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L459) (reorient DWIs + bvecs to LAS).
- **Third-party tools invoked (hard-coded paths):** MRtrix `dwidenoise`, `mrcalc`, `mrmath`, `mrdegibbs`, `dwigradcheck`, `dwibiascorrect` (under `/usr/pubsw/packages/mrtrix/current`); FSL `bet`, `eddy` (`/usr/pubsw/packages/fsl/6.0.4`), `dtifit`, `bedpostx_*`, `probtrackx2`; ANTs (`/autofs/.../ANTS/2.3.5`); DTK (`/usr/pubsw/packages/dtk/0.6.4.1_patched`: `hardi_mat`, `odf_recon`, `dti_recon`, `odf_tracker`, `spline_filter`); MATLAB `fix_exvivo_dwi_drift` ([`matlab/fix_exvivo_dwi_drift.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fix_exvivo_dwi_drift.m)); MGH cluster submitters `pbsubmit`, `fsl_sub_mgh`.

## Purpose and Context

Ex vivo diffusion imaging of fixed brain specimens differs from in vivo dMRI in
several ways this script is built to handle: the specimen sits in fixative
(fomblin or formalin) so the background and masking behave differently; the
gradient table is supplied **externally** (not embedded in the DICOMs) and must be
rotated into image space; the specimen is placed in non-standard orientations in
the bore (whole brain, or a single hemisphere lying lateral-side-down), so the
header orientation must be corrected before tractography; and scanner temperature
drifts over the long acquisitions, requiring intensity normalisation. The script
encodes the MGH lab's accumulated recipe for turning Bay 3 SSFP diffusion DICOMs
into FA/ODF maps and tractography.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]] or the standard
[[trac-all]] diffusion pipeline; it is a parallel, lab-internal ex vivo workflow.
Conceptually it occupies the same niche as [[trac-all]] (DWI preprocessing →
model fitting → tractography) but uses FSL/MRtrix/DTK rather than FreeSurfer's
TRACULA path tools.

## Inputs

### Required Input: a configuration file

The **only command-line argument** is the path to a config file, which is sourced
([`scripts/process_exvivo_diff_data_bay3.sh:21-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L21-L27)):

```bash
process_exvivo_diff_data_bay3.sh <configfile>
```

The config file must define (checked at [`scripts/process_exvivo_diff_data_bay3.sh:29-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L29-L65)):

| Variable | Meaning |
|----------|---------|
| `dcmdir` | DICOM source directory (must contain `scan.log`). |
| `dcmlist` | List of run numbers to convert/concatenate. |
| `bvecfile` | Externally supplied b-vector file (rotated into image space by the script). |
| `bvalfile` | b-value file. |
| `dwidir` | Output working directory. |
| `protocol` **or** (`pe1`,`pe2`,`rotime`) | Acquisition parameters: either a protocol print-out to parse, or the phase-encode directions and readout time directly. |

> [!assumption] Bay 3 SSFP ex vivo DICOMs with an external gradient table
> The DICOMs are assumed to be the `trufi_diff` SSFP diffusion series logged in
> `$dcmdir/scan.log` ([`scripts/process_exvivo_diff_data_bay3.sh:195-196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L195-L196)).
> The gradient directions come from `bvecfile`/`bvalfile`, **not** the headers, and
> are rotated by the absolute value of the volume's RAS→voxel matrix before use
> ([`scripts/process_exvivo_diff_data_bay3.sh:336-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L336-L358)). Stage toggles and
> thresholds also come from the config; unset toggles default to **off** (except
> `dogradcheck`, which defaults **on**).

### Input Assumptions and stage toggles

Every stage is gated by a `do*` switch, all defaulting to 0 unless set, with
`dogradcheck` defaulting to 1 ([`scripts/process_exvivo_diff_data_bay3.sh:67-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L67-L142)):
`doconcat`, `dodenoise`, `dodrift`, `dodegibb`, `doorient`, `dogradcheck`,
`domask`, `doeddy`, `dobiascor`, `dotensor`, `doodf`, `dotrk`, `doprebed`,
`dobed`, `dopostbed`, `doprobtrk`, `dopd`. Threshold/parameter variables include
`orientation` (0/1/2 specimen-placement code), `lobmaskthresh` (0.1),
`hibmaskthresh` (400), `usehibmask` (0), `angthresh` (60), `nstick` (2), and
`seedroidir`.

## Outputs

All outputs go under `$dwidir` (and `$dwidir.bedpostX` for bedpostx). The exact set
depends on which stages are enabled; the main artefacts are:

### Files Created (by stage)

| Stage (toggle) | Key outputs in `$dwidir` |
|----------------|--------------------------|
| `doconcat` | `dwi_set##.nii.gz` per run, then concatenated `dwi_orig.nii.gz` ([`scripts/process_exvivo_diff_data_bay3.sh:187-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L187-L221)) |
| `dodenoise` | `dwi_denoised.nii.gz`, `noise_est.nii.gz`, `residuals.nii.gz`, `rms_residuals.nii.gz` ([`scripts/process_exvivo_diff_data_bay3.sh:225-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L225-L260)) |
| `dodrift` | `dwi_drift.nii.gz`, `drift*` (MATLAB temperature-drift correction) ([`scripts/process_exvivo_diff_data_bay3.sh:262-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L262-L291)) |
| `dodegibb` | `dwi_degibb.nii.gz` ([`scripts/process_exvivo_diff_data_bay3.sh:295-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L295-L333)) |
| (always) | `mtx.r2v.txt`, `neg.mtx.r2v.txt`, `r2v.bvecs` — RAS→voxel-rotated b-vectors ([`scripts/process_exvivo_diff_data_bay3.sh:342-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L342-L358)) |
| `doorient` | `*.hdrorient.nii.gz`, `dwi_las.nii.gz` + `dwi_las.bvecs/.bvals` (LAS orientation), and `*_checked` gradient files if `dogradcheck` ([`scripts/process_exvivo_diff_data_bay3.sh:361-498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L361-L498)) |
| `domask` | `lowb_las_brain*`, `highb_las_brain_mask.nii.gz` ([`scripts/process_exvivo_diff_data_bay3.sh:501-552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L501-L552)) |
| `doeddy` | `dwi.nii.gz` (eddy-corrected) + `dwi.bvecs/.bvals`, `acqp.txt`, `index.txt`, masks ([`scripts/process_exvivo_diff_data_bay3.sh:554-664`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L554-L664)) |
| `dobiascor` | `dwi_biascorr.nii.gz`, `bias_est.nii.gz` ([`scripts/process_exvivo_diff_data_bay3.sh:667-706`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L667-L706)) |
| `dotensor` | `dtifit_*` (FA, MD, eigenvectors, …) ([`scripts/process_exvivo_diff_data_bay3.sh:708-743`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L708-L743)) |
| `doodf` | `qbi*` (DTK q-ball ODFs), `dti*` (FA/ADC/colour-FA), `gradients.txt`, `qbi_mat.dat` ([`scripts/process_exvivo_diff_data_bay3.sh:748-826`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L748-L826)) |
| `dotrk` | `qbi.inv,*.swap,*.trk` (q-ball streamline files for every inversion/swap combination) ([`scripts/process_exvivo_diff_data_bay3.sh:828-866`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L828-L866)) |
| `doprebed`/`dobed`/`dopostbed` | bedpostx inputs/outputs under `$dwidir.bedpostX` ([`scripts/process_exvivo_diff_data_bay3.sh:869-948`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L869-L948)) |
| `doprobtrk` | `dpath.{uncorrected,corrected}.targeted.*` probabilistic tractography ([`scripts/process_exvivo_diff_data_bay3.sh:950-1003`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L950-L1003)) |
| (all) | `log.txt` — per-command log ([`scripts/process_exvivo_diff_data_bay3.sh:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L156)) |

### Output Specifications

Volumes are NIfTI (`nii`/`nii.gz`); gradient files are FSL-style bvecs/bvals.
`dwi_las.nii.gz` is in **LAS** orientation (the convention FSL diffusion tools
expect), produced by `orientLAS` after the header reorientation, rather than by
FSL's `flip4fsl` — the script comment notes `flip4fsl` erroneously inverts the
x-bvecs ([`scripts/process_exvivo_diff_data_bay3.sh:455-463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L455-L463)).

## Mathematical Foundations

The script itself is an **orchestrator**; the diffusion modelling is done by the
external tools (FSL `dtifit`, DTK `odf_recon`, FSL `bedpostx`). The two genuinely
numerical operations performed *by the script* concern the **gradient-table and
volume geometry**, which dominate correctness for ex vivo data:

> [!math] B-vector rotation into image space
> Because the gradient table is supplied externally, the b-vectors must be rotated
> from scanner/RAS space into the image's voxel space. The script takes the
> RAS→voxel matrix from `mri_info --ras2vox`, replaces every element by its
> **absolute value** ([`scripts/process_exvivo_diff_data_bay3.sh:349-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L349-L352)), and
> applies that matrix to the b-vectors with `xfmrot`. Using the absolute value
> keeps the rotation a pure axis permutation/sign-free mapping appropriate when
> only the gradient axis assignment (not handedness) needs correcting.

> [!math] Specimen-placement reorientation
> The direction cosines and `c_ras` from the header are permuted to undo the
> non-standard placement of the specimen in the bore. The default
> ($orientation=0$) rotates 90° about x, $(x,y,z)\to(x,-z,y)$
> ([`scripts/process_exvivo_diff_data_bay3.sh:374-405`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L374-L405)); codes 1 and 2 apply
> different sign patterns for alternative placements. For a single hemisphere lying
> lateral-side-down, a further 90° rotation about y is applied
> ($(x,y,z)\to(z,y,-x)$ for lh, $(-z,y,x)$ for rh,
> [`scripts/process_exvivo_diff_data_bay3.sh:408-433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L408-L433)). The new cosines are
> written into the header with `mri_convert -iid/-ijd/-ikd -ic`.

> [!internal] All diffusion model fitting is external
> Tensor fitting (FSL `dtifit`), q-ball ODF reconstruction (DTK `odf_recon`,
> `hardi_mat`), deterministic tracking (DTK `odf_tracker`), and the ball-and-stick
> model + probabilistic tracking (FSL `bedpostx`/`probtrackx2`) are third-party
> programs; their algorithms are out of scope for this page.

## Configuration Options

### Command-line

There is exactly one positional argument — the config file — and no flags
([`scripts/process_exvivo_diff_data_bay3.sh:21-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L21-L27)). All control is via the
sourced config file.

### Config-file variables (the real "flags")

#### Required

| Variable | Type | Description |
|----------|------|-------------|
| `dcmdir` | path | DICOM source directory (with `scan.log`). |
| `dcmlist` | list | Run numbers to convert and concatenate. |
| `bvecfile` | path | External b-vector file. |
| `bvalfile` | path | b-value file. |
| `dwidir` | path | Output working directory. |
| `protocol` | path | Protocol print-out to parse for `pe1`/`pe2` (eddy). |
| `pe1`,`pe2`,`rotime` | str/str/float | Alternative to `protocol`: phase-encode directions (R/L/A/P) and readout time. |

#### Stage toggles (default 0 unless noted)

| Variable | Default | Stage enabled |
|----------|---------|---------------|
| `doconcat` | 0 | DICOM → NIfTI conversion + concatenation |
| `dodenoise` | 0 | MRtrix `dwidenoise` (Veraart 2016) |
| `dodrift` | 0 | MATLAB temperature-drift correction (`fix_exvivo_dwi_drift`) |
| `dodegibb` | 0 | MRtrix `mrdegibbs` (Kellner 2016) |
| `doorient` | 0 | header + gradient reorientation, LAS conversion |
| `dogradcheck` | **1** | MRtrix `dwigradcheck` gradient-orientation check |
| `domask` | 0 | brain mask from low-b (`bet`) and high-b (`mri_binarize`) |
| `doeddy` | 0 | FSL `eddy` distortion correction |
| `dobiascor` | 0 | ANTs/MRtrix `dwibiascorrect` |
| `dotensor` | 0 | FSL `dtifit` tensor fit |
| `doodf` | 0 | DTK q-ball ODF + DTI reconstruction |
| `dotrk` | 0 | DTK deterministic q-ball tracking (all inv/swap combos) |
| `doprebed` | 0 | bedpostx preprocessing |
| `dobed` | 0 | bedpostx main (slice-by-slice, cluster) |
| `dopostbed` | 0 | bedpostx postprocessing |
| `doprobtrk` | 0 | `probtrackx2` targeted probabilistic tractography |
| `dopd` | 0 | add `--pd` (path-distribution correction) in probtrackx |

#### Numeric parameters (with defaults)

| Variable | Default | Meaning |
|----------|---------|---------|
| `orientation` | 0 | Specimen-placement code (0/1/2) selecting the reorientation sign pattern. |
| `lobmaskthresh` | 0.1 | `bet` fractional-intensity threshold for the low-b mask. |
| `hibmaskthresh` | 400 | `mri_binarize --min` for the high-b mask. |
| `usehibmask` | 0 | Use the high-b mask (`highb`) instead of low-b (`lowb`) for eddy. |
| `extent_window` | 5 | (`extent`) `dwidenoise` patch extent. |
| `angthresh` | 60 | DTK tracking angle threshold (deg). |
| `nstick` | 2 | bedpostx number of fibres per voxel (`--nf`). |
| `seedroidir` | `$dwidir/rois` | Directory of seed/target ROI `.nii` files for probtrackx. |
| `acq_plane` | (axial) | Acquisition plane for `mrdegibbs` axes (axial/coronal/sagittal). |
| `keepframe` | all 1 | Per-frame keep mask used to pick low-b/high-b frame indices. |
| `hemi` | (unset) | `lh`/`rh` → apply hemisphere reorientation (lateral-side-down). |

### Configuration Interactions

> [!gotcha] `protocol` vs (`pe1`,`pe2`,`rotime`) for eddy
> The eddy stage needs phase-encode directions and a readout time. Provide
> **either** a `protocol` print-out (parsed with awk for the `trufi_diff_tb`
> entry's "Phase enc. dir.") **or** set `pe1`/`pe2`/`rotime` directly
> ([`scripts/process_exvivo_diff_data_bay3.sh:41-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L41-L53), [`558-578`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L558-L578)). With
> `protocol`, `rotime` is forced to 0.1 (the comment notes "1 doesn't work in
> eddy", [`scripts/process_exvivo_diff_data_bay3.sh:576`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L576)).

> [!gotcha] Stages chain through files, not memory — run them in order
> Each stage discovers its input by checking for the **most-processed file that
> exists** (e.g. degibb → drift → denoised → orig,
> [`scripts/process_exvivo_diff_data_bay3.sh:300-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L300-L306)). So enabling a later
> stage before its predecessor has produced its output will silently fall back to
> an earlier (or missing) file. The intended use is to enable stages in pipeline
> order across successive runs.

> [!gotcha] `usehibmask` switches which mask eddy and downstream stages use
> `usehibmask=1` sets `mask=highb` (else `lowb`,
> [`scripts/process_exvivo_diff_data_bay3.sh:144-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L144-L148)). The high-b mask exists
> as a fallback for specimens in **formalin** (heavy background) where the low-b
> `bet` mask fails; in **fomblin** the low-b mask is usually fine.

> [!gotcha] `orientation` and `hemi` reorientations were not co-validated
> The per-`orientation` whole-brain reorientation and the per-`hemi`
> hemisphere reorientation are applied in sequence, but a source comment warns
> the two paths "have not been debugged together"
> ([`scripts/process_exvivo_diff_data_bay3.sh:408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L408)). Verify the resulting
> orientation manually.

> [!gotcha] `dotrk` deliberately produces every inversion/axis-swap combination
> The deterministic tracking loop runs DTK `odf_tracker` for all
> inversion (`no x y z`) × swap (`no xy yz zx`) combinations and writes one `.trk`
> per combination ([`scripts/process_exvivo_diff_data_bay3.sh:842-865`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L842-L865)) so the
> user can pick the geometrically correct one by inspection — a manual QC step,
> not a bug.

## Typical Use Cases

### 1. First pass: convert and concatenate, then reorient

```tcsh
# config1.csh sets: dcmdir, dcmlist, bvecfile, bvalfile, dwidir,
#   doconcat = 1, doorient = 1, orientation = 0
process_exvivo_diff_data_bay3.sh config1.csh
```

### 2. Second pass: preprocess, mask, eddy

```tcsh
# config2.csh adds: dodenoise = 1, dodegibb = 1, domask = 1,
#   doeddy = 1, pe1 = A, pe2 = P, rotime = 0.1
process_exvivo_diff_data_bay3.sh config2.csh
```

### 3. Model fitting and tractography

```tcsh
# config3.csh adds: dobiascor = 1, dotensor = 1, doodf = 1, dotrk = 1,
#   angthresh = 60
process_exvivo_diff_data_bay3.sh config3.csh
```

### 4. Probabilistic tractography on the cluster

```tcsh
# config4.csh adds: doprebed = 1 (run on a high-memory node), then
#   dobed = 1 (submits to launchpad), dopostbed = 1, doprobtrk = 1,
#   seedroidir = /path/to/rois
process_exvivo_diff_data_bay3.sh config4.csh
```

## Pipeline Context

A self-contained, **site-specific ex vivo diffusion pipeline**. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]] or [[trac-all]], and it does not
call them.

**Predecessor:** Bay 3 SSFP diffusion DICOMs + an external gradient table →
**process_exvivo_diff_data_bay3.sh** → **Successor:** FA/ODF maps and streamline /
probabilistic-tractography results, used in downstream ex vivo connectivity
analysis. It plays the role [[trac-all]] (and tools such as [[dmri_paths]]) play
for in vivo TRACULA, but with an FSL/MRtrix/DTK toolchain instead.

**Predecessor:** [[wiki/tools/mri_convert|mri_convert]] (DICOM import) → **This
tool** → **Successor:** downstream ex vivo tractography analysis.

## Gotchas and Caveats

> [!gotcha] Hard-coded absolute third-party paths
> MRtrix (`/usr/pubsw/packages/mrtrix/current`), FSL 6.0.4
> (`/usr/pubsw/packages/fsl/6.0.4/bin/eddy`), ANTs
> (`/autofs/cluster/pubsw/.../ANTS/2.3.5`), and DTK
> (`/usr/pubsw/packages/dtk/0.6.4.1_patched`) are referenced by absolute path
> ([`scripts/process_exvivo_diff_data_bay3.sh:159-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L159-L160), [`594`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L594), [`675`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L675), [`745`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L745)). These
> will not exist off-site; the script must be edited to relocate them.

> [!gotcha] Cluster job submitters are MGH-specific
> `dobed` builds a command file for `fsl_sub_mgh` and `doprobtrk` uses
> `pbsubmit -q p30 ...` ([`scripts/process_exvivo_diff_data_bay3.sh:928`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L928), [`988`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L988)) —
> the MGH/Martinos "launchpad" scheduler. `dobed` only **prints** the submission
> command for the user to run manually.

> [!gotcha] `FS_SAME_SLICE_THRESH` is forced during conversion
> The conversion stage sets `FS_SAME_SLICE_THRESH .01`
> ([`scripts/process_exvivo_diff_data_bay3.sh:200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L200)) to avoid a "strange exvivo
> save/transfer error" — a workaround baked into the script.

> [!gotcha] `#!/bin/tcsh -ef` aborts on the first error
> The `-e` flag means any failing command stops the whole run. Because stages
> auto-select inputs from prior outputs, a missing predecessor file can cause an
> abort or a silent fall-back depending on the stage; check `log.txt`.

> [!gotcha] Some "ERROR" messages do not actually exit
> The required-variable checks (e.g. `dcmdir`, `protocol`/`pe*`) print an error
> string but **do not `exit`** ([`scripts/process_exvivo_diff_data_bay3.sh:29-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L29-L65)),
> so a missing variable may surface later as a downstream failure rather than a
> clean early exit.

## Error Compensation and Guard Rails

- **Stage input fall-back:** every stage picks the most-processed existing input
  file, so the pipeline tolerates skipped optional stages
  (e.g. [`scripts/process_exvivo_diff_data_bay3.sh:271-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L271-L275)).
- **High-b mask as a low-b fall-back** for formalin specimens
  ([`scripts/process_exvivo_diff_data_bay3.sh:527-531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L527-L531)).
- **`orientLAS` instead of `flip4fsl`** to avoid an erroneous x-bvec inversion
  ([`scripts/process_exvivo_diff_data_bay3.sh:455-463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L455-L463)).
- **`dwigradcheck` on by default** to catch gradient-table misorientation
  ([`scripts/process_exvivo_diff_data_bay3.sh:85-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L85-L87), [`467-496`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L467-L496)) — a
> response to the historical gradient-orientation problems noted in the header.
- It does **not** auto-correct specimen placement; `orientation`/`hemi` must be set
  correctly by the user.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — DICOM → NIfTI conversion and the header reorientation (`-iid/-ijd/-ikd -ic`).
- [[mri_concat]] — concatenates per-run DWIs and averages low-b/high-b frames.
- [[mri_binarize]] — builds the high-b brain mask by thresholding.
- [[mri_info]] — supplies the RAS↔voxel matrix, direction cosines, `c_ras`, slice count, and voxel size used for reorientation and gradient rotation.
- [[xfmrot]] — rotates the b-vectors by the (abs) RAS→voxel matrix.
- [[orientLAS]] — reorients the DWIs and gradient table to LAS for the FSL tools.
- [[trac-all]] — FreeSurfer's standard (in vivo) diffusion/TRACULA pipeline; the conceptual counterpart this lab-internal script parallels.
- [[dmri_paths]] — TRACULA path reconstruction tool, for contrast with the DTK/bedpostx tractography used here.

## Confidence and Gaps

**Medium confidence.** The stage structure, toggle defaults, config-variable
requirements, the gradient-rotation and reorientation arithmetic, and the
per-stage outputs were read directly from
[`scripts/process_exvivo_diff_data_bay3.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh).
Confidence is capped at medium because correctness depends on many external tools
and a user config that no shipped template documents.

> [!gap] No shipped config template
> The set of config variables is only discoverable by reading the script; there is
> no example config or schema in the tree. The lists above are the de-facto
> contract.

> [!gap] External-tool behaviour out of scope
> MRtrix, FSL, ANTs, and DTK steps are treated as black boxes here; their exact
> options/algorithms (e.g. `eddy --dont_peas`, `odf_recon -nt -p 3 -sn 1`) are
> documented by those projects.

> [!gap] MATLAB drift correction
> `dodrift` shells out to MATLAB `fix_exvivo_dwi_drift`
> ([`matlab/fix_exvivo_dwi_drift.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fix_exvivo_dwi_drift.m)); its internal model was not analysed
> on this page.

## References

- FreeSurfer source: [`scripts/process_exvivo_diff_data_bay3.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh) (v8.2.0).
- Installed as an optional NMR component: [`scripts/CMakeLists.txt:355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L355).
- Methods referenced in comments: Veraart et al. 2016 (MP-PCA denoising), Kellner et al. 2016 (Gibbs-ringing removal); both via their MRtrix implementations.
- Adapted from the lab-internal `do,qbi` script; later edits by L. Zollei and C. Maffei (header, [`scripts/process_exvivo_diff_data_bay3.sh:4-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/process_exvivo_diff_data_bay3.sh#L4-L19)).
