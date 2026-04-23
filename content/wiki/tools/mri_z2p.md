---
title: "mri_z2p"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_z2p/mri_z2p.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_fdr]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps: []
tags:
  - mri
  - statistics
  - z-score
  - p-value
  - significance
---

# mri_z2p

## Summary

`mri_z2p` converts a z-score (standard normal deviate) map to a $-\log_{10}(p)$ significance map (signed or unsigned). Given a volume of z-scores, it computes for each voxel the corresponding p-value from the standard normal distribution, then takes $-\log_{10}(p)$. The output is a signed or unsigned significance map suitable for thresholding and visualization. Optionally, an output p-value volume (not log-transformed) can also be written. Author: Douglas Greve.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_z2p/mri_z2p.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_z2p`
- **Original Author:** Douglas Greve

## Purpose and Context

Statistical maps from group analyses (e.g., `mri_glmfit`) are often expressed as z-scores. For display and thresholding, the $-\log_{10}(p)$ representation is preferred because:

1. It maps the full range of significance onto a manageable scale.
2. Values > 1.3 correspond to $p < 0.05$; values > 2 correspond to $p < 0.01$; etc.
3. The sign of z can be preserved to indicate direction of effect.

`mri_z2p` performs this conversion with optional two-sided vs. one-sided testing and masking.

## Inputs

### Required Inputs

(Specified via flags)

- **`--z <vol>`** — input z-score volume.
- **`--log10p <vol>`** — output $-\log_{10}(p)$ volume (signed, if two-sided).

### Optional Inputs

- **`--p <vol>`** — output raw p-value volume.
- **`--mask <vol>`** — mask volume; only process voxels within the mask.

### Input Assumptions

> [!assumption] Input must be z-scores
> The input values are interpreted as z-scores (quantiles of the standard normal distribution). Passing t-statistics or F-statistics directly will produce incorrect p-values.

> [!assumption] Two-sided by default
> By default (`TwoSided = 1`), the test is two-sided: $p = 2 \cdot (1 - \Phi(|z|))$, where $\Phi$ is the standard normal CDF. The sign of the output $-\log_{10}(p)$ reflects the sign of z.

## Outputs

### Files Created

- **`--log10p <vol>`** — signed $-\log_{10}(p)$ volume. Positive values indicate $z > 0$; negative indicate $z < 0$. The magnitude gives the significance: $|-\log_{10}(p)| > 1.301$ corresponds to $p < 0.05$ two-sided.
- **`--p <vol>`** (optional) — raw p-values (not log-transformed).

## Mathematical Foundations

For each voxel with z-score $z$:

**Two-sided test:**
$$
p = 2 \cdot (1 - \Phi(|z|))
$$
$$
\text{sig} = -\log_{10}(p) \cdot \text{sign}(z)
$$

**One-sided test:**
$$
p = 1 - \Phi(z)
$$
$$
\text{sig} = -\log_{10}(p)
$$

where $\Phi$ is the standard normal CDF.

The $-\log_{10}$ transformation is computed from the internal function `z2p()` / `sig_from_normal_cdf()` in `randomfields.c`.

**Key threshold reference:**
| $-\log_{10}(p)$ | p-value (two-sided) |
|---|---|
| 1.301 | 0.05 |
| 2.0 | 0.01 |
| 3.0 | 0.001 |
| 4.0 | 0.0001 |

## Configuration Options

### Complete Flag Reference

| Flag | Aliases | Type | Default | Description |
|------|---------|------|---------|-------------|
| `--z <vol>` | | string | required | Input z-score volume. |
| `--log10p <vol>` | | string | — | Output $-\log_{10}(p)$ volume (signed by sign of z). At least one output is required. |
| `--p <vol>` | | string | — | Output raw (untransformed) p-value volume. |
| `--mask <vol>` | | string | — | Mask volume; only masked (non-zero) voxels are processed; others are set to 0 in all outputs. |
| `--two-sided` | `--unsigned` | boolean | true | Compute two-sided p-value: $p = 2(1 - \Phi(\|z\|))$; sign of output equals sign of z (default). |
| `--unsigned` | | boolean | — | Alias for `--two-sided`. |
| `--one-sided` | `--signed` | boolean | false | Compute one-sided p-value: $p = 1 - \Phi(z)$; output is unsigned. |
| `--signed` | | boolean | — | Alias for `--one-sided`. |
| `--feat <dir>` | | string | — | Process all FSL/FEAT z-stat and zf-stat volumes in `<dir>/stats/`, writing `zsig*` and `zfsig*` outputs alongside them; bypasses `--z`/`--log10p`/`--p`. |
| `--featfmt <ext>` | | string | auto | Override output format extension for FEAT mode (e.g., `nii`, `nii.gz`, `mgh`, `mgz`, `img`); auto-detected from `$FSLOUTPUTTYPE` if not given. |
| `--nii` | | boolean | — | Set FEAT output format to `nii`. |
| `--nii.gz` | | boolean | — | Set FEAT output format to `nii.gz`. |
| `--mgh` | | boolean | — | Set FEAT output format to `mgh`. |
| `--mgz` | | boolean | — | Set FEAT output format to `mgz`. |
| `--img` | | boolean | — | Set FEAT output format to `img` (Analyze). |
| `--tfce <in> <mask\|nomask> <E> <H> <thsign> <surf\|nosurf> <out> <maxvox\|nomaxvox>` | | compound | — | Stand-alone Threshold Free Cluster Enhancement (TFCE): applies TFCE to the input map and writes the result; exits immediately after. See TFCE section below. |
| `--debug` | | boolean | false | Enable verbose diagnostic output. |
| `--checkopts` | | boolean | false | Parse and validate options then exit without processing. |
| `--nocheckopts` | | boolean | — | Disable check-only mode (default). |
| `--version` | | boolean | — | Print version string and exit. |
| `--help` | | boolean | — | Print usage information and exit. |

### TFCE Sub-command Arguments

When `--tfce` is used, it takes 8 arguments and exits immediately:

| Argument | Description |
|----------|-------------|
| `<input>` | Input z-map or t-map |
| `<mask\|nomask>` | Path to a binary mask, or `nomask` to skip masking |
| `<E>` | TFCE extent exponent (recommended: 0.5 for volumes) |
| `<H>` | TFCE height exponent (recommended: 2.0) |
| `<thsign>` | Sign of threshold: `0` = absolute, `+1` = positive, `-1` = negative |
| `<surf\|nosurf>` | FreeSurfer surface file for surface-based TFCE, or `nosurf` for volumetric |
| `<output>` | Output TFCE map |
| `<maxvox\|nomaxvox>` | Path for maximum-voxel text file, or `nomaxvox` to skip |

### Configuration Interactions

- `--two-sided` / `--unsigned` and `--one-sided` / `--signed` are mutually exclusive aliases for two pairs of modes; the last specified on the command line takes effect.
- In standard mode, at least one of `--log10p` or `--p` must be specified; if neither is given, the tool exits with an error.
- `--feat` mode is mutually exclusive with `--z`/`--log10p`/`--p`; it processes all z-stat volumes in the FEAT directory automatically.
- `--featfmt`, `--nii`, `--nii.gz`, `--mgh`, `--mgz`, `--img` only apply when `--feat` is given; they are ignored otherwise.
- `--tfce` is entirely self-contained and ignores all other options; the tool exits after TFCE computation.
- In FEAT mode, z-stat maps (zstat*) are processed with two-sided testing; zf-stat maps (zfstat*, typically F-contrasts) are processed with one-sided testing, regardless of `--one-sided` / `--two-sided`.

## Typical Use Cases

### Use Case 1: Convert z-map to significance map

```bash
mri_z2p --z zstat.mgz --log10p sig.mgz
```

### Use Case 2: One-sided test with masking

```bash
mri_z2p --one-sided --mask brain.mgz \
  --z zstat.mgz --log10p sig.mgz --p pmap.mgz
