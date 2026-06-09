---
title: "mkheadsurf"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/mkheadsurf"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[mri_seghead]]"
  - "[[mri_mc]]"
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mri_binarize]]"
  - "[[mideface]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The seghead intensity logic (thresh1/thresh2/nhitsmin/fhi) lives in mri_seghead, not this script; the precise meaning of each parameter is documented on the mri_seghead page."
  - "Help text mentions a fill value of 255, but the script default is fillval=1; not reconciled against an actual run."
tags:
  - surface
  - head
  - scalp
  - segmentation
  - tessellation
  - skull-strip-adjacent
---

# mkheadsurf

## Summary

`mkheadsurf` builds a triangulated **surface of the whole head/scalp** from an anatomical MRI. It is a thin tcsh pipeline that (1) segments the head as a filled binary volume with [[mri_seghead]], (2) tessellates that volume into a closed surface with [[mri_mc]] (marching cubes, the default) or [[mri_tessellate]], and (3) smooths the mesh with [[mris_smooth]]. Optionally it can inflate the surface and compute `sulc`/`curv`. With `-s <subject>` it drops into the standard subject layout, producing `mri/seghead.mgz` and `surf/lh.seghead`. The head surface is used for visualization, scalp/skin rendering, head-model construction (e.g. for MEG/EEG), and as an input to face-defacing tools.

## Source Information

- **Language:** tcsh shell script
- **Original author:** Doug Greve
- **Source file:** [`scripts/mkheadsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf)
- **Binary/script location:** `$FREESURFER_HOME/bin/mkheadsurf`
- **Tools invoked:** [`mri_seghead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L103) (head segmentation), optional [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L127) (dilate/erode the mask), [`mri_mc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L150) or [`mri_tessellate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L147) (tessellation), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L165), optional [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L185), and helper `getfullpath`.

## Purpose and Context

Most of FreeSurfer is concerned with the cortical surfaces of the brain, but a number of tasks need the **outer surface of the head** instead: rendering the scalp in [[wiki/tools/freeview|freeview]], building a boundary for forward modelling, or — most commonly in modern use — providing the head mesh that face-removal tools deface. `mkheadsurf` packages the three steps needed to go from a T1 to that mesh into one command, with sensible defaults, and writes the result into the subject's `mri/` and `surf/` directories so it can be loaded like any other surface.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run standalone (or by other scripts). It is, for example, invoked by [[mideface]] to create the head surface used during defacing. The head segmentation is deliberately permissive — it captures skin/scalp, not just brain — and the resulting `seghead.mgz` volume can be hand-edited and the surface regenerated with `-noseghead` if the first attempt is unsatisfactory.

## Inputs

### Required Inputs

There are two ways to specify inputs ([`scripts/mkheadsurf:413-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L413-L435)):

- **Subject mode (`-s <subjid>`)** — the script derives everything from the subject directory: input `mri/<srcvol>` (default `T1.mgz`), output volume `mri/<headvol>` (default `seghead.mgz`), output surface `surf/<hemi>.<headsurf>` (default `lh.seghead`).
- **Explicit mode** — supply all three of `-i <inputvol>`, `-o <outputvol>`, and `-surf <outputsurf>`.

The input is a 3D anatomical MRI volume readable by [[mri_seghead]] (e.g. [[mgz]]). It must contain the whole head (skin/scalp), not a skull-stripped brain, since the point is to find the outer head boundary.

### Input Assumptions

> [!assumption] Whole-head anatomical, head-vs-air contrast
> The input volume is assumed to be a **whole-head** anatomical (e.g. T1) in which head tissue is brighter than the surrounding air, so that intensity thresholding in [[mri_seghead]] separates head from background. By default the input is **rescaled** when converted to `uchar` (`-rescale`, disable with `-no-rescale`). A skull-stripped or brain-extracted volume would produce a surface of the brain mask, not the head. The segmentation parameters (`thresh1`, `thresh2`, `nhitsmin`, `fhi`) are passed through to [[mri_seghead]]; see that page for their meaning.

## Outputs

### Files Created

In **subject mode** (`-s subjid`):

| File | Format | Contents |
|------|--------|----------|
| `$SUBJECTS_DIR/<subj>/mri/seghead.mgz` (`<headvol>`) | [[mgz]] | Binary/filled head segmentation from [[mri_seghead]] (filled with `fillval`, default 1). |
| `$SUBJECTS_DIR/<subj>/surf/lh.seghead` (`<hemi>.<headsurf>`) | [[surface-format\|surface]] | The tessellated, smoothed head surface. |
| `$SUBJECTS_DIR/<subj>/surf/lh.seghead.inflated` | surface | Inflated head surface (only with `-inflate`). |
| `$SUBJECTS_DIR/<subj>/surf/{area,curv,sulc}.seghead` | curv/overlay | `area`+`curv` only with `-curv`; `sulc` only with `-inflate`. |
| `$SUBJECTS_DIR/<subj>/scripts/mkheadsurf.log` | text | Run log (previous log moved to `.old`). |

In **explicit mode** the three paths are exactly what you passed to `-i`/`-o`/`-surf`; the log goes next to the output volume.

> [!gotcha] The smoothed surface overwrites the raw tessellation in place
> `mris_smooth` is called as `mris_smooth … $OutputSurf $OutputSurf` ([`scripts/mkheadsurf:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L171)), so the surface you name (e.g. `lh.seghead`) ends up holding the **smoothed** mesh, not the raw marching-cubes output. There is no separate `smseghead` file by default despite the `-smheadsurf` option name — that option's value is parsed but not used to name a distinct output in the current code. The help/legacy text refers to `lh.smseghead`, which is historical.

