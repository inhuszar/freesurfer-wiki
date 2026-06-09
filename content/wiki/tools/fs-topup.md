---
title: "fs-topup"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fs-topup"
families: []                     # standalone FSL-bridge wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[fs-eddy]]"
  - "[[epidewarp.fsl]]"
  - "[[vsm-smooth]]"
  - "[[mri_synthstrip]]"
  - "[[bbregister]]"
  - "[[mri_concat]]"
  - "[[mri_vol2vol]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[dt_recon]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hard-coded config paths point at /usr/pubsw/packages/fsl/6.0.1/...; whether these resolve on a generic install is site-dependent."
  - "topup --nthr is only honoured by FSL >= 6.0.6; the script cannot detect the FSL version and only warns after a failure."
tags:
  - distortion-correction
  - b0
  - topup
  - fsl-bridge
  - diffusion
  - bold
---

# fs-topup

## Summary

`fs-topup` is a FreeSurfer front end for **FSL's `topup`**, which estimates the susceptibility-induced off-resonance (B0) field from a pair of images acquired with **opposite phase-encode directions** (e.g. AP and PA). The script collects the two input volumes, averages multi-frame inputs, picks the slice-parity-appropriate `topup` configuration, runs `topup`, builds a brain mask with [[mri_synthstrip]], masks the field map, and writes the field as both a **Hz map** and a **voxel-shift map (VSM)**. Optionally it registers the corrected mean to a FreeSurfer subject with [[bbregister]] and runs a before/after registration QA. Its outputs feed directly into [[fs-eddy]], FSFAST, and other FreeSurfer programs that take a `--vsm`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fs-topup`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs-topup`
- **External dependency:** **FSL** — `topup` must be on the `PATH` (checked at [`scripts/fs-topup:549-554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L549-L554)). Developed under FSL 6.0.5.1.
- **FreeSurfer tools invoked:** [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L108) (slice count / frame count), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L165) (frame averaging and direction concatenation), [`mri_synthstrip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L228) (brain mask), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L233) (mask dilation), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L243) (apply mask), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L267) (Hz→voxel conversion), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L290) (QA resampling), and [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L306) (registration / QA), plus the helper `UpdateNeeded`.

## Purpose and Context

EPI acquisitions (BOLD and diffusion) are geometrically distorted along the phase-encode (PE) axis by B0 inhomogeneity. If two acquisitions are collected with the PE direction reversed, the distortions are equal and opposite, and the underlying field — and hence the correction — can be recovered. FSL's `topup` performs exactly this estimation. `fs-topup` wraps it so that the inputs and outputs interoperate cleanly with FreeSurfer: it normalises the inputs (NIfTI, mean-over-frames), produces a synthstrip mask instead of FSL's BET, and emits the field map in the **voxel-shift** units that FreeSurfer's `--vsm`-aware tools ([[bbregister]], [[mri_vol2vol]], FSFAST) expect.

It is most often used as the topup stage of a diffusion pipeline driven by [[fs-eddy]] (which calls `fs-topup` internally when given `--topup-rev`), but it can be run standalone for BOLD fieldmap-less distortion correction whenever reversed-PE pairs are available. It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] topup defines the corrected space from the *first* input volume
> `topup` registers the second (reversed-PE) volume to the first and reports the
> field in the **undistorted space of the first volume** (help block,
> [`scripts/fs-topup:623-629`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L623-L629)). When combining with [[fs-eddy]], the first
> volume given to `fs-topup` must match the first frame of the series passed to
> `eddy`, and the acquisition-parameter file and TRT must be consistent.

## Inputs

### Required Inputs

