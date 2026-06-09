---
title: "samseg2recon"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/samseg2recon"
families: []                     # standalone samseg-import script
recon_all_stage: autorecon2      # invoked via -autorecon2-samseg / UseSamseg to seed the surface stream
related:
  - "[[wiki/tools/samseg|samseg]]"
  - "[[seg2recon]]"
  - "[[seg2filled]]"
  - "[[seg2cc]]"
  - "[[mergeseg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_cc]]"
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
  - "[[mri_concat]]"
  - "[[mri_mask]]"
  - "[[lta_convert]]"
  - "[[mri_label2vol]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "T2/FLAIR handling: the multi-mode loop creates T2.mgz/FLAIR.mgz, but the surrounding comment block describes the -T2pial/-FLAIRpial integration as a work in progress; exact downstream consumption not fully traced here."
  - "The --dice/--uchar/--no-uchar flags are parsed but --dice's comparison output is not produced in the main flow (computedice is set but never used); --uchar likewise has no effect on the kept-ECS path per the in-code note."
tags:
  - segmentation
  - samseg
  - subject-creation
  - longitudinal
  - recon-all-helper
---

# samseg2recon

## Summary

`samseg2recon` imports the output of a [[wiki/tools/samseg|samseg]] (or
samseg-long) run into a FreeSurfer subject directory, populating it so the
[[wiki/pipelines/recon-all|recon-all]] surface stream can run without repeating
the volume segmentation. Because samseg already bias-corrects and registers to an
atlas, this script mostly **re-uses** samseg's products: it rescales samseg's
bias-corrected volume so white matter sits at intensity 110 (`nu.mgz`), links
samseg's Talairach LTA, converts the samseg `seg.mgz` to `aseg.auto_noCCseg.mgz`,
builds a brain mask and `norm.mgz`, and adds the corpus callosum
(`aseg.auto.mgz`). Optionally it can build the `filled.mgz` from the segmentation
(via [[seg2filled]]) and handle multi-modal (T2/FLAIR) and longitudinal
(base/timepoint) samseg runs. It is invoked by recon-all whenever samseg is the
chosen segmentation engine.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/samseg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon)
- **Binary/script location:** `$FREESURFER_HOME/bin/samseg2recon`
- **Key helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L93) (copy/cast), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L124) (ECS removal / WM mask / brain mask), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L198) (WM mean), [`mri_concat --mul`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L213) (intensity rescale), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L238) (norm), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L159) (Talairach xfm), [`mri_cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L335), [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L349), [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L376), and [`seg2filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L411) (optional). Also uses the FreeSurfer shell utilities `getfullpath`, `UpdateNeeded`, `fs_time`, `fname2stem`.

## Purpose and Context

[[wiki/tools/samseg|samseg]] produces a whole-head segmentation (`seg.mgz`,
including extracerebral structures), per-mode bias-corrected volumes
(`modeNN_bias_corrected.mgz`), and an atlas registration
(`samseg.talairach.lta`, `template.m3z`). To run recon-all surfaces on a
samseg-segmented subject, those artefacts must be re-expressed as the files
recon-all expects (`orig`, `nu`, `norm`, `brainmask`, `T1`, `aseg.auto*`,
`talairach.*`). `samseg2recon` is the adapter that performs this translation.

Within recon-all, when `UseSamseg` is active the pipeline first runs
[[wiki/tools/samseg|samseg]] and then `samseg2recon --s $subjid --samseg
$samsegdir --from-recon-all` ([`scripts/recon-all:1683-1700`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1683-L1700)).
The `--from-recon-all` flag stops it from overwriting the `orig.mgz`/`rawavg.mgz`
recon-all already created. The aseg it emits is the deliverable that
`-autorecon2-samseg` consumes, so it functionally sits in the `autorecon2`
segmentation slot. It also drives the longitudinal samseg integration
(`-long-samseg`).

> [!gotcha] Work in progress; assumes a conformed T1 input to samseg
> The header states the script "is a work in progress as it assumes that the
> input to samseg is T1 and has been conformed"
> ([`scripts/samseg2recon:710-712`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L710-L712)). It copies the samseg input
> straight to `orig.mgz` without conforming, so the samseg run that preceded it
> must already have used conformed (1 mm) T1 input.

## Inputs

### Required Inputs

