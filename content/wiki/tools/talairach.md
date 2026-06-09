---
title: "talairach"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/talairach"
families:
  - "scripts"
recon_all_stage: "autorecon1"
related:
  - "[[talairach_avi]]"
  - "[[talairach2]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[talairach_afd]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The MINC/mritotal tool (called internally) details are not documented."
tags:
  - talairach
  - registration
  - MNI305
  - autorecon1
  - tcsh
---

# talairach

## Summary

`talairach` is a tcsh wrapper script that computes the Talairach registration for a FreeSurfer subject by calling the MNI `mritotal` tool. Given an input MRI volume, it converts the volume to MINC format, runs `mritotal` to compute the affine registration to the MNI305 (average_305) atlas, and produces both an `.xfm` (MINC transform) and an `.lta` (Linear Transform Array) file. The protocol defaults to `icbm` (ICBM-152 atlas alignment).

## Source Information

- **Language:** tcsh shell script
- **Source file(s):** `scripts/talairach`
- **Binary/script location:** `$FREESURFER_HOME/bin/talairach`
- **External dependency:** `mritotal` (from the MNI tools / mni_autoreg package), `lta_convert`

## Purpose and Context

Talairach registration maps subject brain space to a standardized coordinate space (MNI305, also sometimes called "FreeSurfer Talairach" space). This registration is used throughout the FreeSurfer pipeline for:

- Atlas-based segmentation (via `mri_ca_label` and `mri_em_register`).
- Spatial normalization for group comparison.
- Coordinate reporting in standardized space.

> [!contradiction] "Talairach" vs. MNI305 vs. MNI152
> Despite the name, FreeSurfer's "Talairach" space is MNI305 (the average of 305 normal subjects), not the original Talairach & Tournoux 1988 atlas. This is a well-known source of confusion. See [[coordinate-systems]] for the detailed distinction.

`talairach` (the script) uses `mritotal` for the registration, whereas `talairach_avi` uses the `avi` (average intensity) method. The `recon-all` pipeline uses `talairach_avi` by default.

## Inputs

### Required Inputs

(Specified via flags)

- **`--i <vol>`** — input MRI volume.
- **`--xfm <path>`** — output `.xfm` transform file path (also creates `<path>.lta`).

### Input Assumptions

> [!assumption] MINC tools in PATH
> The script calls `mri_convert` (to produce `.mnc`), `mritotal` (for registration), and `lta_convert` (to produce `.lta`). All must be in the PATH or accessible via `$MINC_BIN_DIR`.

> [!assumption] mni_autoreg model files present
> `mritotal` requires model files at `${MINC_BIN_DIR}/../share/mni_autoreg/`. The `average_305.mnc` target atlas must be present at this location.

## Outputs

### Files Created

- **`<xfm_path>`** — MINC `.xfm` transform file (affine registration to MNI305/average_305).
- **`<xfm_path>.lta`** — Linear Transform Array (LTA) version of the transform, produced by `lta_convert`. The LTA has subject `fsaverage` assigned.
- **`<dir>/talairach.log`** — processing log.
- Temporary directory `tmp.talairach.
$$
` (cleaned up after successful completion).

### Output Specifications

The `.xfm` file is in MINC transform format. The `.lta` file is in FreeSurfer LTA format and is used by subsequent pipeline tools (e.g., `mri_em_register`). The transform maps from the input volume space to MNI305/average_305 space.

## Mathematical Foundations

`mritotal` computes a 9- or 12-parameter linear registration (depending on protocol settings) between the input volume and the MNI305 atlas by maximizing normalized cross-correlation or mutual information. The `icbm` protocol uses ICBM-152 atlas constraints.

The resulting affine transform $M \in \mathbb{R}^{4 \times 4}$ maps input scanner RAS coordinates to MNI305 RAS coordinates:
$$
\mathbf{x}_{\text{MNI305}} = M \cdot \mathbf{x}_{\text{subj}}
$$

See [[coordinate-systems]] for the full coordinate system definitions and transform chain.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <vol>` | string | required | Input MRI volume. |
| `--xfm <path>` | string | required | Output `.xfm` transform path. |
| `--x <path>` | string | required | Alias for `--xfm`. |
| `--protocol-default` | boolean | false | Use MNI default registration protocol. |
| `--protocol-icbm` | boolean | true | Use ICBM protocol (default). |
| `--log <file>` | string | `<OutDir>/talairach.log` | Log file path. |
| `--debug` | boolean | false | Enable verbose/debug output. |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

- `--protocol-default` and `--protocol-icbm` are mutually exclusive (both set the `Protocol` variable; last one wins).
- The output `.lta` file is always created alongside the `.xfm` file.

## Typical Use Cases

### Use Case 1: Register subject to Talairach space (low-level call)

```bash
talairach --i $SUBJECTS_DIR/subject/mri/orig/001.mgz \
  --xfm $SUBJECTS_DIR/subject/mri/transforms/talairach.xfm
```

Note: In practice, `recon-all` calls `talairach_avi` (not `talairach`) for this step.

## Pipeline Context

`talairach` is a component of the `autorecon1` stage of `recon-all`, but **`talairach_avi` is the tool actually called by default in `recon-all`**. `talairach` may be called via `talairach2` (a wrapper that provides the subject-directory context). See the [[wiki/pipelines/recon-all|recon-all]] pipeline page for stage ordering.

**Predecessor:** `mri_normalize` → **This tool** (or `talairach_avi`) → `mri_em_register`

## Gotchas and Caveats

> [!gotcha] Requires MNI tools
> `mritotal` is part of the MNI autoreg package and must be installed. On some systems, `mritotal` may not be available or may produce different results from different versions.

> [!gotcha] Uses MINC as intermediate format
> The script converts to MINC (`.mnc`) format as an intermediate step. This requires `mri_convert` to support MINC output (needs MINC library support in the FreeSurfer build).

> [!gotcha] Temporary directory cleanup
> If the script fails (non-zero exit status from `mritotal`), it still removes the temporary directory `tmp.talairach.
> $$
> `, but the `.xfm` output may be absent or incomplete.

## Related Tools

- [[talairach_avi]] — alternative Talairach registration using the avi (average intensity) method; used by default in `recon-all`
- [[talairach2]] — wrapper script that calls this tool with subject-directory context
- [[mri_em_register]] — uses the Talairach registration output for atlas registration
- [[coordinate-systems]] — detailed explanation of FreeSurfer coordinate spaces and the Talairach/MNI305 distinction
- [[talairach_afd]] — automatic failure detection for Talairach registration
- [[rca-talairach]] — the SynthMorph-era recon-all replacement for the classic
  `talairach_avi`/`mritotal` Talairach stage; supersedes this script when
  `recon-all`'s SynthMorph path is enabled.
- [[remove_talairach]] — strips the Talairach transform back out of a subject's
  legacy COR volume headers (undoes the effect of this stage).
- [[show_tal]] — quick visual QC wrapper that overlays the subject's `orig`
  (transformed by `talairach.xfm`) on the Talairach reference volume.

## Confidence and Gaps

Confidence is **high**. The script is fully read and straightforward. The `mritotal` algorithm internals are outside FreeSurfer's source tree.