- **`--i vol1 vol2`** — two volumes with **opposite phase-encode directions** (the script's parameter file is written for AP then PA: `0 1 0 TRT` / `0 -1 0 TRT`). Each may be single- or multi-frame; multi-frame inputs are averaged (or first-frame-extracted) before use. Any [[wiki/tools/mri_convert|mri_convert]]-readable format; output is forced to NIfTI internally.
- **`--o outdir`** — output directory (created if absent).

### Input Assumptions

> [!assumption] AP/PA pair with consistent geometry; PE encoded by `--p`/parity
> The two inputs are assumed to be the same prescription acquired with reversed
> PE. Without an explicit `--p params` file the script hard-codes an AP→PA
> parameter file ([`scripts/fs-topup:175-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L175-L183)); if your PE axis or order differs you
> must supply your own. The `topup` **config** is chosen from slice parity
> (odd → `b02b0_1.cnf`, even → `b02b0_2.cnf`), because `topup` fails if given the
> wrong-parity config.

## Outputs

### Files Created

Written under `outdir` (canonicalised to an absolute path):

| File | Units | Contents |
|------|-------|----------|
| `b0dc.nii.gz` | vox if `TRT==1`, else Hz | masked B0 field/distortion-correction map |
| `b0dc.nomask.nii.gz` | vox if `TRT==1`, else Hz | the same map **before** masking |
| `b0dc.vox.nii.gz` | voxels | voxel-shift map; **always correct regardless of TRT**. Pass this as `--vsm` to FreeSurfer tools. (Symlink to `b0dc.nii.gz` when `TRT==1`.) |
| `b0dc.hz.nii.gz` | Hz | field map in Hz; **only created when `TRT != 1`** (symlink to `b0dc.nii.gz`). |
| `both.nii.gz` | — | the two (averaged) inputs concatenated, fed to `topup`. |
| `both.b0dc.nii.gz` | — | the two inputs after `topup` correction (`--iout`). |
| `mean.b0dc.nii.gz` | — | mean of the corrected volumes; the BBR moving image. |
| `mask.b0dc.nii.gz` | — | synthstrip (optionally dilated) brain mask in corrected space. |
| `topup_fieldcoef.nii.gz`, `topup_movpar.txt` | — | `topup`'s spline field coefficients and movement parameters, renamed so `outdir/topup` is a valid `--topup` argument for other FSL tools. |
| `params.dat` | — | the acquisition-parameter file actually used (also `--datain` for `topup`). |
| `vol1.nii.gz`, `vol2.nii.gz` | — | per-input frame averages (only when an input is multi-frame). |
| `reg/reg.mean.b0dc.lta` | — | BBR registration of the corrected mean to the subject (only with `--s`). |
| `reg/reg.v{1,2}.{nob0dc,b0dc}.lta` + `.mincost` | — | per-input before/after QA registrations (only with `--s --qa`). |
| `qa/v{1,2}.qa.nii.gz` | — | FS-applied correction for the FS-vs-FSL comparison (only with `--qa2`). |
| `log/fs-topup.*.log`, `log/nframes*.dat` | — | logs and cached frame counts. |

### Output Specifications

The B0 maps share the geometry of the (averaged) first input. The relationship between the map's units and the total readout time (TRT) is the central design point — see [Mathematical Foundations](#mathematical-foundations). For downstream FreeSurfer use, **`b0dc.vox.nii.gz` is the canonical product**; within FSFAST it is copied/linked to `sess/fsd/b0dcmap.nii.gz` (help, [`scripts/fs-topup:631-634`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L631-L634)).

## Mathematical Foundations

`topup` models the reversed-PE image pair to estimate the off-resonance field $f$ (in Hz) and the displacement it induces. The displacement of a voxel along the PE axis, in **voxels**, is

$$ \Delta_{\text{vox}} = f \cdot \text{TRT}, $$

where TRT is the **total readout time** in seconds (the time to traverse k-space along PE). `fs-topup` exploits this by setting the last column of the parameter file to `TRT` and letting `topup`'s `--fout` output carry whichever units fall out:

- If **`TRT = 1`** (the script default), the field-out map is numerically the **voxel-shift map** directly, and `b0dc.vox.nii.gz` is just a symlink to it ([`scripts/fs-topup:254-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L254-L258)).
- If **`TRT != 1`**, the field-out map is in **Hz**, so the script makes `b0dc.hz.nii.gz` a symlink and computes the VSM as $f\cdot\text{TRT}$ via `fscalc -mul $TRT` ([`scripts/fs-topup:259-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L259-L272)).

> [!math] Why the voxel-shift map is TRT-independent
> The *correction* (and therefore `b0dc.vox.nii.gz`) does not depend on the TRT
> value: a wrong TRT only mis-scales the **Hz** interpretation, not the geometric
> shift. The help block states this explicitly
> ([`scripts/fs-topup:615-621`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L615-L621)). The one operational caveat is that FSL `eddy`
> tends to fail when `TRT=1`, so if the output will be combined with `eddy` you
> should set a realistic TRT (and keep it consistent across topup and eddy).

The TRT-equals-1 test itself is computed as $\sqrt{(1-\text{TRT})^2} < 10^{-4}$ via `bc` ([`scripts/fs-topup:186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L186)).

> [!internal] The field estimation is entirely inside FSL `topup`
> `fs-topup` does no field estimation itself; the spline-regularised model fit is
> done by `topup`. The script's numerical contributions are limited to the
> Hz↔voxel scaling above and the mean/mask algebra.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/fs-topup:365-498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L365-L498)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | 2 strings | *(required)* | The two opposite-PE input volumes (`vol1 vol2`). |
| `--o` | string | *(required)* | Output directory. |
| `--trt` | float (s) | `1` | Total readout time. Controls only the Hz units (and eddy compatibility); see Foundations. |
| `--s` | string | — | FreeSurfer subject to register the corrected mean to (via BBR). Required for any `--qa`. |
| `--sd` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `--config` | string | parity-chosen | Explicit `topup` config file. Sets `UseConfig=1`. |
| `--no-config` | bool | use config | Do not pass any config file to `topup`. |
| `--config-odd` | bool | — | Force the odd-slice config (`b02b0_1.cnf`). |
| `--config-even` | bool | — | Force the even-slice config (`b02b0_2.cnf` = `b02b0.cnf`). |
| `--p` | string | auto AP/PA | Acquisition-parameter file passed to `topup` (`--datain`). |
| `--ndil`<br>`--ndilations` | int | `1` | Number of dilations applied to the synthstrip mask. |
| `--no-mask` | bool | mask on | Do not mask the B0 map (`b0dc` = `b0dc.nomask`). |
| `--multi-frame-mean` | bool | **on** | Average multi-frame inputs over frames (the default). |
| `--multi-frame-first` | bool | off | Use the first frame of multi-frame inputs instead of the mean. |
| `--no-multi-frame` | bool | off | Do nothing to multi-frame inputs (requires `--p`; see gotcha). |
| `--qa` | bool | off | Before/after BBR QA per input (needs `--s`). Adds ~5–10 min. |
| `--qa2` | bool | off | FS-vs-FSL application comparison via `mri_vol2vol`. |
| `--threads` | int | `1` | Threads; passed to `bbregister`/synthstrip and to `topup --nthr` (FSL ≥ 6.0.6 only). |
| `--log` | string | `outdir/log/fs-topup.*.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory; also sets `cleanup=0`. |
| `--nocleanup` | bool | — | Keep the temp directory. |
| `--cleanup` | bool | on | Delete the temp directory. |
| `--force` | bool | off | Re-run every step even if outputs are up to date (`UpdateNeeded`). |
| `--no-force` | bool | — | Disable `--force`. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `--config` and `--no-config` are mutually exclusive
> Supplying both is a hard error ("cannot spec both --config and --no-config",
> [`scripts/fs-topup:531-534`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L531-L534)). By default the script auto-selects the
> parity-correct config; use `--no-config` only if you understand the
> consequence (topup will run but "may not do the right thing" per the comment at
> [`scripts/fs-topup:12-15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L12-L15)).