- **Subject** (`--s`) — name of the recon-all subject directory to populate.
- **samseg output directory** (`--samseg`) — the directory produced by `samseg`
  or `samseg-long`. If omitted, defaults to `$SUBJECTS_DIR/$subject/mri/samseg`
  ([`scripts/samseg2recon:614`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L614)). Must exist.

The input image (`--i`) is **not** normally supplied: in cross-sectional mode the
script discovers it from the samseg coreg directory
(`<coregdir>/t1w/runavg-refmodespace.mgz`,
[`scripts/samseg2recon:624-644`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L624-L644)). It also reads the list of
acquired modes from `<coregdir>/log/fsr-import.unique.modenames.txt`.

### Input Assumptions

> [!assumption] A complete samseg run with standard layout
> `samseg2recon` expects the samseg directory to contain `seg.mgz`,
> `mode01_bias_corrected.mgz` (and `modeNN_…` for extra modes),
> `samseg.talairach.lta`, optionally `template.m3z`, and an `input`/coreg subtree
> with the mode-name log. The label IDs in `seg.mgz` are samseg's (FreeSurfer
> `aseg` IDs plus extracerebral 165/258/259). The segmentation is assumed to be
> in the (conformed) T1 space. For longitudinal runs it expects `base/`, `tpXXX/`,
> and `mc/` subfolders from `samseg-long`
> ([`scripts/samseg2recon:646-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L646-L662)).

## Outputs

### Files Created (under `$SUBJECTS_DIR/$subject/mri/`)

| File / pattern | Contents |
|----------------|----------|
| `orig.mgz` | copy of the samseg input (skipped under `--from-recon-all`) |
| `rawavg.mgz` → `orig.mgz` | symlink (skipped under `--from-recon-all`) |
| `aseg.auto_noCCseg.mgz` | samseg `seg.mgz` cast to `int` (ECS kept by default) |
| `transforms/talairach.lta` → `samseg.talairach.lta` | symlink to samseg's atlas registration |
| `transforms/talairach.xfm` | MNI xfm from [[lta_convert]] (needed by `mris_anatomical_stats`) |
| `transforms/talairach.m3z` → `template.m3z` | symlink, only if samseg wrote `template.m3z` (note: not the same space as a recon-all `talairach.m3z`) |
| `nu.mgz` | samseg bias-corrected volume rescaled so WM = 110 |
| `norm.mgz` | `nu.mgz` masked by the brain mask |
| `T1.mgz` → `nu.mgz`, `brainmask.mgz` → `norm.mgz` | symlinks |
| `aseg.auto.mgz` | `aseg.auto_noCCseg.mgz` with CC labels 251–255 |
| `T2.mgz` / `FLAIR.mgz` (+ `*.prenorm.mgz`, `*.norm.mgz`) | per extra mode, rescaled and masked (multi-modal samseg) |
| `brain.mgz` → `norm.mgz` | symlink, only with `--normalization2` |
| `filled.mgz`, `wm.mgz` | only with `--fill` (via [[seg2filled]]); `wm.mgz` = `norm` masked by `filled` |
| `scripts/samseg2recon.log` | run log |

### Output Specifications

The segmentation is cast to **int** (`-odt int --no_scale 1`,
[`scripts/samseg2recon:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L140)) because extracerebral IDs exceed uchar
range. `nu.mgz` is the bias-corrected volume **scaled to WM ≈ 110**
(FreeSurfer's canonical WM intensity), the scale being $110/\overline{\text{WM}}$
(see Mathematical Foundations). `talairach.xfm` is derived from samseg's own
atlas LTA, so the subject's stereotaxic frame is samseg's, not a recon-all
`talairach_avi` result. Geometry equals the (conformed) samseg input space.

## Mathematical Foundations

`samseg2recon` re-uses samseg's heavy computation (segmentation, bias field,
registration); its own numerics are the **WM intensity normalization** and the CC
conform detour.

