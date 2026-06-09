---
title: "sfa2fieldsign"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/sfa2fieldsign"
families: []                       # FS-FAST retinotopy helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_fieldsign]]"
  - "[[mri_vol2surf]]"
  - "[[mri_binarize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_surf2surf]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The 'intersection of thresholded fsigs' fslmaths step multiplies the eccen binary mask by itself (eccen x eccen), not eccen x polar, which contradicts the comment and help text — flagged as a likely bug."
  - "Relies on the external FSL fslmaths binary (FSLOUTPUTTYPE=NIFTI); fslmaths is not part of FreeSurfer and must be on PATH."
tags:
  - fsfast
  - retinotopy
  - fieldsign
  - visual-cortex
  - surface-sampling
---

# sfa2fieldsign

## Summary

`sfa2fieldsign` computes cortical **visual field-sign** maps from an FS-FAST
phase-encoded retinotopy analysis (the output of `sfa-sess`, which runs
`selfreqavg` on eccentricity and polar-angle runs). Field sign — whether a visual
area represents the world as a mirror image or not — is the standard way to
delineate retinotopic visual area borders (V1/V2/V3 …). The script thresholds the
eccentricity and polar significance volumes, intersects them into a single mask,
masks the eccentricity and polar **phase (angle)** volumes, samples everything
onto each hemisphere's cortical surface with [[mri_vol2surf]], and finally calls
the [[mri_fieldsign]] binary to compute the field-sign map per hemisphere. It is
a tcsh orchestrator: the field-sign math itself lives in [[mri_fieldsign]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/sfa2fieldsign`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign)
- **Binary/script location:** `$FREESURFER_HOME/bin/sfa2fieldsign`
- **FreeSurfer tools invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L71) (threshold the fsig volumes), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L95) (extract the angle frame), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L121) (sample volumes to the surface), [`mri_fieldsign`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L141) (compute field sign), and `reg2subject` ([`scripts/sfa2fieldsign:281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L281)).
- **External (non-FreeSurfer) dependency:** FSL `fslmaths` ([`scripts/sfa2fieldsign:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L79), [`:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L89), [`:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L101)); `setenv FSLOUTPUTTYPE NIFTI` is set at [`scripts/sfa2fieldsign:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L3).

## Purpose and Context

Phase-encoded retinotopy presents a stimulus that sweeps the visual field
(expanding rings for **eccentricity**, rotating wedges for **polar angle**).
FS-FAST's `selfreqavg` (driven by `sfa-sess -a rtopy`) extracts, at each voxel,
the response phase at the stimulus frequency — i.e. the preferred eccentricity
and polar angle — together with an omnibus significance (`fsig`). `sfa2fieldsign`
turns those volumetric phase maps into a **surface field-sign map**:

- Field sign is the sign of the Jacobian of the (eccentricity, polar) → cortical
  position mapping. Where the visual field is represented as a mirror image the
  sign flips, so adjacent visual areas (V1/V2, V2/V3, …) have alternating sign and
  their borders fall on the sign reversals.

The script prepares and surface-samples the inputs and then delegates the
gradient/cross-product computation to [[mri_fieldsign]]. It is run **by hand** as
the surface stage of FS-FAST retinotopy; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]] or trac-all.

## Inputs

### Required Inputs

- **`--sfa sfadir`** — the analysis directory produced by `sfa-sess`. It must
  contain, for each of `eccen` and `polar`:
  - `sfadir/<type>/omnibus/fsig.nii` — omnibus significance volume (checked at
    [`scripts/sfa2fieldsign:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L65-L69)).
  - `sfadir/<type>/h.nii` — the selfreqavg result volume (frame 9 is the phase /
    angle, extracted at [`scripts/sfa2fieldsign:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L95)).
- **`--reg register.dat`** — functional→anatomical registration. The **subject is
  derived from it** via `reg2subject` ([`scripts/sfa2fieldsign:281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L281)); the subject
  must exist under `$SUBJECTS_DIR`.

### Input Assumptions

> [!assumption] sfa-sess retinotopy output with eccen and polar runs
> The input is assumed to be a complete `sfa-sess -a rtopy` analysis containing
> **both** `eccen` and `polar` sub-analyses, each with an `omnibus/fsig.nii` and
> an `h.nii` whose **frame 9 is the response phase (angle) in radians**. The
> registration must be a classic `register.dat`/LTA that `reg2subject` can resolve
> to a recon-all subject (the subject's `?h` surfaces must already be built).

The `h.nii` frame-9 convention is the FS-FAST selfreqavg layout; the script
hard-codes `--frame 9` ([`scripts/sfa2fieldsign:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L95)).

## Outputs

