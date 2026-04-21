---
title: "talairach2"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/talairach2"
families:
  - "scripts"
recon_all_stage: "autorecon1"
related:
  - "[[talairach]]"
  - "[[talairach_avi]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - talairach
  - registration
  - MNI305
  - autorecon1
  - tcsh
---

# talairach2

## Summary

`talairach2` is a convenience tcsh wrapper script that performs Talairach registration for a FreeSurfer subject using `mritotal`, starting from the subject's intensity-normalized volume (`nu.mgz` or `nu/`). Unlike `talairach` (which takes an explicit input file), `talairach2` takes a subject ID and operates on the standard subjects directory structure, reading `nu.mgz` (or `nu` COR) and writing the transform to `transforms/talairach.xfm`.

## Source Information

- **Language:** tcsh shell script
- **Source file(s):** `scripts/talairach2`
- **Binary/script location:** `$FREESURFER_HOME/bin/talairach2`
- **External dependency:** `mritotal` (MNI autoreg), `mri_convert`, `lta_convert`

## Purpose and Context

`talairach2` is called during `recon-all` autorecon1 to compute the Talairach transform for the subject, using the bias-corrected (`nu`) volume for better registration accuracy. The algorithm for the transform is correlation-based (`mritotal`), and using the intensity-normalized volume rather than the raw `orig` was chosen specifically because correlation-based alignment benefits from uniform intensity.

The script comments note: "The algorithm of mritotal is correlation based and thus it is better to use the intensity normalized volume, nu."

A second positional argument (`mgzflag`) switches between reading `nu.mgz` (MGZ format) and the legacy `nu/` COR directory.

## Inputs

### Required Inputs

(Positional arguments: `<subjectid> [<mgzflag>]`)

- **`<subjectid>`** — FreeSurfer subject ID. The script reads `$SUBJECTS_DIR/<subject>/mri/nu.mgz` (if mgzflag present) or `$SUBJECTS_DIR/<subject>/mri/nu/` (COR format, legacy).
- **`<mgzflag>`** — optional second argument; if any string is provided, assumes `nu.mgz` format. If absent, uses COR directory format.

`SUBJECTS_DIR` must be set.
`MINC_BIN_DIR` and MNI autoreg model files must be available.

### Input Assumptions

> [!assumption] nu volume must exist
> The intensity-normalized `nu.mgz` (or `nu/` COR directory) must already exist. This is produced earlier in `autorecon1` by `mri_nu_correct.mni`.

> [!assumption] MGZ vs. COR format
> Modern FreeSurfer uses MGZ format (provide any second argument). Legacy COR format is used when no second argument is given.

## Outputs

### Files Created

- **`mri/transforms/talairach.xfm`** — MINC format Talairach transform.
- **`scripts/mritotal.log`** — mritotal log file.
- Temporary `nu.mnc` in `mri/` (deleted after successful completion).

Note: Unlike `talairach`, this script does not create an `.lta` file directly. The `.lta` conversion happens elsewhere in the pipeline (e.g., via `lta_convert` called from `recon-all`).

## Mathematical Foundations

Identical to `talairach` — uses `mritotal` (MNI autoreg) with the `icbm` protocol to compute a 9- or 12-parameter affine registration to the MNI305/average_305 atlas. See [[talairach]] and [[coordinate-systems]] for mathematical details.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<subjectid>` | string | required | Subject ID (first positional argument). |
| `<mgzflag>` | string | — | Any non-empty string triggers MGZ mode (read `nu.mgz` instead of `nu/`). |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

- Providing any value as the second argument (even `0`) enables MGZ mode. The script uses `$#argv` to detect whether a second argument was given.

## Typical Use Cases

### Use Case 1: Register subject to Talairach space (MGZ format, modern)

```bash
talairach2 subject 1
```

This is how `recon-all` calls it (with a flag for MGZ format).

### Use Case 2: Legacy COR format

```bash
talairach2 subject
```

## Pipeline Context

`talairach2` is called in `autorecon1` of `recon-all` after intensity normalization (`mri_nu_correct.mni`). It generates the Talairach transform used by subsequent registration and atlas labeling steps.

**Predecessor:** `mri_nu_correct.mni` (produces `nu.mgz`) → **This tool** → `mri_em_register` (uses `talairach.xfm`)

## Gotchas and Caveats

> [!gotcha] Deletes nu.mnc on success, but not on failure
> The temporary `nu.mnc` file is deleted with `rm nu.mnc` only on the success path. If `mritotal` fails, `nu.mnc` may be left in the `mri/` directory.

> [!gotcha] Log goes to scripts/mritotal.log
> The mritotal log is redirected to `../scripts/mritotal.log` (relative to `mri/`). This is an unusual location — check `scripts/mritotal.log` if registration fails.

## Related Tools

- [[talairach]] — similar wrapper that takes explicit input file rather than subject ID
- [[talairach_avi]] — alternative registration method used by default in `recon-all`
- [[talairach_afd]] — automatic failure detection for the Talairach transform
- [[coordinate-systems]] — Talairach/MNI305 coordinate system documentation
- [[mri_em_register]] — uses the transform produced by this tool

## Confidence and Gaps

Confidence is **high**. The script is fully read and straightforward.