> [!math] White-matter intensity normalization to 110
> For each mode, the script erodes the WM labels (2, 41) by 2 voxels to get a
> conservative WM mask ([`mri_binarize --match 2 41 --erode 2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L187)),
> measures the mean of the bias-corrected volume in that mask
> ([`mri_segstats --avgwf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L198)), and multiplies the whole volume so
> that mean maps to 110:
> $$\text{scale} = \frac{110}{\overline{I_{\text{WM, eroded}}}}, \qquad
>   \text{nu}(x) = \text{scale}\cdot I_{\text{BC}}(x)$$
> applied with [`mri_concat --mul`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L213)
> ([`scripts/samseg2recon:182-219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L182-L219)). This places the volume on
> FreeSurfer's expected intensity scale without re-fitting a bias field.

> [!math] Brain mask by inverted exclusion of background + ECS
> The brain mask binarizes background + extracerebral labels (0, 165, 258, 259),
> inverts, and uses that as the mask
> ([`mri_binarize --match 0 165 258 259 --inv`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L226)). `norm.mgz` is
> then `nu` masked by it.

The CC step uses the **same conform/un-conform/[[mergeseg]] detour** as
[[seg2cc]]/[[seg2recon]] when the seg is not 1 mm-conformed
([`scripts/samseg2recon:328-393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L328-L393)).

> [!internal] Segmentation, bias field, and registration are samseg's
> The actual EM segmentation, bias-field estimation, and affine/nonlinear atlas
> registration live in [[wiki/tools/samseg|samseg]]. `samseg2recon` only rescales,
> masks, links, and adds the CC. The `filled` construction, if requested, is
> delegated to [[seg2filled]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/samseg2recon:458-602`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L458-L602)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name to populate. |
| `--samseg` | string | `subject/mri/samseg` | samseg (or samseg-long) output directory. Must exist. |
| `--i` | string | discovered | Input image. Normally auto-found from the samseg coreg dir; rarely set by hand. |
| `--m` | string | computed | Use this volume as the brain mask instead of deriving one from the seg. Must exist. |
| `--no-cc` | bool | CC **on** | Do not segment the corpus callosum (`aseg.auto.mgz` becomes a copy of the no-CC aseg). |
| `--cc` | bool | **on** | Segment the corpus callosum into `aseg.auto.mgz`. |
| `--fill` | bool | off | Build `filled.mgz` from `aseg.auto.mgz` via [[seg2filled]] (and a placeholder `wm.mgz`). |
| `--no-fill` | bool | — | Do not build the `filled.mgz`. |
| `--normalization2` | bool | off | Mimic recon-all's normalization2 by linking `brain.mgz → norm.mgz` (so `brain.finalsurfs.mgz` can be built from it). |
| `--nonormalization2` | bool | **on** (off) | Do not create `brain.mgz`. |
| `--keep-exc` | bool | **on** | Keep extracerebral segmentations in the aseg (recon-all handles them). |
| `--no-keep-exc` | bool | — | Remove extracerebral labels 165/258/259 from the aseg (via [[mri_binarize]] `--replaceonly … 0`). |
| `--uchar` | bool | off | Convert to uchar. (No effect on the kept-ECS path; see gap.) |
| `--no-uchar` | bool | **on** (off) | Do not convert to uchar. |
| `--long` | int | — | Longitudinal **timepoint** mode: process `tpXXX` inside the samseg-long dir (`XXX` zero-padded; leading zeros stripped from the argument). |
| `--base` | bool | off | Longitudinal **base** mode: process the `base` folder inside the samseg-long dir. |
| `--from-recon-all` | bool | off | Signals invocation from recon-all: do **not** overwrite the `orig.mgz`/`rawavg.mgz` recon-all already wrote. |
| `--no-from-recon-all` | bool | **on** (off) | Stand-alone mode (writes its own `orig.mgz`/`rawavg.mgz`). |
| `--dice` | string | — | A segmentation to compare against (sets `computedice`); parsed but the comparison is not emitted in the main flow (see gap). |
| `--force-update`<br>`--no-force-update` | bool | off | Regenerate outputs regardless of `UpdateNeeded`. |
| `--log` | string | `scripts/samseg2recon.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging. |
| `--tmp`<br>`--tmpdir` | string | `mri/tmp.samseg2recon` | Scratch directory; also implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. (Note: the final `rm -rf $tmpdir` is commented out — see gotcha.) |
| `--cleanup` | bool | **on** | Remove the temporary directory at the end. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--long N` and `--base` select different samseg-long subfolders
> With neither flag, the script runs **cross-sectional**: it reads the coreg dir,
> the mode list, and uses `$samsegdir` as the Talairach source
> ([`scripts/samseg2recon:624-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L624-L645)). `--base` processes
> `$samsegdir/base` (motion-corrected template input). `--long N` processes
> `$samsegdir/tpNNN` (timepoint input `mc/mc.NNN.mgz`)
> ([`scripts/samseg2recon:646-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L646-L662)). `--base` and `--long` are
> alternative longitudinal entry points; the cross-sectional mode-discovery (and
> hence multi-modal T2/FLAIR handling) only runs when **neither** is set.

> [!gotcha] `--from-recon-all` suppresses orig/rawavg creation
> Under `--from-recon-all` the entire `orig.mgz`/`rawavg.mgz` block is skipped
> ([`scripts/samseg2recon:89-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L89-L111)) so it does not clobber what
> recon-all already produced. Stand-alone, leave it off and the script makes its
> own.

