---
title: "seg2recon"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/seg2recon"
families: []                     # standalone subject-seeding script
recon_all_stage: autorecon2      # produces the aseg consumed by -autorecon2-samseg/-synthseg
related:
  - "[[samseg2recon]]"
  - "[[seg2cc]]"
  - "[[seg2filled]]"
  - "[[mergeseg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_fit_bias]]"
  - "[[mri_seghead]]"
  - "[[talairach_avi]]"
  - "[[lta_convert]]"
  - "[[mri_cc]]"
  - "[[mri_mask]]"
  - "[[mri_binarize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether the recon-all in-tree call to seg2recon is ever active: it is guarded by `if(0 && ...)` so is currently dead code."
  - "No talairach.m3z is produced; downstream steps that expect a nonlinear talairach (e.g. some GCA-based steps) may not be satisfied by the linear talairach.xfm alone."
tags:
  - segmentation
  - subject-creation
  - bias-field
  - recon-all-helper
  - synthseg
  - fastsurfer
---

# seg2recon

## Summary

`seg2recon` builds and populates a FreeSurfer subject directory from a raw input
image **and** an externally produced `aseg`-style segmentation (e.g. from
SynthSeg, FastSurfer, PSACNN, [[wiki/tools/samseg|samseg]], or an existing
`aseg`), so that [[wiki/pipelines/recon-all|recon-all]]'s surface stream can run
on it without re-doing the volume segmentation. Its distinguishing feature
versus [[samseg2recon]] is that it **fits and removes the bias field itself**
(via [[mri_fit_bias]]) — needed because most learning-based segmenters do not
bias-correct. It produces the standard `orig`/`nu`/`norm`/`brainmask`/`T1`
volumes, a `talairach.xfm` (via [[talairach_avi]]), and `aseg.auto.mgz` with the
corpus callosum added (via [[mri_cc]] + [[mergeseg]]).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/seg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon)
- **Binary/script location:** `$FREESURFER_HOME/bin/seg2recon`
- **Key helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L97) (copy/cast inputs), [`mri_seghead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L135) (head mask), [`mri_fit_bias`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L157) (bias field), [`talairach_avi`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L182) + [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L190) (Talairach registration), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L208) (brain mask), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L224) (norm), [`mri_cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L260), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L256), [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L274), and [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L301) (CC splice). Also uses the FreeSurfer shell utilities `getfullpath`, `UpdateNeeded`, `fs_time`, `fsr-getxopts`, `fsr-checkxopts`, and optionally calls [[wiki/pipelines/recon-all|recon-all]] under `--rca`.

## Purpose and Context

Machine-learning anatomical segmenters (SynthSeg, FastSurfer, PSACNN) and
generative ones ([[wiki/tools/samseg|samseg]]) produce a high-quality `aseg`, but
recon-all's surface placement needs more than the labels: it needs an intensity-
normalized, bias-corrected volume (`nu.mgz`/`norm.mgz`), a brain mask, a
Talairach transform, and a CC-bearing `aseg.auto.mgz`. `seg2recon` manufactures
all of those from the input image + the supplied segmentation, then leaves the
subject in a state where `recon-all -autorecon2-samseg -autorecon3` finishes the
surfaces ([`scripts/seg2recon:589-590`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L589-L590)).

Its header summarizes the relationship to its sibling: it "is similar to
[[samseg2recon]] but provides for bias field correction (which is already done by
samseg)" ([`scripts/seg2recon:1-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L1-L7)). The aseg it produces is the
deliverable that `-autorecon2-samseg`/`-autorecon2-synthseg` would otherwise
build, so functionally it occupies the `autorecon2` segmentation slot even though
recon-all invokes it during input conversion.

> [!contradiction] recon-all's in-tree seg2recon call is disabled
> [[wiki/pipelines/recon-all|recon-all]] contains a `seg2recon` invocation, but it
> is guarded by `if(0 && ! $CblumFromSynthSeg && ! $SynthSegForSurf)`
> ([`scripts/recon-all:1650-1666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1650-L1666)) — the leading `0` makes
> the whole branch **dead code** in v8.2.0. As shipped, recon-all does **not**
> run `seg2recon`; it is intended for stand-alone use (or as a template for the
> SynthSeg path). Contrast with [[samseg2recon]], whose recon-all call is live.

## Inputs

### Required Inputs

- **Subject** (`--s`) — name of the subject directory to create/populate.
- **Segmentation** (`--seg`) — an `aseg`-style label volume (from synthseg,
  fastsurfer, psacnn, samseg, or an `aseg`). Must exist.
- **Input image** (`--i`) — the volume you would otherwise pass to
  `recon-all -i` (e.g. the raw/native T1). Must exist.

`check_params` enforces all three and verifies the files exist
([`scripts/seg2recon:503-531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L503-L531)).

