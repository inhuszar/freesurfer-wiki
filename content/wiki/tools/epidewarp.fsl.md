---
title: "epidewarp.fsl"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/epidewarp.fsl"
families: []                     # classic B0-fieldmap EPI dewarper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[vsm-smooth]]"
  - "[[fs-topup]]"
  - "[[fs-eddy]]"
  - "[[dt_recon]]"
  - "[[mri_synthstrip]]"
  - "[[mri_concat]]"
  - "[[bbregister]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "FSL v3 compatibility branch (avwmaths/avw* tools) is dead on any modern FSL; described from code but not exercised."
  - "A parse bug sets the variable 'undwarpdir' for --unwarpdir, so the flag does not actually change the unwarp direction (see contradiction callout)."
tags:
  - distortion-correction
  - b0
  - fieldmap
  - epi
  - fsl-bridge
  - voxel-shift-map
  - bold
  - diffusion
---

# epidewarp.fsl

## Summary

`epidewarp.fsl` is the **classic B0-fieldmap EPI dewarping** script: a front end to FSL's **`prelude`** (phase unwrapping) and **`fugue`** (field-to-shift unwarping) that corrects the susceptibility-induced geometric distortion of echo-planar (BOLD or diffusion) images using a **gradient-echo B0 field map**. From a magnitude image and a phase / phase-difference (or complex) field map acquired at two echo times, it unwraps the phase, builds a **voxel-shift map (VSM)** with `fugue`, registers that map into the EPI space, and optionally applies it to dewarp an example-functional and/or the full EPI time series. It is the fieldmap counterpart to the reversed-PE [[fs-topup]] approach and is the engine `trac-preproc` (and hence `trac-all`) uses for fieldmap-based DWI distortion correction.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/epidewarp.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl)
- **Binary/script location:** `$FREESURFER_HOME/bin/epidewarp.fsl`
- **Original authors:** Doug Greve, Dave Tuch, Tom Liu, Bryon Mueller (with FSL/FBIRN).
- **External dependency:** **FSL** — `prelude`, `fugue`, `flirt`, and the `fsl*`/`avw*` maths/ROI/merge tools (uses `$FSLDIR/etc/fslversion` to branch on FSL major version, [`scripts/epidewarp.fsl:95-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L95-L109)). Requires `FSLOUTPUTTYPE` to be set and to match the output extension.
- **FreeSurfer tools invoked:** [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L147) (frame count), [`mri_synthstrip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L210) (optional brain mask), [`mris_calc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L192) (complex-mode magnitude/phase/atan2 math), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L304) (assemble two-frame phase), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L166), and [[vsm-smooth]] (extend the VSM past the mask, [`scripts/epidewarp.fsl:464`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L464)).

> [!gotcha] As of Feb 26 2010 this script requires FreeSurfer
> Once FSL-only, the script now depends on FreeSurfer utilities (`mri_info`,
> `mris_calc`, `mri_synthstrip`, [[vsm-smooth]]); the help block states this at
> [`scripts/epidewarp.fsl:921`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L921).

## Purpose and Context

A B0 field map measures the off-resonance field $\Delta f$ from the phase evolution between two gradient-echo acquisitions separated by $\Delta\text{TE}$. In EPI, that off-resonance shifts each voxel along the phase-encode axis by an amount proportional to $\Delta f$ and the EPI echo spacing. `epidewarp.fsl` turns a field map into the corrective VSM and applies it. This is the **fieldmap** route to B0 correction; the **reversed-PE** route is [[fs-topup]], and both feed the same kind of `--vsm` consumers downstream.

The field map must be acquired with the **same slice prescription, thickness, skip, resolution, and FOV as the EPI** (help, [`scripts/epidewarp.fsl:939-945`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L939-L945)). The script is the standard FBIRN/Martinos fieldmap dewarper and is wired into [`trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L981-L995) for the diffusion stream; it is **not** part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

The field map can be supplied in one of three forms (mutually exclusive):

- **`--mag` + `--dph`** — a magnitude volume and a **phase-difference** volume (Echo2 − Echo1), scaled 0–4095 for −π…π (the stock Siemens form). *Most common.*
- **`--mag` + `--ph`** — a magnitude volume and a single **phase** volume (when individual-echo phases are available rather than their difference), same 0–4095 scaling.
- **`--complex r1 i1 r2 i2`** — real/imaginary components of both echoes; magnitude and phase difference are computed internally with `mris_calc`.

Plus:

- **`--tediff tediff`** — the field-map echo-time difference $\Delta\text{TE}$ in **ms** (e.g. 2.46 ms at 3T).
- **`--esp esp`** — the **EPI echo spacing** in ms (time between successive k-space lines of the *functional*, not the field map).
- **`--epi` and/or `--exf`** — the EPI volume to dewarp and/or an example-functional used for registration to the magnitude. At least one is required.
- **`--vsm vsm`** — output voxel-shift map path (required); its extension must match `FSLOUTPUTTYPE`.

### Input Assumptions

> [!assumption] Fieldmap geometry matches the EPI; phase scaled 0–4095
> The magnitude/phase field map is assumed to share the EPI's slice prescription
> and resolution, and the phase (or phase-difference) is assumed to be the stock
> Siemens 0–4095 integer encoding of −π…π (rescaled at
> [`scripts/epidewarp.fsl:312-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L312-L321)/[`scripts/epidewarp.fsl:354-356`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L354-L356)). If your phase
> spans −4096…4094 instead, pass `--dph-range-type-2`. NIFTI/NIFTI_GZ are
> *highly* recommended over ANALYZE.

## Outputs

### Files Created

| File | When | Contents |
|------|------|----------|
| `--vsm` volume | always | the voxel-shift map in **EPI space**; per-voxel PE-direction shift (in voxels) to undo B0 distortion. |
| `--vsmmag` volume | if `--vsmmag` given (else temp) | the VSM in **magnitude/fieldmap space** before resampling into EPI space. |
| `--exfdw` volume | if `--exfdw` given | the example-functional with distortion removed. |
| `--epidw` volume | if `--epidw` given (needs `--epi`) | the full EPI time series with distortion removed. |
| `--prelude` volume | if `--prelude` given | the unwrapped phase output from `prelude`. |
| `<vsm>.log` | default | log file (or `--log` path). |
| `tmp-epidewarp.<pid>.fsl/` | unless cleaned | intermediates (masks, dewarped mag, FLIRT matrices, split EPI frames). Kept with `--tmpdir`/`--nocleanup`. |

A `.mat` registration sidecar accompanying `--epi`/`--exf` is propagated to the outputs if present.

### Output Specifications

The `--vsm` map matches the EPI grid (it is resampled into EPI space by FLIRT, [`scripts/epidewarp.fsl:452-456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L452-L456)) and is the artefact to pass as `--vsm` to other tools. Dewarped EPI/exf outputs share the EPI geometry. By default the **in-brain mean shift is removed** from the VSM (see Foundations and `--keep-mean`).

> [!gotcha] The output is not registered to the magnitude volume
> The dewarped EPI/exf are in EPI space, which is generally **not** in register
> with the field-map magnitude. To overlay them on the mag, register the mag to
> the dewarped output afterward (help, [`scripts/epidewarp.fsl:1111-1115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L1111-L1115)).

## Mathematical Foundations

The pipeline implements the Jezzard–Balaban fieldmap correction (10-step overview at [`scripts/epidewarp.fsl:959-970`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L959-L970)):

1. **Phase rescaling.** The integer phase $P\in[0,4095]$ is mapped to radians:
   $$\varphi = (P - 2047.5)\times 0.00153435539 \approx (P-2047.5)\cdot\frac{2\pi}{4095},$$
   ([`scripts/epidewarp.fsl:315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L315)). `--dph-range-type-2` instead uses $\varphi = P\times 0.0007671776931843207 \approx P\cdot\frac{2\pi}{8190}$ for the −4096…4094 range ([`scripts/epidewarp.fsl:320`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L320)).
2. **Phase unwrapping.** `prelude` removes the $2\pi$ wraps (3-D, masked) ([`scripts/epidewarp.fsl:330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L330)).
3. **Field → shift.** `fugue` converts the unwrapped phase to a voxel-shift map. The displacement in voxels along the PE axis is
   $$\Delta_{\text{vox}} = \frac{\varphi_{\text{uw}}}{2\pi\,\Delta\text{TE}}\times\text{esp},$$
   i.e. phase → field (Hz) via $\Delta\text{TE}$ (`fugue --asym`), then field → shift via the echo spacing (`fugue --dwell`) ([`scripts/epidewarp.fsl:392-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L392-L397)). The VSM is also smoothed 2-D by `--sigma` (Gaussian σ, default 2 mm).
4. **Mean removal.** Unless `--keep-mean`, the mean in-brain shift is subtracted so the correction does not translate the whole brain ([`scripts/epidewarp.fsl:400-414`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L400-L414)).
5. **Registration.** The magnitude is forward-warped by the VSM (`fugue -w`) and registered to the example-functional with `flirt` (6-DOF), and the VSM is resampled into EPI space with that transform ([`scripts/epidewarp.fsl:416-456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L416-L456)).
6. **Application.** `fugue --loadshift` applies the EPI-space VSM to dewarp the exf and/or each EPI frame ([`scripts/epidewarp.fsl:486-537`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L486-L537)).

For **complex** input, the per-echo phases are $\arctan2(\text{imag},\text{real})$, their difference is wrapped into $[0,2\pi)$ via `add 6.2832; mod 6.2832`, then unwrapped ([`scripts/epidewarp.fsl:266-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L266-L296)).

> [!math] Reversed phase encode = negate the echo spacing
> `--perev` simply multiplies the echo spacing by −1
> ([`scripts/epidewarp.fsl:377-380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L377-L380)), which flips the sign of every voxel
> shift. It is equivalent to giving `--esp` (or `--tediff`) a negative value.

> [!internal] Phase unwrapping and unwarping are FSL algorithms
> The unwrapping (Jenkinson 2003) is `prelude`'s; the regularised field-to-shift
> unwarping (Jenkinson 2001) is `fugue`'s. This script orchestrates them, the
> phase rescaling, the mean-removal, and the FLIRT registration of the VSM into
> EPI space; it does not implement the unwrapping/unwarping itself.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/epidewarp.fsl:556-750`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L556-L750)). Boolean flags take no argument.

#### Field-map input

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mag` | string | *(required unless `--complex`)* | B0 magnitude volume; only the first frame is used. |
| `--dph` | string | — | Phase-**difference** volume (Echo2−Echo1), scaled 0–4095 for −π…π. Not with `--ph`/`--complex`. |
| `--ph` | string | — | Single phase volume, scaled 0–4095. Not with `--dph`/`--complex`. |
| `--complex` | 4 strings | — | `real1 imag1 real2 imag2`; magnitude/phase computed internally. Not with `--mag`/`--dph`/`--ph`. |
| `--dph-range-type-1` | bool | **on** | Assume phase range 0…4095. |
| `--dph-range-type-2` | bool | off | Assume phase range −4096…+4094. |

#### EPI / example-functional and timing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--epi` | string | — | EPI volume to dewarp (canonicalised to absolute). Required for `--epidw`. |
| `--exf` | string | middle EPI frame | Example-functional for registration to the mag. If omitted, the middle time point of `--epi` is extracted. |
| `--tediff` | float (ms) | *(required)* | Field-map echo-time difference $\Delta\text{TE}$. |
| `--esp` | float (ms) | *(required)* | EPI echo spacing (of the functional). |
| `--perev` | bool | off | Assume reversed phase-encode direction (negates echo spacing). |
| `--unwarpdir` | string | `y` | Intended unwarp direction (`x`/`y`/`z`/`x-`/`y-`/`z-`). **See contradiction callout — this flag is mis-parsed.** |

#### VSM / masking / smoothing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sigma` | float (mm) | `2` | 2-D Gaussian σ for in-`fugue` VSM smoothing. |
| `--vsm-fwhm` | float (mm) | `10` | FWHM passed to [[vsm-smooth]] to extend the VSM past the mask; `0` skips it. |
| `--keep-mean` | bool | off | Do **not** remove the mean in-brain shift from the VSM. |
| `--synthstrip`<br>`--no-bet` | bool | off (uses BET) | Build the brain mask with [[mri_synthstrip]] instead of FSL `bet`. |
| `--no-synthstrip` | bool | — | Force BET (the default). |
| `--head` | bool | off (brain) | Mask with the dilated **head** mask instead of the brain mask. |
| `--nomagexfreg` | bool | reg on | Assume mag and exf are already in register (use identity instead of FLIRT). |

#### Outputs and housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vsm` | string | *(required)* | Output voxel-shift map (EPI space). Extension must match `FSLOUTPUTTYPE`. |
| `--vsmmag` | string | temp | Output VSM in magnitude space. |
| `--exfdw` | string | — | Output dewarped example-functional. |
| `--epidw` | string | — | Output dewarped EPI time series (requires `--epi`). |
| `--prelude` | string | — | Save the unwrapped phase (`prelude` output). |
| `--tmpdir` | string | `tmp-epidewarp.<pid>.fsl` | Intermediate directory; setting it implies `--nocleanup`. |
| `--log` | string | `<vsm>.log` | Log-file path. |
| `--nocleanup` | bool | cleanup on | Keep the temp directory. |
| `--cleanup` | bool | — | Force deletion of the temp directory even if `--tmpdir`/`--nocleanup` was given. |
| `--debug` | bool | off | `set echo` + verbose. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] Field-map forms are mutually exclusive
> `--complex` cannot be combined with `--mag`/`--dph`/`--ph`, and `--dph` cannot
> be combined with `--ph`; both are hard errors in `check_params`
> ([`scripts/epidewarp.fsl:758-766`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L758-L766)). Pick exactly one way to specify the
> field map.

