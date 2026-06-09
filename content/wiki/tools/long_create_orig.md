---
title: "long_create_orig"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/long_create_orig"
families: []                     # longitudinal stream helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/concepts/longitudinal-processing|longitudinal-processing]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_robust_template]]"
  - "[[mri_concatenate_lta]]"
  - "[[mri_add_xform_to_header]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The FOV>256 guard branch references an undefined $LF and cannot execute as written; whether any wrapper ever sets LF before calling this script was not found in v8.2.0 (recon-all does not call it)."
tags:
  - longitudinal
  - motion-correction
  - registration
  - base
---

# long_create_orig

## Summary

`long_create_orig` builds the base-space `rawavg.mgz`, `orig.mgz`, and
`aseg_cross.mgz` for one or all time points of a longitudinal subject by mapping,
motion-correcting (averaging), and conforming the original cross-sectional inputs
(`mri/orig/001.mgz`, `002.mgz`, …) into the within-subject **base/template**
space. It is the standalone counterpart of the in-`recon-all` step now performed
by `longmc`: it concatenates each run's motion-correction transform with the
time-point→base registration so that the raw runs are resampled into base space
**once**, avoiding repeated interpolation.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/long_create_orig`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig)
- **Original author:** Martin Reuter
- **Binary/script location:** `$FREESURFER_HOME/bin/long_create_orig`
- **FreeSurfer tools invoked:** [[wiki/tools/mri_convert|mri_convert]] (mapping/conforming/casting), [[mri_robust_template]] (motion-correction averaging and LTA estimation), [[mri_concatenate_lta]] (compose run→base transforms), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L289) (FOV read), [[mri_add_xform_to_header]] (stamp talairach into the header).

## Purpose and Context

In the cross-sectional stream, `orig.mgz` is the conformed average of one or more
raw T1 acquisitions (`001.mgz`, `002.mgz`, …) after motion correction. For the
longitudinal stream, each time point's raw runs must end up in the **base
(template) space** so that all time points share an identical voxel grid. Naively
this would mean two resampling steps (run→time-point average, then
time-point→base), each blurring the data. `long_create_orig` avoids that by
**composing the transforms** first and resampling the raw runs to base space in a
single interpolation:

1. Map each time point's cross-sectional `aseg.mgz` into base space (nearest
   neighbour) → `aseg_cross.mgz`.
2. Obtain the per-run motion-correction LTAs (copy them from the cross run if they
   exist; otherwise re-estimate them with [[mri_robust_template]]).
3. Concatenate each run's LTA with the time-point→base registration
   (`<tp>_to_<base>.lta`) using [[mri_concatenate_lta]].
4. Run [[mri_robust_template]] with those composed transforms (`--ixforms`) to
   produce the base-space average `rawavg.mgz` in one pass, then cast it to
   `uchar` for `orig.mgz`.
5. Stamp the (not-yet-existing) `talairach.xfm` into the `orig.mgz` header.

The aligned `aseg_cross.mgz` and the base-space `nu`/`norm` volumes produced
around this stage are exactly the inputs consumed by
[[long_create_base_sigma]].

> [!gotcha] In v8.2.0 recon-all uses `longmc`, not this script
> `recon-all` no longer calls `long_create_orig` (no reference in
> [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all));
> the longitudinal motion-correction/orig step is invoked as `longmc` from
> [`scripts/rca-long-tp-init:168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L168).
> `longmc` uses the same composed-transform strategy (same `<tp>_to_<base>.lta`,
> [[mri_concatenate_lta]], [[mri_robust_template]] `--ixforms`, `mri_convert -odt
> uchar`). The header comment "This script is called from within recon-all" is
> **stale** for 8.2.0; use `long_create_orig` only for standalone/legacy
> reconstruction of the longtp orig files.

## Inputs

### Required Inputs

Positional ([`scripts/long_create_orig:66-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L66-L79)):

1. **`<base-id>`** — subject ID of an existing base; must contain `base-tps` and,
   for each time point processed, `mri/transforms/<tp>_to_<base>.lta`.
2. **`<tp-id>`** *(optional)* — a single time-point ID to process. If omitted, the
   script loops over every ID in the base's `base-tps`.

For each processed time point, in the cross-sectional subject directory
`$SUBJECTS_DIR/<tp>/`:

| File | Role | Checked at |
|------|------|-----------|
| `mri/orig/001.mgz` (… `00N.mgz`) | raw T1 run(s) to map to base | [`:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L92), [`:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L121) |
| `mri/orig/00N.lta` | per-run motion-correction transform (optional; re-estimated if absent) | [`:151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L151) |
| `mri/orig/00N-iscale.txt` | per-run intensity-scale (optional) | [`:152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L152) |
| `mri/aseg.mgz` | cross-sectional segmentation to map to base | [`:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L106) |
| `<base>/mri/transforms/<tp>_to_<base>.lta` | time-point→base registration | [`:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L96) |

### Input Assumptions

> [!assumption] Cross runs finished; at least `001.mgz`; base registration exists
> Each time point must have completed cross-sectional motion correction (so that
> `mri/orig/00N.mgz`, the `aseg.mgz`, and ideally the `00N.lta` exist) and must
> already be registered to the base (`<tp>_to_<base>.lta`). If `001.mgz` is missing
> the script errors and points to the conversion tutorial
> ([`scripts/long_create_orig:121-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L121-L127)).
> If LTAs are absent (e.g. data processed with FreeSurfer 5.0 or FSL), they are
> re-estimated from the runs ([`:181-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L181-L233)).

## Outputs

### Files Created

Written under `$SUBJECTS_DIR/<base>/longtp/<tp>/`
([`scripts/long_create_orig:87-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L87-L95)):

