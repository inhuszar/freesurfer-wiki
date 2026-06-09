---
title: "long_create_base_sigma"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/long_create_base_sigma"
families: []                     # longitudinal stream helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/concepts/longitudinal-processing|longitudinal-processing]]"
  - "[[mri_long_normalize]]"
  - "[[mri_cal_renormalize_gca]]"
  - "[[mri_fuse_intensity_images]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The binary mri_cal_normalize, which this script calls in step 1, is not present in the v8.2.0 install (only mri_cal_renormalize_gca is). The modern -base stream uses mri_long_normalize instead. The exact provenance of the longtp/<tp>/norm.mgz and longtp/<tp>/aseg_cross.mgz inputs (script vs. recon-all base stage) was not traced end-to-end."
tags:
  - longitudinal
  - normalization
  - atlas
  - base
---

# long_create_base_sigma

## Summary

`long_create_base_sigma` is a tcsh helper for the FreeSurfer **longitudinal base
(within-subject template) stream**. It performs a *joint* (cross-time) intensity
normalization of all of a subject's time points at one chosen Gaussian smoothing
level `sigma`, and then builds a **subject-specific GCA atlas** by renormalizing
the global FreeSurfer atlas to that subject's data. The result is one
`norm.long.s<sigma>.mgz` per time point plus one `base.s<sigma>.gca`, all stored
under the base subject's `longtp/` directory. The same processing is conceptually
part of building a base, but the script lets you *add* a new sigma level to an
already-built base after the fact.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/long_create_base_sigma`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma)
- **Original author:** Martin Reuter
- **Binary/script location:** `$FREESURFER_HOME/bin/long_create_base_sigma`
- **FreeSurfer tools invoked:** `mri_cal_normalize` (joint normalization — see the [!contradiction] below), [[mri_cal_renormalize_gca]] (subject-specific atlas).

## Purpose and Context

The longitudinal stream estimates a per-subject template ("base") and processes
each time point relative to it to reduce processing bias (Reuter et al., 2012).
A robust template benefits from an intensity normalization that is *consistent
across time points*: rather than normalizing each scan independently, the same
control points are shared across the subject's scans so that intensity scaling
does not vary spuriously from one session to the next. `long_create_base_sigma`
performs exactly that joint normalization at a single smoothing scale `sigma`,
and then derives a subject-tuned atlas so that later atlas-based steps see less
between-subject variability (the "renormalization" idea of Han et al., 2006).

The `sigma` parameter is the cross-time smoothing width fed to
`mri_cal_normalize -cross_time_sigma`; it is the bandwidth of the temporal Parzen
window used when averaging control-point intensities across scans (typical values
2–6). Because the optimal sigma is not known a priori, the base may be processed
at several sigmas; this script's *raison d'être* is to add another sigma to an
existing base without rebuilding it from scratch.

> [!contradiction] Step 1 calls `mri_cal_normalize`, which is absent from the v8.2.0 install
> The script's first processing step invokes **`mri_cal_normalize -cross_time_sigma`**
> ([`scripts/long_create_base_sigma:245-256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L245-L256)),
> but `mri_cal_normalize` is **not shipped** in `$FREESURFER_HOME/bin` for 8.2.0
> (only `mri_cal_renormalize_gca` is). The current `recon-all` base stream performs
> the joint longitudinal normalization with the newer C++ binary
> [[mri_long_normalize]] instead, and the old `mri_cal_normalize` source survives
> only under `attic/`. Treat this script as a **legacy / standalone** helper:
> step 2 ([[mri_cal_renormalize_gca]]) still works, but step 1 will fail with
> "command not found" unless `mri_cal_normalize` is built and on `PATH`. Code is
> authoritative for *what the script does*; the install reflects *what actually
> runs* in recon-all.

## Inputs

### Required Inputs

Positional, in order ([`scripts/long_create_base_sigma:80-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L80-L84)):

1. **`<base-id>`** — the subject ID of an existing **base** (within-subject
   template) under `$SUBJECTS_DIR`. It must contain a `base-tps` file (the list
   of time-point IDs created by the `-base` run); a directory lacking `base-tps`
   is rejected as "an existing regular (cross sectional) run"
   ([`scripts/long_create_base_sigma:139-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L139-L149)).
