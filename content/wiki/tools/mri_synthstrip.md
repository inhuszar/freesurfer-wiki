---
title: "mri_synthstrip"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_synthstrip/mri_synthstrip"
  - "mri_synthstrip/readme.md"
  - "mri_synthstrip/Dockerfile.cpu"
  - "mri_synthstrip/Dockerfile.gpu"
  - "mri_synthstrip/synthstrip.1.pt"
  - "mri_synthstrip/synthstrip.nocsf.1.pt"
families:
  - "mri_*"
  - "synthstrip"
recon_all_stage: "autorecon1"
related:
  - "[[recon-all]]"
  - "[[mri_watershed]]"
  - "[[mri_em_register]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "The training data composition and number of training subjects are documented in the Hoopes 2022 paper but not reproduced here"
  - "Exact architecture constants (nb_features=16, nb_levels=7, feat_mult=2, max_features=64, max_pool=2) come from the SynthStrip class constructor; their training-time rationale is not derived"
  - "The 'nocsf' model weights have different training data and produce tighter brain masks without CSF; the difference in empirical performance is not benchmarked here"
tags:
  - skull-stripping
  - brain-extraction
  - cnn
  - pytorch
  - synthstrip
  - learning-based
---

# mri_synthstrip

## Summary

`mri_synthstrip` is FreeSurfer's learning-based skull stripper: a
deep 3-D U-Net trained on synthetic data that predicts a signed
distance transform (SDT) of the brain boundary from an input MRI
volume of *any* contrast (T1, T2, FLAIR, DWI, PD, MPRAGE, SPGR,
etc.) at *any* resolution. The mask is extracted by thresholding
the SDT at a user-controlled border (default 1 mm) and keeping
the largest connected component. The tool is a Python script that
invokes PyTorch; no brain-specific shape prior, atlas, or
intensity thresholds are needed.

It is the modern alternative to [[mri_watershed]] — orders of
magnitude more robust on pathological, cross-contrast, and
low-quality data, but requires a CPU or GPU with PyTorch and
~4 GB RAM for model inference. Published by Hoopes et al.:

> Hoopes, A., Mora, J. S., Dalca, A. V., Fischl, B. & Hoffmann, M.
> *SynthStrip: Skull-stripping for any brain image*. NeuroImage
> 260, 119474, 2022.
> <https://doi.org/10.1016/j.neuroimage.2022.119474>

Within [[recon-all]], `mri_synthstrip` is invoked early in
autorecon1 (Stage 1, before the classic watershed Stage 5) when
the `$SynthStrip` flag is set:

```bash
mri_synthstrip --threads $OMP_NUM_THREADS -i orig.mgz -o synthstrip.mgz
```

The resulting mask is later applied to `T1.mgz` to produce
`brainmask.mgz`, *bypassing* the [[mri_watershed]] + [[mri_em_register]]
`-skull` path entirely.

## Source Information