All outputs go in `sfadir/fieldsign` by default, or `sfadir/<osd>` if `--osd` is
given ([`scripts/sfa2fieldsign:46-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L46-L47)).

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `fsig.bin.nii` | [[nifti]] mask | binarised/intersected significance mask (see contradiction below) |
| `eccen.masked.nii` | [[nifti]] | eccentricity angle (rad) volume masked by `fsig.bin` ([`:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L101)) |
| `polar.masked.nii` | [[nifti]] | polar angle (rad) volume masked by `fsig.bin` |
| `?h.eccen.masked.mgh` | [[mgz]]/mgh surface overlay | masked eccen angle sampled on the `?h` surface ([`:134-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L134-L135)) |
| `?h.polar.masked.mgh` | mgh surface overlay | masked polar angle sampled on the `?h` surface |
| `?h.fieldsign.masked.mgh` | mgh surface overlay | the **field-sign map** computed by [[mri_fieldsign]] ([`:141-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L141-L145)) |
| `sfa2fieldsign.log` | text | command/environment log (unless `--nolog`) |
| `<subject>` (empty file) | — | a touch-file named after the subject, dropped in the output dir ([`scripts/sfa2fieldsign:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L48)) |

Additionally, masked-h surface overlays `?h.h.masked.mgh` are written under
`sfadir/<type>/` (these are the actual inputs [[mri_fieldsign]] reads,
[`scripts/sfa2fieldsign:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L120) and [`:143-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L143-L144)). The registration file is also
copied into the output dir ([`scripts/sfa2fieldsign:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L49)).

### Output Specifications

The angle overlays are in **radians**. Per the help text
([`scripts/sfa2fieldsign:365-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L365-L392)): eccentricity runs 0→2π (foveal→peripheral);
left-hemisphere polar angle runs −π→+π (upper visual field 0→π below the
calcarine, lower visual field 0→−π above it); right-hemisphere polar angle is
restricted to the left visual hemifield (±π/2…±π), which the help notes is harder
to interpret. The field-sign overlay is the signed map from [[mri_fieldsign]]
(typically thresholded at ±0.5 for display). Surface sampling uses projection
fraction `--projfrac 0.5` by default (`--proj-frac`).

## Mathematical Foundations

The field-sign computation is **not** in this script — it is in the
[[mri_fieldsign]] binary, invoked with `--old` (the legacy algorithm,
`usenew=0`), `--fwhm`, and either `--sphere` (default here) or `--patch`
([`scripts/sfa2fieldsign:141-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L141-L150)).

> [!math] Visual field sign
> Field sign is the sign of the Jacobian determinant of the cortical map from
> visual-field coordinates $(r,\theta)$ (eccentricity, polar angle) to cortical
> surface position $(x,y)$:
> $$\mathrm{sign}\Big(\frac{\partial(r,\theta)}{\partial(x,y)}\Big)
>   = \mathrm{sign}\big(\nabla r \times \nabla\theta\big).$$
> Equivalently, it is the sign of the angle between the local gradients of the
> eccentricity and polar phase maps on the surface. Mirror-image (non-mirror)
> representations have opposite signs, so visual-area borders coincide with sign
> reversals. The gradient estimation and cross product are done by
> [[mri_fieldsign]]; this script only prepares the smoothed (`--fwhm`),
> surface-sampled eccen/polar phase overlays it consumes.

