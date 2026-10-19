---
title: "mri_rbvpvc"
type: tool
fs_version: "8.2.0"
source_language: "C"
source_files:
  - "mri_rbvpvc/mri_rbvpvc.c"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_gtmpvc]]"
  - "[[mri_gtmseg]]"
  - "[[mri_coreg]]"
  - "[[color-lut]]"
  - "[[mri_segstats]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps:
  - "Source header marks the program 'not yet tested' (print_help). It overlaps heavily with the more complete mri_gtmpvc; document as the standalone RBV/GTM implementation it is, but treat its production-readiness as uncertain."
  - "GTM/RBV/MG numerical internals (GTMbuildX, GTMsolve, GTMrbv, GTMmgpvc) are in gtm.c / gtm.h and were not opened for this page."
tags:
  - pet
  - partial-volume-correction
  - rbv
  - gtm
  - quantification
---

# mri_rbvpvc

## Summary

`mri_rbvpvc` performs **Region-Based Voxelwise (RBV)** partial volume
correction (PVC) on PET data, after Thomas et al. (2011). To do this it first
builds and solves the **Geometric Transfer Matrix (GTM)** — RBV requires the
GTM region estimates as an intermediate — and can optionally also produce a
**Müller-Gärtner (MG)** correction. Given a PET volume, an anatomical
segmentation that defines the regions, an anatomical→PET registration, and the
scanner point-spread-function (PSF) FWHM, it estimates the true (PV-corrected)
activity and writes a directory of GTM/RBV/MG outputs plus diagnostics.

> [!contradiction] "not yet tested" warning in source
> `print_help()` prints **"WARNING: this program is not yet tested!"**
> ([`mri_rbvpvc/mri_rbvpvc.c:889-893`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L889-L893)).
> The actively-maintained PET PVC tool in FreeSurfer is [[mri_gtmpvc]], which
> implements GTM/MG/RBV with a broader, tested option set. Prefer
> `mri_gtmpvc` unless you specifically need this program; this page documents
> `mri_rbvpvc` for completeness and provenance.

## Source Information

- **Language:** C (with some C++ standard-library use)
- **Source file(s):** [`mri_rbvpvc/mri_rbvpvc.c`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_rbvpvc`
- **Original author:** Douglas N. Greve.
- **Core math** lives in the shared GTM library (`gtm.h` / `gtm.c`): see the
  `GTMbuildX`, `GTMsolve`, `GTMrbv`, `GTMmgpvc`, `GTMsynth` declarations at
  [`mri_rbvpvc/mri_rbvpvc.c:139-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L139-L153).

## Purpose and Context

PET images have low spatial resolution, so signal "spills over" between
adjacent tissue regions (the partial-volume effect). The **GTM** method models
this spill-over as a linear system: each anatomical region's measured PET
signal is a weighted mixture of the true regional values, where the weights
come from convolving the region masks with the scanner PSF. Solving that system
recovers per-region true activity. **RBV** then projects those GTM region
estimates back to a *voxelwise* corrected image. **MG** is an alternative
two-compartment (GM/non-GM) voxelwise correction.

The anatomical regions come from a FreeSurfer-style tissue-type segmentation
(as produced for the GTM workflow by [[mri_gtmseg]]), and the PET must be
registered to that anatomy with an LTA transform (e.g. from [[mri_coreg]] /
bbregister). This tool is a standalone, post-hoc PET-quantification step; it is
not part of recon-all.

## Inputs

### Required Inputs

| Input | Flag | Format | Role |
|------|------|--------|------|
| PET source volume | `--i` / `--src` | [[mgz]] / nii(.gz) | the data to be PV-corrected (`yvol`) |
| Anatomical segmentation | `--seg` | [[mgz]] | defines the GTM regions; **must pass a tissue-type check** |
| anat→PET registration | `--reg` | [[lta-format\|.lta]] | maps the anatomical/segmentation space to PET space (**LTA required**) |
| PSF FWHM | `--psf` (or per-axis) | mm (float) | scanner resolution; required (may be set per col/row/slice) |
| Output directory | `--o` | dir | where all outputs are written |