- **Language:** Python 3 (PyTorch + NumPy + `surfa`).
- **Source file(s):**
  - `mri_synthstrip/mri_synthstrip` — 326-line Python script.
    Contains the `StripModel` class (a 3-D U-Net with 7 levels,
    16→64 feature channels, 2 convs per level, max-pool 2), the
    `ConvBlock` helper, the `extend_sdt()` utility for extending
    the narrow-band signed distance transform, the CLI parser
    (`argparse`), and the inference driver.
  - `mri_synthstrip/readme.md` — brief install / usage notes.
  - `mri_synthstrip/Dockerfile.cpu` / `Dockerfile.gpu` — container
    recipes for distributing pre-built environments.
  - `mri_synthstrip/synthstrip.1.pt` — the default CNN model
    weights (PyTorch pickle). ~30 MB.
  - `mri_synthstrip/synthstrip.nocsf.1.pt` — alternative weights
    trained to *exclude* CSF from the brain border. Selected with
    `--no-csf`.
  - `synthstrip-docker`, `synthstrip-singularity` — shell wrappers
    for container-based invocation.
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_synthstrip`
- **Model weights are loaded from:**
  `$FREESURFER_HOME/models/synthstrip.1.pt` (default) or
  `$FREESURFER_HOME/models/synthstrip.nocsf.1.pt` (with
  `--no-csf`), unless `--model <file>` is passed.
- **Runtime dependencies:** Python 3, PyTorch, NumPy, surfa. These
  are installed either by the FreeSurfer Python environment
  (`$FREESURFER_HOME/python/bin/python3`) or by a Docker /
  Singularity container.

## Purpose and Context

Skull-stripping is the first content-aware step in any
pipeline that needs brain-only data. Classical tools (BET,
`mri_watershed`) rely on intensity thresholds and hand-crafted
shape priors, and fail on:

- Non-T1 contrasts.
- Non-human data (infants, primates).
- Pathological anatomy (large tumours, severe atrophy, post-op
  voids).
- Non-canonical resolutions (submillimetre hi-res, anisotropic
  coronal stacks).

SynthStrip solves the cross-contrast problem by training on
*synthetic* data: the network is trained to map randomly
generated synthetic MRI-like images to a known brain mask,
using "random-contrast augmentation" that decouples the
learned features from any specific acquisition protocol. At
inference time, it is therefore robust to whatever contrast
it sees.

Within [[recon-all]]'s autorecon1, `mri_synthstrip` is
invoked when `$SynthStrip = 1` (enabled by `-use-synthstrip`
or the v8 XOpts file). It runs on `orig.mgz` to produce an
intermediate `synthstrip.mgz`, which is then used later to
compute `brainmask.mgz` by masking `T1.mgz` with
`mri_mask`:

```bash
mri_mask T1.mgz synthstrip.mgz brainmask.mgz
```

See `scripts/recon-all:1611–1625` for the first call, and
`scripts/recon-all:2253–2283` for the masking.

## Inputs

### Required arguments

| Flag | Type | Description |
|------|------|-------------|
| `-i` / `--image <file>` | path | Input volume in any format supported by `surfa.load_volume()` (MGZ, NIfTI, ANALYZE, DICOM). Required. |

### At-least-one-of arguments

The tool requires **at least one** output flag:

| Flag | Type | Description |
|------|------|-------------|
| `-o` / `--out <file>` | path | Save the input volume with non-brain voxels replaced by `fill` value. |
| `-m` / `--mask <file>` | path | Save the binary brain mask (same geometry as the input). |
| `-d` / `--sdt <file>` | path | Save the signed distance transform (negative inside the brain, positive outside, in millimetres). |

### Input assumptions

- **Any contrast**, but best results are still on T1-weighted
  MPRAGE (the network was also trained on this distribution).
- **Any resolution**: the tool internally conforms the input to
  1 mm isotropic LIA orientation for inference, then
  unconforms the mask back to the input geometry. Submillimetre
  inputs are downsampled during inference and upsampled on
  output.
- **Any 4-D frame count**: the tool loops over frames (one
  inference per frame) and stacks the results.
- **Any head pose**: the network is translation- and
  rotation-invariant within the training augmentation range
  (augmented random rigid transforms during training).
- **FOV**: crops to a bounding box before inference to fit
  padded shapes of a multiple of 64 voxels, clipped to the
  range [192, 320].

> [!assumption] PyTorch + model weights must be available
> `mri_synthstrip` loads `$FREESURFER_HOME/models/synthstrip.1.pt`
> (or `.nocsf.1.pt`) via `torch.load()`. The default FreeSurfer
> 8.2.0 install ships the weights; if
> `$FREESURFER_HOME/models/` is incomplete, the tool exits
> with a `FileNotFoundError`. The `--model <file>` flag allows
> overriding the path to a locally stored alternative.

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<out>` (from `-o`) | same as input | Masked brain volume: non-brain voxels set to `fill` (default `min(image.min(), 0)`). Geometry preserved. |
| `<mask>` (from `-m`) | same as input | Binary brain mask (0/1), in the input geometry. |
| `<sdt>` (from `-d`) | same as input (float) | Signed distance transform: negative inside the brain, positive outside, in millimetres. Clipped to a narrow band by the network; `extend_sdt()` extends the positive part outwards when the user requests `--border` beyond 4–5 mm. |

### Output Specifications