### Input Assumptions

> [!assumption] Isotropic (conformable) input; standard aseg labels
> The header warns: "If input volume is not isotropic, then there will be
> downstream failures" ([`scripts/seg2recon:91-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L91-L94)). The input is
> copied to `orig.mgz` **without** conforming, so for robust downstream behaviour
> it should already be 1 mm isotropic (or you must resolve the failures
> yourself). The segmentation must use FreeSurfer label numbering; extracerebral
> labels are tolerated only if they appear in the built-in `xcersegs` list
> (samseg/CHARM extracerebral IDs, [`scripts/seg2recon:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L32)).

If `--ctab` is not given and the segmentation has no embedded color table, the
script falls back to `FreeSurferColorLUT.txt`
([`scripts/seg2recon:515-525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L515-L525)).

## Outputs

### Files Created (under `$SUBJECTS_DIR/$subject/mri/`)

| File / pattern | Contents |
|----------------|----------|
| `orig.mgz` | copy of the input image (no conforming) |
| `rawavg.mgz` → `orig.mgz` | symlink, needed by `pctsurfcon` |
| `aseg.auto_noCCseg.mgz` | the input segmentation cast to `int` (extracerebral IDs > 255) |
| `head.mgz` | head mask from [[mri_seghead]] (unless `--h` supplied) |
| `biasfield.mgz` | estimated bias field (only if bias correction on) |
| `nu.mgz` | bias-corrected input (or a symlink to `orig.mgz` if `--no-bfc`) |
| `transforms/talairach.xfm` | linear Talairach from [[talairach_avi]] |
| `transforms/talairach.xfm.lta`, `transforms/talairach.lta` → it | LTA form (via [[lta_convert]]) and symlink |
| `seg.bin.dil<N>.mgz` | brain mask (binarize-everything-outside, invert, dilate) unless `--m` supplied |
| `norm.mgz` | `nu.mgz` masked by the brain mask |
| `T1.mgz` → `nu.mgz`, `brainmask.mgz` → `norm.mgz` | symlinks |
| `aseg.auto.mgz` | `aseg.auto_noCCseg.mgz` with CC labels 251–255 added |
| `scripts/seg2recon.log` | run log |

### Output Specifications

`orig.mgz` keeps the input geometry. The segmentation is written as **int**
(`-odt int --no_scale 1`, [`scripts/seg2recon:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L119)) precisely because
extracerebral seg IDs exceed the uchar range. `talairach.xfm` is a **linear**
MNI305 registration; **no `talairach.m3z` (nonlinear) is created**
([`scripts/seg2recon:587`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L587)). `nu.mgz`/`norm.mgz` are the
bias-corrected intensity volumes the surface stream consumes.

## Mathematical Foundations

`seg2recon` chains four quantitative operations; each is delegated to a dedicated
tool, with `seg2recon` choosing the inputs.

> [!math] Log-domain bias field via DCT-GLM
> The central numerical step is [[mri_fit_bias]]
> ([`scripts/seg2recon:157-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L157-L158)): it takes the log of the input,
> fits a general linear model with discrete-cosine-transform basis functions as
> regressors (constrained to the supplied head mask and guided by the seg), and
> divides out the fitted low-frequency field to yield `nu.mgz`. The
> `--thresh` argument ($1.2$ by default) sets the intensity threshold for the
> fit. This is the function samseg performs internally, hence
> [[samseg2recon]] omits it.

