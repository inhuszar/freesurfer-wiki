---
title: "mideface"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/mideface"
families: []                     # standalone defacing wrapper
recon_all_stage: null
related:
  - "[[mri_defacer]]"
  - "[[mri_deface]]"
  - "[[deface_subject]]"
  - "[[samseg]]"
  - "[[mkheadsurf]]"
  - "[[bbregister]]"
  - "[[mris_apply_reg]]"
  - "[[lta_convert]]"
  - "[[mri_concatenate_lta]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[label-format]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Inner workings of mri_defacer (distance-bound computation, watermark embedding, ripple) are in the compiled binary / mideface library, not in this script."
  - "Exact RAM/runtime figures for samseg (~14GB) and synthseg (~35GB) are quoted from the help text, not benchmarked here."
tags:
  - defacing
  - de-identification
  - anonymization
  - privacy
  - surface-based
  - quality-assurance
---

# mideface

## Summary

`mideface` ("minimally invasive defacing") is the modern FreeSurfer
anonymization driver. It is a tcsh wrapper that removes a subject's facial
features from an anatomical MRI while disturbing as little brain-adjacent
tissue as possible. Rather than relying on a volumetric atlas like the legacy
[[mri_deface]], it registers a **template head/face surface mesh** to the
input, builds a head surface for the subject, optionally runs
[[samseg]]/SynthSeg to create a brain **exclusion mask**, and then calls the
defacing engine [[mri_defacer]] to blank out the region between the skin and
the face while protecting the brain. It can embed a recoverable **watermark**
(a provenance "code") in the output, produce before/after QA snapshots, apply
a previously computed face mask to other volumes of the same subject, and
report whether a volume has already been defaced.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mideface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface)
- **Binary/script location:** `$FREESURFER_HOME/bin/mideface`
- **Defacing engine:** [`mri_defacer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L330) (the C++ binary that does the actual voxel removal, watermark, and ripple)
- **Other tools invoked:** [`samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L171)/[`run_samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L156) or `synthseg` (exclusion-mask segmentation), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L218) and [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L228) (build/invert the atlas→subject registration), [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L245) (optional boundary-based refinement), [`mris_apply_reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L266) (map the template surface to the subject), [`mkheadsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L277) (build the subject head surface/mask), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L294), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L310), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L359), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L201), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L349) (attach the color table), [`mris_diff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L387), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L396), and [`freeview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L418) (QA pictures, via `Xvfb`/`fsxvfb` when headless). It also uses the FreeSurfer helpers `fsr-getxopts`, `fsr-checkxopts`, `getfullpath`, `fname2stem`, `fs_time`, `UpdateNeeded`, and `fs_temp_dir`.

> [!contradiction] "mri_mideface" does not exist; the engine is mri_defacer
> `mideface` is sometimes described as wrapping `mri_mideface`, but there is no
> `mri_mideface` binary in FreeSurfer 8.2.0 (the source tree has no such
> directory and no such program installs). The C++ engine that `mideface`
> actually drives is [`mri_defacer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L330) (built from
> `mri_deface/mri_defacer.cpp`, which `#include`s the `mideface.h` library).
> Code is authoritative: cross-link [[mri_defacer]], not a non-existent
> `mri_mideface`.

## Purpose and Context

Defacing is required before anatomical MRI can be shared, because a 3D render
of an unmodified T1 reveals the subject's face. The legacy [[mri_deface]]
removes a generous atlas-defined block in front of the brain, which can clip
orbitofrontal/temporal cortex and leaves a flat, obviously-defaced surface.
`mideface` was designed to be **minimally invasive**: it carves out only the
shell of tissue between the skin and a controlled inward distance, keeping the
brain and as much of the head shape as possible, and (optionally) leaves a
faint watermark and a QA image trail so that defacing can be audited and even
detected programmatically afterwards.

The workflow inside the script is:

1. **Register** the input to the samseg defacing atlas (running [[samseg]] —
   either full, for an exclusion mask, or registration-only).