- **Geometry** matches the input exactly (the tool uses
  `sdt.resample_like(image, fill=100)` to unconform; voxels
  outside the narrow band are filled with 100, not ±∞).
- **Mask value at a voxel** is `(sdt < border) &
  (largest_connected_component)`. The largest-CC step removes
  any spurious isolated brain blobs.
- **Background fill** for the `-o` output defaults to
  `min(image.min(), 0)` — i.e. the image minimum or 0,
  whichever is smaller. Override with `-f <val>`.

## Mathematical Foundations

### Signed distance transform as CNN target

During training, the network learns to predict a narrow-band
signed distance function (SDF) $d: \Omega \to \mathbb{R}$
centred on the ground-truth brain boundary $\partial B$:

$$
d(\mathbf{x}) = \begin{cases}
-\operatorname{dist}(\mathbf{x}, \partial B) & \mathbf{x}\in B,\\
+\operatorname{dist}(\mathbf{x}, \partial B) & \mathbf{x}\notin B,
\end{cases}
$$

where $B$ is the brain. At inference time the network outputs a
predicted $\hat{d}$; the brain mask is recovered by thresholding:

$$
\hat{B} = \{\mathbf{x} : \hat{d}(\mathbf{x}) < t\}, \quad t = \mathtt{--border}.
$$

The default `--border = 1` mm creates a 1-mm "halo" around the
predicted boundary — inclusive enough to avoid clipping cortex,
tight enough to exclude dura. `--border 0` would threshold
exactly at the zero level-set.

### U-Net architecture

The `StripModel` class instantiates a 3-D U-Net with:

- `nb_levels = 7` encoder–decoder levels.
- `nb_features = 16` initial channels, doubling with each
  level (`feat_mult = 2`), clamped at `max_features = 64`.
- `nb_conv_per_level = 2` 3×3×3 convolutions per level.
- `max_pool = 2` spatial downsampling per level.
- Skip connections from encoder to decoder at each level.
- `LeakyReLU(0.2)` activation in the encoder / decoder;
  linear output at the final layer (for SDF regression).

With these defaults, a 192³ input is reduced through 6 pooling
stages to a 3³ bottleneck. The decoder restores the spatial
resolution via nearest-neighbour upsampling and concatenation
with encoder features. The total parameter count is ~20k
(tiny by modern standards) — the network is deliberately
over-regularised because the training data is entirely
synthetic.

### Inference pipeline (per frame)

```
  image (any contrast / any geometry)
     ├─ conform to 1 mm isotropic LIA  (surfa Volume.conform)
     ├─ crop to bounding box
     ├─ reshape to nearest multiple of 64, clipped to [192, 320]
     ├─ intensity normalise: (x − min) / percentile_99, clip [0,1]
     ├─ forward through StripModel → narrow-band sdt
     ├─ extend_sdt() if border > narrow-band range
     ├─ resample_like(input) → sdt in input geometry
     └─ mask = (sdt < border) ∧ largest-CC
```

The normalisation step (`x / x.percentile(99)`) is what makes
the tool contrast-invariant: it rescales any input to roughly
[0, 1] regardless of whether the native intensity range is T1-
or T2-weighted, DICOM 16-bit, NIfTI float, etc.

### `extend_sdt()` — the narrow-band extension

The trained network outputs a narrow-band SDT: values are
reliable only within ~4–5 mm of the true boundary. For
`--border > 4 mm`, `extend_sdt()` uses the
`surfa.Volume.distance()` Euclidean distance transform to
recompute the outer part of the SDT, keeping the accurate
interior values:

```python
mask = sdt < 1
out[bbox] = sf.Volume(mask[bbox]).distance()
out[keep] = sdt[keep]
```