> [!gotcha] `--qa` / `--qa2` require `--s`
> Any QA mode needs a subject; without `--s`, `--qa` errors in `check_params`
> ([`scripts/fs-topup:519-524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L519-L524)). The QA does **not** throw an error if the
> correction is bad — you must read the `.mincost` files yourself and check the
> `b0dc` cost is lower than the `nob0dc` cost.

> [!gotcha] Disabling multi-frame averaging forces a parameter file
> With multi-frame inputs, if `MultiFrame` is off and no `--p` is supplied the
> script errors ("multiframe data needs either --p or allowing of
> multiframemean", [`scripts/fs-topup:152-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L152-L155)). Because all frames are then
> concatenated, the parameter file must have one row per resulting frame.

> [!contradiction] `--no-multi-frame` sets the wrong variable
> The usage text lists `--no-multi-frame` / `--no-multi-frame-mean` to leave
> multi-frame inputs untouched, but the handler sets `DoMultiFrameMean=0`
> ([`scripts/fs-topup:439-441`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L439-L441)), a variable the rest of the script never
> reads (it tests `$MultiFrame`). As written, `--no-multi-frame` therefore does
> **not** disable averaging; only `--multi-frame-first` changes the behaviour
> (to first-frame extraction). Code is authoritative.

Other interactions:

