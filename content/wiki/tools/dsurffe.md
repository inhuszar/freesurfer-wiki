---
title: "dsurffe"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/dsurffe"
families: []                     # deep-learning toolbox frontend, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[topofit]]"
  - "[[mri_synthstrip]]"
  - "[[mri_synthmorph]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[bbregister]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The deepsurfer Python package (version 0.1.1a5) ships separately from the FreeSurfer source tree; subcommand details were read from the installed site-packages copy, not from a versioned GitHub path, so their source-line links point to scripts/dsurffe (the wrapper) only."
  - "The package authors label every method 'experimental'; the train and preprocess (dev) subcommands are developer-facing and were documented from --help only."
tags:
  - deep-learning
  - surface
  - topofit
  - synthstrip
  - frontend
  - dispatcher
---

# dsurffe

## Summary

`dsurffe` is the command-line **frontend for the `deepsurfer` package** — a
PyTorch-based, learning-based toolbox for brain-image analysis bundled with
FreeSurfer 8 (`fspython`). The script is a 16-line Python launcher that simply
calls `deepsurfer.system.commandline.execute()`; all behaviour lives in the
`deepsurfer` package, which dispatches on the first argument to a registered
**subcommand**. The headline subcommand is `fit-cortex` (TopoFit: rapid
deep-learning reconstruction of topologically-correct white and pial cortical
surfaces from a T1), and the toolbox also exposes deep-learning skull-stripping
(`strip`, i.e. SynthStrip), brain cropping (`crop`), affine template alignment
(`align-template`), header-orientation correction (`correct-matrix`), and two
developer tools (`preprocess`, `train`). Despite the name, `dsurffe` is **not** a
single surface tool — it is a multi-tool dispatcher; its true behaviour is
whatever subcommand you give it.

## Source Information

- **Language:** Python 3 (`#!/usr/bin/env python3`)
- **Source file (wrapper):** [`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe)
- **Binary/script location:** `$FREESURFER_HOME/bin/dsurffe` (installed via `install_pyscript_fspython_tree`, [`scripts/CMakeLists.txt:310`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L310))
- **Backing package:** `deepsurfer` (version 0.1.1a5), installed under `fspython` site-packages; entry point `deepsurfer.system.commandline.execute`. Requires `numpy`, `scipy`, `pyyaml`, `surfa`, `torch`.
- **What the wrapper does:** imports `execute` from `deepsurfer.system.commandline`, prints `starting ds frontend`, runs `execute()`, reports `surfa.system.vmpeak()`, prints `ds frontend finished`, and exits with the subcommand's return code ([`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe)).

## Purpose and Context

FreeSurfer 8 ships several deep-learning models (skull-stripping, registration,
surface placement) that share preprocessing (cropping, orientation correction,
affine alignment to a template) and a common device/IO layer. `deepsurfer`
packages those models and `dsurffe` (`ds`) is the single command that exposes
them as subcommands, grouped into three categories: **Image Processing**,
**Cortical Surface Processing**, and **Development Tools**.

The dispatcher logic is small: with no argument (or `help`/`--help`) it prints
the categorised subcommand list; otherwise it looks the first token up in the
registry and runs that subcommand's `func()`
(`deepsurfer/system/commandline.py:execute`). Each subcommand registers itself
with an `@subcommand(name, category, help)` decorator.