2. **`<sigma>`** — an integer smoothing level (the cross-time Parzen bandwidth),
   usually 2–6.

The base must already contain, and each listed time point must already provide,
the following files (all checked before processing):

| File | Location | Checked at |
|------|----------|-----------|
| `base-tps` | `$SUBJECTS_DIR/<base>/` | [`:139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L139) |
| `mri/brainmask.mgz` | base | [`:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L155) |
| `mri/transforms/talairach.xfm` | base | [`:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L164) |
| `mri/transforms/talairach.m3z` | base (used, see gotcha) | [`:252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L252) |
| `longtp/<tp>/nu.mgz` | base, per time point | [`:175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L175) |
| `longtp/<tp>/aseg_cross.mgz` | base, per time point | [`:186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L186) |
| the global GCA atlas | `$FREESURFER_HOME/average/<gca>` | default at [`:84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L84) |

The `nu.mgz` and `aseg_cross.mgz` files are the **aligned** (base-space) bias-field-
corrected images and the cross-sectional segmentations mapped into base space; in
the longitudinal stream these are produced earlier (the cross runs must be
finished and the base run carried at least to `-careg`, per the script header).
See [[long_create_orig]], which creates the analogous `aseg_cross.mgz` in the
standalone path.

### Input Assumptions

> [!assumption] Base processed to at least `-careg`, single scanner
> The script assumes the base exists and was carried far enough that
> `talairach.xfm`/`talairach.m3z` and the per-time-point aligned `nu.mgz`/
> `aseg_cross.mgz` are present (i.e. the cross runs finished and the base reached
> `-careg`). The atlas renormalization in step 2 further assumes **all time points
> come from the same scanner/protocol** — true for a well-designed longitudinal
> study. The header explicitly notes that per-scanner renormalization is *not*
> implemented ([`scripts/long_create_base_sigma:259-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L259-L264)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `norm.long.s<sigma>.mgz` | `$SUBJECTS_DIR/<base>/longtp/<tp>/` (one per time point) | jointly cross-time-normalized intensity volume at this sigma |
| `base.s<sigma>.gca` | `$SUBJECTS_DIR/<base>/longtp/` | subject-specific renormalized GCA atlas at this sigma |
| `base-sigmas` (appended) | `$SUBJECTS_DIR/<base>/` | running list of sigma levels present in the base |

### Output Specifications

- The `norm.long.s<sigma>.mgz` volumes are conformed-space MGZ intensity volumes
  (uchar, 256³, 1 mm) in the base/template geometry, registered across time. See
  [[mgz]] and [[norm.mgz]] for the canonical normalized-volume description.
- `base.s<sigma>.gca` is a Gaussian Classifier Array (atlas) in the same `.gca`
  format as the global FreeSurfer atlas, but with intensity statistics re-fit to
  this subject. See [[mri_cal_renormalize_gca]].

## Mathematical Foundations

The script is a thin orchestrator; the numerical work lives in the two binaries it
calls.