> [!gotcha] `--no-keep-exc` zeroes specific ECS labels only
> Removing extracerebral structures replaces only labels 258, 259, 165 with 0
> ([`scripts/samseg2recon:122-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L122-L136)) — not an arbitrary ECS set.
> Because `mri_binarize --replaceonly` preserves the input (float) type, the
> `--uchar` flag has **no effect** on this path (noted in the code).

> [!gotcha] `--fill` changes how the WM surface is seeded
> With `--fill`, [[seg2filled]] builds `filled.mgz` from the aseg and the script
> then sets `wm.mgz` = `norm` masked by `filled`
> ([`scripts/samseg2recon:407-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L407-L430)), because the topology fixer
> needs a `wm.mgz`. Without `--fill`, recon-all's normal fill stream builds it.

- `--m` bypasses the inverted-exclusion brain mask.
- `--normalization2` is needed if you want `brain.finalsurfs.mgz` to derive from
  the samseg-normalized `norm` rather than a recon-all `mri_normalize` pass.

## Typical Use Cases

### Use Case 1: As recon-all runs it (samseg engine)

```bash
# recon-all has already run samseg into $samsegdir and made orig/rawavg.
samseg2recon --s subj01 --samseg $SUBJECTS_DIR/subj01/mri/samseg.rca --from-recon-all
```

This is the exact recon-all invocation
([`scripts/recon-all:1692`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1692)).

### Use Case 2: Stand-alone cross-sectional import

```bash
# Run samseg yourself, then import + finish surfaces.
samseg --t1w T1.mgz --refmode t1w --o /path/samseg --threads 8
samseg2recon --s subj01 --samseg /path/samseg --fill
recon-all -s subj01 -autorecon2-samseg -autorecon3
```

### Use Case 3: Longitudinal base + timepoints

```bash
# After samseg-long produced base/ and tp001/ tp002/ in samseglongdir:
samseg2recon --base --s subj_base --samseg samseglongdir
recon-all -s subj_base -autorecon2-samseg -autorecon3

samseg2recon --long 2 --s long.tp002 --samseg samseglongdir
recon-all -long-samseg subj_base long.tp002 -autorecon2-samseg -autorecon3
```