In the FreeSurfer scripts, `dsurffe` is called by [[topofit]], which runs
`dsurffe fit-cortex --image <T1> --threads <n> --outdir <dir> --io si` to place
cortical surfaces ([`scripts/topofit:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L121)). It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

> [!gotcha] The name is misleading — inspect the subcommand, not the script
> "dsurffe" looks like a single surface tool, but it is the deepsurfer toolbox
> dispatcher. The same binary skull-strips, crops, aligns, fixes headers, fits
> cortical surfaces, and (for developers) trains models, depending entirely on
> the first argument. Read the subcommand's `--help` to know what it will do.

## Inputs

### Required Inputs

The required inputs depend on the subcommand. The dispatcher itself requires a
**subcommand name** as the first argument; with none it prints help and returns 1
(`commandline.py:execute`). Common patterns:

- Most subcommands take a single input medical image with `-i/--image` (any
  `surfa`/FreeSurfer-readable volume — `nii`/`nii.gz`/`mgz`…), and **none of them
  require the input to be pre-processed** (the models are robust to contrast,
  resolution, and orientation).
- `fit-cortex` additionally **requires** `--io {fs|si}` to choose the output
  layout, and takes `-o/--outdir` (a directory).
- `preprocess` takes two positional directories (a recon'ed FreeSurfer subject
  and an output directory).

### Input Assumptions

> [!assumption] T1-weighted input for surface fitting; robust elsewhere
> `fit-cortex` estimates the white and pial surfaces from a **T1-weighted**
> image; the other image tools (`strip`, `crop`, `align-template`,
> `correct-matrix`) accept any adult-brain contrast/resolution and do not need
> skull-stripping or pre-processing. `fit-cortex` and `strip` can also be
> restricted to one hemisphere/contrast as noted. The `--list` (multi-image)
> mode is parsed but **disabled for `fit-cortex`** (it calls a fatal error,
> deepsurfer `modules/topofit.py`).

## Outputs

### Files Created

Output depends on the subcommand and (for `fit-cortex`) the `--io` format.

For **`fit-cortex --io si`** (single output directory, NIfTI-compatible) the
deepsurfer IO map produces:

| File (in `--outdir`) | Contents |
|----------------------|----------|
| `cortex.wm.lh.srf`, `cortex.wm.rh.srf` | white-matter (interior) surface meshes |
| `cortex.gm.lh.srf`, `cortex.gm.rh.srf` | pial (exterior/grey-matter) surface meshes |
| `image.raw.mgz`, `image.stripped.mgz` | the input and skull-stripped image |
| `affine.template.lta` | the template→image affine alignment |

For **`fit-cortex --io fs`** the same products are written into a standard
FreeSurfer subject layout instead: `surf/lh.white`, `surf/rh.white`,
`surf/lh.pial`, `surf/rh.pial`, `mri/brainmask.mgz`,
`mri/transforms/talairach.lta`, etc. (deepsurfer `resource/iotypes/fs.yaml`).

Other subcommands write a single file each: `strip` → masked image (`-o/--out`);
`crop` → cropped image (`-c/--cropped`); `align-template` → affine transform
(`-a/--affine`, in world/scanner coordinates); `correct-matrix` →
orientation-fixed image (`-f/--fixed`). `preprocess` writes a `dsprep`
subdirectory under the FreeSurfer subject.

### Output Specifications

`fit-cortex` produces standard cortical surface meshes (the `.srf`/`lh.white`
files); the affine from `align-template` is in world (RAS) coordinates, and its
template's RAS position matches FreeSurfer's `fsaverage` space (so the inverse
moves a subject into a standardised space). Surfaces and transforms are
deepsurfer-native but interoperate with FreeSurfer formats via `surfa`.

## Mathematical Foundations

> [!internal] All numerics are in the deepsurfer PyTorch models
> The `dsurffe` wrapper does no computation. Each subcommand loads a pretrained
> `torch` model (e.g. `topofit-beta-5.pt`, `synthstrip-1.pt`,
> `template-alignment-1.pt`, `brain-cropping-1.pt`) and runs inference on a
> configured device (CPU/GPU). The methods are published deep-learning models;
> see the references for the underlying papers.

> [!math] TopoFit cortical surface fitting
> `fit-cortex` implements **TopoFit** (Hoopes et al., MIDL 2022): a graph-neural
> network that deforms a topologically-correct template mesh toward the cortical
> tissue boundaries, jointly learning image features and mesh deformation, so the
> output white/pial surfaces are guaranteed sphere-topology without an explicit
> topology-correction step. `strip` implements **SynthStrip** (Hoopes et al.,
> NeuroImage 2022), a contrast- and resolution-agnostic learned skull-stripping
> model.

## Configuration Options

### Subcommands (the primary "options")

Registered via `@subcommand` across the deepsurfer package (decorator in
deepsurfer `system/commandline.py`; registrations in `modules/`, `preprocess.py`,
`training.py`).

| Subcommand | Category | Description |
|------------|----------|-------------|
| `fit-cortex` | Cortical Surface Processing | Fit white (interior) and pial (exterior) cortical surface meshes to a T1 (TopoFit). |
| `strip` | Image Processing | Robust skull-stripping of any-contrast/any-resolution brain image (SynthStrip). |
| `crop` | Image Processing | Crop an image to the bounding box around the brain. |
| `align-template` | Image Processing | Affinely align the deepsurfer template to the image; outputs a world-coordinate affine. |
| `correct-matrix` | Image Processing | Estimate and fix an incorrect anatomical orientation in the image header. |
| `preprocess` | Development Tools | Preprocess a recon'ed FreeSurfer subject for model training (writes `dsprep/`). |
| `train` | Development Tools | Universal model-training utility. |

### Frontend / dispatcher behaviour

| Invocation | Behaviour |
|------------|-----------|
| `dsurffe` (no args) | Print the categorised subcommand list and return 1 (`commandline.py:execute`). |
| `dsurffe help` / `dsurffe --help` | Same help text (the `-`/`help` check), return 0. |
| `dsurffe <unknown>` | Print `error: '<x>' is not a known deepsurfer subcommand` and return 1. |
| `dsurffe <sub> --help` | Print that subcommand's own usage/options. |

### Common subcommand flags

These appear across most image subcommands (from the deepsurfer argument parsers
and `--help`):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i`, `--image` | file | — | Single input image. |
| `--list` | file | — | Two-column (input, output) list for batch mode. **Disabled for `fit-cortex`.** |
| `--io` | format | *(required for `fit-cortex`; optional for `crop`/`align-template` batch)* | IO layout: `fs` (FreeSurfer subject tree) or `si` (single dir, NIfTI-style). |
| `--cpu` | flag | off | Force CPU even if a GPU is available (`strip`, `align-template`, `fit-cortex`). |
| `--gpu` | flag | off | Force GPU (`crop`, `correct-matrix`, which default to CPU for a single image). |
| `--threads` | int | max available | Number of CPU threads. |
| `--model` | file | bundled | Use an alternative model file. |
| `--suffix` | str | — | Suffix appended to output filenames. |
| `--debug` | flag | off | Verbose debugging output. |
| `--no-cite` | flag | off | Suppress the citation request (`strip`, `fit-cortex`). |

### Subcommand-specific flags

| Subcommand | Flag | Default | Description |
|------------|------|---------|-------------|
| `fit-cortex` | `-o`, `--outdir` | — | Output directory. |
| `fit-cortex` | `-a`, `--alignment` | — | Pre-computed initial affine alignment (preprocessed-file hack). |
| `fit-cortex` | `--hemi` | both | Reconstruct only `L` or `R` hemisphere. |
| `fit-cortex` | `--alignment-model` | bundled | Alternative template-alignment model file. |
| `strip` | `-o`, `--out` | — | Masked (skull-stripped) output image. |
| `strip` | `-b`, `--border` | `1` | Mask border threshold in mm. |
| `crop` | `-c`, `--cropped` | — | Cropped output image. |
| `crop` | `--margin` | `10` | Crop margin from the brain boundary, mm. |
| `crop` | `--shape` | — | Fix the cropped image shape (three ints, centred on brain). |
| `crop` | `--subjs` | — | Subjects to process (requires `--io`). |
| `align-template` | `-a`, `--affine` | — | Template-to-image affine output. |
| `align-template` | `--subjs` | — | Subjects to process (requires `--io`). |
| `correct-matrix` | `-f`, `--fixed` | — | Orientation-fixed output image. |
| `preprocess` | `DIR DIR` (positional) | — | recon subject dir, then output dir. |
| `preprocess` | `--all` | — | Run all preprocessing components (recommended). |
| `preprocess` | `--img-copy`/`--img-seg`/`--img-crop`/`--img-mask`/`--synth-density`/`--surf-resample`/`--surf-seg` | — | Run individual components. |
| `preprocess` | `--synth-density-source` | `t1w` | Source modality for `samseg` tissue-density creation. |

### Configuration Interactions

> [!gotcha] `fit-cortex` requires `--io` and rejects `--list`
> `--io {fs|si}` is mandatory for `fit-cortex` (it produces multiple outputs and
> needs to know the layout); omitting it is a parse error. Multi-image `--list`
> mode is present in the parser but immediately fatals with "`--list` is not
> supported right now" (deepsurfer `modules/topofit.py`), so `fit-cortex` is
> single-image only in this release.

> [!gotcha] CPU/GPU defaults differ by subcommand
> `crop` and `correct-matrix` **default to CPU** for a single image (GPU
> init is slower than the work) and expose `--gpu` to force the GPU; `strip`,
> `align-template`, and `fit-cortex` default to GPU when available and expose
> `--cpu` to force CPU. Pick the right flag for your subcommand.

> [!gotcha] `--io fs` writes into a FreeSurfer subject tree
> With `--io fs`, outputs are written to recon-style paths under the output
> directory (`surf/lh.white`, `mri/brainmask.mgz`, `mri/transforms/talairach.lta`,
> …). With `--io si` everything goes into one flat directory with NIfTI-style
> names. Choose `si` if you do not want a full subject layout.

## Typical Use Cases

### 1. Fit cortical surfaces to a T1 (single directory output)

```bash
dsurffe fit-cortex --image image.nii.gz --outdir processed --io si
# → processed/cortex.wm.?h.srf, processed/cortex.gm.?h.srf, ...
```

### 2. The invocation used by topofit

```bash
# What scripts/topofit runs internally:
dsurffe fit-cortex --image $invol --threads $threads --outdir $outdir/work --io si
```

### 3. Skull-strip any brain image (SynthStrip)

```bash
dsurffe strip --image image.nii.gz --out stripped.nii.gz
```

### 4. Crop around the brain / fix header orientation

```bash
dsurffe crop --image image.nii.gz --cropped cropped.nii.gz --margin 10
dsurffe correct-matrix --image image.nii.gz --fixed fixed.nii.gz
```

### 5. Affinely align to the (fsaverage-positioned) template

```bash
dsurffe align-template --image image.nii.gz --affine tmpl2img.lta
```

## Pipeline Context

`dsurffe` is a stand-alone deep-learning toolbox frontend. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Within FreeSurfer scripts
it is driven by [[topofit]] for the cortical-surface step.

**Predecessor:** a T1 (any preprocessing optional) → **dsurffe fit-cortex** (via
[[topofit]]) → **Successor:** surface-based analysis tools, or the rest of a
recon workflow. The image subcommands (`strip`/`crop`/`align-template`/
`correct-matrix`) are general-purpose preprocessing utilities and overlap in
function with the C/Python tools [[mri_synthstrip]] and [[mri_synthmorph]].

## Gotchas and Caveats

> [!gotcha] "Experimental — review the outputs"
> The deepsurfer help epilogue states the methods are experimental and "should
> not be used for formal analysis without substantial review of the outputs"
> (`commandline.py:help_text_epilogue`). Treat `dsurffe` results, especially
> surfaces, as needing QC.

> [!gotcha] The frontend prints framing lines to stdout
> Every run prints `starting ds frontend` / `deepsurfer VmPeak …` /
> `ds frontend finished` around the subcommand output
> ([`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe)). Scripts parsing stdout must account for these.

> [!gotcha] Usage strings say `ds`, not `dsurffe`
> The deepsurfer help and examples use the package's own command name `ds`
> (e.g. `ds fit-cortex …`); the installed FreeSurfer binary is `dsurffe`. They
> are the same program — substitute `dsurffe` for `ds`.

## Error Compensation and Guard Rails

- **Unknown subcommand handling.** An unrecognised first argument prints a clear
  error and returns 1 rather than crashing (`commandline.py:execute`).
- **`--hemi` validation.** `fit-cortex` rejects any `--hemi` value not starting
  with `L`/`R` with a fatal message (deepsurfer `modules/topofit.py`).
- **Robust inputs by design.** The image models are trained to tolerate arbitrary
  contrast, resolution, and orientation, so they compensate for un-conformed
  input rather than requiring it.
- **Return-code propagation.** The wrapper returns the subcommand's exit code (0
  if it returns `None`), so callers can branch on success/failure
  ([`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe)).

## Related Tools

- [[topofit]] — the FreeSurfer tcsh wrapper that calls `dsurffe fit-cortex` to place cortical surfaces; the user-facing entry to TopoFit in a recon workflow.
- [[mri_synthstrip]] — FreeSurfer's standalone SynthStrip tool; `dsurffe strip` is the deepsurfer-package equivalent.
- [[mri_synthmorph]] — learned registration; overlaps with `dsurffe align-template` (affine to the template/fsaverage space).
- [[wiki/tools/mri_convert|mri_convert]] — used elsewhere to convert between the deepsurfer outputs and FreeSurfer formats.
- [[bbregister]] — classical boundary-based registration, a non-learning counterpart to `align-template` for moving data into anatomical/standard space.

## Confidence and Gaps

**High confidence:** that `dsurffe` is the deepsurfer dispatcher; the full
subcommand catalogue and categories; the `fit-cortex` (TopoFit) and `strip`
(SynthStrip) identities; the `--io fs`/`si` output maps; the per-subcommand flag
sets; and the `topofit` call site — verified from the wrapper
[`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe), the installed `deepsurfer` package
(`commandline.py`, `modules/*.py`, `resource/iotypes/*.yaml`), and live `--help`
output.

> [!gap] Package is out-of-tree and pre-release
> `deepsurfer` (0.1.1a5) is installed separately from the FreeSurfer source tree,
> so its code cannot be linked to a versioned GitHub path here; the wrapper is the
> only in-repo source. Subcommand internals (`train`, `preprocess`) are
> developer-facing and were captured from `--help` and parser code, not exercised.

## References

- FreeSurfer source (wrapper): [`scripts/dsurffe`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dsurffe) (v8.2.0).
- deepsurfer package: `github.com/freesurfer/deepsurfer` (the help epilogue's readme pointer).
- Hoopes A, Iglesias JE, Fischl B, Greve D, Dalca A. *TopoFit: Rapid Reconstruction of Topologically-Correct Cortical Surfaces.* MIDL: Medical Imaging with Deep Learning, 2022. (the `fit-cortex` method)
- Hoopes A, Mora JS, Dalca AV, Fischl B, Hoffmann M. *SynthStrip: Skull-Stripping for Any Brain Image.* NeuroImage 206 (2022), 119474. (the `strip` method)