> [!math] Brain mask by inverted exclusion
> Rather than thresholding the seg directly, the brain mask is built by
> binarizing everything that is background **or** extracerebral, inverting, and
> dilating ([`mri_binarize --i seg --match 0 $xcersegs --inv --dilate $ndilate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L208)).
> This keeps cerebral structures even when the segmentation includes
> extracerebral labels (samseg/CHARM), provided those labels are in `xcersegs`.

The Talairach math (linear affine to MNI305) lives in [[talairach_avi]]; the CC
math lives in [[mri_cc]] (same conform/un-conform detour as [[seg2cc]], see
[Pipeline Context](#pipeline-context)).

> [!internal] Bias-field and Talairach numerics are external
> The GLM/DCT bias fit is [[mri_fit_bias]]; the affine registration is
> [[talairach_avi]]; the LTA conversion is [[lta_convert]]. `seg2recon`
> orchestrates them but contains no numerics of its own beyond mask construction.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/seg2recon:357-495`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L357-L495)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name to create/populate. |
| `--seg` | string | *(required)* | `aseg`-style segmentation (synthseg/fastsurfer/psacnn/samseg/aseg). |
| `--i` | string | *(required)* | Input image (the volume you would pass to `recon-all -i`). |
| `--ctab` | string | embedded, else `FreeSurferColorLUT.txt` | Color table to embed in the aseg. |
| `--ndilate` | int | `2` | Dilation radius when building the brain mask from the seg. |
| `--threads` | int | — | Thread count passed to [[mri_fit_bias]]. |
| `--m` | string | computed | Use this volume as the brain mask instead of deriving one from the seg. Must exist. |
| `--h` | string | computed | Use this volume as the head mask instead of running [[mri_seghead]]. Must exist. |
| `--thresh` | float | `1.2` | Intensity threshold for the [[mri_fit_bias]] estimation. |
| `--no-bias-field-cor`<br>`--no-bfc` | bool | bias-cor **on** | Skip bias-field estimation; `nu.mgz` becomes a symlink to `orig.mgz`. |
| `--bias-field-cor`<br>`--bfc` | bool | **on** | Enable bias-field correction (the default). |
| `--cc` | bool | **on** | Segment the corpus callosum into `aseg.auto.mgz`. |
| `--no-cc` | bool | — | Skip CC segmentation; `aseg.auto.mgz` is a plain copy of `aseg.auto_noCCseg.mgz`. |
| `--rca` | bool | off | After populating the subject, run `recon-all -autorecon2-samseg -autorecon3` (testing convenience). |
| `--no-rca` | bool | **on** (off) | Do not run recon-all afterwards. |
| `--expert` | string (repeatable) | — | Expert options file(s); validated by `fsr-checkxopts`, applied to [[mri_seghead]], [[mri_fit_bias]], and [[talairach_avi]] via `fsr-getxopts`. |
| `--force-update`<br>`--no-force-update` | bool | off | Regenerate outputs regardless of `UpdateNeeded`. |
| `--log` | string | `scripts/seg2recon.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging. |
| `--tmp`<br>`--tmpdir` | string | auto (`/scratch` or `mri/tmp`) | Scratch directory; also implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory at the end. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--no-bfc` makes `nu.mgz` a symlink to `orig.mgz`
> With bias correction disabled, the script skips [[mri_fit_bias]] entirely and
> links `nu.mgz → orig.mgz` ([`scripts/seg2recon:165-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L165-L170)). Since
> `norm.mgz` is `nu.mgz` masked, and `T1.mgz → nu.mgz`, your normalized volumes
> are then **un-corrected** copies of the input. Only use `--no-bfc` if the input
> is already bias-corrected (the whole point of the script is usually the
> opposite).

> [!gotcha] `--m` and `--h` bypass the computed masks
> Supplying `--m` skips the inverted-exclusion brain mask
> ([`scripts/seg2recon:200-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L200-L217)); supplying `--h` skips
> [[mri_seghead]] ([`scripts/seg2recon:130-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L130-L144)). recon-all's
> (disabled) call passes the SynthStrip mask via `--m`.

> [!gotcha] `--no-cc` yields an `aseg.auto.mgz` that is just a copy
> With `--no-cc`, `aseg.auto.mgz` is `cp`'d from `aseg.auto_noCCseg.mgz`
> ([`scripts/seg2recon:309-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L309-L318)) — i.e. no corpus callosum. Some
> downstream stats expect CC labels; leave CC on unless you have a reason.

- `--ndilate` only affects the **computed** brain mask; it is ignored if `--m` is
  given.
- `--thresh` and `--threads` only matter while bias correction is active.
- `--rca` is a convenience for end-to-end testing; in production you typically run
  recon-all yourself afterwards.

## Typical Use Cases

### Use Case 1: Seed a subject from a SynthSeg/FastSurfer aseg

```bash
# input.mgz is the native T1; aseg.mgz is the ML segmentation.
seg2recon --s subj01 --seg aseg.mgz --i input.mgz --threads 8
# then finish the surfaces:
recon-all -s subj01 -autorecon2-samseg -autorecon3 -threads 8
```

### Use Case 2: One-shot with recon-all (testing)

```bash
seg2recon --s subj01 --seg synthseg.mgz --i T1.mgz --rca --threads 8
```

### Use Case 3: Use an existing brain mask, skip bias correction

```bash
# Input already bias-corrected; supply your own brain mask.
seg2recon --s subj01 --seg aseg.mgz --i nu_already.mgz \
  --m brainmask.mgz --no-bfc
```

## Pipeline Context

`seg2recon` is a **subject-seeding helper** that stands in for recon-all's
volume-segmentation output. Although [[wiki/pipelines/recon-all|recon-all]]
contains a `seg2recon` call, it is **disabled** (`if(0 && ...)`,
[`scripts/recon-all:1650`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1650)); in practice you run `seg2recon`
yourself, then `recon-all -autorecon2-samseg -autorecon3`. The CC step inside
`seg2recon` mirrors [[seg2cc]] (same conform/un-conform/[[mergeseg]] sequence,
[`scripts/seg2recon:249-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L249-L318)).

**Predecessor:** an input T1 + an `aseg` from SynthSeg/FastSurfer/PSACNN/[[wiki/tools/samseg|samseg]]
→ **seg2recon** → **Successor:** `recon-all -autorecon2-samseg -autorecon3`
(surface placement, parcellation, stats). Compare [[samseg2recon]] (no bias fit;
imports samseg's own bias-corrected volumes and Talairach).

## Gotchas and Caveats

> [!gotcha] No nonlinear Talairach (`talairach.m3z`)
> Only the linear `talairach.xfm`/`.lta` is produced
> ([`scripts/seg2recon:172-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L172-L198)); the header explicitly states "No
> talairach.m3z is created" ([`scripts/seg2recon:587`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L587)). Steps that
> require the nonlinear morph are not served by this script.

> [!gotcha] Input is copied, not conformed
> `orig.mgz` is a straight [[wiki/tools/mri_convert|mri_convert]] of the input
> ([`scripts/seg2recon:97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L97)) with no `--conform`. Non-isotropic input
> is therefore carried through unchanged and is expected to cause downstream
> failures (per the header). Conform beforehand if needed.

> [!gotcha] Talairach uses the **whole head** nu, for ICV
> The Talairach is computed from `nu.mgz` (whole head), not the brain-masked
> `norm`, deliberately so that intracranial-volume estimation downstream is valid
> ([`scripts/seg2recon:172-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L172-L176)).

> [!gotcha] `talairach.lta` is only created if absent
> The `talairach.lta → talairach.xfm.lta` symlink is made only when it does not
> already exist ([`scripts/seg2recon:195-197`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L195-L197)), to avoid clobbering a
> hand-edited registration on re-runs.

## Error Compensation and Guard Rails

- **Bias-field correction is the headline guard rail:** it compensates for
  scanner intensity inhomogeneity that learning-based segmenters leave in, so the
  surface stream sees a normalized volume.
- **Extracerebral-aware brain mask.** The inverted-exclusion mask keeps cerebral
  structures even when the seg carries extracerebral labels
  ([`scripts/seg2recon:200-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L200-L217)).
- **int output for the aseg.** Casting to `int` prevents truncation of
  extracerebral label IDs > 255 ([`scripts/seg2recon:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L119)).
- **ctab fallback.** Missing/embedded-absent color table → `FreeSurferColorLUT.txt`
  ([`scripts/seg2recon:515-525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L515-L525)).
- **Up-to-date skips + fail-fast.** Every major output is gated by
  `UpdateNeeded`/`$ForceUpdate`, and each sub-command checks `$status`.

## Related Tools

- [[samseg2recon]] — the closest sibling; imports a samseg run (which is already bias-corrected) instead of fitting the bias itself.
- [[seg2cc]] — performs the same CC-add step in isolation (recon-all's CC Seg stage).
- [[seg2filled]] — derives `filled.mgz` from a segmentation (the WM/surface seed).
- [[mergeseg]] — splices CC labels into the aseg.
- [[mri_fit_bias]] — fits and removes the bias field (the unique step of this script).
- [[mri_seghead]] — builds the head mask that bounds the bias fit.
- [[talairach_avi]] / [[lta_convert]] — linear Talairach registration and LTA conversion.
- [[mri_cc]] — corpus-callosum localization.
- [[wiki/tools/samseg|samseg]] — one possible source of the input segmentation.
- [[wiki/pipelines/recon-all|recon-all]] — run with `-autorecon2-samseg -autorecon3` after `seg2recon`.

## Confidence and Gaps

**High confidence:** the full output set, the bias-field/Talairach/brain-mask/CC
chain, the int-cast rationale, the extracerebral-aware masking, and the complete
flag set — all read from
[`scripts/seg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon). The `--help` output matches the source.

> [!gap] recon-all's seg2recon call is dead code
> The in-tree call is `if(0 && ...)` ([`scripts/recon-all:1650`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1650)),
> so recon-all does not actually run `seg2recon` in v8.2.0. Whether this is a
> deliberate disable (the SynthSeg path now links `synthseg.rca.mgz` straight to
> `aseg.auto_noCCseg.mgz` instead) or a temporary one is not stated in the code.

> [!gap] Linear-only Talairach sufficiency
> With no `talairach.m3z`, any downstream step expecting the nonlinear morph is
> unserved. Whether `-autorecon2-samseg -autorecon3` ever needs it for a
> seg2recon-seeded subject is not verifiable from this script alone.

## References

- FreeSurfer source: [`scripts/seg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon) (v8.2.0).
- recon-all (disabled) call site: [`scripts/recon-all:1650-1666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1650-L1666).
- Built-in help: `seg2recon --help` (the `BEGINHELP` block, [`scripts/seg2recon:577-598`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L577-L598)).
