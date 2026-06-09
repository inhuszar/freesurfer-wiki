---
title: "trac-preproc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/trac-preproc"
families: []                     # TRACULA stage script
recon_all_stage: null
related:
  - "[[wiki/pipelines/trac-all|trac-all]]"
  - "[[trac-paths]]"
  - "[[dmri_motion]]"
  - "[[dmri_train]]"
  - "[[dmri_bset]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_concat]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
  - "[[mri_robust_register]]"
  - "[[mri_cvs_register]]"
  - "[[mri_binarize]]"
  - "[[dt_recon]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The CVS, SyN, and FNIRT inter-subject warp branches and their longitudinal base-template variants were read statically but not executed; several carry explicit 'Hack: using one time point for now' comments."
  - "Multi-field-map (nmap>1) branch at lines ~1005-1014 sets cmd without 'set' (likely a latent bug); not exercised here."
tags:
  - tracula
  - diffusion
  - dmri
  - preprocessing
  - registration
  - eddy
---

# trac-preproc

## Summary

`trac-preproc` performs all of TRACULA's pre-processing for **a single subject**.
It is the worker behind the [[wiki/pipelines/trac-all|trac-all]] `-prep` stage and
is not normally invoked by hand. Driven by a sourced configuration file
(`dmrirc.local`), it executes up to six substeps in sequence: (1.1) DWI
conversion and eddy-current / B0 distortion correction, (1.2) image quality
assessment / head-motion estimation, (1.3) intra-subject diffusion-to-T1
registration, (1.4) single-tensor fit, (1.5) inter-subject registration to a
template, and (1.6) construction of anatomical pathway priors from the training
atlas. It chains together a large number of FreeSurfer and FSL tools rather than
implementing image computation itself.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc)
- **Script location:** `$FREESURFER_HOME/bin/trac-preproc`
- **Original author:** Anastasia Yendiki (MGH)
- **Invoked by:** [[wiki/pipelines/trac-all|trac-all]] (the `-prep` stage and individual substep flags), which writes `scripts/dmrirc.local` and passes it via `-c`.
- **Tools it drives:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L223), `orientLAS`, FSL `topup`/`applytopup`/`eddy_openmp`/`eddy_correct`/`bet`/`dtifit`/`flirt`/`fsl_reg`/`invwarp`/`convertwarp`/`applywarp`, `xfmrot`, [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L240), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L492), [`dmri_bset`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1118), [`dmri_motion`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1197), `fslregister`/[`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1296), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1308), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1329), [`mri_robust_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1651), [`mri_cvs_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1750), `antsRegistrationSyNQuick.sh`, [`mri_warp_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1832), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1609), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1966), and [`dmri_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2152).

## Purpose and Context

TRACULA's tractography needs each subject's diffusion data placed in a common
analysis frame, corrected for the dominant DWI artefacts, fitted with a tensor
(for FA-based registration and along-tract scalars), and equipped with
anatomically-informed priors for every pathway. `trac-preproc` produces all of
that for one subject. Splitting it from the orchestrator lets
[[wiki/pipelines/trac-all|trac-all]] submit one `trac-preproc` per subject as an
independent cluster job.

The substeps actually run are controlled by the booleans `docorr`, `doqa`,
`dointra`, `dotensor`, `dointer`, `dopriors` set in `dmrirc.local`. `trac-all -prep`
turns on all six; the individual `trac-all` substep flags (e.g. `-inter`) turn on
just one.

> [!gotcha] Designed to be called only by trac-all
> The built-in help says plainly: "This script is called by trac-all. Trac-all
> makes sure that a proper configuration file is written locally
> (scripts/dmrirc.local) and passed as an argument to this script."
> ([`scripts/trac-preproc#L2487-L2489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2487-L2489)). Running it directly requires hand-crafting
> a valid `dmrirc.local`.

## Inputs

### Required Inputs

- **A sourced configuration file** (`-c <dmrirc.local>`): the only command-line
  requirement. It defines `subj`, `dtroot`, `dcmroot`/`dcmfile`,
  `bvecfile`/`bvalfile`, the correction/registration options, the training atlas,
  and the location of the TRACULA binaries (`trcdir`).
- **Diffusion-weighted runs** named in `dcmfile` (relative to `dcmroot`), DICOM or
  any format [[wiki/tools/mri_convert|mri_convert]] reads.
- **A completed FreeSurfer recon** at `$SUBJECTS_DIR/$subj` (for substeps 1.3–1.6):
  `mri/brain.mgz`, `mri/<segname>.mgz`, the white surfaces, and — if
  `usethalnuc=1` — a `ThalamicNuclei.*.FSvoxelSpace.mgz`.
- **Gradient/b-value tables** if not embedded in the DICOM header.

### Input Assumptions

> [!assumption] One subject, shelled diffusion, recon-all done
> `trac-preproc` operates on the single `subj` named in the config. Multi-run DWI
> is concatenated into one series. The `eddy`-based correction passes
> `--data_is_shelled` unconditionally ("Assuming that it is!",
> [`scripts/trac-preproc#L714`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L714)), so single- or multi-shell data is assumed.
> Substeps 1.3–1.6 silently no-op or error if the FreeSurfer recon is absent.

- A DWI run **without** gradient/b-value tables is assumed to be a b=0-only scan,
  and all-zero tables are synthesised ([`scripts/trac-preproc#L291-L323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L291-L323)).
- For B0/topup or model-based eddy correction the config must carry
  `pedir`/`echospacing`/`epifactor` (topup) or field-map inputs (`dob0=1`); the
  orchestrator validates these before calling.

## Outputs

### Files Created

Written under `<dtroot>/<subj>/`:

| Substep | File(s) | Contents |
|---------|---------|----------|
| 1.1 | `dmri/dwi_orig.<run>.nii.gz`, `.bvecs`, `.bvals` | per-run converted DWI + tables |
| 1.1 | `dmri/dwi.nii.gz`, `dmri/dwi.bvecs`, `dmri/dwi.bvals` | corrected, combined DWI series |
| 1.1 | `dmri/lowb.nii.gz`, `dlabel/diff/lowb_brain_mask.nii.gz` | mean b=0 image and BET brain mask |
| 1.1 | `dmri/topup*`, `dmri/acqp.txt`, `dmri/index.txt`, `dmri/dwi.eddy_parameters`/`dwi.ecclog` | distortion-correction intermediates |
| 1.1 | `dmri/dcminfo.dat` | `mri_probedicom` header dump of the input DICOM(s) |
| (sel) | `dmri/data.nii.gz`, `dmri/bvecs`, `dmri/bvals` | symlinks to the DWI subset used downstream (all DWIs, or a `dmri_bset` subset) |
| 1.2 | `dmri/dwi_motion.txt`, `dmri/dwi_motion_byvol.txt` | between-/within-volume motion measures ([[dmri_motion]]) |
| 1.3 | `dmri/xfms/diff2anatorig.<reg>.lta`, `anatorig2diff.<reg>.lta` | diffusion↔T1 transforms |
| 1.3 | `dlabel/anatorig/{<segname>,White-Matter,White-Matter++}.nii.gz`, `dlabel/diff/*.<reg>.nii.gz` | segmentation + WM masks in anatomical and diffusion space |
| 1.3 | `dmri/dwi_snr.txt` | SNR of DWIs in the WM mask |
| 1.4 | `dmri/dtifit_FA.nii.gz` (and MD/MO/eigen outputs) | single-tensor fit (FSL `dtifit`) |
| 1.5 | `dmri/xfms/{anat2mni,diff2mni,diff2<xspace>}.<reg>.lta` / `*_warp.m3z` | individual→template transforms |
| 1.5 | `dlabel/<xspace>/*.nii.gz` | masks/segmentation mapped to template space |
| 1.6 | `dlabel/<xspace>/<path>_<avgmode>_*` (priors, end ROIs, `*_cpts_*.txt`) | per-pathway anatomical priors and spline initial control points ([[dmri_train]]) |
| (all) | `scripts/trac-paths.done`/`trac-preproc.done`, `scripts/trac-all.error` | stage status files |

### Output Specifications

All volumes are NIfTI-GZ. Transforms are FreeSurfer LTA (`.lta`), FSL matrices
(`.mat`), or non-linear morphs (`.m3z`). Masks are mapped with
nearest-neighbour interpolation to preserve their binary nature
(e.g. [`scripts/trac-preproc#L1438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1438)).

## Mathematical Foundations

`trac-preproc` is a **pipeline of external tools**; it performs no estimation
itself, but it does set several quantitative conventions.

> [!math] Phase-encode geometry and dwell time for distortion correction
> For topup/eddy, the script builds an FSL acquisition-parameters file. Assuming
> LAS orientation, it maps the phase-encode direction to a unit vector (e.g.
> `RL → (1 0 0)`, `AP → (0 -1 0)`) and computes the total readout (dwell) time as
> $$t_{\text{dwell}} = \text{esp}\times 10^{-3}\times(\text{epifactor}-1)$$
> from echo spacing `esp` (ms) and the EPI factor
> ([`scripts/trac-preproc#L432-L450`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L432-L450)). The field-map TE difference, if not given,
> is derived from the Siemens `alTE` header fields as
> $(\text{TE}_2-\text{TE}_1)/1000$ ([`scripts/trac-preproc#L960-L961`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L960-L961)).

> [!internal] Tensor fit and priors live in external code
> The single-tensor estimate is FSL `dtifit` (least-squares). The anatomical
> neighbourhood priors, end ROIs, and spline control-point initialisation are
> computed by [[dmri_train]] (with [[dmri_spline]]); the head-motion measures by
> [[dmri_motion]]. See those pages for the equations.

The brain-mask SNR is reported as the WM-mask mean intensity divided by its
standard deviation (`fslstats -m -s`, [`scripts/trac-preproc#L1449-L1456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1449-L1456)).

## Configuration Options

### Complete Flag Reference

`trac-preproc` takes only run-control flags; **all analysis parameters come from
the sourced config**. Flags parsed at
[`scripts/trac-preproc#L2340-L2429`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2340-L2429):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c <file>` | string | *(required)* | Configuration (dmrirc.local) file to source; must exist and be readable. |
| `-log <file>` | string | `<dir(rcfile)>/trac-all.log` | Log file path. |
| `-nolog` | bool | log on | Send the log to `/dev/null`. |
| `-cmd <file>` | string | `<dir(rcfile)>/trac-all.cmd` | Command-record file. |
| `-nocmd` | bool | cmd on | Send the command record to `/dev/null`. |
| `-no-isrunning` | bool | check on | Do not create/check the `IsRunning.trac` lock. |
| `-time`<br>`-notime` | bool | off | Wrap main commands in `fs_time`. |
| `-umask <mask>` | string | `002` | Unix file-permission mask. |
| `-grp <gid>` | string | — | Assert current primary group equals `<gid>`. |
| `-allowcoredump` | bool | off | `limit coredumpsize unlimited`. |
| `-debug` | bool | off | Verbose output; also passed to [[dmri_train]] as `--debug`. |
| `-dontrun` | bool | run | Echo every command without executing (warns that subsequent args may be inaccurate). |
| `-onlyversions` | bool | off | Sets `DoVersionsOnly` (used by the orchestrator's versions dump). |
| `-version` | bool | — | Print script version and exit. |
| `-help` | bool | — | Print the full help and exit. |

The command line may end with a literal `;` token, which the parser treats as a
terminator (`if ("$flag" == ";") break`, [`scripts/trac-preproc#L2346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2346)); this
lets [[wiki/pipelines/trac-all|trac-all]] concatenate several `trac-preproc`
invocations into one `tcsh -fc` string for longitudinal runs.

### Configuration Interactions

These live in the **config variables**, not the flags. The script derives the
registration spaces from the numeric `intrareg`/`interreg` codes
([`scripts/trac-preproc#L72-L94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L72-L94)):

> [!gotcha] Substep availability differs for the longitudinal base template
> When `dmrirc.local` defines a non-empty `tplist`, the run is a longitudinal
> **base template**. In that mode the image-correction, QA, and tensor-fit
> substeps are explicitly **unavailable** and error out
> ([`scripts/trac-preproc#L1102-L1105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1102-L1105), [`#L1263-L1266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1263-L1266),
> [`#L1520-L1523`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1520-L1523)); only intra/inter registration and priors run on the base.
> [[wiki/pipelines/trac-all|trac-all]] sets the right booleans automatically.

- **`doeddy` level** chooses the eddy engine: `1` → FSL `eddy_correct` (registration),
  `2` → `eddy_openmp` (model-based), `>2` (i.e. `doeddy=3`) adds `--repol` outlier
  replacement ([`scripts/trac-preproc#L718-L720`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L718-L720)).
- **`dob0` level** chooses the B0 engine: `1` → field-map (`epidewarp.fsl`),
  `2` → reverse-polarity (`topup`/`applytopup`). For topup, the runs must differ
  in PE direction or echo spacing or the step errors
  ([`scripts/trac-preproc#L456-L462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L456-L462)).
- **`dorotbvecs`** rotates gradient vectors by the eddy motion parameters
  (`xfmrot`) when set, else copies them unchanged
  ([`scripts/trac-preproc#L816-L848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L816-L848)).
- **`intrareg`** 1/2 → `flirt` affine (`reg=flt`, cost corratio/mutualinfo),
  3 → `bbregister` boundary-based (`reg=bbr`).
- **`interreg`** 1/2 → MNI affine (`xspace=mni`), 3 → robust affine (`rob`),
  4 → CVS (`cvs`), 5 → SyN FA (`syn`), 6 → FNIRT FA (`fnt`).
- **`bmax` vs `bshell`** select a DWI subset via [[dmri_bset]] (mutually exclusive
  upstream in `trac-all`); absent both, all DWIs are used.
- **`usemaskanat`** chooses the brain mask used for the tensor fit and tractography:
  the dilated anatomical segmentation mask (`1`) or the low-b BET mask (`0`).
- **`usethalnuc`** merges the thalamic-nuclei segmentation into the main
  segmentation (nearest-neighbour replacement of the thalamus labels) before
  priors are built ([`scripts/trac-preproc#L1339-L1382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1339-L1382)).

## Typical Use Cases

### 1. As run by trac-all (the normal path)

```bash
# trac-all writes dmrirc.local and calls:
trac-preproc -c $SUBJECTS_DIR/subj01/scripts/dmrirc.local \
  -log $SUBJECTS_DIR/subj01/scripts/trac-all.log \
  -cmd $SUBJECTS_DIR/subj01/scripts/trac-all.cmd
```

### 2. Re-run one subject's pre-processing standalone

```bash
# Only if a valid dmrirc.local already exists (e.g. from a prior trac-all run).
trac-preproc -c $SUBJECTS_DIR/subj01/scripts/dmrirc.local -no-isrunning
```

## Pipeline Context

`trac-preproc` is **step 1 (all substeps)** of TRACULA, invoked by the
[[wiki/pipelines/trac-all|trac-all]] `-prep` stage.

**Predecessor:** [[wiki/pipelines/trac-all|trac-all]] `-prep` (which depends on a
completed [[wiki/pipelines/recon-all|recon-all]]) → **trac-preproc** (substeps
1.1–1.6) → **Successor:** [[wiki/pipelines/trac-all|trac-all]] `-bedp`
(`bedpostx`), then [[trac-paths]] for step 3.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] FSL output type is forced to NIfTI-GZ by trac-all
> The parent sets `FSLOUTPUTTYPE=NIFTI_GZ`; `trac-preproc` assumes `.nii.gz`
> throughout. Running it in a shell with a different `FSLOUTPUTTYPE` can break the
> filename bookkeeping.

> [!gotcha] Thalamic nuclei required by default
> With `usethalnuc=1` (the adult default), a missing
> `ThalamicNuclei.*.FSvoxelSpace.mgz` aborts the intra-subject step with a long
> error listing the accepted filename patterns
> ([`scripts/trac-preproc#L1342-L1359`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1342-L1359)). Set `usethalnuc=0` only if you have a
> good reason.

> [!gotcha] SyN requires ANTSPATH; FNIRT/CVS/SyN unavailable for infants
> The SyN branch errors unless `$ANTSPATH` is set
> ([`scripts/trac-preproc#L1792-L1795`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1792-L1795)). The non-linear inter-subject methods are
> disabled in the infant stream by [[wiki/pipelines/trac-all|trac-all]].

## Error Compensation and Guard Rails

- **Missing tables → b=0 assumption** (synthesised zero tables); aborts only if no
  run has real tables ([`scripts/trac-preproc#L291-L328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L291-L328)).
- **b-vector orientation auto-detected** (3 rows vs 3 columns) and transposed to
  3-column form; row/column-vs-bvalue count mismatch is fatal
  ([`scripts/trac-preproc#L347-L396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L347-L396)).
- **CRLF stripped** from user-supplied bvec/bval files (`tr -d '\r'`).
- **DWIs reoriented to LAS** before FSL tools (`orientLAS`).
- **Odd dimensions disable topup subsampling** automatically by editing `b02b0.cnf`
  ([`scripts/trac-preproc#L501-L524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L501-L524)).
- **NIfTI header restored** after FSL eddy/topup via `mri_convert --in_like`
  ([`scripts/trac-preproc#L1019-L1032`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1019-L1032)).
- **Bad frames dropped** when `dmri/keepframes.txt` exists, with the full series
  preserved as `dwi.full.*` so the trim is non-destructive
  ([`scripts/trac-preproc#L1212-L1260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1212-L1260)).
- **Second-generation CVS warps** are symlinked into third-generation naming so
  older recons still work ([`scripts/trac-preproc#L1721-L1732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1721-L1732)).
- On any error the script writes `scripts/trac-all.error`, removes the lock file,
  and exits 1 (`error_exit`, [`scripts/trac-preproc#L2311-L2337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2311-L2337)).

## Known Bugs

- [[00184]] — in the multi-field-map branch (`if ($nmap > 1)`), three `mri_concat` lines are missing the `set` keyword, so the DWI concatenation mis-parses and the script aborts with a tcsh error instead of merging the per-map DWIs.

## Related Tools

- [[wiki/pipelines/trac-all|trac-all]] — the orchestrator that writes `dmrirc.local` and calls this script.
- [[trac-paths]] — the step-3 sibling that does the tractography.
- [[dmri_motion]] — head-motion / QA measures (substep 1.2).
- [[dmri_train]] — builds the anatomical pathway priors (substep 1.6).
- [[dmri_bset]] — extracts a `bmax`/`bshell` DWI subset.
- [[wiki/tools/mri_convert|mri_convert]] — DWI/segmentation format conversion (with `--bvec-voxel`).
- [[bbregister]], [[lta_convert]], [[mri_concatenate_lta]] — intra-subject registration and transform handling.
- [[mri_robust_register]], [[mri_cvs_register]] — inter-subject (rob/cvs) registration.
- [[mri_binarize]], [[mri_concat]], [[mri_vol2vol]] — mask construction and mapping.
- [[dt_recon]] — an alternative, single-scan tensor reconstruction outside TRACULA.

## Confidence and Gaps

**High confidence:** the substep sequence and gating booleans, the
distortion-correction logic (eddy/topup/field-map levels), the registration-method
dispatch, the brain-mask / SNR / motion handling, and the full run-control flag
set — all read directly from
[`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc).

> [!gap] Multi-field-map branch looks buggy
> In the `nmap > 1` field-map concatenation block, three lines assign `cmd = …`
> without the `set` keyword ([`scripts/trac-preproc#L1005-L1014`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1005-L1014)), which in
> tcsh would not build the command as intended. This path was not exercised; treat
> multi-field-map B0 correction as unverified.

> [!gap] Non-linear warp branches not run
> The CVS/SyN/FNIRT inter-subject branches (and their longitudinal base-template
> variants, several flagged "Hack: Using one time point for now") were read but
> not executed end-to-end.

## References

- FreeSurfer source: [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc) (v8.2.0).
- Companion: [`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all), `dmrirc.example`.
- Yendiki A. et al. *Front. Neuroinform.* 5:23 (2011) — TRACULA.
