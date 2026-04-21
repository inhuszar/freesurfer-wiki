---
title: "mri_maps2csd"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mcsim/mri_maps2csd.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_mcsim]]"
  - "[[mri_glmfit]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "CSD file format details not fully traced"
tags:
  - statistics
  - cluster-inference
  - surface
  - csd
---

# mri_maps2csd

## Summary

`mri_maps2csd` converts surface-based statistical maps into Cluster Size Distribution (CSD) format, which is the file format used by FreeSurfer's multiple comparison correction framework. It computes the maximum cluster size (or cluster mass) for each input map at a given threshold and appends that to a CSD table. It is a utility companion to [[mri_mcsim]] and the `mri_glmfit-sim` multiple comparison correction pipeline.

## Source Information

- **Language:** C++
- **Source file:** `mri_mcsim/mri_maps2csd.cpp` (lives in the `mri_mcsim` source directory)

## Purpose and Context

The Monte Carlo simulation approach to multiple comparisons (implemented by [[mri_mcsim]]) works by generating many null-hypothesis surface maps, finding the maximum cluster size in each, and building an empirical distribution (the CSD). `mri_maps2csd` performs the same cluster-extraction step on a set of real or simulated surface maps, appending the maximum cluster size from each map to a CSD output file.

This is used when:
1. Running a permutation test on real data maps rather than synthetic noise.
2. Adding additional simulation iterations to an existing CSD table.
3. Applying a pre-computed CSD to threshold results of a new analysis.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Surface | FreeSurfer surface file | Target surface on which maps are defined |
| Input maps | surface overlay files | Statistical maps (one per input file) |
| Threshold | float | Cluster-forming threshold |
| Sign | string | `pos`, `neg`, or `abs` — direction of test |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| CSD file | `.csd` | Cluster size distribution table (appended or created) |
| CSD PDF | text | Optional; empirical PDF/CDF of maximum cluster sizes |

## Mathematical Foundations

For each input map $f$, the tool:

1. Thresholds at $|f(\mathbf{v})| \geq \theta$ (or signed, depending on the `sign` parameter).
2. Identifies connected clusters of suprathreshold vertices on the surface mesh.
3. Records the maximum cluster size (in vertices or mm²) as a single entry in the CSD.

The CSD is an empirical distribution:

$$\hat{P}(\text{max cluster size} \geq k) = \frac{1}{N} \sum_{i=1}^{N} \mathbf{1}[\text{maxcluster}_i \geq k]$$

This distribution is used to determine cluster-level p-values: a cluster of size $k$ in the real data is significant at level $\alpha$ if $\hat{P}(\text{max cluster size} \geq k) \leq \alpha$.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subject> <hemi> <surf>` | 3 strings | required (or `--surf`) | Subject name, hemisphere (`lh`/`rh`), and surface name (e.g. `white`). Resolves surface as `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surf>`. |
| `--surf <path>` | string | required (or `--s`) | Direct path to the surface file. Cannot be combined with `--s`. |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--thresh <f>` | float | required | Cluster-forming threshold (in `-log10(p)` units). |
| `--sign <val>` | numeric | required | Direction of the test: `+1` (positive), `-1` (negative), or `0` (absolute value / two-tailed). Stored as a numeric sign modifier on the threshold. |
| `--i <fname>` | string | repeatable | Input surface map file. Can be repeated or positional (unrecognised arguments are added as inputs). |
| `--csd <fname>` | string | required | Output CSD file (entries are appended; file is created if it does not exist). |
| `--pdf <fname>` | string | null | Output CSD PDF file derived from the CSD distribution. |
| `--csd-apply <csdfile> <applyout>` | 2 strings | — | Read an existing CSD from `<csdfile>`, apply it to the inputs, and write the p-value of the maximum cluster to `<applyout>`. Also sets `subject`, `hemi`, and `surfname` from the CSD header. |
| `--debug` | flag | off | Enable verbose debug output. |
| `--checkopts` | flag | off | Check options and exit without processing. |
| `--nocheckopts` | flag | off | Disable option checking (explicit override). |
| `--help` | flag | — | Print usage and exit. |
| `--version` | flag | — | Print version string and exit. |

> [!gotcha] `--sign` takes numeric values, not strings
> The `--sign` flag stores its argument via `sscanf(pargv[0], "%lf", &csd->threshsign)`. Pass `+1`, `-1`, or `0`, **not** strings like `pos`/`neg`/`abs`.

> [!gotcha] `--pdf` not `--csdpdf`
> The flag for the output PDF file is `--pdf`, not `--csdpdf`.

> [!gotcha] `--s` takes three arguments
> `--s subject hemi surf` requires all three arguments in sequence: the subject name, the hemisphere, and the surface name.

> [!gotcha] `--s` and `--surf` are mutually exclusive
> The `check_options()` function errors if both are specified.

## Configuration Interactions

- `--thresh` and `--sign` together define the cluster-forming criterion. The sign value numerically modifies the stored threshold.
- `--csd-apply` activates a different mode where instead of building a CSD, the tool reads an existing CSD and applies it to inputs to produce a maximum cluster p-value.
- When `--csd-apply` is used, `subject`, `hemi`, and `surfname` are automatically set from the CSD header (overriding any `--s` or `--surf`).
- Multiple `--i` flags can be provided to process many maps in one invocation. Positional (non-flag) arguments are also treated as input files.

## Typical Use Cases

```bash
# Build CSD from permutation maps (two-tailed test, -log10(p) threshold of 2.0)
mri_maps2csd \
  --s fsaverage lh white \
  --sign 0 --thresh 2.0 \
  --csd /path/to/mc-z.csd \
  --i perm.001.mgz --i perm.002.mgz --i perm.003.mgz

# Apply CSD to real data
mri_maps2csd \
  --csd-apply /path/to/mc-z.csd /path/to/real_stat.csd.pdf.txt \
  --i /path/to/real_stat.mgz
```

## Pipeline Context

Part of the `mri_glmfit-sim` multiple comparison correction workflow:

1. `mri_glmfit` — fits the GLM and produces statistical maps
2. `mri_mcsim` (or `mri_maps2csd`) — builds the CSD under the null hypothesis
3. `mri_glmfit-sim` — applies the CSD to produce corrected p-values

## Gotchas and Caveats

> [!gotcha] CSD file is appended, not overwritten
> The tool appends entries to an existing CSD file. Running it twice on the same data will double the entries in the distribution, inflating $N$ without adding new information.

> [!gotcha] Threshold sign interaction
> If `--sign pos` but the map has predominantly negative values, no clusters will be found, producing zero-size entries that can corrupt the CSD.

> [!gap] Surface units
> Whether cluster size is reported in vertices or mm² depends on how the surface cluster computation is configured. The code uses `surfcluster.h` but the specific size metric is not confirmed.

## Related Tools

- [[mri_mcsim]] — generates the null-hypothesis CSD via Monte Carlo simulation
- [[mri_glmfit]] — produces the statistical maps processed by this tool

## Confidence and Gaps

**Confident:** All flags verified from complete `parse_commandline()` source. Core purpose (map-to-CSD conversion), surface loading options (`--s` vs `--surf`), cluster-forming threshold, sign parameter (numeric), `--pdf` flag name, `--csd-apply` two-argument form.

**Less confident:** Cluster size units (vertices vs mm²), CSD file binary format details.
