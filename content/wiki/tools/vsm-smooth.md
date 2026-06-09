---
title: "vsm-smooth"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/vsm-smooth"
families: []                     # standalone B0-DC helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[epidewarp.fsl]]"
  - "[[fs-topup]]"
  - "[[mri_fwhm]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[fscalc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - distortion-correction
  - b0
  - voxel-shift-map
  - smoothing
  - fsl-bridge
---

# vsm-smooth

## Summary

`vsm-smooth` performs a **masked, edge-preserving smoothing** of a voxel-shift map (VSM) — the per-voxel displacement field produced by B0 (susceptibility) distortion correction. Voxels that already hold a non-zero shift value are left exactly as they are; voxels that are zero (typically just outside the brain mask) are filled in with a Gaussian-smoothed version of the map. The net effect is a cheap **extrapolation** of the VSM a short distance beyond the support of the non-zero voxels, so that EPI voxels lying at or just past the mask edge still receive a sensible shift when the map is applied. Although written for B0 VSMs, the script states it works on any map with the same zero/non-zero structure.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vsm-smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth)
- **Binary/script location:** `$FREESURFER_HOME/bin/vsm-smooth`
- **FreeSurfer tools invoked:** [`mri_fwhm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L64) (the actual Gaussian smoothing), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L70) (build the "is-zero" mask), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L76) (keep the smoothed values only where the original was zero), and [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L81) (add the two pieces together), plus the shell helper `fs_temp_dir`.
- **External dependencies:** none — this script is pure FreeSurfer and does **not** require FSL.

## Purpose and Context

B0 distortion-correction tools estimate a voxel-shift map only where there is signal to estimate it from — i.e. inside a brain or head mask. Outside that mask the VSM is zero. When the map is later applied to an EPI volume (e.g. by [`fugue`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L519) inside [[epidewarp.fsl]], or by [[mri_vol2vol]]/[[bbregister]] via their `--vsm` option), voxels at the boundary of the brain can sample from regions where the shift abruptly drops to zero, producing a hard edge. `vsm-smooth` softens that boundary by growing the valid shift values a little way into the zero region while leaving the interior of the map untouched.

It is a small utility called automatically near the end of [[epidewarp.fsl]] (the `--vsm-fwhm` step, default FWHM = 10 mm), but it is also usable on its own — for example to post-process the `b0dc.vox.nii.gz` output of [[fs-topup]] before feeding it to FSFAST or [[bbregister]].

> [!gotcha] "Smoothing" here does not blur the map you keep
> Despite the name, the interior of the VSM is **not** smoothed. Only the
> previously-zero voxels are replaced by smoothed values; every originally
> non-zero voxel survives bit-for-bit. The operation is a hole-filling /
> extrapolation, not a low-pass filter of the whole volume.

## Inputs

### Required Inputs

- **`--i` / `--vsm` `vsm`** — the voxel-shift map to extend. Any volume format [[wiki/tools/mri_convert|mri_convert]]/`mri_fwhm` can read (`nii`, `nii.gz`, `mgz`, …). It must already encode "no estimate" as exactly zero, because zero is the value the script treats as a hole to be filled.
- **`--o` `vsmout`** — output path for the extended map.
- **`--fwhm` `fwhm`** — full-width-at-half-maximum (in mm) of the Gaussian used to smooth the map before hole-filling. Larger values reach further beyond the mask edge.

### Input Assumptions

> [!assumption] Zero means "no estimate"
> The map is assumed to mark voxels with no valid shift as exactly `0`, and all
> in-mask voxels as non-zero. The "keep" region is defined by
> `|value| >= 1e-10` ([`scripts/vsm-smooth:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L70)); a genuine in-brain shift
> that happens to round to exactly zero would be treated as a hole and
> over-written by the smoothed value. In practice this is harmless because such
> a voxel's smoothed value is ~0 as well.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `vsmout` (the `--o` path) | user-specified | the extended VSM: original non-zero voxels unchanged, former zero voxels filled with smoothed values |
| `vsm-smooth.log` | dir of `vsmout` | run log (only if `--log` is set to a real path; the script defaults `LF` to `/dev/null`, see gotcha) |

Three intermediate volumes (`vsm.sm.nii`, `notvsm.nii`, `vsm.sm.masked.nii`) are written under a scratch `tmpdir` and deleted on success unless `--nocleanup`/`--tmpdir` is given.

### Output Specifications

The output has the **same geometry, voxel size, and orientation as the input** — `mri_fwhm`, `mri_mask`, and `fscalc` are all voxel-wise and do not resample. The data type follows the FreeSurfer default for the output extension (intermediate files are `.nii`).

## Mathematical Foundations

The script implements a single masked-extrapolation identity. Let $V$ be the input VSM. Define the "hole" mask

$$ Z(x) = \begin{cases} 1 & |V(x)| < 10^{-10} \\ 0 & \text{otherwise} \end{cases} $$

(`mri_binarize --abs --min 1e-10 --inv` builds $Z$). Let $S = G_{\sigma} * V$ be $V$ smoothed by a Gaussian of the requested FWHM (`mri_fwhm --smooth-only`, with $\sigma = \text{FWHM}/\sqrt{8\ln 2}$). The output is

$$ V_{\text{out}}(x) = V(x) + Z(x)\,S(x), $$

i.e. add the smoothed map but **only** where the original was zero (`mri_mask` zeroes $S$ outside $Z$, then `fscalc add`). Where $V(x)\neq 0$, $Z(x)=0$ and the second term vanishes, so $V_{\text{out}}=V$ exactly; where $V(x)=0$, $V_{\text{out}}=S(x)$, the local Gaussian average that bleeds in from the nearby non-zero voxels.

