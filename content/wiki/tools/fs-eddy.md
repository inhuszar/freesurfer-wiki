---
title: "fs-eddy"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fs-eddy"
families: []                     # standalone FSL-bridge wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[fs-topup]]"
  - "[[epidewarp.fsl]]"
  - "[[dt_recon]]"
  - "[[mri_synthstrip]]"
  - "[[mri_concat]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[bbregister]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Tested by the author only on single-PE-direction data; behaviour on multi-direction acquisitions is uncertain (stated in help)."
  - "eddy is non-deterministic per the help block; identical inputs can give slightly different outputs run-to-run."
tags:
  - distortion-correction
  - eddy-current
  - motion-correction
  - diffusion
  - fsl-bridge
  - b0
---

# fs-eddy

## Summary

`fs-eddy` is a FreeSurfer front end for **FSL's `eddy`**, which jointly corrects diffusion-weighted MRI for **eddy-current distortions, subject motion, and (optionally, via topup) susceptibility-induced B0 distortion**. The script ingests a DWI series with its `bvals`/`bvecs`, normalises everything into the formats `eddy` expects, builds a brain mask from the mean low-b image with [[mri_synthstrip]], optionally runs [[fs-topup]] first for B0 correction, runs `eddy`, and can finish by registering the corrected low-b to a FreeSurfer subject ([[bbregister]]) and fitting the diffusion tensor ([[wiki/tools/mri_glmfit|mri_glmfit]], the same fit as [[dt_recon]]).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fs-eddy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs-eddy`
- **External dependency:** **FSL** — `eddy` (script calls `eddy_cpu` or `eddy`, see gotcha) must be on the `PATH` (checked at [`scripts/fs-eddy:516-521`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L516-L521)). Developed under FSL 6.0.5.1.
- **FreeSurfer tools invoked:** [[fs-topup]] (optional B0 stage, [`scripts/fs-eddy:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L91)), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L221) (to NIfTI), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L232) (mean low-b), [`mri_synthstrip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L253) (mask), [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L290) (optional registration), [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L302) (optional tensor fit), and the helpers `UpdateNeeded`, `reg2subject`, `fs_time`.

## Purpose and Context

In diffusion MRI, each gradient direction is acquired as a separate EPI volume, so the series suffers from (a) **eddy-current** geometric distortions that differ per gradient, (b) **subject motion** between volumes, and (c) the **B0 susceptibility** distortion common to all EPI. FSL's `eddy` estimates and removes (a) and (b) in a single model, and — given a topup field — (c) as well. `fs-eddy` packages this for FreeSurfer users: it converts the DWI to NIfTI, coerces `bvals`/`bvecs` into FSL's row format, synthesises the `acqp` and `index` files if not supplied, makes a synthstrip mask, optionally calls [[fs-topup]], runs `eddy`, and produces a corrected series plus a distortion-free mean low-b image.

It is the modern FreeSurfer diffusion preprocessing entry point and a more capable sibling of the fieldmap-based [[epidewarp.fsl]] route used by `trac-preproc`. It is **not** part of [[wiki/pipelines/recon-all|recon-all]] and is normally run by hand. The optional `--tensorfit` step reproduces the tensor fit of [[dt_recon]].

> [!gotcha] `eddy` is slow and non-deterministic
> The help block warns that `eddy` can take **hours** (use `--gpu` if a GPU is
> available) and that it is **not deterministic** — re-running with identical
> inputs can yield slightly different results
> ([`scripts/fs-eddy:592-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L592-L599)).

## Inputs

### Required Inputs

- **`--i invol`** — the DWI series (any [[wiki/tools/mri_convert|mri_convert]]-readable format; converted to `dwi.nii.gz`). Path is canonicalised to absolute.
- **`--b bvals bvecs`** — the b-value and b-vector files. Both are reformatted into FSL's single-row-per-value layout if they are not already in it (bvals one row; bvecs three rows).
- **`--o outputdir`** — output directory.
- **`--bval-thresh thresh`** — threshold (inclusive, `bval <= thresh`) defining **low-b** frames, used to build the mean low-b image and mask.
- **`--trt TRT`** — total readout time in seconds (passed to topup and used in the synthesised `acqp` file).

### Input Assumptions

> [!assumption] Single-PE DWI series with matching bvals/bvecs
> The script has been tested mainly on **single phase-encode-direction** data
> where the same-PE volume is the first frame of the series (help,
> [`scripts/fs-eddy:608-610`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L608-L610)). The number of `bvals` must equal the number of
> `bvecs` (checked at [`scripts/fs-eddy:141-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L141-L146)) and should equal the number of
> DWI frames; the synthesised `index` file assumes one acqp row per frame. There
> must be at least one low-b frame at the chosen threshold or the script errors.

## Outputs

### Files Created

Written under `outdir`:

| File | Contents |
|------|----------|
| `dwi-ecc.nii.gz` | the eddy/motion(/B0)-corrected DWI series — `eddy`'s primary output (`--out`). |
| `dwi-ecc.lowb.nii.gz` | mean of the low-b frames **after** correction (no distortion). |
| `dwi.nii.gz` | the input series converted to NIfTI. |
| `dwi.lowb.nii.gz` | mean of the low-b frames **before** correction (still distorted); used to build the mask. |
| `mask.nii.gz` | brain mask (synthstrip on the pre-correction mean low-b, or a copy of a user `--mask`). |
| `bvals.fsl.dat`, `bvecs.fsl.dat` | bvals/bvecs reformatted to FSL row layout. |
| `frame.lowb.dat` | per-frame 1/0 low-b indicator (the `--w` weights for `mri_concat`). |
| `acqp.dat` | acquisition-parameter file (synthesised `0 1 0 TRT` / `0 -1 0 TRT`, or a copy of `--acqp`). |
| `index.dat` | per-frame index into `acqp.dat` (all 1s by default, or a copy of `--acqp-index`). |
| `topup/…` | full [[fs-topup]] output tree (only with `--topup-rev`). |
| `topup.samepe.nii.gz` | first frame of the input, used as topup's same-PE volume if `--topup-same` not given. |
| `register.lta` | BBR registration of the corrected mean low-b to the subject (only with `--s`). |
| `tensorfit/` | [[wiki/tools/mri_glmfit|mri_glmfit]] DTI fit directory (`beta.nii.gz` etc.; only with `--tensorfit`). |
| `log/fs-eddy.log` | run log. |

### Output Specifications

`dwi-ecc.nii.gz` matches the input series in dimensions and frame count; it is the volume to carry forward into tractography or scalar (FA/MD) analysis. `dwi-ecc.lowb.nii.gz` is the recommended moving image for registration to the anatomical. The tensor-fit outputs follow [[wiki/tools/mri_glmfit|mri_glmfit]]'s `--dti` conventions.

## Mathematical Foundations

`fs-eddy` performs no estimation itself; the eddy-current/motion model (and the optional B0 term) is fit by FSL `eddy`. The script's quantitative steps are bookkeeping:

- **Low-b selection.** A frame is low-b iff `bval <= bval-thresh` (evaluated with `bc -l`, [`scripts/fs-eddy:156-163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L156-L163)); the indicator drives a weighted mean ([`mri_concat --mean --w`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L232)).
- **acqp / TRT.** The acquisition-parameter file encodes the PE direction and total readout time, written as `0 1 0 TRT` (and its reverse) when not supplied ([`scripts/fs-eddy:178-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L178-L180)). Per the eddy FAQ quoted in the help, the **exact** TRT matters little as long as it is consistent between topup and eddy, but eddy can crash if TRT is too small (~<0.01) or too large (~>0.9).
- **index.** Maps each frame to a row of `acqp.dat`; defaults to all 1s.

> [!internal] The eddy-current/motion/B0 model is inside FSL `eddy`
> The Gaussian-process-based eddy-current and movement model (Andersson &
> Sotiropoulos 2016) lives entirely in `eddy`. `fs-eddy` only assembles inputs
> and, optionally, the topup field via [[fs-topup]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/fs-eddy:321-480`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L321-L480)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input DWI series. Canonicalised to an absolute path. |
| `--b` | 2 strings | *(required)* | `bvals bvecs` files; reformatted to FSL layout if needed. |
| `--o` | string | *(required)* | Output directory. |
| `--bval-thresh` | float | `0` | Inclusive threshold defining low-b frames (`bval <= thresh`). |
| `--trt` | float (s) | *(required)* | Total readout time; used in `acqp.dat` and passed to topup. |
| `--acqp` | string | synthesised | FSL acquisition-parameter file. If given without `--topup-rev`, it is copied into `outdir/acqp.dat`. |
| `--acqp-index` | string | all 1s | Per-frame index into `acqp`; must have `nbvals` entries. |
| `--topup-rev` | string | off | Reversed-PE volume → runs [[fs-topup]] first and passes its field to `eddy` (`--topup`). Sets `DoTopup=1`. |
| `--topup-same` | string | first frame of `--i` | The same-PE volume given to topup (the non-reversed input). |
| `--mask` | string | synthstrip | Brain mask; if omitted, one is generated from the mean low-b. |
| `--gpu` | bool | off (CPU) | Allow the GPU build (`eddy` instead of `eddy_cpu`). |
| `--cpu` | bool | **on** | Force the CPU build (`eddy_cpu`). |
| `--s`<br>`--subject` | string | — | Register corrected low-b to this FreeSurfer subject; also passes `--s` to [[fs-topup]]. |
| `--sd` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `--reg` | string | — | Derive the subject from an existing registration (`reg2subject`). |
| `--no-reg` | bool | (no effect) | Parsed flag that sets `DoRegistration=0` and `DoTalairach=0` ([`scripts/fs-eddy:436-439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L436-L439)), but **neither variable is read anywhere else** in the script, so the flag is currently a no-op. It is also not listed in the usage/help text. Registration still runs whenever `--s`/`--reg` is given. |
| `--tensorfit` | bool | off | Fit the diffusion tensor with [[wiki/tools/mri_glmfit|mri_glmfit]] `--dti` (as in [[dt_recon]]). |
| `--no-tensorfit` | bool | on | Disable the tensor fit (the default). |
| `--topup-qa` | bool | off | Run [[fs-topup]] with `--qa` (requires `--s`). |
| `--threads` | int | `1` | Threads; sets `OMP_NUM_THREADS` and is passed to `bbregister`/synthstrip/topup. |
| `--force` | bool | off | Re-run all steps even if outputs are up to date. |
| `--verbose` | bool | off | Verbose shell tracing. |
| `--echo` | bool | off | `set echo`. |
| `--debug` | bool | off | `set echo` + verbose. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `--topup-qa` requires `--s`
> The QA path runs [[fs-topup]] `--qa`, which itself demands a subject. Use
> `--topup-qa` only together with `--s subject` (the usage text notes this at
> [`scripts/fs-eddy:571`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L571)).