The segmentation file is parsed for its companion `<stem>.lta` (anat→seg)
which is read alongside `--reg`
([`mri_rbvpvc/mri_rbvpvc.c:298-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L298-L308)).

### Input Assumptions

> [!assumption] Registration must be an LTA, not register.dat
> Passing a `register.dat`-style matrix to `--reg` is rejected with an explicit
> error: "cannot use register.dat-style registration matrix, must be LTA"
> ([`mri_rbvpvc/mri_rbvpvc.c:678-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L678-L693)).
> Alternatively `--reg-identity` uses an identity transform (PET already in the
> segmentation's space).

> [!assumption] Segmentation must carry tissue types
> The seg is validated with `CheckSegTissueType()`; if it fails, the program
> aborts with "Failed tissue type check"
> ([`mri_rbvpvc/mri_rbvpvc.c:324-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L324-L328)).
> The default tissue-type schema is `default-jan-2014`
> ([`mri_rbvpvc/mri_rbvpvc.c:254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L254));
> `--ttype+head` switches to the variant that includes a head segmentation.

> [!assumption] PSF FWHM is mandatory
> If no PSF is set (all three axis FWHMs remain negative) the program aborts
> with "must spec psf FWHM"
> ([`mri_rbvpvc/mri_rbvpvc.c:919-922`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L919-L922)).

## Outputs

With `--o OUTDIR`, the parser pre-registers a fixed set of output paths
([`mri_rbvpvc/mri_rbvpvc.c:761-779`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L761-L779))
and `main()` writes additional files
([`mri_rbvpvc/mri_rbvpvc.c:452-630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L452-L630)):

| File (under `OUTDIR/`) | Contents |
|---|---|
| `beta.nii.gz` | per-region GTM estimates (the solved true activities) |
| `seg.nii.gz` | GTM segmentation resampled into PET space |
| `seg.ctab` | tissue-type colour table for the GTM seg |
| `pvf.nii.gz` | tissue-type partial-volume fractions in PET space |
| `rvar.dat` | residual variance per frame |
| `vrf.dat` / `seg.vrf.nii.gz` | variance-reduction factor (overall / per region) |
| `seg.rvar.nii.gz` | residual variance per region |
| `seg.nvox.nii.gz` | voxel count per region |
| `skew.dat`, `kurtosis.dat` | residual skew/kurtosis per frame |
| `xtx.mat` | the $X^{T}X$ matrix (MATLAB format) |
| `cond.dat` | condition number of $X^{T}X$ |
| `nmask.dat` | number of voxels in the analysis mask |
| `scale.dat` | global rescale factor (if rescaling) |
| `hrseg2pet.lta`, `anat2pet.lta` | registrations actually used |
| `mri_rbvpvc.log` | run log |
| `rbv.nii.gz` | **RBV-corrected volume** (only with `--rbv`) |
| `mg.nii.gz` + `mg.reftac.dat` | **MG-corrected volume** (only with `--mgpvc`) |
| `eres.nii.gz`, `yhat.nii.gz`, `yhat0.nii.gz` | residual / fitted volumes (only with `--save-eres`, `--save-yhat`, `--save-yhat0`) |

### Output Specifications

GTM region quantities (`beta`, `vrf`, `nvox`, …) are written as 1-D
"images" with one column per region. `rbv.nii.gz`, `mg.nii.gz`, and the fitted
volumes are full PET-space volumes. By default the RBV output is masked to the
brain (see `--no-mask_rbv_to_brain`).

## Mathematical Foundations

> [!math] GTM linear model
> The GTM expresses measured regional PET as $y = X\beta + \varepsilon$, where
> $X$ is the geometric transfer matrix (region masks convolved with the PSF and
> integrated per region) and $\beta$ are the true per-region activities. The
> tool builds $X$ (`GTMbuildX`) and solves the normal equations
> $\hat{\beta} = (X^{T}X)^{-1}X^{T}y$ (`GTMsolve`), reporting the condition
> number of $X^{T}X$ and the variance-reduction factor
> $\mathrm{VRF}_n = 1/(X^{T}X)^{-1}_{nn}$
> ([`mri_rbvpvc/mri_rbvpvc.c:1028-1052`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L1028-L1052)).

- **PSF model:** the FWHM is converted to a Gaussian standard deviation via
  $\sigma = \mathrm{FWHM}/\sqrt{\log 256}$ (used in the smoothing helpers, e.g.
  [`mri_rbvpvc/mri_rbvpvc.c:1007-1010`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L1007-L1010)).
- **RBV:** computed by `GTMrbv()` from the GTM solution and written when
  `--rbv` is set ([`mri_rbvpvc/mri_rbvpvc.c:618-630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L618-L630)).
- **Global rescaling (default on):** the result is rescaled so the mean of the
  reference regions equals a fixed value; the default reference seg IDs are
  **7 and 46** (left/right cerebellum white matter), set at
  [`mri_rbvpvc/mri_rbvpvc.c:256-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L256-L259);
  the usage text describes it as "global rescale such that mean of cerebellum
  WM is 100" ([`mri_rbvpvc/mri_rbvpvc.c:859`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L859)).

> [!internal] Core algorithms are in the GTM library
> `GTMbuildX`, `GTMsolve`, `GTMrbv`, `GTMmgpvc`, `GTMsynth`, `GTMsegrvar`,
> `VRFStats` orchestrate the method; the heavy lifting is in `gtm.c`/`gtm.h`
> (not opened for this page). See [[mri_gtmpvc]] for the sibling tool built on
> the same library.

## Configuration Options

### Complete Flag Reference

Parsed in `parse_commandline()`
([`mri_rbvpvc/mri_rbvpvc.c:644-843`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L644-L843)).
Option matching is case-insensitive except where noted.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i`<br>`--src` | string | (required) | PET source volume to correct ([`:696`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L696)) |
| `--seg` | string | (required) | anatomical segmentation defining GTM regions ([`:701`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L701)) |
| `--reg` | LTA file | (required unless `--reg-identity`) | anat→PET registration; LTA only ([`:678`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L678)) |
| `--reg-identity`<br>`--identity` | flag | off | use identity registration (PET already in seg space) ([`:694-695`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L694-L695)) |
| `--o` | dir | (required, unless `--synth` alone) | output directory ([`:761`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L761)) |
| `--psf` | float (mm) | unset (<0) | isotropic scanner PSF FWHM (sets col/row/slice together) ([`:716`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L716)) |
| `--psf-col` | float (mm) | from `--psf` | PSF FWHM, column axis ([`:724`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L724)) |
| `--psf-row` | float (mm) | from `--psf` | PSF FWHM, row axis ([`:729`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L729)) |
| `--psf-slice` | float (mm) | from `--psf` | PSF FWHM, slice axis ([`:734`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L734)) |
| `--rbv` | flag | off | perform RBV PVC → `rbv.nii.gz` ([`:745`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L745)) |
| `--mgpvc` | float | off | perform Müller-Gärtner PVC; arg is min GM PVF (0–1) → `mg.nii.gz` ([`:749`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L749)) |
| `--no-mask_rbv_to_brain` | flag | (mask on) | do not mask the RBV output to brain ([`:670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L670)) |
| `--rescale`<br>`--no-rescale` | flag | rescale on | global rescale to reference regions (cerebellum WM, ids 7 & 46) / disable it ([`:746-747`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L746-L747)) |
| `--mask` | string | none | restrict analysis to voxels in this mask (PET space) ([`:706`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L706)) |
| `--ttype+head` | flag | default-jan-2014 | use tissue-type schema that includes head segmentation ([`:667-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L667-L668)) |
| `--tt-reduce` | flag | off | reduce the segmentation to its tissue-type classes ([`:669`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L669)) |
| `--replace` | int int | — | replace seg id1 with id2 (repeatable) ([`:783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L783)) |
| `--merge-hypos` | flag | off | merge WM-hypointensity ids 78 & 79 into 77 ([`:790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L790)) |
| `--apply-fwhm` | float | 0 | extra Gaussian smoothing of the input (for testing) ([`:739`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L739)) |
| `--X` | string | none | save the (large) GTM design matrix $X$ as text ([`:755`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L755)) |
| `--synth` | beta vol | — | synthesise an unsmoothed volume from supplied GTM betas ([`:799`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L799)) |
| `--save-eres` | flag | off | write residual volume `eres.nii.gz` ([`:780`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L780)) |
| `--save-yhat` | flag | off | write smoothed fitted volume `yhat.nii.gz` ([`:781`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L781)) |
| `--save-yhat0` | flag | off | write unsmoothed fitted volume `yhat0.nii.gz` ([`:782`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L782)) |
| `--rvar-only` | flag | off | compute/write residual variance then exit early ([`:760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L760)) |
| `--opt` | flag | off | run a Powell optimisation of the registration (reads `register.lta`) ([`:666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L666)) |
| `--vg-thresh` | float | 1e-4 | volume-geometry equality tolerance for LTA concatenation ([`:794`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L794)) |
| `--sd`<br>`-SDIR` | string | `$SUBJECTS_DIR` | set the subjects directory ([`:672`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L672)) |
| `--threads` | int | 1 | number of OpenMP threads ([`:810`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L810)) |
| `--max-threads` | flag | — | use the maximum available threads ([`:818`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L818)) |
| `--max-threads-1` | flag | — | use max threads minus one ([`:825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L825)) |
| `--gdiag` | int | — | set diagnostic verbosity ([`:711`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L711)) |
| `--debug` | flag | off | echo each parsed option ([`:663`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L663)) |
| `--checkopts`<br>`--nocheckopts` | flag | off | parse and check options, then exit without running ([`:664-665`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L664-L665)) |
| `--help` | flag | — | print usage (and the "not yet tested" warning) ([`:661`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L661)) |
| `--version` | flag | — | print version and exit ([`:662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L662)) |

> [!gotcha] `--threads-max` in the usage text vs `--max-threads` in the parser
> The usage block prints `--threads-max` / `--threads-max-1`
> ([`mri_rbvpvc/mri_rbvpvc.c:873-875`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L873-L875)),
> but the option actually parsed is `--max-threads` / `--max-threads-1`
> ([`mri_rbvpvc/mri_rbvpvc.c:818-832`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L818-L832)).
> Use the parser spelling.

### Configuration Interactions

- **`--reg` vs `--reg-identity`:** exactly one registration source is needed.
  If neither is supplied (and not identity), the program aborts "must spec
  regfile" ([`mri_rbvpvc/mri_rbvpvc.c:959-964`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L959-L964)).
- **`--o` vs `--synth`:** an output directory is required *unless* you only
  want synthesis. With `--synth` and no `--o`, the program sets `SynthOnly` and
  exits after writing the synthesised volume
  ([`mri_rbvpvc/mri_rbvpvc.c:924-928`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L924-L928)).
- **`--save-eres/--save-yhat/--save-yhat0`** only take effect when `--o` is set
  (the filenames are built inside the `OutDir` block of `check_options`,
  [`mri_rbvpvc/mri_rbvpvc.c:930-943`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L930-L943)).
- **`--rbv` / `--mgpvc`** are independent add-ons to the GTM solve; you can
  request neither (GTM only), either, or both.
- **`--psf` then `--psf-col/row/slice`:** `--psf` sets all three axes; the
  per-axis flags override individually, so order matters if you mix them.

## Typical Use Cases

### Use Case 1: GTM + RBV correction

```bash
mri_rbvpvc \
  --i pet.nii.gz \
  --seg gtmseg.mgz \
  --reg pet2anat.lta \
  --psf 6 \
  --rbv \
  --o rbv.output
```

GTM solve plus RBV-corrected `rbv.output/rbv.nii.gz`, assuming a 6 mm PSF.

### Use Case 2: GTM with Müller-Gärtner

```bash
mri_rbvpvc --i pet.nii.gz --seg gtmseg.mgz --reg pet2anat.lta \
  --psf 6 --mgpvc 0.5 --o mg.output
```

### Use Case 3: GTM only, no global rescale

```bash
mri_rbvpvc --i pet.nii.gz --seg gtmseg.mgz --reg pet2anat.lta \
  --psf 5 --no-rescale --o gtm.output
```

## Pipeline Context

Standalone PET-quantification step, not part of recon-all
(`recon_all_stage: null`). Upstream you need a recon-all subject, a GTM
segmentation (e.g. [[mri_gtmseg]]), and a PET→anatomy registration
([[mri_coreg]] / bbregister). Downstream, region values can be tabulated and
ROI summaries produced (see [[mri_segstats]] / GTM stats tooling).

**Predecessor:** [[mri_gtmseg]] + [[mri_coreg]] → **This tool** →
**Successor:** ROI tabulation / analysis

## Gotchas and Caveats

> [!gotcha] Prefer mri_gtmpvc
> This program duplicates much of [[mri_gtmpvc]] but carries a "not yet
> tested" warning and a narrower, partly inconsistent option surface. For
> production PET PVC use `mri_gtmpvc`.

> [!gotcha] register.dat is rejected outright
> Only LTA registrations are accepted for `--reg`; a `register.dat` aborts
> immediately ([`mri_rbvpvc/mri_rbvpvc.c:678-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L678-L693)).

> [!gotcha] Default rescaling silently changes intensities
> Unless `--no-rescale` is given, the output is globally rescaled so the
> cerebellum-WM reference (seg ids 7 & 46) hits the reference level — absolute
> intensities are not preserved
> ([`mri_rbvpvc/mri_rbvpvc.c:256-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L256-L259), [`:462-475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L462-L475)).

## Error Compensation and Guard Rails

- Validates source, seg, registration type, PSF, and output destination in
  `check_options()` before loading data
  ([`mri_rbvpvc/mri_rbvpvc.c:900-967`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L900-L967)).
- If the seg file is not directly readable, it retries under
  `$SUBJECTS_DIR/<subject>/mri/` using the subject name embedded in the
  registration ([`mri_rbvpvc/mri_rbvpvc.c:910-917`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L910-L917)).
- Checks seg/mask dimension agreement and the tissue-type schema before
  building the GTM
  ([`mri_rbvpvc/mri_rbvpvc.c:324-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_rbvpvc/mri_rbvpvc.c#L324-L372)).

## Related Tools

- [[mri_gtmpvc]] — the maintained PET PVC tool implementing GTM/MG/RBV on the
  same GTM library; preferred over `mri_rbvpvc`
- [[mri_gtmseg]] — builds the high-resolution tissue-type GTM segmentation used
  for `--seg`
- [[mri_coreg]] — produces the PET→anatomy LTA registration for `--reg`
- [[color-lut]] — the label scheme behind the reference ids (7/46 cerebellum
  WM) and hypointensity ids (77/78/79 used by `--merge-hypos`)
- [[mri_segstats]] — general segmentation-statistics tool for downstream ROI
  summaries

## Confidence and Gaps

The complete CLI, required inputs, output file set, and the high-level GTM/RBV
flow are read directly from the source with high confidence. Confidence is
marked **medium** overall because the program self-identifies as untested and
overlaps with `mri_gtmpvc`.

> [!gap] GTM/RBV/MG numerical internals
> `GTMbuildX`, `GTMsolve`, `GTMrbv`, `GTMmgpvc`, and `GTMsynth` live in
> `gtm.c`/`gtm.h` and were not opened here; the equations above are the
> standard GTM/RBV formulation, but exact masking, padding, and PVF
> computations should be confirmed against the GTM library.

## References

- Thomas, B.A., Erlandsson, K., Modat, M., et al. (2011). *The importance of
  appropriate partial volume correction for PET quantification in Alzheimer's
  disease.* Eur J Nucl Med Mol Imaging 38, 1104–1119. (Cited in the source
  header as the RBV reference.)
- Müller-Gärtner, H.W., et al. (1992). *Measurement of radiotracer
  concentration in brain gray matter using positron emission tomography: MRI-
  based correction for partial volume effects.* J Cereb Blood Flow Metab.