```

### Use Case 3: Threshold significance map at p < 0.05

After running `mri_z2p`, threshold with [[mri_binarize]]:
```bash
mri_binarize --i sig.mgz --abs --min 1.301 --o sig_thresh.mgz
```

## Pipeline Context

`mri_z2p` is not called by `recon-all`. It is used in the post-processing phase of group analyses:

1. Run `mri_glmfit` → produces z-stat volumes.
2. Run `mri_z2p` → converts to $-\log_{10}(p)$.
3. View in [[freeview]] or threshold with [[mri_binarize]].

## Gotchas and Caveats

> [!gotcha] Input must be z-scores, not t-statistics
> If your GLM output is a t-statistic map, do not pass it directly to `mri_z2p`. Either convert to z-scores first, or use the appropriate t-to-p conversion (t-distribution with correct df).

> [!gotcha] Sign convention in output
> The output $-\log_{10}(p)$ is signed: positive values indicate $z > 0$ (positive effect) and negative values indicate $z < 0$ (negative effect). The magnitude (absolute value) is the significance. Visualisation tools and thresholding should account for this sign.

## Related Tools

- `mri_glmfit` — computes z-statistics for group models; output fed to this tool
- [[mri_fdr]] — applies FDR correction to a p-value or significance map
- [[mri_binarize]] — thresholds the significance map at a given cutoff

## Confidence and Gaps

Confidence is **high**: full `parse_commandline()` was read from source. All flags confirmed.