> [!gotcha] `--gpu` vs `--cpu` and the `eddy` binary name
> The script selects the binary by suffix: `--cpu` (default) runs `eddy_cpu`,
> `--gpu` runs `eddy` ([`scripts/fs-eddy:428-434`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L428-L434), invoked as `eddy$cpu` at
> [`scripts/fs-eddy:267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L267)). The *availability* check, however, always tests
> for a binary literally named `eddy` ([`scripts/fs-eddy:516`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L516)). On an install
> that ships only `eddy_cpu` (or only the CUDA `eddy`) the names may not line up;
> ensure both the checked name and the suffixed name resolve.

> [!gotcha] `--acqp` is copied only when not doing topup
> If both `--acqp` and `--topup-rev` are given, the acqp is **not** copied to
> `outdir/acqp.dat`; instead the acqp is overwritten by topup's `params.dat`
> ([`scripts/fs-eddy:98-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L98-L99), [`scripts/fs-eddy:182-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L182-L187)). With topup, the
> topup parameter file is authoritative and must be consistent with your bvecs.

Other interactions:

- `--topup-rev` triggers a full [[fs-topup]] run; if `--topup-same` is not given, the **first frame** of `--i` is extracted as the same-PE input ([`scripts/fs-eddy:80-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L80-L89)).
- `--reg` and `--s` both end up setting `subject`; `--reg` derives it via `reg2subject`.
- `--cpu`/`--gpu` are last-one-wins; the default is CPU.