> [!internal] The smoothing kernel lives in `mri_fwhm`
> The Gaussian convolution (and the FWHM→σ conversion) is performed by
> [[mri_fwhm]] in `--smooth-only` mode, not in this script. `vsm-smooth` only
> orchestrates the binarize / mask / add algebra.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/vsm-smooth:97-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L97-L158)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i`<br>`--vsm` | string | *(required)* | Input voxel-shift map. Must exist. |
| `--o` | string | *(required)* | Output (extended) voxel-shift map. |
| `--fwhm` | float (mm) | *(required)* | FWHM of the Gaussian used to smooth the map before hole-filling. |
| `--log` | string | `/dev/null` | Log-file path. See gotcha — logging is off unless this is set. |
| `--nolog`<br>`--no-log` | bool | — | Force the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir --scratch`) | Directory for intermediate files; setting it also disables cleanup. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory after finishing. |
| `--cleanup` | bool | on | Delete the temporary directory (the default). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version string and exit. |

### Configuration Interactions

> [!gotcha] Logging is effectively off by default
> Although `--log`/`--nolog` exist, line [`scripts/vsm-smooth:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L48)
> unconditionally sets `LF = /dev/null` **before** the `if($#LF == 0)` default on
> the next line, so a default `vsm-smooth.log` is never created. To get a log you
> must pass `--log <path>` explicitly. Code is authoritative here; the usage text
> does not mention this.

- `--tmpdir`/`--tmp` implies `--nocleanup` (sets `cleanup = 0`), so intermediate volumes survive for inspection.
- `--cleanup` and `--nocleanup` are last-one-wins booleans; the built-in default is cleanup on.

## Typical Use Cases

### 1. Extend a B0 voxel-shift map by 10 mm

```bash
# Grow a topup/epidewarp VSM a short way past the brain mask
vsm-smooth --i vsm.nii.gz --o vsm.smoothed.nii.gz --fwhm 10
```

### 2. As called automatically inside epidewarp.fsl

```bash
# This is the exact invocation epidewarp.fsl issues (vsm-fwhm default 10)
vsm-smooth --fwhm 10 --i vsm.nii.gz --o vsm.nii.gz
```

Here the input and output are the same path: the map is extended in place after FLIRT has resampled it into EPI space.

## Pipeline Context

`vsm-smooth` is a leaf utility in the B0 distortion-correction stream. It does not appear in [[wiki/pipelines/recon-all|recon-all]] or `trac-all` directly; it is reached through [[epidewarp.fsl]], which `trac-all`/`trac-preproc` call for fieldmap-based DWI dewarping.

**Predecessor:** [[epidewarp.fsl]] (or [[fs-topup]]) produces a VSM → **vsm-smooth** extends it → **Successor:** [`fugue`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L519), [[mri_vol2vol]], or [[bbregister]] apply the VSM to the EPI.

Inside [[epidewarp.fsl]] the call sits at [`scripts/epidewarp.fsl:462-468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/epidewarp.fsl#L462-L468), immediately after the VSM is resampled into EPI space by FLIRT and just before the EPI/exf are dewarped. The amount of extension is controlled there by `--vsm-fwhm` (default 10 mm; `--vsm-fwhm 0` skips the call entirely).

## Gotchas and Caveats

> [!gotcha] Input and output may be the same file
> The script writes intermediates to a separate `tmpdir` and only touches the
> final output with `fscalc ... -o $vsmout` at the very end, so `--i X --o X` is
> safe and is exactly how [[epidewarp.fsl]] uses it.

> [!gotcha] FWHM, not sigma
> `--fwhm` is a full-width-at-half-maximum in millimetres, passed straight to
> `mri_fwhm`. This is a different convention from [[epidewarp.fsl]]'s `--sigma`
> option (a Gaussian standard deviation in mm used by `fugue`). Do not conflate
> the two.

## Error Compensation and Guard Rails

- **Existence checks.** `--i` must exist and `--o`/`--fwhm` must be supplied, else the script errors in `check_params` ([`scripts/vsm-smooth:164-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L164-L181)).
- **Fail-fast.** Each of the four sub-commands is checked with `if($status) exit 1`, so a failure in `mri_fwhm`/`mri_binarize`/`mri_mask`/`fscalc` aborts immediately.
- **No silent resampling.** Because the whole pipeline is voxel-wise, the output is guaranteed to share the input grid; nothing is reoriented or interpolated.

## Related Tools

- [[epidewarp.fsl]] — the main consumer; calls `vsm-smooth` to extend the VSM past the mask before dewarping.
- [[fs-topup]] — another producer of voxel-shift maps (`b0dc.vox.nii.gz`) that can be post-processed with this script.
- [[mri_fwhm]] — performs the underlying Gaussian smoothing (`--smooth-only`).
- [[mri_binarize]] — builds the zero-voxel ("hole") mask.
- [[mri_mask]] — restricts the smoothed values to the hole region.
- [[fscalc]] *(no wiki page yet)* — voxel-wise calculator used to add the original map and the masked-smoothed map.

## Confidence and Gaps

**High confidence:** the full flag set, the four-step binarize/smooth/mask/add algebra, the `1e-10` keep threshold, the in-place-safe behaviour, and the default-off logging are all read directly from [`scripts/vsm-smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth). The script is short and self-contained; there are no unresolved branches.

## References

- FreeSurfer source: [`scripts/vsm-smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth) (v8.2.0).
- Built-in help: `vsm-smooth --help` (the `BEGINHELP` block, [`scripts/vsm-smooth:212-220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vsm-smooth#L212-L220)).