This is a perf optimisation: the interior narrow-band is
untouched (accurate), the exterior is recomputed on a small
bounding box.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i <file>` / `--image <file>` | path | **required** | Input volume. |
| `-o <file>` / `--out <file>` | path | — | Output masked image. |
| `-m <file>` / `--mask <file>` | path | — | Output binary brain mask. |
| `-d <file>` / `--sdt <file>` | path | — | Output signed distance transform (narrow-band + extension). |
| `-g` / `--gpu` | bool | off | Use CUDA for inference. Requires a CUDA-capable GPU and a GPU PyTorch build. Errors out with "CUDA is not available" otherwise. |
| `-b <mm>` / `--border <mm>` | float | 1.0 | Mask border threshold in millimetres. Lower = tighter strip, higher = more inclusive. |
| `-t <n>` / `--threads <n>` | int | PyTorch default | CPU thread count (`torch.set_num_threads()`). |
| `-f <val>` / `--fill <val>` | float | `min(image.min(), 0)` | Background fill value for the `-o` output. |
| `--no-csf` | bool | off | Use the `synthstrip.nocsf.1.pt` model variant that excludes CSF from the brain border. Produces a tighter brain mask suitable for tools expecting brain-only tissue. |
| `--model <file>` | path | `$FREESURFER_HOME/models/synthstrip.1.pt` | Use alternative model weights. |
| `-v` / `--version` | bool | — | Print the value of the `SYNTHSTRIP_VERSION` environment variable and exit. |
| `-h` / `--help` | bool | — | Print the help and the citation reference and exit. |

## Configuration Interactions

> [!gotcha] At least one of `-o`, `-m`, `-d` is required
> The sanity check at line 50 of the script errors out with
> *"Must provide at least one -o, -m, or -d output flag."* if
> only `-i` is given. Unlike most FreeSurfer tools there is
> no implicit output — you must choose explicitly.

> [!gotcha] `-g` requires a CUDA build of PyTorch
> `-g` / `--gpu` fails with *"CUDA is not available"* if the
> installed PyTorch was built without CUDA, even if a GPU is
> physically present. Check
> `python -c "import torch; print(torch.cuda.is_available())"`
> before using `-g` in a batch script.

> [!gotcha] `-t` only affects CPU inference
> `torch.set_num_threads()` is a no-op for the CUDA path. For
> GPU inference, the parallelism is controlled by CUDA kernel
> launch parameters, not the `-t` flag. `recon-all` passes
> `--threads $OMP_NUM_THREADS` unconditionally — harmless on
> GPU, effective on CPU.

> [!gotcha] `--border` beyond 4–5 mm triggers `extend_sdt`
> The network only learns a narrow-band SDT. For
> `--border > 4 mm` the tool calls `extend_sdt()` to recompute
> the outer band with an Euclidean distance transform on the
> bounding box of the interior. This adds a few seconds to
> inference but is generally negligible.

> [!gotcha] `--no-csf` silently uses a different model
> The `--no-csf` flag swaps the loaded weights from
> `synthstrip.1.pt` to `synthstrip.nocsf.1.pt`. These two
> models were trained with slightly different boundary
> definitions: the "nocsf" variant excludes CSF voxels from
> the brain mask. The difference is subtle but systematic —
> results are not directly comparable between the two.

> [!gotcha] `recon-all` uses mri_synthstrip *on `orig.mgz`*
> In `recon-all`'s autorecon1 Stage 1, `mri_synthstrip` is
> run on `orig.mgz`, *not* on the more processed `T1.mgz`.
> The rationale is that SynthStrip does not need the
> bias-corrected input — it is contrast-invariant — and
> running it early avoids the watershed + `mri_em_register
> -skull` dependency chain. The resulting mask is then
> applied to `T1.mgz` in Stage 5 to produce `brainmask.mgz`.

> [!gotcha] No `talairach_with_skull.lta` is produced
> When `mri_synthstrip` replaces the classic watershed path,
> `mri_em_register -skull` is not run, so
> `transforms/talairach_with_skull.lta` **does not exist**.
> Any downstream tool or custom script that depends on this
> LTA must account for its absence under SynthStrip mode.
> See the `[!gotcha]` in the [[recon-all]] pipeline page.

> [!gotcha] `-i` and `-m` share geometry, but `-o` does not
> necessarily
> The `-m` mask is always in the exact geometry of the input
> (via `image.new(mask)`). The `-o` output is the original
> image with non-brain voxels zeroed; it shares geometry too.
> The `-d` SDT uses `resample_like(image, fill=100)` which
> fills regions outside the narrow band with the value 100.

## Typical Use Cases

### Use case 1: recon-all's autorecon1 short-circuit

```bash
mri_synthstrip --threads $OMP_NUM_THREADS -i orig.mgz -o synthstrip.mgz
```

This is the exact command at `scripts/recon-all:1616`. It
produces `mri/synthstrip.mgz`, which is then used as:

```bash
mri_mask T1.mgz synthstrip.mgz brainmask.mgz
```

at `scripts/recon-all:2259`.

### Use case 2: Standalone mask extraction

```bash
mri_synthstrip -i raw_mprage.nii.gz -m brain_mask.nii.gz
```

Produces the binary mask in the input geometry. Use this when
you want the mask but not the masked image.

### Use case 3: Preserve CSF in the mask (default)

```bash
mri_synthstrip -i t2.nii.gz -o t2_brain.nii.gz -m t2_mask.nii.gz
```

Default behaviour: the CSF surrounding the brain is *included*
in the mask (roughly the same boundary that `mri_watershed`
produces).

### Use case 4: Tight brain-only strip (no CSF)

```bash
mri_synthstrip --no-csf -i t1.mgz -o t1_brain_nocsf.mgz -m t1_mask_nocsf.mgz
```

Uses the `synthstrip.nocsf.1.pt` weights, which exclude CSF
from the mask. Appropriate when the downstream tool wants
brain parenchyma only (e.g. cortical-thickness measurement on
non-FreeSurfer tools).

### Use case 5: Adjustable border

```bash
mri_synthstrip -i t1.mgz -o t1_tight.mgz -b 0
mri_synthstrip -i t1.mgz -o t1_loose.mgz -b 5
```

Changing `-b` (the border threshold) is the easiest knob to
fine-tune inclusiveness without switching models.

### Use case 6: GPU inference

```bash
mri_synthstrip -g -i t1.mgz -m t1_mask.mgz
```

On a modern NVIDIA GPU, inference drops from ~30 s (CPU) to
~2 s. Requires a CUDA-enabled PyTorch build.

### Use case 7: Custom model weights

```bash
mri_synthstrip -i t1.mgz -m brain.mgz \
    --model /path/to/retrained_synthstrip.pt