## Typical Use Cases

### 1. Eddy-current + motion correction only

```bash
fs-eddy --i dwi.nii.gz --b bvals bvecs --o eddyout \
  --bval-thresh 50 --trt 0.0673 --threads 8
# → eddyout/dwi-ecc.nii.gz
```

### 2. Full eddy + topup B0 correction (reversed-PE pair)

```bash
# rev.nii.gz is a b0 with reversed PE relative to the series
fs-eddy --i dwi.nii.gz --b bvals bvecs --o eddyout \
  --bval-thresh 50 --trt 0.0673 \
  --topup-rev rev.nii.gz --gpu --threads 8
# fs-topup runs first; its field is passed to eddy as --topup
```

### 3. Correct, register to anatomical, and fit the tensor

```bash
fs-eddy --i dwi.nii.gz --b bvals bvecs --o eddyout \
  --bval-thresh 50 --trt 0.0673 \
  --s subj01 --tensorfit --threads 8
# → register.lta and tensorfit/ (FA/MD via mri_glmfit --dti)
```

## Pipeline Context

`fs-eddy` is the orchestrating front of the FreeSurfer diffusion-preprocessing path. It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`; it is run standalone. When B0 correction is requested it **calls [[fs-topup]] internally** before invoking `eddy`.

**Predecessor:** raw DWI series + bvals/bvecs (e.g. from [[wiki/tools/mri_convert|mri_convert]]/dcm2niix), optionally a reversed-PE b0 → **fs-eddy** (which may call [[fs-topup]]) → **Successors:** tractography, scalar analysis, or the built-in [[wiki/tools/mri_glmfit|mri_glmfit]] tensor fit (as in [[dt_recon]]). The fieldmap-based alternative for B0 correction within `trac-preproc` is [[epidewarp.fsl]].

## Gotchas and Caveats

> [!gotcha] TRT must be consistent and in a safe range
> The TRT is passed to both topup and eddy via the acqp file. Per the eddy FAQ
> (quoted at [`scripts/fs-eddy:612-620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L612-L620)) the absolute value matters little as
> long as topup and eddy agree, but eddy may crash if TRT is too low (~<0.01) or
> too high (~>0.9). Compute it as Echo-Spacing × EPI-factor × PartialFourier ÷
> Acceleration.