2. **Compose** that with the atlas's stored atlas→samseg transform to get an
   atlas→input transform, and invert it.
3. Optionally **refine** the face alignment with [[bbregister]] (off by
   default; faces are variable and BBR can mangle the surface).
4. **Map** the template head/face surface onto the subject with
   [[mris_apply_reg]], and **build** the subject's own head mask/surface with
   [[mkheadsurf]].
5. Optionally **segment** the brain (samseg or SynthSeg) and dilate it into an
   **exclusion mask** so the defacer never touches cerebral voxels.
6. **Deface** with [[mri_defacer]], using the mapped face labels (lower face,
   upper face, nose, eyes, and optionally ears/forehead/back-of-head), the
   head mask, and a watermark.
7. **QA**: paint the face mask onto the head surface, optionally rebuild a
   post-deface head surface and measure how far the surface moved, and take
   before/after [[wiki/tools/freeview|freeview]] snapshots.

It is run **by hand** on the volume(s) to be released. It is not part of
[[wiki/pipelines/recon-all|recon-all]]. Its stand-alone, fixed-atlas
predecessor for the older defacer is [[deface_subject]].

## Inputs

### Required Inputs

- **`--i <vol>`** — the anatomical volume to deface (T1; mgz/nii/nii.gz). The
  script aborts if missing or not found ([`scripts/mideface:852-859`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L852-L859)).
- **`--o <vol>`** *or* **`--odir <dir>`** — the defaced output volume, or an
  output directory (in which case the output is `<dir>/defaced.<fmt>` and
  post-head-surface QA is turned on). One of these is required
  ([`scripts/mideface:878-881`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L878-L881)).
- **Defacing atlas** — a directory of template surfaces and face labels.
  Defaults to `$FREESURFER/average/mideface-atlas`
  ([`scripts/mideface:861`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L861)); override with `--atlas`. It must contain
  `average.head.mgz`, the decimated template surface, `reg.samseg-default.lta`,
  the per-region `.label` files, the watermark label, `deface.ctab`, and
  `samseg-options.json`.

### Input Assumptions