### Output Specifications

The surface is a standard FreeSurfer triangle mesh in surface-RAS coordinates with the volume geometry of the input. The head segmentation volume is the same geometry as the input MRI. Vertex/face count depends on head size and the tessellation method ([[mri_mc]] marching cubes vs [[mri_tessellate]]).

## Mathematical Foundations

`mkheadsurf` itself contains no numerics — it is a sequencer. The substantive operations are in the tools it calls:

> [!internal] Segmentation and tessellation math live in the called tools
> The head **segmentation** (intensity thresholding, hit-counting along rays, hole filling / island removal) is implemented in [[mri_seghead]] and governed by `thresh1`, `thresh2`, `nhitsmin`, and `fhi`. The **tessellation** is either marching cubes ([[mri_mc]]) — which extracts an iso-surface of the filled volume at `fillval` — or the older voxel-face tessellator ([[mri_tessellate]]). Surface **smoothing** (Laplacian-style vertex averaging) and **inflation** live in [[mris_smooth]] and [[mris_inflate]].

The only arithmetic in the script is choosing whether to **decimate/clean** via `mri_binarize --dilate/--erode` when `-ndilate`/`-nerode` are non-zero ([`scripts/mkheadsurf:126-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L126-L134)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/mkheadsurf:207-407`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L207-L407)).

#### Input / output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` | string | — | Input anatomical volume (explicit mode). |
| `-o` | string | — | Output head segmentation volume (explicit mode). |
| `-surf` | string | — | Output head surface path (explicit mode); canonicalised with `getfullpath`. |
| `-s`<br>`-subjid` | string | — | Subject ID; sets `-i`/`-o`/`-surf` from the subject directory (overrides explicit paths). |
| `-sd` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `-srcvol` | string | `T1.mgz` | In subject mode, the input volume name under `mri/`. |
| `-headvol` | string | `seghead.mgz` | In subject mode, the output segmentation volume name under `mri/`. |
| `-headsurf` | string | `seghead` | In subject mode, the surface base name (combined with `-hemi`). |
| `-smheadsurf` | string | `smseghead` | Parsed but not used to name a distinct output (see gotcha). |
| `-hemi` | string | `lh` | Hemisphere prefix for the subject-mode surface name. |