> [!gotcha] The mask is built from a *distorted* mean low-b
> `mask.nii.gz` is computed by synthstrip on the **pre-correction** mean low-b,
> which still contains B0/eddy distortion ([`scripts/fs-eddy:227-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L227-L258); the
> source comment flags this). It is adequate for masking eddy but is not a
> distortion-free brain mask.

> [!gotcha] bvecs/bvals reformatting is shape-based
> The script decides whether to reformat by counting lines: `bvals` with one
> line and `bvecs` with three lines are copied as-is, otherwise they are
> transposed into FSL rows ([`scripts/fs-eddy:107-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L107-L136)). Unusual column/row
> layouts may be mis-detected.

## Error Compensation and Guard Rails

- **FSL presence check.** Aborts if `eddy` is not on the `PATH` ([`scripts/fs-eddy:516-521`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L516-L521)).
- **bval/bvec count check.** Errors if the number of bvals and bvecs disagree ([`scripts/fs-eddy:141-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L141-L146)), and if the supplied `--acqp-index` length ≠ nbvals ([`scripts/fs-eddy:202-206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L202-L206)).
- **At-least-one-low-b check.** Errors if no frame meets the low-b threshold ([`scripts/fs-eddy:165-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L165-L169)).
- **Auto-synthesis of acqp/index.** Missing acquisition-parameter and index files are generated with sensible defaults so the user need only supply `--trt`.
- **Forced NIfTI.** Sets `FSLOUTPUTTYPE=NIFTI_GZ` and converts the input so FSL tools receive a consistent format.
- **Skip-if-up-to-date.** Every stage uses `UpdateNeeded`; `--force` overrides.

## Known Bugs

- [[00186]] — the FSL-eddy existence check tests `which eddy` while the default invocation runs `eddy_cpu` (`eddy$cpu`); the guard and the call reference different binary names, so the eddy step can abort or fail to launch on mismatched FSL builds.

## Related Tools

- [[fs-topup]] — called internally for the B0 (reversed-PE) correction step.
- [[epidewarp.fsl]] — the classic single-fieldmap B0 alternative used by `trac-preproc`.
- [[mri_synthstrip]] — builds the brain mask from the mean low-b.
- [[mri_concat]] — computes the weighted mean low-b images.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — performs the optional `--dti` tensor fit.
- [[bbregister]] — registers the corrected low-b to the FreeSurfer anatomical.
- [[dt_recon]] — the diffusion recon whose tensor fit `--tensorfit` reproduces.
- `eddy` *(external, FSL)* — the eddy-current/motion correction engine this script wraps.

## Confidence and Gaps

**High confidence:** the complete flag set and defaults, the topup-on-`--topup-rev` wiring, the acqp/index/bvecs synthesis and reformatting rules, the low-b masking logic, the `eddy_cpu`/`eddy` selection, and the optional registration/tensor steps are all read directly from [`scripts/fs-eddy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy).

> [!gap] Multi-direction data untested
> The author states testing was limited to single-PE-direction data where the
> same-PE volume is the first frame; multi-direction behaviour is unverified
> ([`scripts/fs-eddy:608-610`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L608-L610)).

> [!gap] `eddy` binary-name mismatch risk
> The availability check tests for `eddy` while execution may call `eddy_cpu`;
> on installs that ship only one of the two the check and the call can disagree.

## References

- FreeSurfer source: [`scripts/fs-eddy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy) (v8.2.0).
- Built-in help: `fs-eddy --help` (the `BEGINHELP` block, [`scripts/fs-eddy:590-642`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-eddy#L590-L642)).
- Andersson & Sotiropoulos (2016). *An integrated approach to correction for off-resonance effects and subject movement in diffusion MR imaging.* NeuroImage 125:1063–1078.
- Andersson, Skare & Ashburner (2003); Smith et al. (2004) — for the topup stage (see [[fs-topup]]).
- FSL `eddy` documentation: <https://fsl.fmrib.ox.ac.uk/fsl/docs/diffusion/eddy/index.html>