- `--config-odd`/`--config-even` set `config` directly to the bundled `b02b0_1.cnf`/`b02b0_2.cnf` paths, overriding the automatic parity choice.
- `--threads > 1` adds `--nthr` to the `topup` command line; on FSL < 6.0.6 this option does not exist and `topup` may fail — the script only prints a hint after the failure ([`scripts/fs-topup:200-204`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L200-L204)).
- `--no-mask` makes `b0dc.nii.gz` identical to `b0dc.nomask.nii.gz` (mask/dilate/`mri_mask` steps skipped).

## Typical Use Cases

### 1. Standalone AP/PA distortion correction for BOLD

```bash
# vol1 = AP, vol2 = PA spin-echo fieldmap pair; produce a voxel-shift map
fs-topup --i ap.nii.gz pa.nii.gz --o topupout --trt 0.0336
# → topupout/b0dc.vox.nii.gz  (use as --vsm downstream)
```

### 2. With subject registration and QA

```bash
fs-topup --i ap.nii.gz pa.nii.gz --o topupout --trt 0.0336 \
  --s subj01 --qa --threads 4
# Then check topupout/reg/reg.v1.b0dc.dat.mincost  <  reg.v1.nob0dc.dat.mincost
```

### 3. As the topup stage inside fs-eddy

```bash
# fs-eddy calls fs-topup automatically with --topup-rev; equivalent manual call:
fs-topup --i dwi_b0_same.nii.gz dwi_b0_rev.nii.gz --o eddyout/topup \
  --threads 8 --trt 0.0673
# eddyout/topup/topup is then passed to FSL eddy as --topup
```

## Pipeline Context

`fs-topup` sits in the EPI distortion-correction stream for both diffusion and BOLD. It is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Its principal caller is [[fs-eddy]], which runs it whenever a reversed-PE volume is given (`--topup-rev`), wiring `outdir/topup` into the subsequent FSL `eddy` call.

**Predecessor:** reversed-PE EPI/spin-echo pair (and optionally [[wiki/tools/mri_convert|mri_convert]] to NIfTI) → **fs-topup** → **Successors:** [[fs-eddy]] / FSL `eddy` (diffusion), FSFAST, or any `--vsm`-aware FreeSurfer tool ([[bbregister]], [[mri_vol2vol]]). The companion classic fieldmap route is [[epidewarp.fsl]].

## Gotchas and Caveats

> [!gotcha] Hard-coded FSL config paths
> The odd/even config files default to
> `/usr/pubsw/packages/fsl/6.0.1/src/topup/flirtsch/b02b0_{1,2}.cnf`
> ([`scripts/fs-topup:17-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L17-L18)) — a Martinos-Center path, not `$FSLDIR`. On a
> generic install these may not exist; pass `--config <path>` (e.g.
> `$FSLDIR/etc/flirtsch/b02b0.cnf`) or `--no-config`.

> [!gotcha] topup renames its outputs awkwardly
> `topup` writes `${outdir}_fieldcoef.nii.gz` and `${outdir}_movpar.txt`
> (note the underscore *outside* the directory). The script moves them to
> `outdir/topup_fieldcoef.nii.gz` / `outdir/topup_movpar.txt` so that
> `outdir/topup` becomes a usable `--topup` prefix for other FSL programs
> ([`scripts/fs-topup:206-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L206-L211)).