#### Head segmentation (passed to mri_seghead)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-thresh1` | int | `20` | First intensity threshold for [[mri_seghead]]. |
| `-thresh2` | int | `20` | Second intensity threshold for [[mri_seghead]]. |
| `-nhitsmin` | int | `2` | Minimum hit count along search rays in [[mri_seghead]]. |
| `-fhi` | float | (seghead default) | `fhi` for `MRIchangeType()`; only passed if set. |
| `-fillval` | int | `1` | Fill value for the segmented head volume. |
| `-rescale` / `-no-rescale` | bool | rescale **on** | Rescale the input when converting to `uchar` (toggles `mri_seghead --rescale`/`--no-rescale`). |
| `-fill-holes-islands` / `-no-fill-holes-islands` | bool | fill **on** | Fill interior holes and remove islands in the head seg. |
| `-or-mask` | string | — | Force all voxels of this mask into the head segmentation (`mri_seghead --or-mask`). |
| `-no-or-mask` | bool | — | Clear a previously set `-or-mask`. |
| `-ndilate` | int | `0` | Dilate the segmentation by N voxels via [[mri_binarize]] (only if non-zero). |
| `-nerode` | int | `0` | Erode the segmentation by N voxels via [[mri_binarize]] (only if non-zero). |

#### Tessellation / surface processing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mc` | bool | **on** | Tessellate with [[mri_mc]] (marching cubes). |
| `-tess` | bool | off | Tessellate with [[mri_tessellate]] instead (mutually exclusive with `-mc`). |
| `-nsmooth` | int | `10` | Number of [[mris_smooth]] iterations. |
| `-inflate` / `-noinflate`<br>`-no-inflate` | bool | off | Inflate the surface and compute `sulc` via [[mris_inflate]]. |
| `-curv` / `-nocurv`<br>`-no-curv` | bool | off | Compute `area`+`curv` during smoothing (`mris_smooth -b … -c …`); when off, smoothing uses `-nw` (no write of curv/area). |
| `-noseghead` | bool | off | **Skip** the head segmentation; tessellate and smooth an existing `<outputvol>` (use after hand-editing `seghead.mgz`). |

#### Housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-umask` | string | `2` | umask for created files (group+individual writable). |
| `-log`<br>`--log` | string | auto | Explicit log-file path. |
| `-verbose` | bool | off | Verbose. |
| `-echo` | bool | off | `set echo` tracing. |
| `-debug` | bool | off | verbose + echo. |
| `-g`/`-s`/`-sf`/`-d`/`-df`/`-cwd` | — | — | Ignored (legacy `getsesspath` arguments accepted for compatibility). |
| `-help`, `-version` | flag | — | Help / version. |

### Configuration Interactions

> [!gotcha] -noseghead requires the segmentation volume to already exist
> With `-noseghead` the script does not create `<outputvol>`; it errors if the file is missing ([`scripts/mkheadsurf:135-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L135-L141)). The intended workflow is: run once normally, edit `mri/seghead.mgz` (e.g. in [[wiki/tools/freeview|freeview]] or tkmedit), then re-run with `-noseghead` to rebuild the surface from the edited volume.

> [!gotcha] -tess and -mc are mutually exclusive; the last one wins
> Each of `-mc`/`-tess` sets one tessellator flag and clears the other ([`scripts/mkheadsurf:345-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L345-L352)). Specifying both uses whichever appears last on the command line. Marching cubes (`-mc`) is the default and the usual choice.

> [!gotcha] -curv changes how mris_smooth is invoked
> Without `-curv`, smoothing runs with `-nw` (do not write curvature/area). With `-curv`, it writes `area.<headsurf>` and `curv.<headsurf>` ([`scripts/mkheadsurf:165-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L165-L170)). So the curvature/area overlays only exist if you ask for them.

> [!gotcha] -ndilate guard has a variable-name typo
> The dilation/erosion block is entered when `$ndilate != 0 || $nerode != 0`, but the dilate test inside it reads `if($dilate > 0)` (note: `$dilate`, not `$ndilate`) ([`scripts/mkheadsurf:126-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L126-L130)). Because `$dilate` is undefined, the `--dilate` argument is effectively never added by this branch; erosion (`-nerode`) works. If you need to dilate the head mask, verify the result.

## Typical Use Cases

### Standard subject head surface

```bash
# Produces mri/seghead.mgz and surf/lh.seghead for an existing recon.
mkheadsurf -s bert
```

### Explicit input/output

```bash
mkheadsurf -i /data/T1.mgz -o /data/seghead.mgz -surf /data/lh.head
```

### Rebuild after editing the segmentation