> [!contradiction] `--unwarpdir` is parsed into the wrong variable
> The default unwarp direction is `y` (variable `unwarpdir`, used by `fugue` at
> [`scripts/epidewarp.fsl:392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L392)). But the `--unwarpdir` handler assigns to a
> misspelled `undwarpdir` ([`scripts/epidewarp.fsl:667-670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L667-L670)), so the value the
> user supplies is **never read**. As written, `--unwarpdir x` (etc.) has no
> effect — the unwarp direction stays `y`. Code is authoritative; if you need a
> non-`y` direction, use `--perev` for a sign flip or edit the script. *(Reported
> as a bug-class issue; cross-links to any matching bug page.)*

> [!gotcha] `--epidw` requires `--epi`
> Dewarping the full series needs the series: `--epidw` without `--epi` errors
> ([`scripts/epidewarp.fsl:815-819`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L815-L819)). `--exfdw` does not require `--epi` if an
> `--exf` is given.

> [!gotcha] `--tmpdir`/`--nocleanup` vs `--cleanup`
> Supplying `--tmpdir` (or `--nocleanup`) keeps the temp directory; `--cleanup`
> forces deletion regardless, via a `cleanup_forced` override applied last
> ([`scripts/epidewarp.fsl:799`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L799)). `--cleanup` therefore wins over the other two.

