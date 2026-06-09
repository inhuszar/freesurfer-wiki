---
title: "AntsDenoiseImageFs"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "AntsDenoiseImageFs/AntsDenoiseImageFs.cpp"
families: []
recon_all_stage: "autorecon2"
related:
  - "[[AntsN4BiasFieldCorrectionFs]]"
  - "[[mri_segment]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_nlfilter]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The five hardcoded filter parameters (epsilon, mean/variance thresholds, smoothing factor/variance) are copied verbatim from the ANTs reference implementation; the rationale for these specific values is not documented in the FreeSurfer source."
tags:
  - denoising
  - ants
  - itk
  - preprocessing
---

# AntsDenoiseImageFs

## Summary

`AntsDenoiseImageFs` denoises an MRI volume using a spatially adaptive,
patch-based non-local-means filter. It is a thin FreeSurfer wrapper around the
ITK class `itkAdaptiveNonLocalMeansDenoisingImageFilter` that ships with the
[ANTs](https://github.com/ANTsX/ANTs) toolbox, implementing the adaptive
non-local means (NLM) method of Manjón et al. (2010). It reads any volume
[[wiki/tools/mri_convert|mri_convert]] can read, denoises each frame
independently with a fixed set of patch/search radii, and writes the result.
It is invoked by [[wiki/pipelines/recon-all|recon-all]] just before white-matter
segmentation when ANTS denoising is enabled.

## Source Information

- **Language:** C++ (ITK-based)
- **Source file:** [`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp)
- **Filter implementation:** [`AntsDenoiseImageFs/itkAdaptiveNonLocalMeansDenoisingImageFilter.hxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/itkAdaptiveNonLocalMeansDenoisingImageFilter.hxx) (vendored from ANTs)
- **Binary/script location:** `$FREESURFER_HOME/bin/AntsDenoiseImageFs`
- **Argument parser:** FreeSurfer `ArgumentParser` (`argparse.h`); help text embedded from [`AntsDenoiseImageFs/AntsDenoiseImageFs.help.xml`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.help.xml)

## Purpose and Context

Thermal and physiological noise in MRI degrades the accuracy of intensity-based
segmentation. Non-local means denoising suppresses that noise while preserving
edges by replacing each voxel with a weighted average of voxels whose
surrounding image patches are similar, drawn from a local search neighbourhood.
The *adaptive* variant of Manjón et al. additionally adjusts the filter strength
to the locally estimated noise level, which matters for modern MRI where noise
is spatially varying (e.g. after parallel-imaging reconstruction or bias
correction).

Within FreeSurfer this tool exists so that `recon-all` can optionally denoise
the skull-stripped `brain.mgz` before `mri_segment` builds the white-matter
mask, improving the robustness of that segmentation. It is the FreeSurfer-native
counterpart to the standalone ANTs `DenoiseImage` program, wrapped so that it
reads and writes FreeSurfer volume formats and integrates with the
[[mgz]] I/O layer. It is normally driven by the pipeline rather than run by
hand, but is perfectly usable as a standalone denoiser.

> [!gotcha] Off by default in recon-all
> The denoising step is controlled by the `DoAntsDenoising` switch, which is
> configured through `recon-config.yaml` and is **not** enabled by the bare
> `recon-all` defaults in v8.2.0. The historical `-ants-denoise` command-line
> flag is commented out in the script; only the disabling flag
> `-no-ants-denoise` remains active ([`scripts/recon-all:6846-6848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L6846-L6848)).

## Inputs

### Required Inputs

- **`-i`/`--input` — input volume.** Any volume readable by `MRIread`
  ([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L40)): [[mgz]]/`mgh`,
  `nii`/`nii.gz`, Analyze, etc. Multi-frame (4D) input is allowed — each frame is
  denoised separately (see [Outputs](#outputs)).
- **`-o`/`--output` — output volume.** Destination path; the format is inferred
  from the extension by `MRIwrite`
  ([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L93)).

### Input Assumptions

> [!assumption] Magnitude MR image, noise model chosen by the user
> The filter assumes a real-valued magnitude image. By default it uses a
> **Gaussian** noise model; pass `--rician` for the Rician model that is
> physically correct for magnitude MR data at low SNR. The tool does not inspect
> the data to decide — the model is whatever the flag selects.

- There is **no intensity, resolution, or orientation requirement**: the filter
  operates in voxel space on whatever grid the input provides. The patch radius
  (1 voxel), search radius (2 voxels), and mean/variance-neighbourhood radius (1
  voxel) are all expressed in voxels, so their physical extent scales with voxel
  size.
- The input geometry (vox→RAS) is preserved unchanged; only intensities are
  modified.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<output>` (e.g. `antsdn.brain.mgz`) | path given to `-o` | the denoised volume, same dimensions / geometry / data type as the input, every frame filtered |

In the `recon-all` pipeline the output is written as `antsdn.brain.mgz` in the
subject's `mri/` directory and then used as the input to `mri_segment`
([`scripts/recon-all:3312-3317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3312-L3317)).

### Output Specifications

The output volume copies the header of the input (the ITK image is round-tripped
through `MRI::toITKImage`/`MRI::loadITKImage` per frame), so dimensions, voxel
size, and coordinate transforms are identical to the input. Only the voxel
intensities change. The data type is whatever the input volume used.

## Mathematical Foundations

The denoiser implements the **adaptive non-local means** estimator. For a voxel
$i$ with intensity $u(i)$, the denoised value is a weighted average over voxels
$j$ in a search neighbourhood $\mathcal{N}(i)$:

$$\hat{u}(i) = \frac{\sum_{j \in \mathcal{N}(i)} w(i,j)\, u(j)}{\sum_{j \in \mathcal{N}(i)} w(i,j)}$$

where the weight compares the local image **patches** $P(i)$, $P(j)$ centred on
the two voxels:

$$w(i,j) = \exp\!\left(-\frac{\lVert P(i) - P(j) \rVert_2^2}{h^2}\right)$$

and $h$ is a smoothing bandwidth derived from the **locally estimated noise
variance**, which makes the filter spatially adaptive. Candidate patches are
pre-selected by local mean and variance statistics so that only sufficiently
similar patches contribute, which is what the mean/variance thresholds below
control.

> [!math] Fixed filter configuration
> The wrapper hardcodes every numerical parameter ([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:63-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L63-L82)):
> neighbourhood patch radius = 1, search radius = 2, local mean/variance radius =
> 1 (all in voxels); $\epsilon = 10^{-5}$; mean-selection threshold = 0.95;
> variance-selection threshold = 0.5; smoothing factor = 1.0; smoothing variance
> = 2.0. The only user-tunable choice is the Gaussian-vs-Rician noise model.

> [!internal] The estimator lives in the vendored ITK filter
> The actual NLM computation, the Rician/Gaussian likelihood, and the local
> noise estimation are implemented in
> [`itkAdaptiveNonLocalMeansDenoisingImageFilter.hxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/itkAdaptiveNonLocalMeansDenoisingImageFilter.hxx)
> and `itkNonLocalPatchBasedImageFilter.hxx`, copied from ANTs. The
> `AntsDenoiseImageFs.cpp` wrapper only configures and runs the filter.

## Configuration Options

### Complete Flag Reference

All options enumerated from the argument parser
([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:32-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L32-L34)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i`<br>`--input` | string | *(required)* | Input volume to denoise. Any format `MRIread` accepts. |
| `-o`<br>`--output` | string | *(required)* | Output (denoised) volume path; format from extension. |
| `--rician` | boolean | off (Gaussian) | Use the Rician noise model instead of the default Gaussian model. Rician is the physically correct model for magnitude MR images at low SNR. |
| `-h`<br>`--help` | boolean | — | Print the embedded help text and exit (registered by `ArgumentParser::addHelp`, [`utils/argparse.cpp:182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/argparse.cpp#L182)). |

There are **no flags** to change the patch radius, search radius, thresholds, or
smoothing parameters; they are compiled in.

### Configuration Interactions

> [!gotcha] Almost nothing is configurable
> Unlike the standalone ANTs `DenoiseImage`, this wrapper exposes only the
> noise-model switch. If you need a different patch/search radius or noise
> estimate, you must use ANTs `DenoiseImage` directly or edit and rebuild the
> source. There are therefore no conflicting flag combinations to worry about —
> `--rician` is the single behavioural toggle.

## Typical Use Cases

### Use Case 1: Denoise a brain volume (Gaussian model)

```bash
# Default Gaussian-model adaptive NLM denoising
AntsDenoiseImageFs -i brain.mgz -o antsdn.brain.mgz
```

This is exactly the command `recon-all` issues before `mri_segment` when
denoising is enabled.

### Use Case 2: Denoise with the Rician model

```bash
# Rician model — appropriate for low-SNR magnitude images
AntsDenoiseImageFs --rician -i T1.nii.gz -o T1.denoised.nii.gz
```

### Use Case 3: Denoise a 4D series

```bash
# Each frame is denoised independently
AntsDenoiseImageFs -i bold.nii.gz -o bold.denoised.nii.gz
```

## Pipeline Context

`AntsDenoiseImageFs` runs in **autorecon2**, in the white-matter-segmentation
block of `recon-all`. When `DoAntsDenoising` is set, `recon-all` denoises
`brain.mgz` into `antsdn.brain.mgz` and feeds that to `mri_segment` instead of
`brain.mgz` ([`scripts/recon-all:3309-3317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3309-L3317)). The call is guarded by an
`UpdateNeeded` timestamp check so it is only re-run when `brain.mgz` is newer
than the existing `antsdn.brain.mgz`.

**Predecessor:** [[mri_normalize]] / skull-strip producing `brain.mgz` →
**AntsDenoiseImageFs** → **Successor:** [[mri_segment]] (white-matter mask).

## Gotchas and Caveats

> [!gotcha] Single-threaded by design
> The wrapper forces ITK to one global thread
> ([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:43-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L43-L47)). This guarantees a
> deterministic result but means the tool does not speed up on multi-core
> machines and can be slow on large volumes.

> [!gotcha] Each frame is denoised in isolation
> For 4D input the filter is applied frame-by-frame
> ([`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp:49-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp#L49-L91)); there is no temporal
> denoising. This is correct for anatomical use but is not a 4D-aware denoiser.

> [!gotcha] Gaussian is the default, not Rician
> Because magnitude MR noise is Rician, users denoising raw magnitude data at low
> SNR usually want `--rician`. The default is Gaussian, matching the historical
> ANTs default.

## Error Compensation and Guard Rails

The wrapper is minimal and performs no input validation beyond what `MRIread`
does: a missing or unreadable input aborts inside `MRIread`. There is no
conforming, rescaling, or orientation fixing — the volume is denoised on its
native grid and its header is preserved. The fixed single-thread setting is the
only behaviour explicitly chosen to keep results reproducible.

## Related Tools

- [[AntsN4BiasFieldCorrectionFs]] — the sibling ANTs wrapper for N4 bias-field
  correction; the two are the FreeSurfer-native ANTs preprocessing pair.
- [[mri_segment]] — the immediate consumer of the denoised volume in `recon-all`.
- [[mri_nlfilter]] — FreeSurfer's older native non-linear (anisotropic / NLM)
  volume filter; a non-ANTs alternative.
- [[wiki/tools/mri_convert|mri_convert]] — shares the `MRIread`/`MRIwrite` I/O
  layer; use it to inspect or reformat the input/output.
- [[wiki/pipelines/recon-all|recon-all]] — the pipeline that calls this tool.

## Confidence and Gaps

**High confidence:** the complete (tiny) flag set, the single `--rician` toggle,
the hardcoded radii/thresholds, the per-frame single-threaded behaviour, and the
exact `recon-all` invocation and pipeline position — all read directly from the
source and confirmed against `--help`.

> [!gap] Rationale for the fixed parameters
> The five hardcoded constants (epsilon, mean/variance thresholds, smoothing
> factor and variance) are copied from the ANTs reference implementation; the
> FreeSurfer source does not explain why these particular values were chosen or
> whether they were tuned for FreeSurfer's `brain.mgz`.

## References

- J. V. Manjón, P. Coupé, L. Martí-Bonmatí, D. L. Collins, M. Robles. *Adaptive
  Non-Local Means Denoising of MR Images With Spatially Varying Noise Levels.*
  Journal of Magnetic Resonance Imaging, 31:192–203, 2010.
- Technical description (Insight Journal): <https://www.insight-journal.org/browse/publication/979>
- ANTs project: <https://github.com/ANTsX/ANTs>
- FreeSurfer source: [`AntsDenoiseImageFs/AntsDenoiseImageFs.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsDenoiseImageFs/AntsDenoiseImageFs.cpp) (v8.2.0).