| File | Format | Contents |
|------|--------|----------|
| `aseg_cross.mgz` | [[mgz]] (int) | cross `aseg.mgz` resampled to base space (nearest neighbour) |
| `rawavg.mgz` | [[mgz]] (float) | base-space motion-corrected average of the raw runs |
| `orig.mgz` | [[mgz]] (uchar) | `rawavg.mgz` cast to 8-bit; the conformed base-space orig, with `talairach.xfm` stamped into its header |
| `00N.lta`, `00N-long.lta`, `00N-iscale.txt` | LTA / text | copied or re-estimated per-run transforms and the run→base composed transforms |

### Output Specifications

`orig.mgz` and `rawavg.mgz` are conformed-geometry volumes (256³, 1 mm) in the
**base/template** voxel space; the only difference from the cross orig is the
coordinate frame and the single-resampling provenance. See [[orig.mgz]] and
[[rawavg.mgz]] for the canonical per-file descriptions and [[hemi.orig|hemi.orig]]
for downstream surface use.

## Mathematical Foundations

The novel arithmetic is **transform composition** to limit interpolation.

> [!math] Composed run→base transform
> For run $i$ with cross-sectional motion-correction transform $M_i$ (run $i$ →
> run 1 / cross average) and the time-point→base registration $R$
> (`<tp>_to_<base>.lta`), the script forms $C_i = R \circ M_i$ via
> `mri_concatenate_lta $M_i $R` ([`scripts/long_create_orig:246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L246))
> and passes all $C_i$ to [[mri_robust_template]] `--ixforms` so every raw run is
> resampled into base space exactly once, then averaged. The single-input case
> skips the average and resamples `001.mgz` directly with
> [[wiki/tools/mri_convert|mri_convert]] `-at $R`.

> [!internal] Robust averaging and intensity scaling
> The actual robust (Tukey-biweight) averaging, the LTA estimation when transforms
> are missing (`--satit --noit --iscale`), and the intensity rescaling
> (`--iscalein`) are performed by [[mri_robust_template]]; see its page for the
> registration math. Resampling kernels here are **cubic** for intensity volumes
> and **nearest** for the segmentation.

## Configuration Options

### Complete Flag Reference

`long_create_orig` takes **no option flags** — only the two positional arguments.
Resampling behaviour (interpolation kernel, output datatype) is fixed in the code:

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<base-id>` *(positional 1)* | string | *(required)* | Subject ID of the existing base/template. |
| `<tp-id>` *(positional 2)* | string | *(all TPs in `base-tps`)* | Process only this one time point; if omitted, loop over every time point listed in the base's `base-tps`. |

Fixed internal choices worth knowing:

| Behaviour | Value | Set at |
|-----------|-------|--------|
| `aseg_cross.mgz` resampling | nearest neighbour (`-rt nearest`) | [`:112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L112) |
| `orig.mgz`/`rawavg.mgz` resampling | cubic (`-rt cubic`) | [`:134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L134), [`:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L142) |
| `orig.mgz` datatype | `uchar` (`-odt uchar`) | [`:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L133), [`:269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L269) |
| LTA re-estimation | `--satit --inittp 1 --fixtp --noit --iscale --subsample 200` | [`:200-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L200-L211) |

### Configuration Interactions

There are no mutually-exclusive flags (no flags exist). The only branch point is
the **number of raw runs** and **whether per-run LTAs are present**:

> [!gotcha] Three code paths depending on inputs
> 1. **Single run** (`001.mgz` only): resample directly to base space and skip the
>    robust-template average ([`:131-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L131-L149)).
> 2. **Multiple runs with existing `00N.lta`**: copy the LTAs (and iscales if
>    present) into the output dir ([`:153-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L153-L180)).
>    The counts of `00N.mgz` and `00N.lta` (and of iscales, if any) must match or
>    the script errors.
> 3. **Multiple runs without LTAs**: re-run [[mri_robust_template]] to regenerate
>    the LTAs/iscales in the output dir ([`:181-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L181-L233)),
>    discarding the temporary `rawavg_temp.mgz` (it would be in 001-space, not base
>    space).

## Typical Use Cases

### 1. Build orig/rawavg/aseg_cross for every time point of a base

```bash
export SUBJECTS_DIR=/data/long_study
long_create_orig OAS2_0001
# -> longtp/<tp>/{aseg_cross,rawavg,orig}.mgz for all tps in base-tps
```

### 2. (Re)build just one time point

```bash
long_create_orig OAS2_0001 OAS2_0001_MR2
# -> longtp/OAS2_0001_MR2/{aseg_cross,rawavg,orig}.mgz
```

## Pipeline Context

A standalone longitudinal **template-space resampling** helper. It expects the
cross runs to be finished and the time-point→base registration
(`<tp>_to_<base>.lta`) to exist, and produces the base-space `orig`/`rawavg` plus
the mapped `aseg_cross`. In a stock 8.2.0 pipeline this work is done in-line by
`longmc` (called from `rca-long-tp-init`).

**Predecessor:** cross-sectional `recon-all` per time point + base registration →
**long_create_orig** (≈ `longmc`) → **Successor:** [[long_create_base_sigma]] /
the longitudinal `-long` stream, which consume `aseg_cross.mgz` and the base-space
volumes.

## Gotchas and Caveats

> [!gotcha] FOV>256 guard references an undefined `$LF` and cannot run as written
> The "is the field of view > 256?" check pipes its error messages through
> `|& tee -a $LF` ([`scripts/long_create_orig:292-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L292-L296)),
> but **`LF` is never `set` anywhere in this script**. Under `tcsh -f`, referencing
> an undefined variable is a fatal error, so if a time point ever has FOV>256 the
> branch dies on "LF: Undefined variable" rather than printing the intended
> `-cw256` advice. This is a copy-paste artefact: the sibling `longmc` *does*
> initialise it (`set LF = ()` at
> [`scripts/longmc:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L22),
> defaulted at [`:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L61));
> `long_create_orig` omitted that line. In practice the comment notes the check is
> "probably not necessary in long" because cross would already have failed.

> [!gotcha] `talairach.xfm` is stamped before it exists
> The final step adds `mri/transforms/talairach.xfm` from the
> *`<tp>.long.<base>`* directory into the `orig.mgz` header
> ([`scripts/long_create_orig:301-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L301-L311))
> even though that file does not exist yet. As the comment explains, this is a
> deliberate compromise (using [[mri_add_xform_to_header]] `-c`, which only edits
> the header field) to avoid changing the orig's timestamp later when the talairach
> *is* computed. If that long directory/transforms path is absent the command can
> fail.

> [!gotcha] Run/LTA/iscale counts must agree
> When per-run LTAs are copied, the number of `00N.mgz`, `00N.lta`, and (if any)
> `00N-iscale.txt` files must match exactly, or the script aborts
> ([`:156-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L156-L159),
> [`:170-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L170-L173)).
> A partially-processed cross run (some LTAs missing) is not silently tolerated.

## Error Compensation and Guard Rails

- **Missing-LTA recovery.** If the cross run never produced per-run LTAs (old
  FreeSurfer or FSL), the script regenerates them with [[mri_robust_template]]
  rather than failing ([`:181-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L181-L233)).
- **Single-input fast path.** With only `001.mgz`, the average step is skipped and
  the run is resampled directly, avoiding an unnecessary robust-template call.
- **Discard of mis-spaced temporary.** The re-estimation path writes
  `rawavg_temp.mgz` only to harvest LTAs and then deletes it, because it is in
  001-space rather than base space — a guard against later confusion
  ([`:219-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig#L219-L226)).
- **Fail-fast.** Every external command's exit status is checked
  (`if($status) exit 1`).

## Known Bugs

- [[00155]] — the FOV>256 guard pipes its advice through `|& tee -a $LF`, but `$LF` is never `set`; under `tcsh -f` the branch dies on "LF: Undefined variable" instead of printing the `-cw256` guidance.

## Related Tools

- [[wiki/concepts/longitudinal-processing|longitudinal-processing]] — the stream this helper serves.
- [[mri_robust_template]] — performs the robust motion-correction average and the LTA re-estimation.
- [[mri_concatenate_lta]] — composes run→base transforms so resampling happens once.
- [[wiki/tools/mri_convert|mri_convert]] — maps/conforms/casts the volumes.
- [[mri_add_xform_to_header]] — stamps `talairach.xfm` into the `orig.mgz` header.
- [[long_create_base_sigma]] — consumes the `aseg_cross.mgz` and base-space volumes this script writes.
- `longmc` *(no wiki page yet)* — the in-recon-all replacement that performs the same step in 8.2.0.

## Confidence and Gaps

**High confidence:** the three input-dependent code paths, fixed interpolation/
datatype choices, the transform-composition strategy, the exact
`mri_robust_template`/`mri_concatenate_lta`/`mri_convert` invocations, output
filenames, and the run/LTA/iscale count checks — all read directly from
[`scripts/long_create_orig`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig).

> [!gap] FOV guard is dead code
> The FOV>256 branch cannot execute as written (undefined `$LF`); no caller in
> v8.2.0 sets `LF` before invoking this script (recon-all calls `longmc` instead).
> The branch's intent is clear but its behaviour on a genuinely oversized FOV is
> a crash, not the advertised message.

## References

- FreeSurfer source: [`scripts/long_create_orig`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_orig) (v8.2.0); compare [`scripts/longmc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010 — the robust registration used for motion correction.
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012.
- FreeSurfer wiki: [LongitudinalProcessing](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing).