> [!gotcha] Output extension must match `FSLOUTPUTTYPE`
> The script aborts if the `--vsm` extension is inconsistent with the current
> `FSLOUTPUTTYPE` (`nii.gz`↔NIFTI_GZ, `nii`↔NIFTI, `img`↔ANALYZE,
> [`scripts/epidewarp.fsl:843-850`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L843-L850)). Set `FSLOUTPUTTYPE` to match your chosen
> extension before running.

Other interactions:

- `--nomagexfreg` replaces the FLIRT mag→exf registration with a hard-coded identity matrix ([`scripts/epidewarp.fsl:441-447`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L441-L447)); only use it when the field map and EPI are already aligned.
- `--head` switches masking from the brain mask to the 3×-dilated head mask for both the field-fit and the application steps.
- If neither `--exfdw` nor `--epidw` is given, the script stops after producing the VSM ([`scripts/epidewarp.fsl:484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L484)) — useful for producing a VSM to hand to FSFAST/[[bbregister]].

## Typical Use Cases

### 1. Produce a VSM from a stock Siemens field map

```bash
setenv FSLOUTPUTTYPE NIFTI_GZ
epidewarp.fsl --mag mag.nii.gz --dph phasediff.nii.gz \
  --epi bold.nii.gz --tediff 2.46 --esp 0.58 \
  --vsm vsm.nii.gz
# vsm.nii.gz can be passed as --vsm to bbregister / FSFAST
```

### 2. Dewarp the full EPI time series

```bash
epidewarp.fsl --mag mag.nii.gz --dph phasediff.nii.gz \
  --epi bold.nii.gz --tediff 2.46 --esp 0.58 \
  --vsm vsm.nii.gz --epidw bold.dwarp.nii.gz
```

### 3. As called inside trac-preproc (diffusion)

```bash
# trac-all/trac-preproc issues this for fieldmap-based DWI dewarping:
epidewarp.fsl --mag mag.nii.gz --dph phasediff.nii.gz \
  --exf lowb.nii.gz --epi dwi.nii.gz \
  --tediff $tediff --esp $esp \
  --vsm vsm.nii.gz --epidw dwi.dwarp.nii.gz
```

### 4. Complex field map with synthstrip masking

```bash
epidewarp.fsl --complex re1.nii.gz im1.nii.gz re2.nii.gz im2.nii.gz \
  --epi bold.nii.gz --tediff 2.46 --esp 0.58 \
  --synthstrip --vsm vsm.nii.gz --exfdw exf.dwarp.nii.gz
```

## Pipeline Context

`epidewarp.fsl` is the fieldmap arm of EPI B0 correction. It is **not** invoked by [[wiki/pipelines/recon-all|recon-all]], but it **is** called by [`trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L981-L995) (run by `trac-all`) when a field map is provided for the diffusion stream, where it dewarps `dwi.nii.gz` against `lowb.nii.gz` and writes `vsm.nii.gz` + the dewarped series. It internally calls [[vsm-smooth]] to extend the VSM beyond the mask.

**Predecessor:** GRE B0 field map (mag + phase/dph) and the EPI/exf (e.g. from [[wiki/tools/mri_convert|mri_convert]]) → **epidewarp.fsl** → **Successors:** the dewarped EPI for analysis, or the VSM for [[bbregister]]/FSFAST. The reversed-PE alternative is [[fs-topup]] (and, for diffusion, [[fs-eddy]] which can call it).

## Gotchas and Caveats

> [!gotcha] `--esp` is the *functional* echo spacing, not the field map's
> The echo spacing is the time between successive k-space lines of the **EPI
> functional** (from the console's Sequence→Part-1, or `m_lEchoSpacing` in µs in
> the raw `meas.asc`), not anything from the field map. It cannot be derived from
> bandwidth (help, [`scripts/epidewarp.fsl:1020-1035`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L1020-L1035)).

> [!gotcha] Mean shift is removed by default
> Because the absolute B0 offset is unobservable from a relative field map, the
> in-brain mean shift is subtracted unless `--keep-mean` is given. This means the
> VSM encodes *relative* distortion; do not interpret its absolute level.

> [!gotcha] Phase scaling assumes the stock Siemens 0–4095 encoding
> Both `--dph` and `--ph` are rescaled assuming integer 0–4095 = −π…π. Maps in
> radians, or in the −4096…4094 range, will be wrong unless you use
> `--dph-range-type-2` (for the latter) or pre-scale the input.

> [!gotcha] `--ph` with two echoes is "probably wrong"
> The source comments that when two phase images exist, the **difference** should
> be unwrapped, not a single phase; the `--ph` path unwraps the phase as-is and is
> flagged as probably incorrect ([`scripts/epidewarp.fsl:363-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L363-L366)). Prefer
> `--dph` (phase difference) or `--complex`.

## Error Compensation and Guard Rails

- **FSL-version branch.** Reads `$FSLDIR/etc/fslversion` and switches between the modern `fsl*` tools and the obsolete v3 `avw*` tools ([`scripts/epidewarp.fsl:95-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L95-L109)). On any current FSL the modern branch is taken.
- **Format/`FSLOUTPUTTYPE` consistency check.** Aborts on a mismatch between the `--vsm` extension and `FSLOUTPUTTYPE` ([`scripts/epidewarp.fsl:843-850`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L843-L850)).
- **Mutually-exclusive input guards.** Conflicting field-map specifications are rejected up front ([`scripts/epidewarp.fsl:758-792`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L758-L792)).
- **Auto example-functional.** If `--exf` is omitted, the middle EPI frame is extracted automatically so registration to the mag can proceed.
- **`.mat` propagation.** Any FLIRT `.mat` sidecar of the EPI/exf is copied onto each intermediate and output so downstream FSL registration is preserved.
- **VSM extension past the mask.** [[vsm-smooth]] is run (FWHM `--vsm-fwhm`, default 10 mm) so edge voxels still receive a shift; `--vsm-fwhm 0` disables it.
- **Fail-fast.** Every external command is checked with `if($status) exit 1`.

## Known Bugs

- [[00163]] — `--unwarpdir` parses into a misspelled variable (`undwarpdir`) that nothing reads, so the FUGUE unwarp axis is always the hard-coded default `y`.

## Related Tools

- [[vsm-smooth]] — called near the end to extend the VSM beyond the brain mask.
- [[fs-topup]] — the reversed-PE alternative for B0 estimation (no field map needed).
- [[fs-eddy]] — diffusion eddy/motion correction that can incorporate topup-based B0 correction.
- [[mri_synthstrip]] — optional brain-mask generator (`--synthstrip`) in place of FSL BET.
- [[mri_concat]] — assembles the two-frame phase volume `fugue` expects.
- [[bbregister]] — common consumer of the output VSM (`--vsm`), and the `bbregister --epi-b0-map` workflow references this script.
- [[dt_recon]] / `trac-preproc` — the diffusion context that invokes this script.
- `prelude`, `fugue`, `flirt`, `bet` *(external, FSL)* — the unwrapping, unwarping, registration, and (default) masking engines.

## Confidence and Gaps

**High confidence:** the three field-map input modes, the phase-rescaling constants and ranges, the 10-step prelude→fugue→flirt→fugue pipeline, the mean-removal, the masking options, the [[vsm-smooth]] call, the full flag set, and the mutual-exclusion guards are all read directly from [`scripts/epidewarp.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl).

> [!gap] `--unwarpdir` does nothing as written
> Because of the `unwarpdir`/`undwarpdir` typo, the supplied direction is ignored
> and the unwarp axis is always `y`. This is a genuine defect, not intended
> behaviour; confirm against any future fix before relying on `--unwarpdir`.

> [!gap] FSL v3 branch unverified
> The `avw*`-based code path for FSL major version 3 is dead on modern FSL and was
> not exercised; it is documented from the source only.

## References

- FreeSurfer source: [`scripts/epidewarp.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl) (v8.2.0).
- Built-in help: `epidewarp.fsl --help` (the `BEGINHELP` block, [`scripts/epidewarp.fsl:919-1164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L919-L1164)).
- Jenkinson, M. (2003). *A fast, automated, N-dimensional phase-unwrapping algorithm.* Magn Reson Med 49(1):193–197. (`prelude`)
- Jenkinson, M. (2001). *Improved unwarping of EPI volumes using regularised B0 maps.* HBM2001. (`fugue`)
- Jezzard, P. & Balaban, R. S. (1995). *Correction for geometric distortion in echo planar images from B0 field variations.* Magn Reson Med 34:65–73.
- FSL FUGUE: <http://www.fmrib.ox.ac.uk/fsl/fugue>