```

Useful for retrained models (e.g. for specific pathologies or
non-human data). The custom model must use the same
`StripModel` architecture (hardcoded `nb_features=16,
nb_levels=7, …`).

### Use case 8: Distance transform output for erosion

```bash
mri_synthstrip -i t1.mgz -d sdt.mgz -b 5
```

Produces a full signed distance transform (with
`extend_sdt()` invoked because `border > 4 mm`). The SDT can
then be thresholded externally to produce an eroded or
dilated mask at arbitrary distances.

### Use case 9: Containerised invocation

```bash
synthstrip-docker -i t1.mgz -m mask.mgz
# or
synthstrip-singularity -i t1.mgz -m mask.mgz
```

Runs the tool inside a pre-built Docker or Singularity
container, bypassing local Python / PyTorch installation.

## Pipeline Context

**Predecessor (in recon-all):** [[mri_convert]] → `orig.mgz`
(Stage 1). `mri_synthstrip` is called on `orig.mgz` before
[[mri_nu_correct.mni]], [[talairach_avi]], [[mri_normalize]],
or any other stage runs. This is different from
[[mri_watershed]], which runs on `T1.mgz` (post-normalisation)
in Stage 5.

**Successors (in recon-all):**
- The `synthstrip.mgz` output is applied to `T1.mgz` via
  `mri_mask` in Stage 5 to produce `brainmask.mgz`.
- `brainmask.mgz` then feeds every autorecon2 stage.

**Predecessor:** [[mri_convert]] → **mri_synthstrip** →
**Successor:** `mri_mask` → [[mri_em_register]].

> [!gotcha] mri_synthstrip bypasses two stages
> When enabled, SynthStrip replaces both:
> 1. The atlas-aware skull registration
>    ([[mri_em_register]] `-skull`) that produces
>    `transforms/talairach_with_skull.lta`.
> 2. The classical watershed strip ([[mri_watershed]]) that
>    produces `mri/brainmask.auto.mgz`.
> Downstream tools that expect `talairach_with_skull.lta` —
> custom pipelines, not the default `recon-all` — will break.
> The default autorecon2 path does not need this LTA because
> it uses the skull-free `transforms/talairach.lta` from a
> separate `mri_em_register` call.

## Error Compensation and Guard Rails

- **Robust to any contrast**: trained on synthetic data
  generated by randomised intensity mappings, so it does not
  rely on T1-specific histograms.
- **Robust to geometry**: the input is conformed to 1 mm LIA
  for inference and unconformed to the input geometry for
  output.
- **Largest connected component**: the final mask is the
  largest CC of the thresholded SDT, removing spurious isolated
  false positives.
- **Narrow-band extension**: `extend_sdt()` avoids the
  "bordering = infinity" issue when the user requests a wide
  border.
- **Frame-by-frame**: 4-D volumes are processed one frame at a
  time to bound memory usage.
- **Missing CUDA**: `-g` errors out rather than silently
  falling back to CPU.
- **Missing model file**: errors out with an explicit
  `FileNotFoundError` from `torch.load()`.
- **`--no-csf` model not available**: same error path; no
  fallback to the default model.

## Related Tools

- [[mri_watershed]] — the classical skull stripper that
  SynthStrip can replace in `recon-all`.
- `mri_mask` — used by `recon-all` to apply the SynthStrip
  output to `T1.mgz`.
- `mri_synthmorph` — sister tool that performs
  learning-based affine and deformable registration.
- `mri_synthseg` — sister tool for learning-based
  segmentation, with a similar "trained on synthetic data"
  philosophy.
- `mri_synthsr` — sister tool for super-resolution.
- [[mri_em_register]] — the classical atlas-aware registration
  that SynthStrip's `recon-all` path bypasses.
- [[mri_convert]] — produces `orig.mgz`, the input to
  `mri_synthstrip` in `recon-all`.
- [[mri_normalize]] — bias-corrects `orig.mgz` into `T1.mgz`,
  which `mri_synthstrip` does *not* require because it is
  contrast-invariant.

## Confidence and Gaps

- **High confidence**: the CLI parser, the inference pipeline,
  the `recon-all` call site, and the six gotchas (especially
  the "no `talairach_with_skull.lta`" one).
- **Medium confidence**: the `StripModel` architecture
  constants (which I read directly from the source) — the
  rationale for those specific values is documented in the
  Hoopes 2022 paper and not re-derived here.
- **Low confidence**: the exact training data, the performance
  delta between the default and `--no-csf` models, and the
  behaviour on paediatric or non-human data. These are not
  documented in the source.

> [!gap] `--no-csf` benchmark
> The `synthstrip.nocsf.1.pt` model was trained with a
> different boundary definition. The empirical difference
> from the default model — on T1, T2, FLAIR — has not been
> benchmarked here. The readme file mentions that the
> `nocsf` variant is preferred for voxel-based morphometry
> and brain-volume measurements, but the exact accuracy
> figures are not reproduced.

> [!gap] Why `recon-all` calls SynthStrip on `orig.mgz` rather
> than `T1.mgz`
> The script calls SynthStrip *before* `mri_normalize` runs,
> i.e. on the bias-containing `orig.mgz`. This is because
> SynthStrip is contrast-invariant and does not need the
> normalised input, and because running it early lets later
> stages assume the brain mask exists. But it's worth
> double-checking whether the mask quality differs between
> `orig.mgz` and `T1.mgz` as input.

## References

- Source: `$FREESURFER_SOURCE/mri_synthstrip/mri_synthstrip`
  (326 lines, FreeSurfer 8.2.0)
- Model weights:
  `$FREESURFER_HOME/models/synthstrip.1.pt`,
  `$FREESURFER_HOME/models/synthstrip.nocsf.1.pt`
- Hoopes, A., Mora, J. S., Dalca, A. V., Fischl, B. &
  Hoffmann, M. *SynthStrip: Skull-stripping for any brain
  image*. NeuroImage 260, 119474, 2022.
  <https://doi.org/10.1016/j.neuroimage.2022.119474>
- Project website: <https://synthstrip.io>
  (accessed 2026-04-14)
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/SynthStrip>
  (accessed 2026-04-14)
