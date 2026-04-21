---
title: "dmri_bset"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/dmri_bset"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[dt_recon]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - diffusion
  - preprocessing
  - bvalue
  - bvec
---

# dmri_bset

## Summary

`dmri_bset` extracts a subset of volumes, b-values, and gradient directions from a diffusion MRI dataset. It allows selection by specific b-value shell(s) or by a maximum b-value threshold, maintaining consistent correspondence between DWI volumes, b-value table, and gradient direction table. The b=0 (minimum b-value) volumes are always included in the output.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/dmri_bset`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_bset`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

Multi-shell diffusion acquisitions contain volumes acquired at multiple b-values (e.g., b=0, b=1000, b=2000, b=3000). Many downstream analyses require only a subset of shells. `dmri_bset` automates the extraction of specific b-shells while keeping b-values, gradient vectors, and image volumes synchronized. It delegates the actual volume extraction to `mri_convert` (using `--frame` selection) and handles the text-file-based bvals/bvecs extraction with `sed`.

This is a preprocessing utility used before DTI fitting, tractography, or other shell-specific analyses.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Input DWI | `--in` | Input 4D diffusion volume | NIfTI, MGH, or any `mri_convert`-readable format |
| Output DWI | `--out` | Output 4D diffusion volume | same format |
| Input b-values | `--inb` | Input b-value file (one per line) | plain text |
| Input gradients | `--ing` | Input gradient table (one triplet per line) | plain text |
| B-value(s) | `--b` | One or more target b-values to extract | float |
| Max b-value | `--bmax` | Extract all volumes with b ≤ this value | float |

## Outputs

| Output | Flag | Description |
|--------|------|-------------|
| Output DWI | `--out` | Subset of volumes at selected b-shells | 4D volume |
| Output b-values | `--outb` | Extracted b-value table | plain text |
| Output gradients | `--outg` | Extracted gradient table | plain text |

Default output b-value and gradient file names are derived from the output DWI filename by replacing its extension with `.bvals` and `.bvecs`.

## Mathematical Foundations

Frame selection is purely index-based. For each requested b-value $b_t$ with tolerance $\tau$ (default 0.05 = 5%), the frames satisfying:

$$
b_t(1 - \tau) \leq b_{\text{frame}} \leq b_t(1 + \tau)
$$

are selected. The minimum b-value (typically $b=0$) in the dataset is always prepended to the extraction list to ensure a reference volume is present.

Frame extraction is performed by `mri_convert --frame <indices>`.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--in <file>` | file | required | Input DWI series |
| `--out <file>` | file | required | Output DWI series |
| `--inb <file>` | file | auto | Input b-value table (default: input base + `.bvals`) |
| `--outb <file>` | file | auto | Output b-value table (default: output base + `.bvals`) |
| `--ing <file>` | file | auto | Input gradient table (default: input base + `.bvecs`) |
| `--outg <file>` | file | auto | Output gradient table (default: output base + `.bvecs`) |
| `--b <num>` | float | — | Extract specific b-value shell (repeatable) |
| `--btol <frac>` | float | 0.05 | Fractional tolerance around each b-value |
| `--bsort` | flag | off | Reorder output by b-shell (default: maintain acquisition order) |
| `--bmax <num>` | float | — | Extract all frames with b ≤ this maximum |

## Configuration Interactions

- `--b` and `--bmax` are **mutually exclusive**. Specifying both causes an error.
- `--b` can be repeated multiple times to select multiple shells simultaneously (e.g., `--b 0 --b 1000`).
- `--btol` applies only to `--b` mode; `--bmax` does an exact inequality test.
- `--bsort` changes the ordering of output frames when multiple shells are extracted. Without `--bsort`, frames appear in their original acquisition order. With `--bsort`, frames are grouped by b-shell.
- The minimum b-value in the input is **always included** regardless of shell specification, ensuring a b=0 reference is available.
- If `--inb` is not specified, the script looks for a file with the same base name as `--in` but with `.bvals` extension.

> [!gotcha] Tolerance applies bidirectionally
> `--btol 0.05` with `--b 1000` matches frames where 950 ≤ b ≤ 1050. Frames nominally acquired at b=1000 but written as 998 or 1002 by scanner software will still be matched.

## Typical Use Cases

```bash
# Extract only b=0 and b=1000 from a multi-shell acquisition
dmri_bset \
  --in dwi_multishell.nii.gz \
  --out dwi_b1000.nii.gz \
  --b 1000

# Extract b=0 and b=2000, maintaining original volume order
dmri_bset \
  --in dwi.nii.gz \
  --out dwi_b0_b2000.nii.gz \
  --b 0 --b 2000

# Extract all volumes with b ≤ 1000 (includes b=0, b=500, b=1000)
dmri_bset \
  --in dwi.nii.gz \
  --out dwi_lowb.nii.gz \
  --bmax 1000

# Specify all files explicitly and sort by b-shell
dmri_bset \
  --in dwi.nii.gz \
  --inb dwi.bval \
  --ing dwi.bvec \
  --out dwi_b1000.nii.gz \
  --outb dwi_b1000.bval \
  --outg dwi_b1000.bvec \
  --b 1000 \
  --bsort
```

## Pipeline Context

`dmri_bset` is a preprocessing utility. It is not called directly by `recon-all`. It is typically used before DTI fitting (`dmri_tensoreig`, `dt_recon`) or before single-shell tractography algorithms that require a specific shell.

```
DWI acquisition --> dmri_bset --> dt_recon / dmri_paths / dmri_train
```

## Gotchas and Caveats

> [!gotcha] b=0 always included
> The minimum b-value in the input is always added to the extraction, even if not explicitly requested with `--b`. This ensures a reference volume is available but can be unexpected if only high-b-value shells are needed.

> [!gotcha] b-value format is one-per-line
> The script uses `sed` line extraction, so each b-value must be on its own line in the bvals file. The FSL format (space-separated single line) is not directly supported — convert to one-per-line first.

> [!gotcha] Output directory must exist
> The script creates the output directory with `mkdir -p` based on the output filename, but the parent directory must be accessible.

## Related Tools

- [[mri_convert]] — called internally to extract frames
- [[dt_recon]] — DTI reconstruction pipeline that may need single-shell input
- [[dmri_paths]] — probabilistic tractography that uses specific b-shells

## Confidence and Gaps

Confidence is high. The source code is a straightforward tcsh script with a complete usage message and clear parameter parsing.
