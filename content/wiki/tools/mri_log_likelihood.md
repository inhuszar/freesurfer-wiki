---
title: "mri_log_likelihood"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_log_likelihood/mri_log_likelihood.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_em_register]]"
  - "[[mri_gca_ambiguous]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Output scale: printed value is 10000 * log-likelihood (not raw LL). Reason for this scaling is not documented."
tags:
  - atlas
  - gca
  - evaluation
  - log-likelihood
---

# mri_log_likelihood

## Summary

`mri_log_likelihood` computes the log-likelihood of one or more MRI volumes under a Gaussian Classifier Atlas (GCA) model, given a spatial registration transform. The result quantifies how well the atlas model explains the observed data, and is used for evaluating registration quality or comparing atlas fits.

## Source Information

- **Language:** C++
- **Source file:** `mri_log_likelihood/mri_log_likelihood.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

After registering an MRI volume to a GCA atlas, it is useful to quantify the quality of the registration or the fit of the atlas. The log-likelihood provides a scalar summary: the higher the log-likelihood, the better the GCA model explains the registered data. This tool is used for debugging registrations, comparing atlas variants, and evaluating normalisation strategies.

## Inputs

| Argument | Description |
|----------|-------------|
| `<inbrain1>` | First input MRI volume |
| `[<inbrain2> ...]` | Additional input volumes (for multi-echo, FLASH data) |
| `<atlas>` | GCA atlas file |
| `<transform>` | Transform file(s) aligning volume to atlas (LTA, XFM, or M3D) |

The number of input volumes and transforms is inferred from the argument count: `ninputs = (argc - 1) / 2`.

## Outputs

- Log-likelihood value printed to stdout.
- No output volume is written.

## Mathematical Foundations

The log-likelihood under the GCA model is:

$$
\log P(\mathbf{I} | \text{GCA}, T) = \sum_{\mathbf{x}} \log P(I(\mathbf{x}) | \text{GCA}(T(\mathbf{x})))
$$

where $T(\mathbf{x})$ maps from image voxel space to atlas space, and $P(I | \text{GCA}(\mathbf{x}))$ is the Gaussian mixture probability of the observed intensity given the atlas label distributions at that atlas location.

For multi-input (FLASH) data, the joint likelihood over all input channels is used:

$$
\log P(\mathbf{I}_1, \ldots, \mathbf{I}_K | \text{GCA}, T) = \sum_\mathbf{x} \log P\left((I_1(\mathbf{x}), \ldots, I_K(\mathbf{x})) \middle| \text{GCA}(T(\mathbf{x}))\right)
$$

## Configuration Options

All option flags use a single dash. Options are parsed before positional arguments.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-orig <vol>` | string | — | Load an alternative "original" (unnormalised) volume and pass it to `GCAimageLogLikelihood()`; used when the normalised input was modified. |
| `-debug_voxel <x> <y> <z>` | 3 × int | — | Enable per-voxel diagnostic output at atlas voxel `(x, y, z)` (sets global `Gx`, `Gy`, `Gz`). |
| `-v <n>` | int | — | Set `Gdiag_no` to `<n>` for selective diagnostic verbosity. |

The main inputs are positional and determined by argument count:
- The number of input brain volumes `N = (argc - 1) / 2` (integer division after option parsing).
- First `N` positional arguments: input MRI volumes.
- Argument `N+1`: GCA atlas file.
- Arguments `N+2` through `2N+1`: transform files, one per input volume.

> [!gotcha] Output is scaled by 10000
> The tool prints `10000 * log-likelihood` rounded to an integer (`printf("%2.0f\n", 10000*ll)`), not the raw log-likelihood. Values should be interpreted accordingly.

## Configuration Interactions

- The positional argument layout requires that the total number of non-option arguments is odd (at least 3): one or more input volumes, one atlas, and the same number of transforms as volumes.
- `-orig` provides an alternative unnormalised volume passed as the last argument to `GCAimageLogLikelihood()`; if not given, `NULL` is passed and the function uses the normalised input directly.
- When `DIAG_VERBOSE_ON` is set (via FreeSurfer diagnostic flags), the tool prints which input files are being read.

## Typical Use Cases

```bash
# Check log-likelihood of registered T1 under atlas
mri_log_likelihood brain.mgz atlas.gca talairach.lta

# Multi-echo FLASH log-likelihood
mri_log_likelihood echo1.mgz echo2.mgz atlas.gca \
  talairach_echo1.lta talairach_echo2.lta
```

## Pipeline Context

Not a direct `recon-all` stage. Diagnostic tool used by researchers developing or evaluating GCA atlases and registration procedures. May be invoked after `mri_em_register` to verify registration quality.

## Gotchas and Caveats

- The total number of non-option positional arguments must be odd: `argc_remaining - 1` must be even (equal number of input volumes and transforms, plus one atlas). An even `argc_remaining - 1` causes division to be off by one.
- The transform must be compatible with the atlas space — typically a Talairach or MNI305 transform.
- The output is a single scalar printed as an integer; no spatial map of per-voxel likelihood is saved.
- The printed value is scaled by 10000: `printf("%2.0f\n", 10000*ll)`. Divide by 10000 to recover the actual log-likelihood.

## Related Tools

- [[mri_ca_label]] — uses GCA for segmentation (not just evaluation)
- [[mri_em_register]] — produces the transform used as input here
- [[mri_gca_ambiguous]] — analyses GCA ambiguity (different metric)

## Confidence and Gaps

**High confidence:** all flags confirmed from complete `get_option()` read. Usage and algorithm clear from source.

> [!gap] Output scale
> The printed value is `10000 * log-likelihood`. The reason for the 10000 scaling factor is not documented in the code or comments.