> [!internal] The gradient/cross-product math lives in mri_fieldsign
> `sfa2fieldsign` masks and surface-samples the phase maps and sets `--fwhm`,
> `--sphere`/`--patch`, and `--old`; the actual surface-gradient computation and
> sign assignment are implemented in [[mri_fieldsign]]
> ([`mri_fieldsign/mri_fieldsign.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_fieldsign/mri_fieldsign.cpp)).

The script's own numerical operations are limited to thresholding (`mri_binarize
--abs --min thresh`), masking (`fslmaths -mul`), and frame extraction
(`mri_convert --frame 9`).

> [!contradiction] The "intersection" of fsigs multiplies eccen by itself, not eccen × polar
> The step labelled "Take intersection of thresholded fsigs"
> ([`scripts/sfa2fieldsign:77-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L77-L83)) runs
> `fslmaths eccen/omnibus/fsig.bin.nii -mul eccen/omnibus/fsig.bin.nii …` — i.e. it
> multiplies the **eccentricity** binary mask by **itself**. Both the in-code
> comment and the help text ([`scripts/sfa2fieldsign:351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L351)) describe this as the
> intersection of the **polar and eccen** masks, which would require the second
> operand to be `polar/omnibus/fsig.bin.nii`. As written, the combined mask equals
> the eccentricity mask alone (squaring a 0/1 mask is a no-op), so the polar
> significance threshold has no effect on the mask. This looks like a copy-paste
> bug; treat the resulting `fsig.bin` as "eccen-thresholded only" until the code is
> fixed. (See [`scripts/sfa2fieldsign`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign).)

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser ([`scripts/sfa2fieldsign:165-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L165-L264)).
`--sfa` and `--reg` are required ([`scripts/sfa2fieldsign:272-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L272-L279)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sfa` | string (dir) | *(required)* | `sfa-sess` output directory holding `eccen/` and `polar/` (each with `omnibus/fsig.nii` and `h.nii`). Existence-checked. |
| `--reg` | string (file) | *(required)* | Functional→anatomical registration; the subject is derived from it via `reg2subject`. Existence-checked. |
| `--thresh` | float | `2` | Significance threshold (−log10 p) applied with `mri_binarize --abs --min` to each omnibus `fsig` ([`scripts/sfa2fieldsign:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L71)). |
| `--fwhm` | float (mm) | `10` | Surface smoothing FWHM passed to [[mri_fieldsign]] `--fwhm` before gradient estimation. |
| `--proj-frac` | float | `0.5` | Projection fraction for [[mri_vol2surf]] `--projfrac` when sampling the masked volumes to the surface. |
| `--occip` | bool | off | Shorthand for `--patch occip.patch.flat`; compute field sign on the flattened occipital patch instead of the sphere ([`scripts/sfa2fieldsign:211-213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L211-L213)). |
| `--patch` | string | — (sphere) | Use the named flat patch `?h.<patch>` for [[mri_fieldsign]] (`--patch`) instead of the whole sphere. The patch file is existence-checked per hemisphere ([`scripts/sfa2fieldsign:286-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L286-L294)). |
| `--osd` | string | `fieldsign` | Output sub-directory name under `sfadir`. |
| `--lh` | bool | both | Process the left hemisphere only ([`scripts/sfa2fieldsign:215-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L215-L217)). |
| `--rh` | bool | both | Process the right hemisphere only. |
| `--log` | string | `outdir/sfa2fieldsign.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmpdir` | string | (unused) | Set a temp dir (also sets `cleanup=0`). *(The tmpdir machinery is commented out, [`scripts/sfa2fieldsign:43-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L43-L44); the flag is parsed but no temp dir is currently used.)* |
| `--nocleanup` | bool | off | Do not clean up (no effect given the commented-out tmpdir). |
| `--cleanup` | bool | on | Clean up (default; no effect given the above). |
| `--debug` | bool | off | tcsh `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print full help and exit. |
| `-version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--sphere` (default) vs `--patch`/`--occip` are mutually exclusive surfaces
> [[mri_fieldsign]] computes either on the sphere or on a flat patch. With no
> patch flag, `sfa2fieldsign` adds `--sphere` ([`scripts/sfa2fieldsign:146-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L146-L150));
> `--patch <p>` (or `--occip`, which sets `--patch occip.patch.flat`) switches to
> the patch and **requires** `$SUBJECTS_DIR/$subject/surf/?h.<p>` to exist for
> each processed hemisphere, or the script errors out up front. Flat-patch field
> sign is the classic visual-area-mapping view; the sphere is the default.

> [!gotcha] `--lh` then `--rh` does not give both — the last one wins
> `--lh` sets the hemisphere list to `(lh)` and `--rh` to `(rh)`
> ([`scripts/sfa2fieldsign:215-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L215-L221)); they overwrite rather than accumulate.
> Specify neither to process both hemispheres (the default).

- The `--tmpdir`/`--nocleanup`/`--cleanup` flags are vestigial: the temp-dir
  block is commented out, so they currently have no effect.
- `--osd` only changes the output directory name; it does not change which input
  files are read.

## Typical Use Cases

### 1. Standard retinotopy field-sign on the sphere

```bash
sfa-sess -s session -a rtopy        # produces session/bold/rtopy

cd session/bold
sfa2fieldsign --sfa rtopy --reg register.dat
# -> rtopy/fieldsign/{lh,rh}.fieldsign.masked.mgh (+ angle overlays)
```

### 2. Field sign on the flattened occipital patch, left hemisphere only

```bash
sfa2fieldsign --sfa rtopy --reg register.dat --occip --lh
# requires $SUBJECTS_DIR/$subject/surf/lh.occip.patch.flat
```

### 3. View the result

```bash
cd rtopy/fieldsign
tksurfer subject rh inflated -aparc -ov rh.fieldsign.masked.mgh -fthresh 0.5
```

## Pipeline Context

`sfa2fieldsign` is the surface stage of FS-FAST phase-encoded retinotopy. It is
not called by [[wiki/pipelines/recon-all|recon-all]] or trac-all.

**Predecessor:** `sfa-sess -a rtopy` / `selfreqavg` (volumetric eccen+polar phase
maps) → **sfa2fieldsign** → **Successor:** tksurfer/freeview display of the
field-sign and angle overlays (and, for group work, [[mri_surf2surf]] to
[[fsaverage]]).

Internally it chains [[mri_binarize]] (threshold), `fslmaths` (mask/intersect),
[[wiki/tools/mri_convert|mri_convert]] (extract the angle frame), [[mri_vol2surf]]
(sample to surface), and [[mri_fieldsign]] (compute field sign).

## Gotchas and Caveats

> [!gotcha] Requires FSL fslmaths on PATH
> Masking and the "intersection" use FSL's `fslmaths`, not a FreeSurfer tool, with
> `FSLOUTPUTTYPE=NIFTI` forced at [`scripts/sfa2fieldsign:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L3). FSL must be
> installed and on `PATH` or the script fails at the first `fslmaths` call.

> [!gotcha] Right-hemisphere polar angle is hard to interpret
> The help notes ([`scripts/sfa2fieldsign:388-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L388-L392)) that the right-hemisphere
> polar-angle overlay spans only the left visual hemifield (±π/2…±π), so the color
> bar and interpretation differ from the left hemisphere. A commented-out
> `fslmaths -rem` remapping to −π/2…+π/2 is present but disabled because the
> `fslmaths -rem` operator was buggy ([`scripts/sfa2fieldsign:105-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L105-L113)).

> [!gotcha] Frame 9 is assumed to be the phase
> `mri_convert --frame 9` is hard-coded to pull the angle out of `h.nii`. This is
> the FS-FAST selfreqavg layout; a differently-laid-out `h.nii` would yield the
> wrong overlay silently.

See also the `[!contradiction]` in [Mathematical Foundations](#mathematical-foundations)
about the eccen×eccen "intersection".

## Error Compensation and Guard Rails

- Every external command's exit status is checked; the script aborts on any
  non-zero status ([`scripts/sfa2fieldsign:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L74), [`:83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L83), [`:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L92), [`:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L125), [`:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L153)).
- The omnibus `fsig.nii` files and (if a patch is requested) the per-hemisphere
  patch files are existence-checked before processing
  ([`scripts/sfa2fieldsign:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L65-L69), [`:286-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L286-L294)).
- The output directory is created and the registration archived into it for
  provenance ([`scripts/sfa2fieldsign:46-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L46-L49)).
- No data are auto-conformed or rescaled; the script only thresholds, masks, and
  surface-samples.

## Known Bugs

- [[00182]] — the analysis-mask step squares the eccentricity significance mask (`fslmaths eccen/.../fsig.bin -mul eccen/.../fsig.bin`) instead of intersecting it with the polar mask, so polar significance is silently dropped from the field-sign mask.

## Related Tools

- [[mri_fieldsign]] — the binary that actually computes the surface field-sign map; `sfa2fieldsign` prepares its inputs and sets `--fwhm`/`--sphere`/`--patch`/`--old`.
- [[mri_vol2surf]] — samples the masked eccen/polar phase volumes onto the cortical surface.
- [[mri_binarize]] — thresholds the omnibus significance volumes.
- [[wiki/tools/mri_convert|mri_convert]] — extracts the phase (frame 9) from the selfreqavg `h.nii`.
- [[mri_surf2surf]] — for mapping individual field-sign maps to [[fsaverage]] for group analysis.
- `selfreqavg` / `sfa-sess` *(no wiki page yet)* — the FS-FAST retinotopy analysis that produces the `--sfa` input.

## Confidence and Gaps

**High confidence:** the complete flag set, the threshold→mask→sample→fieldsign
sequence, the radian conventions and frame-9 phase assumption, the sphere-vs-patch
interaction, and the hemisphere-flag overwrite behaviour — all read directly from
[`scripts/sfa2fieldsign`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign).

> [!gap] Likely eccen×eccen "intersection" bug
> The fsig-mask step multiplies the eccentricity mask by itself rather than by the
> polar mask (see the contradiction above). It is unclear whether this is
> intentional or a copy-paste error; if the latter, polar significance is silently
> ignored when forming the analysis mask. Needs developer confirmation.

> [!gap] FSL dependency
> The script depends on FSL `fslmaths`, which is outside FreeSurfer; behaviour
> when FSL is absent or a different version is on `PATH` was not tested.

## References

- FreeSurfer source: [`scripts/sfa2fieldsign`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign) (v8.2.0).
- Built-in help: `sfa2fieldsign -help` (the `BEGINHELP` block, [`scripts/sfa2fieldsign:335-393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sfa2fieldsign#L335-L393)).
- Field-sign method: Sereno et al., *Science* 268:889–893 (1995), "Borders of multiple visual areas in humans revealed by functional magnetic resonance imaging." See [[mri_fieldsign]] for the implementation.
- Companion: [`fsfast/bin/sfa-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/sfa-sess), [`fsfast/bin/selfreqavg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selfreqavg).