> [!assumption] Whole-head T1 with the face intact, plus the bundled atlas
> The input must be a whole-head anatomical (the face must still be present —
> you cannot deface a skull-stripped brain) in a format
> [[wiki/tools/freeview|freeview]]/`mri_convert` can read. `mideface` assumes
> the defacing atlas directory is present and complete; the registration is
> driven by [[samseg]], so the input should be a reasonably standard
> T1-weighted head for samseg to align. The tool treats the input as `--t1`
> contrast during the optional BBR refinement ([`scripts/mideface:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L245)).

> [!gotcha] `--atlas` default uses `$FREESURFER`, not `$FREESURFER_HOME`
> The default atlas path is built from `$FREESURFER`
> ([`scripts/mideface:861`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L861)), an environment variable set by
> `sources.csh` that normally equals `$FREESURFER_HOME`. In the standard 8.2.0
> install the atlas lives at `$FREESURFER_HOME/average/mideface-atlas`. If
> `$FREESURFER` is unset (e.g. a partially sourced environment), the default
> path resolves to `/average/mideface-atlas` and the run aborts with "cannot
> find atlasdir"; pass `--atlas` explicitly in that case.

## Outputs

### Files Created

When `--o <vol>` is given, intermediates live in a scratch directory that is
deleted unless `--nocleanup`/`--tmp`/`--odir` keep it. When `--odir` is given,
everything is retained under that directory and a post-deface head surface is
built. The principal products:

| File | Default location | Contents |
|------|------------------|----------|
| defaced volume | `--o` path (or `<odir>/defaced.<fmt>`) | the input with the face region blanked, watermark embedded |
| face mask | `--facemask` (or `<odir>/face.mask.mgz`, else scratch) | segmentation of the removed face region, with `deface.ctab` color table attached ([`scripts/mideface:349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L349)) |
| `<stem>.mideface.log` | next to the output (or `<odir>/log/mideface.log`) | full run log |
| `viewcmd` | scratch/odir | a ready-made `freeview` command line to inspect the result ([`scripts/mideface:473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L473)) |
| `headvol.stats` | scratch/odir | head-volume statistics from [[mri_segstats]] (QA) |
| `face-before.png`, `face-after.png`, `face-before+after.gif` | scratch/odir | before/after renders and an animated GIF (only with `--pics`; `--code` prefixes the subject code to the names) |
| `head.surf`, `head.defaced.surf`, `template.surf`, `min.surf`, `max.surf` | scratch/odir | QA surfaces (the post-deface ones only with PostHeadSurf on) |
| `dist-to-face.thresh.mgz` | scratch/odir | per-vertex distance the head surface moved after defacing, thresholded to ≤1 mm (only with PostHeadSurf) |

### Output Specifications

The defaced volume is written in the format chosen by `--mgz` (default) /
`--nii` / `--nii.gz` when the output name is unspecified; if you name `--o`
explicitly the extension you give determines the format. Geometry matches the
input (the defacer operates in input voxel space). The **face mask** is a
labeled `mgz` volume carrying the `deface.ctab` color table. The watermark is
embedded by raising the template surface in the watermark-label region before
the defacer samples intensities, so the output volume carries a faint,
machine-detectable signature (recovered later with `--check`).

## Mathematical Foundations

The heavy numerics live in the compiled engine [[mri_defacer]] and in
[[samseg]]; this script orchestrates them. Two parts are worth stating
explicitly.

**1. Building the atlas→subject registration.** The defacing atlas is supplied
with a stored transform from the atlas to the samseg default space
(`reg.samseg-default.lta`). The script registers the *input* to samseg (giving
`template.lta`) and **composes** the two to land the atlas on the subject:

$$ T_{\text{atlas}\to\text{input}} \;=\; T_{\text{samseg}\to\text{input}}
   \,\circ\, T_{\text{atlas}\to\text{samseg}} $$

via [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L218), then inverts it with
[`lta_convert --invert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L228) to get input→atlas. The template head/face
surface is carried into subject space by [[mris_apply_reg]]. If `--bbr` is
set, a [[bbregister]] step refines this against the face boundary (6/9/12 DoF)
and replaces the composed transform.

**2. Defining what gets removed.** [[mri_defacer]] is handed the mapped
template surface (`--ts`), the subject head mask (`--hm`), and a list of face
**labels** (`--l`), each optionally with inward distance bounds (the script
passes ear/forehead/back-of-head with bounds `2 3`). The engine computes, per
face vertex, a distance band between the skin and an inward limit and blanks
voxels in that shell — replacing them either with a fitted background mode
(default) or a constant (`--fill-const`/`--fill-zero`). The exclusion mask
(`--xmask`) vetoes any cerebral voxel from removal. The watermark and optional
`--ripple` perturb the surface before sampling. See [[mri_defacer]] for the
distance-bound and watermark details.

> [!internal] The defacing geometry and watermark live in the mideface library
> Distance-bound computation, mode-based background fill, watermark embedding,
> ripple, and the provenance "code" are implemented in
> `mri_deface/mri_defacer.cpp` / `mideface.h`, not in this script. `mideface`
> only assembles the command line. See [[mri_defacer]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/mideface:510-844`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L510-L844)). All flags use a double dash. "bool"
flags take no argument.

#### Core I/O

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input whole-head anatomical volume to deface. |
| `--o` | string | *(required\*)* | Defaced output volume. If the value is not a recognized volume format it is treated as an **output directory** (turns on post-head-surface QA). |
| `--odir` | string | — | Output directory; output becomes `<odir>/defaced.<fmt>`, intermediates are retained, and post-head-surface QA is turned on. Alternative to `--o`. |
| `--facemask` | string | `<odir>/face.mask.mgz` or scratch | Path for the output face-region segmentation. |
| `--mgz` | bool | **on** | Output in compressed MGH (`.mgz`) — the default (used when the output name is unspecified). |
| `--nii` | bool | off | Output in NIfTI (used when the output name is unspecified). |
| `--nii.gz` | bool | off | Output in compressed NIfTI (used when the output name is unspecified). |
| `--atlas` | string | `$FREESURFER/average/mideface-atlas` | Defacing atlas directory (surfaces + labels + ctab + samseg json). |

\* `--o` or `--odir` is required.

#### Brain exclusion mask (protect the brain)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--xmask` | string | — | Use this pre-made exclusion mask (voxels inside are never defaced). Mutually exclusive with `--synthseg`. |
| `--samseg`<br>`--xmask-samseg` | int (`ndil`) | **on**, `ndil=1` | Segment the input with full [[samseg]] (~14 GB, +~20–40 min) and dilate `ndil` times to build the exclusion mask. |
| `--no-samseg` | bool | off | Do not run full samseg for the mask (samseg is then run registration-only); also disables samseg-fast. |
| `--synthseg`<br>`--xmask-synthseg` | int (`ndil`) | off | Segment the input with SynthSeg (~35 GB, +~20 min) instead of samseg to build the mask. |
| `--ndil` | int | `1` | Number of dilations applied to the segmentation when forming the exclusion mask. |
| `--mask-seg-to-head` | bool | **on** | Restrict the exclusion mask to the head mask (drops stray skull voxels). |
| `--no-mask-seg-to-head` | bool | off | Keep stray skull voxels outside the head mask in the exclusion mask. |
| `--xmask-eyeballs` | bool | **on** (samseg) | Include the eyeballs (segid 259) in the exclusion mask. |
| `--no-xmask-eyeballs` | bool | off | Exclude the eyeballs from the exclusion mask (allows defacing over the eyes). |

#### Samseg configuration

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--samseg-fast` | bool | **on** | Configure samseg for speed (block-coordinate descent + bundled `samseg-options.json`); sets `ndil=1`. |
| `--no-samseg-fast` | bool | off | Do not use the fast samseg configuration. |
| `--samseg-json` | string | — | Provide a custom samseg options JSON (mutually exclusive with `--samseg-fast`). |
| `--no-samseg-json` | bool | — | Clear any samseg JSON. |
| `--init-reg` | string (lta) | — | Initialize samseg with this registration (useful if samseg's own registration fails). |

#### What to remove

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ears` | bool | **on** | Include the ears in the defacing. |
| `--no-ears` | bool | off | Do not deface the ears. |
| `--forehead` | bool | off | Include the forehead (warned to risk removing brain). |
| `--no-forehead` | bool | on | Do not deface the forehead (default). |
| `--back-of-head` | bool | off | Include the back of the head in the defacing. |
| `--no-back-of-head` | bool | on | Do not deface the back of the head (default). |

#### How to fill / distort

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fill-const` | 2 floats (`In Out`) | off (mode fill) | Fill removed voxels with constant values inside/outside instead of the fitted background mode; sets `FillType=2`. |
| `--fill-zero`<br>`--zero` | bool | off | Shorthand for `--fill-const 0 0` (blank to zero). |
| `--fhi` | float | `mri_seghead` default | `fhi` value passed to `MRIchangeType()` during head-surface creation. |
| `--ripple` | 2 floats (`amp period`) | off | Apply a ripple distortion of the given amplitude and period to the template surface before sampling. |
| `--no-ripple` | bool | on | Disable ripple (default). |

#### Registration refinement

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--bbr` | bool | off | Refine the face registration with [[bbregister]] (default 9 DoF). Use with care — faces are variable and BBR can distort the surface. |
| `--no-bbr` | bool | on | Disable BBR refinement (default). |
| `--bbr-dof-6`<br>`--bbr-dof-9`<br>`--bbr-dof-12` | bool | (9 if `--bbr`) | Enable BBR and set its degrees of freedom to 6 / 9 / 12. |
| `--or-mask` | bool | off | OR the samseg/exclusion mask into [[mkheadsurf]] as an additional head-mask source (more robust head surface). |
| `--no-or-mask` | bool | on | Do not OR the mask into mkheadsurf (default). |

#### QA imagery

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--pics` | bool | off | Render before/after face snapshots and an animated GIF with [[wiki/tools/freeview|freeview]]. |
| `--no-pics` | bool | on | Do not take pictures (default). |
| `--code` | string | — | Embed this codename in the QA picture filenames and annotation (eases slideshows). |
| `--imconvert` | string | `/usr/bin/convert` | Path to the ImageMagick `convert` binary used to crop/annotate the snapshots. |
| `--display` | int | — | Set the `Xvfb` display number for headless picture taking (`FSXVFB_START_D`). |
| `--no-xvfb` | bool | auto | Do not use `Xvfb`/`fsxvfb` (auto-disabled if `Xvfb` is not on `PATH`). |
| `--post` | bool | off (on with `--odir`) | Build a head surface *after* defacing (for surface-movement QA). |
| `--no-post` | bool | on | Do not build the post-deface head surface. |

#### Stand-alone modes (do one thing and exit)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--apply` | `vol facemask reg out` | — | Apply an existing face mask to **another** volume of the same subject and exit; use `regheader` if no registration is needed. Put `--statframe` *before* `--apply`. ([`scripts/mideface:752-771`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L752-L771)) |
| `--check` | `vol [outfile]` | — | Print `1` if `vol` is a mideface output (carries the provenance code) or `0` otherwise, and exit; optionally also write the 0/1 to `outfile`. ([`scripts/mideface:739-750`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L739-L750)) |
| `--statframe` | int | `0` | 0-based frame used for intensity statistics; must precede `--apply`. |

#### Run control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--threads` | int | `1` | Threads passed to samseg/synthseg/mri tools. |
| `--force` | bool | off | Force reprocessing even if outputs look up to date (only meaningful when `--odir` retains intermediates). |
| `--no-force` | bool | on | Honour the `UpdateNeeded` checks (default). |
| `--expert` | string (file) | — | Expert-options file; per-tool extra flags are injected via `fsr-getxopts` (keys: `run_samseg`, `samseg`, `synthseg`, `bbregister`, `mkheadsurf`, `mri_defacer`, `freeview-before`, `freeview-after`). |
| `--tmp`<br>`--tmpdir` | string | auto (`/scratch` or `<outdir>`) | Scratch directory; implies `--nocleanup`. |
| `--cleanup` | bool | on | Delete the scratch directory on success (default; auto-off with `--odir`). |
| `--nocleanup` | bool | off | Keep the scratch directory. |
| `--log` | string | `<stem>.mideface.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + the (very short) `BEGINHELP` and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--xmask` and `--synthseg` cannot be combined
> Supplying a pre-made exclusion mask with `--xmask` while also asking for a
> SynthSeg-derived mask is a hard error: "cannot use --xmask and --synthseg"
> ([`scripts/mideface:886-889`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L886-L889)).

> [!gotcha] samseg and synthseg exclusion masks are mutually exclusive
> `--xmask-synthseg` and `--xmask-samseg` cannot both be on; the script exits
> with "cannot use both --xmask-synthseg and --xmask-samseg"
> ([`scripts/mideface:890-893`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L890-L893)). Note `--synthseg` sets
> `DoSynthSegXMask=1` but does **not** clear `DoSamsegXMask` (which defaults
> on), so you must add `--no-samseg` when switching to SynthSeg, or you hit
> this error.

> [!gotcha] `--samseg-fast` and `--samseg-json` conflict
> You cannot specify both a fast preset and a custom JSON: "cannot spec
> --samseg-fast and --samseg-json" ([`scripts/mideface:895-898`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L895-L898)). With the
> default fast configuration the script silently uses the atlas's bundled
> `samseg-options.json` ([`scripts/mideface:899`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L899)).

> [!gotcha] samseg runs by default — it is expensive
> Out of the box `DoSamsegXMask=1`, so a full [[samseg]] segmentation runs to
> build the exclusion mask (~14 GB RAM, +~20–40 min). If you only need the
> registration (not the brain-protection mask), pass `--no-samseg`, which runs
> samseg in `--reg-only` mode instead ([`scripts/mideface:152-163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L152-L163)).

> [!gotcha] `--o` may silently become a directory
> If the value given to `--o` is not a recognized volume format, `fname2stem`
> fails and the script reinterprets it as an **output folder**, setting
> `DoPostHeadSurf=1` ([`scripts/mideface:518-528`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L518-L528)). A typo in the output
> filename's extension can therefore change the run mode rather than erroring.

- `--odir` implies retained intermediates (`cleanup=0`), a post-deface head
  surface, an `<odir>/log/mideface.log`, and `face.mask.mgz` under the
  directory ([`scripts/mideface:867-876`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L867-L876)).
- `--bbr-dof-6/9/12` each also turn `--bbr` on; `--no-bbr` turns it off.
- Flags are processed left to right; for the `--bbr`/`--samseg` family the last
  one on the line wins.
- `--statframe` must appear **before** `--apply` (and before `--check`) to take
  effect, because those modes act and exit immediately.

## Typical Use Cases

### Use Case 1: Default minimally-invasive deface

```bash
# Full samseg exclusion mask (slow, safest), ears included, mode-fill
mideface --i T1.mgz --o T1.defaced.mgz --facemask face.mask.mgz --threads 8
```

### Use Case 2: Fast deface without the heavy samseg mask

```bash
# Skip the full samseg segmentation; samseg still gives the registration
mideface --i T1.nii.gz --o T1.defaced.nii.gz --no-samseg --threads 8
```

### Use Case 3: Deface into a directory with QA imagery

```bash
mideface --i T1.mgz --odir defaced_out --pics --code sub-001 --threads 8
# → defaced_out/defaced.mgz, face.mask.mgz, before/after PNGs + GIF,
#   post-deface head surface, log/
```

### Use Case 4: Apply an existing face mask to a second scan of the same subject

```bash
# Reuse the face mask from the T1 on a co-registered FLAIR (no reg needed)
mideface --apply FLAIR.mgz face.mask.mgz regheader FLAIR.defaced.mgz
```

### Use Case 5: Check whether a volume was already defaced

```bash
mideface --check suspect.mgz
# prints 1 if it is a mideface output, 0 otherwise
```

## Pipeline Context

`mideface` is a stand-alone anonymization step, run by hand on the volume(s)
to be released. It is **not** called by [[wiki/pipelines/recon-all|recon-all]]
(recon-all's optional `-deface` uses the legacy [[mri_deface]] instead).

**Predecessor:** raw/ reconstructed whole-head T1 (and, internally,
[[samseg]] for registration/segmentation) → **mideface** → **Successor:** data
release, or [[wiki/pipelines/recon-all|recon-all]] on the defaced volume.
Within a subject, `--apply` lets one face mask be propagated to additional
modalities.

## Gotchas and Caveats

> [!gotcha] `--forehead` risks removing brain
> The help text explicitly warns that including the forehead "risks removing
> brain" ([`scripts/mideface:946`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L946)). The forehead overlies frontal cortex;
> the exclusion mask is the only protection, so only use `--forehead` when the
> samseg/synthseg mask is reliable and you have inspected the result.

> [!gotcha] BBR can mangle the face surface
> A source comment cautions against `--bbr`: "Faces are highly variable and the
> surface can get mangled" ([`scripts/mideface:237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L237)). The default (no BBR)
> relies on the samseg-atlas registration, which is more robust.

> [!gotcha] Picture-taking needs a display (or Xvfb)
> `--pics` drives [[wiki/tools/freeview|freeview]] off-screen via
> `fsxvfb`/`Xvfb`; if `Xvfb` is not on `PATH`, `UseXvfb` is auto-set to 0 and
> the snapshots require a real X display. The crop/annotate step also needs the
> ImageMagick `convert` binary at `--imconvert` (default `/usr/bin/convert`).

> [!gotcha] Output may be NIfTI or MGZ depending on flags vs. filename
> `--nii`/`--nii.gz`/`--mgz` only set the format when the output name is left
> for the script to build (e.g. via `--odir`). If you pass `--o name.mgz`, the
> `.mgz` extension wins regardless of `--nii`.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Every major step is wrapped in an `UpdateNeeded`
  check, so a re-run with `--odir` only redoes stages whose inputs changed;
  `--force` overrides this ([`scripts/mideface:328-329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L328-L329) and throughout).
- **samseg as a head-mask backstop.** Adding samseg into [[mkheadsurf]] via
  `--or-mask` makes the head-surface extraction "much more robust" because
  samseg effectively supplies a head mask ([`scripts/mideface:279-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L279-L281)).
- **Exclusion mask restricted to the head.** By default the dilated brain
  segmentation is masked to the head (`--mask-seg-to-head`) so stray skull
  voxels do not enlarge the protected region ([`scripts/mideface:312-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L312-L313)).
- **Hard validation.** Missing `--i`/output, a missing atlas dir, a missing
  `--init-reg`/`--imconvert`/`--atlas` file, and the mutually-exclusive flag
  combinations above all abort with explicit messages
  ([`scripts/mideface:850-906`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L850-L906)). Any internal command returning non-zero
  jumps to `error_exit` and writes the failing command to the error file.
- **Provenance.** The embedded watermark lets `--check` later confirm a volume
  was defaced, guarding against accidentally releasing an un-defaced scan.

## Related Tools

- [[mri_defacer]] — the C++ engine `mideface` drives (does the voxel removal, watermark, ripple, `--apply`, and `--check`/`--check-code`).
- [[mri_deface]] — the legacy GCA-atlas defacer that `mideface` supersedes.
- [[deface_subject]] — stand-alone wrapper around the legacy `mri_deface`.
- [[samseg]] — builds the brain exclusion mask and the subject→atlas registration (run full or registration-only).
- [[mkheadsurf]] — extracts the subject head mask and surface that bound the defacing.
- [[bbregister]] — optional boundary-based refinement of the face registration.
- [[mris_apply_reg]] — maps the template head/face surface onto the subject.
- [[lta_convert]], [[mri_concatenate_lta]] — compose and invert the atlas→input registration.
- [[wiki/tools/freeview|freeview]] — renders the before/after QA snapshots and the suggested view command.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the
mutually-exclusive-flag rules, the default-on samseg behaviour and its cost,
the atlas-path/`$FREESURFER` subtlety, the `--o`-as-directory fallback, the
`--apply`/`--check` stand-alone modes, the QA outputs, and the orchestration
order — all read directly from [`scripts/mideface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface) and confirmed against
`mideface --help` and the contents of `$FREESURFER_HOME/average/mideface-atlas`.

> [!gap] Engine internals
> The distance-bound math, the background-mode fill, the watermark/ripple
> embedding, and the provenance "code" are implemented in
> [[mri_defacer]] (`mideface.h`), not in this script, and are documented there.

> [!gap] Resource figures are from the help text
> The "~14 GB / +20–40 min" (samseg) and "~35 GB / +20 min" (synthseg) figures
> are quoted from the help/comments ([`scripts/mideface:934`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L934), [`scripts/mideface:939`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L939)),
> not benchmarked on this system.

## References

- FreeSurfer source: [`scripts/mideface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface) (v8.2.0).
- Defacing engine: [`mri_deface/mri_defacer.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_deface/mri_defacer.cpp) → [[mri_defacer]].
- FreeSurfer wiki: [MiDeFace](https://surfer.nmr.mgh.harvard.edu/fswiki/MiDeFace) (referenced from the script's `BEGINHELP`, [`scripts/mideface:978`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L978)).