```bash
# 1) initial run, 2) edit seghead.mgz, 3) regenerate the surface only:
mkheadsurf -s bert
# ... edit $SUBJECTS_DIR/bert/mri/seghead.mgz ...
mkheadsurf -s bert -noseghead
```

### Inflate and compute curvature

```bash
mkheadsurf -s bert -inflate -curv
```

## Pipeline Context

`mkheadsurf` is a **standalone** head-surface generator, **not** invoked by [[wiki/pipelines/recon-all|recon-all]]. It is, however, called by other FreeSurfer scripts — notably [[mideface]], which builds a head surface as part of face removal. Within a single run it orchestrates [[mri_seghead]] → [[mri_mc]] (or [[mri_tessellate]]) → [[mris_smooth]] (→ [[mris_inflate]]).

**Predecessor:** a whole-head anatomical (e.g. `T1.mgz` from [[wiki/pipelines/recon-all|recon-all]]) → **mkheadsurf** → **Successor:** visualization in [[wiki/tools/freeview|freeview]], head-model / forward-model construction, or defacing via [[mideface]].

## Gotchas and Caveats

> [!gotcha] Output surface name vs the historical "smseghead"
> Despite the `-smheadsurf` option and legacy documentation referring to `lh.smseghead`, the current script writes the smoothed mesh **into the `-surf`/`<headsurf>` file** (default `lh.seghead`) in place. Expect the smoothed head surface at `surf/lh.seghead`.

> [!gotcha] It builds a head, not a brain
> Feeding a skull-stripped volume (`brainmask.mgz`, `brain.mgz`) yields a surface of that mask, not the scalp. Use a whole-head volume such as `T1.mgz`.

## Error Compensation and Guard Rails

- **Input validation:** errors if the subject is missing (subject mode), if any of input/output/surf are unspecified, or if the input volume does not exist ([`scripts/mkheadsurf:413-439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L413-L439)).
- **Per-step status checks:** the script aborts (exit 1) if [[mri_seghead]], the tessellator, or [[mris_smooth]] returns non-zero.
- **Output directories** are created up front (`mkdir -p` of the volume and surface directories, [`scripts/mkheadsurf:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L82)).
- **Full-path surface name:** `-surf` is canonicalised with `getfullpath` because surface writers may otherwise prepend `lh`/`rh` to a bare filename ([`scripts/mkheadsurf:145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf#L145)).
- **`-rescale` on by default** silently rescales the input intensities when converting to `uchar` for segmentation.

## Known Bugs

- [[00178]] — dilation test reads undefined `$dilate` instead of `$ndilate`, aborting the `-ndilate`/`-nerode` post-processing block with `dilate: Undefined variable.`.

## Related Tools

- [[mri_seghead]] — performs the head segmentation; owns `thresh1/thresh2/nhitsmin/fhi` and the fill/island logic.
- [[mri_mc]] — marching-cubes tessellator (default).
- [[mri_tessellate]] — alternative voxel-face tessellator (`-tess`).
- [[mris_smooth]] — smooths the tessellated mesh; optionally writes `curv`/`area`.
- [[mris_inflate]] — inflates the head surface and computes `sulc` (`-inflate`).
- [[mri_binarize]] — dilates/erodes the head mask (`-ndilate`/`-nerode`).
- [[mideface]] — a downstream consumer that uses a head surface for defacing.
- [[wiki/tools/freeview|freeview]] — used to view (and edit the segmentation behind) the head surface.

## Confidence and Gaps

**High confidence** on the pipeline structure, flag set, defaults, and the in-place smoothing behaviour — all read from [`scripts/mkheadsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf).

> [!gap] seghead parameter semantics
> The exact effect of `thresh1`, `thresh2`, `nhitsmin`, and `fhi` is determined by [[mri_seghead]] (the script merely forwards them); consult that page for their meaning.

> [!gap] fill value 255 vs default 1
> The legacy help text says the head volume is "filled with 255", but the script's default `fillval` is **1**, and that same value is what the tessellator extracts. The discrepancy was not reconciled against a live run.

## References

- FreeSurfer source: [`scripts/mkheadsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mkheadsurf) (v8.2.0).
- Built-in help: `mkheadsurf -help`. See also `mri_seghead --help` for the segmentation parameters.