(From the header's worked example, [`scripts/samseg2recon:714-728`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L714-L728).)

## Pipeline Context

`samseg2recon` is the **samseg→recon-all adapter**. It is invoked by
[[wiki/pipelines/recon-all|recon-all]] in the `UseSamseg` branch — recon-all runs
[[wiki/tools/samseg|samseg]] first, then `samseg2recon … --from-recon-all`
([`scripts/recon-all:1683-1700`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1683-L1700)) — and the aseg it builds is
what `-autorecon2-samseg` consumes, placing it functionally in `autorecon2`. It
is also the entry point for longitudinal samseg integration
(`-long-samseg`). The CC step reproduces [[seg2cc]]; the optional `filled` step
calls [[seg2filled]].

**Predecessor:** a completed [[wiki/tools/samseg|samseg]] / `samseg-long` run →
**samseg2recon** → **Successor:** `recon-all -autorecon2-samseg -autorecon3`
(or `-long-samseg …`) for surface placement, parcellation, and stats. Compare
[[seg2recon]], which is the analogous adapter for segmentations that are **not**
already bias-corrected (it fits the bias itself).

## Gotchas and Caveats

> [!gotcha] WM is forced to 110 by linear rescale, not re-normalization
> `nu.mgz` is the samseg bias-corrected volume multiplied by a single global
> scale so eroded-WM mean = 110 ([`scripts/samseg2recon:182-219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L182-L219)).
> This is a global gain, not a spatial normalization — it relies on samseg's bias
> correction already being good.

> [!gotcha] Cleanup is effectively disabled
> The final `rm -rf $tmpdir` is **commented out**
> ([`scripts/samseg2recon:432-433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L432-L433)) with the note that cleaning up
> would make all the `UpdateNeeded` caching "useless." So intermediate files in
> `mri/tmp.samseg2recon` persist regardless of `--cleanup`. This is intentional
> (re-run speed) but does leave scratch behind.

> [!gotcha] `talairach.m3z` link is not a recon-all-equivalent morph
> When samseg wrote `template.m3z`, it is linked as `talairach.m3z`
> ([`scripts/samseg2recon:167-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L167-L174)) but the in-code comment warns
> "This is not the same space as the talairach.m3z." Do not assume it is
> interchangeable with a GCA-pipeline morph.

> [!gotcha] Input is copied, not conformed
> Like [[seg2recon]], `orig.mgz` is a plain copy of the samseg input
> ([`scripts/samseg2recon:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L93)); the samseg run must have used conformed
> T1 input for downstream steps to behave.

## Error Compensation and Guard Rails

- **WM=110 normalization** puts samseg intensities on the scale recon-all
  surface placement expects, compensating for samseg's arbitrary output scaling.
- **ECS-aware brain mask** keeps cerebral tissue when extracerebral labels are
  present ([`scripts/samseg2recon:222-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L222-L233)).
- **int cast** prevents truncation of extracerebral IDs > 255
  ([`scripts/samseg2recon:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L140)).
- **CC conform detour** lets the CC step work on non-isotropic segs
  ([`scripts/samseg2recon:328-393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L328-L393)).
- **`--from-recon-all` guard** avoids clobbering recon-all's `orig`/`rawavg`.
- **Up-to-date skips + fail-fast** on every major output and sub-command.

## Related Tools

- [[wiki/tools/samseg|samseg]] — produces the segmentation, bias-corrected volumes, and atlas registration this script imports.
- [[seg2recon]] — the analogous adapter for non-bias-corrected segmentations (it fits the bias instead of importing it).
- [[seg2filled]] — builds `filled.mgz` from the aseg under `--fill`.
- [[seg2cc]] — the same CC-add step in isolation.
- [[mergeseg]] — splices CC labels into the aseg.
- [[mri_segstats]] / [[mri_concat]] — measure WM mean and apply the 110 rescale.
- [[mri_binarize]] — ECS removal, WM mask, brain mask.
- [[lta_convert]] — converts the samseg LTA to a Talairach xfm.
- [[mri_cc]] / [[mri_label2vol]] — CC localization and conform/un-conform resampling.
- [[wiki/pipelines/recon-all|recon-all]] — calls `samseg2recon` in the samseg branch and finishes with `-autorecon2-samseg -autorecon3`.

## Confidence and Gaps

**High confidence:** the import flow (orig/rawavg, int aseg, Talairach link/xfm,
WM=110 rescale, brain mask, norm, CC add, optional fill), the cross-sectional vs
`--base`/`--long` branching, the `--from-recon-all` behaviour, and the full flag
set — all read from
[`scripts/samseg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon). The `--help` output matches the source.

> [!gap] T2/FLAIR multi-modal completion
> The mode loop creates `T2.mgz`/`FLAIR.mgz` (+ prenorm/norm)
> ([`scripts/samseg2recon:262-300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L262-L300)), but the large comment block
> that follows describes the `-T2pial`/`-FLAIRpial` integration as still being
> worked out ([`scripts/samseg2recon:302-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L302-L323)). Exact downstream
> consumption was not fully traced here.

> [!gap] `--dice` and `--uchar` are effectively inert
> `--dice` sets `computedice` and stores `$diceseg` but no comparison is emitted
> in the main flow; `--uchar` has no effect on the default kept-ECS path (the
> code itself notes `--replaceonly` copies the input's float type). Treat both as
> non-functional placeholders in v8.2.0.

## References

- FreeSurfer source: [`scripts/samseg2recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon) (v8.2.0).
- recon-all call site: [`scripts/recon-all:1683-1700`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1683-L1700) (UseSamseg branch).
- Built-in help: `samseg2recon --help` (the `BEGINHELP` block, [`scripts/samseg2recon:708-730`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L708-L730)).
- [[wiki/tools/samseg|samseg]] — the upstream segmentation tool.