> [!gotcha] Always pass the voxel map downstream
> Use `b0dc.vox.nii.gz` (not `b0dc.nii.gz`) as the `--vsm` argument: it is in
> voxel units and is correct irrespective of the TRT you chose.

## Error Compensation and Guard Rails

- **FSL presence check.** Aborts early if `topup` is not on the `PATH` ([`scripts/fs-topup:549-554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L549-L554)).
- **Parity-correct config auto-selection.** Reads the slice count with [`mri_info --dim`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L108) and chooses the odd/even config so `topup` does not die on a parity mismatch.
- **Skip-if-up-to-date.** Every stage is wrapped in `UpdateNeeded`; re-runs reuse existing outputs unless `--force` is given.
- **Automatic multi-frame averaging.** Multi-frame inputs are averaged with [[mri_concat]] (or first-frame-extracted) so the user can pass raw 4-D fieldmaps.
- **synthstrip instead of BET.** The brain mask is made with [[mri_synthstrip]] (and optionally dilated), avoiding a dependence on FSL's BET for the masking step.

## Known Bugs

- [[00185]] — `--no-multi-frame` sets a never-read variable (`DoMultiFrameMean`) instead of `MultiFrame = 0`, so the flag is a silent no-op and multi-frame inputs are still mean-averaged.

## Related Tools

- [[fs-eddy]] — primary caller; runs `fs-topup` then FSL `eddy` for diffusion.
- [[epidewarp.fsl]] — the classic single-fieldmap (phase/magnitude) alternative to the reversed-PE approach.
- [[vsm-smooth]] — can extend the `b0dc.vox.nii.gz` map past the mask edge.
- [[mri_synthstrip]] — builds the brain mask used to mask the field map.
- [[bbregister]] — registration of the corrected mean to the anatomical, and the QA engine.
- [[mri_concat]] — frame averaging and concatenation of the two PE directions.
- [[mri_vol2vol]] — applies the VSM in the `--qa2` FS-vs-FSL comparison.
- [[dt_recon]] — a typical downstream diffusion consumer.
- `topup` *(external, FSL)* — the field-estimation engine this script wraps.

## Confidence and Gaps

**High confidence:** the complete flag set and defaults, the TRT/units logic, the parity-based config selection, the output-file inventory and renaming, the masking pipeline, and the QA behaviour are all read directly from [`scripts/fs-topup`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup).

> [!gap] Site-specific config paths
> The default config locations are hard-coded to a `/usr/pubsw/packages/fsl/6.0.1`
> tree. Whether they exist on an arbitrary install is environment-dependent; on a
> standard FSL layout you will likely need `--config`/`--no-config`.

> [!gap] `--nthr` / FSL version coupling
> Multi-threaded `topup` (`--nthr`) requires FSL ≥ 6.0.6. The script cannot
> detect the FSL version and only emits a hint *after* a failure, so the
> effective behaviour of `--threads > 1` depends on the local FSL build.

## References

- FreeSurfer source: [`scripts/fs-topup`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup) (v8.2.0).
- Built-in help: `fs-topup --help` (the `BEGINHELP` block, [`scripts/fs-topup:597-708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-topup#L597-L708)).
- Andersson, Skare & Ashburner (2003). *How to correct susceptibility distortions in spin-echo echo-planar images: application to diffusion tensor imaging.* NeuroImage 20(2):870–888.
- Smith et al. (2004). *Advances in functional and structural MR image analysis and implementation as FSL.* NeuroImage 23(S1):208–219.
- FSL `topup` documentation: <https://fsl.fmrib.ox.ac.uk/fsl/docs/diffusion/topup/index.html>