> [!internal] Cross-time normalization math is in `mri_cal_normalize`
> The joint normalization (steps a–g listed in the script comments,
> [`scripts/long_create_base_sigma:233-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L233-L243))
> performs: (a) per-image histogram scaling; (b) atlas sample lookup;
> (c) per-region/per-structure control-point selection; (d) discarding unlikely
> control points; (e) discarding control points whose labels disagree with the
> mapped `aseg`; (f) joint normalization of all channels of a region from a *common*
> control-point set; (g) a cross-time weighted average using a **Parzen window** of
> width `sigma`. In the shipped 8.2.0 the equivalent computation is performed by
> [[mri_long_normalize]].

> [!math] Cross-time Parzen smoothing
> Control-point intensities are combined across the subject's $T$ time points by a
> Gaussian-weighted average; for time point $t$ the weight assigned to time point
> $t'$ is $w_{t,t'} \propto \exp\!\big(-(t-t')^2 / 2\sigma^2\big)$, so larger
> `sigma` shares information across more sessions (more temporal smoothing of the
> intensity model). The `sigma` argument is this $\sigma$, passed as
> `-cross_time_sigma`.

> [!internal] Atlas renormalization is in `mri_cal_renormalize_gca`
> Step 2 performs **one** histogram fit and keeps it fixed (the Han et al. 2006
> renormalization), producing a subject-tuned atlas to reduce variability. See
> [[mri_cal_renormalize_gca]].

## Configuration Options

### Complete Flag Reference

The two leading arguments are positional (`<base-id>`, `<sigma>`); the remaining
flags are parsed in the `while` loop at
[`scripts/long_create_base_sigma:86-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L86-L108).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<base-id>` *(positional 1)* | string | *(required)* | Subject ID of the existing base/template under `$SUBJECTS_DIR`. |
| `<sigma>` *(positional 2)* | int | *(required)* | Cross-time smoothing level (Parzen bandwidth, usually 2–6). |
| `-sd` | string | `$SUBJECTS_DIR` | Override the subjects directory (sets `SUBJECTS_DIR`). |
| `-force` | bool | off | Re-create this sigma even if it already appears in `base-sigmas` (otherwise the script errors to protect existing data). |
| `-gca` | string | `$FREESURFER_HOME/average/RB_all_2014-08-21.gca` | Path to the global GCA atlas to renormalize from. |

> [!gotcha] The help text advertises a `-gca` flag, but the default atlas is hard-set twice
> The usage block lists `-gca` ([`scripts/long_create_base_sigma:41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L41)),
> and `-gca` does work. Note, however, that the default GCA is assigned **twice**
> ([`scripts/long_create_base_sigma:77-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L77-L78)):
> the first assignment to `RB_all_2015-08-04.gca` is immediately overwritten by
> `RB_all_2014-08-21.gca`, so the effective default is the **2014** atlas. The
> `2015` line is dead.

### Configuration Interactions

> [!gotcha] `-force` only controls the `base-sigmas` guard, not overwriting
> Without `-force`, if `<sigma>` is already listed in `base-sigmas` the script
> aborts before doing any work
> ([`scripts/long_create_base_sigma:208-216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L208-L216)).
> With `-force` it proceeds **and does not re-append** the sigma to `base-sigmas`
> (the append is skipped when `recreate` is set,
> [`scripts/long_create_base_sigma:287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L287)),
> so the list stays consistent. The alternative documented in the error message is
> to delete the matching line from `base-sigmas` by hand and re-run without
> `-force`.

- `-sd` must be given *before* the script needs `SUBJECTS_DIR`; it is parsed in the
  argument loop and also honoured if already set in the environment.
- The two processing steps are sequential and not independently selectable: there
  is no flag to run only the normalization or only the renormalization.

## Typical Use Cases

### 1. Add a sigma level to an existing base

```bash
# Base 'OAS2_0001' already built; add smoothing level sigma=4.
export SUBJECTS_DIR=/data/long_study
long_create_base_sigma OAS2_0001 4
# -> longtp/<tp>/norm.long.s4.mgz for each tp, longtp/base.s4.gca
```

### 2. Force re-creation of an existing sigma with a specific atlas

```bash
long_create_base_sigma OAS2_0001 4 -force \
  -gca $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  -sd /data/long_study
```

## Pipeline Context

The script header states it "is also called from within recon-all base stream,"
but in **v8.2.0 `recon-all` does not call `long_create_base_sigma`** (no reference
exists in [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)),
and the binary it relies on (`mri_cal_normalize`) is not installed. The equivalent
joint normalization in the modern base stream is performed with
[[mri_long_normalize]] / [[mri_fuse_intensity_images]]. Treat this as a
**standalone** helper for experimenting with additional sigma levels on a base
built by an older FreeSurfer, or in a build where `mri_cal_normalize` is present.

**Predecessor:** `-base` run carried to `-careg` (provides `talairach.*`, aligned
`nu.mgz`, `aseg_cross.mgz`) → **long_create_base_sigma** → **Successor:** the
subject-specific `base.s<sigma>.gca` and `norm.long.s<sigma>.mgz` are consumed by
the longitudinal time-point processing (`recon-all -long`).

## Gotchas and Caveats

> [!gotcha] `talairach.m3z` is required but only `talairach.xfm` is checked
> The pre-flight check verifies `mri/transforms/talairach.xfm`
> ([`scripts/long_create_base_sigma:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L164)),
> but **both** processing steps pass `mri/transforms/talairach.m3z`
> ([`:252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L252),
> [`:276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L276)).
> If the `.m3z` (the nonlinear GCA registration) is missing while the `.xfm` is
> present, the check passes but the command itself fails. The header's note that
> "the base needs to be run at least till `-careg`" is precisely the stage that
> produces the `.m3z`.

> [!gotcha] Typos in error messages do not affect behaviour
> Several error strings contain spelling slips ("bsae"/"bast-tps"/"withan",
> e.g. [`:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L138),
> [`:157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L157),
> [`:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L180)).
> The check logic is correct; the messages are cosmetic.

> [!gotcha] Usage-block quoting glitch
> The optional-parameters line in the usage block opens a single-quoted `echo`
> that is never closed on the same line
> ([`scripts/long_create_base_sigma:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L39)).
> This only affects the formatting of the printed help, not the parsing of real
> arguments.

## Error Compensation and Guard Rails

- **Existence pre-flight.** Before any processing the script verifies the base
  directory, `base-tps`, `brainmask.mgz`, `talairach.xfm`, and per-time-point
  `nu.mgz`/`aseg_cross.mgz`, exiting with a specific message for each missing
  artefact ([`:133-196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L133-L196)).
- **Cross-sectional guard.** A directory lacking `base-tps` is explicitly rejected
  as a non-base (cross-sectional) run rather than silently mis-processed
  ([`:139-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma#L139-L149)).
- **Idempotence guard.** An already-present sigma aborts the run unless `-force`
  is given; `base-sigmas` is appended only on a genuinely new sigma.
- **Fail-fast.** After each binary the exit status is checked and propagated
  (`if ($status) exit $status`).

## Related Tools

- [[wiki/concepts/longitudinal-processing|longitudinal-processing]] — the within-subject template stream this script belongs to.
- [[mri_long_normalize]] — the modern C++ joint longitudinal normalizer that replaces `mri_cal_normalize` in recon-all.
- [[mri_cal_renormalize_gca]] — step 2; builds the subject-specific atlas.
- [[mri_fuse_intensity_images]] — fuses per-time-point intensities in the current base stream.
- [[long_create_orig]] — sibling standalone helper that produces the aligned `aseg_cross.mgz`/`orig.mgz` inputs in the longtp tree.
- `mri_cal_normalize` *(no wiki page; not installed in 8.2.0)* — the binary step 1 depends on.

## Confidence and Gaps

**High confidence:** complete flag set and defaults, positional arguments,
pre-flight checks, the `base-sigmas` guard / `-force` interaction, the
double-assigned default GCA, the exact `mri_cal_normalize`/`mri_cal_renormalize_gca`
command lines, and the output filenames — all read directly from
[`scripts/long_create_base_sigma`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma).

> [!gap] Step-1 binary not installed; not exercised
> `mri_cal_normalize` is absent from the 8.2.0 install, so the full two-step run
> could not be executed end-to-end. The mapping between this legacy script and the
> modern [[mri_long_normalize]]-based base stream is inferred from the recon-all
> source and the `attic/` location of the old binary.

## References

- FreeSurfer source: [`scripts/long_create_base_sigma`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_create_base_sigma) (v8.2.0).
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. [doi:10.1016/j.neuroimage.2012.02.084](https://dx.doi.org/10.1016/j.neuroimage.2012.02.084)
- Han X, Fischl B. *Atlas renormalization for improved brain MR image segmentation across scanner platforms.* IEEE TMI 26(4):479-486, 2007 — the fixed-histogram renormalization used in step 2.
- FreeSurfer wiki: [LongitudinalProcessing](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing).
