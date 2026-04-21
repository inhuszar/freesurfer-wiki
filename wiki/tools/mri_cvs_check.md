---
title: "mri_cvs_check"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "mri_cvs_register/mri_cvs_check"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_cvs_register]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - cvs
  - registration
  - preflight
---

# mri_cvs_check

## Summary

`mri_cvs_check` is a preflight validation script for the CVS (Combined Volumetric and Surface) registration pipeline. It checks whether all required files exist in the subject and template directories before attempting to run [[mri_cvs_register]], reporting a list of any missing files.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `mri_cvs_register/mri_cvs_check`
- **Original author:** Lilla Zollei

## Purpose and Context

[[mri_cvs_register]] requires a specific set of surface, label, and morphometric files. If any are missing, the registration will fail partway through, wasting compute time. `mri_cvs_check` performs the validation upfront, listing missing files so they can be created before attempting registration.

## Inputs

Command-line arguments:
- `--mov movingid`: moving subject ID
- `--template templateid`: template subject ID (or use `--templatedir` / CVS template flags)
- Optional: `--hemi hemi` for single-hemisphere processing

## Outputs

Prints to stdout:
- List of missing files (if any)
- Exit status 0 if all files present; non-zero if any are missing

## Mathematical Foundations

None — this is a file existence check only.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov movingid` | string | required | Moving subject ID |
| `--template templateid` | string | required | Template subject ID |
| `--cvstemplate` | — | off | Use built-in CVS template (skip template checks) |
| `--hemi hemi` | lh or rh | both | Check only one hemisphere |

## Required Files Checked

For each subject (moving; template if not using built-in CVS template):

**Surfaces** (`surf/`):
- `?h.inflated`, `?h.pial`, `?h.sphere`, `?h.white`, `?h.smoothwm`, `?h.sulc`
- `?h.inflated.H`, `?h.inflated.K` (curvature; also acceptable as `?h.inflated.H.crv`, `?h.inflated.K.crv`)

**Labels** (`label/`):
- `?h.aparc.annot`

**MRI volumes** (`mri/`):
- `aseg.mgz` (or the `asegfname`-specified file)
- `norm.mgz`

## Configuration Interactions

- `--cvstemplate` skips all checks for the template subject (assumes the built-in `cvs_avg35` template is complete).
- `--hemi` reduces the check to one hemisphere's surface and label files.

## Typical Use Cases

Check files before running CVS registration:
```bash
mri_cvs_check --mov subject001 --template cvs_avg35
```

Check for single hemisphere:
```bash
mri_cvs_check --mov subject001 --template cvs_avg35 --hemi lh
```

## Pipeline Context

Run as the first step before [[mri_cvs_register]]:
```bash
mri_cvs_check --mov subject001 --template cvs_avg35
# If no errors:
mri_cvs_register --mov subject001 --template cvs_avg35
```

## Gotchas and Caveats

> [!gotcha] `.H` and `.K` files are checked with fallback
> The curvature files `?h.inflated.H` and `?h.inflated.K` are flagged missing only if neither the file nor its `.crv` extension variant exists. The script uses `! -e ${file:r}` as a fallback check.

## Related Tools

- [[mri_cvs_register]] — the main CVS registration tool
- [[mri_cvs_data_copy]] — copy the minimal set of required files to a new location

## Confidence and Gaps

Confidence is **high**. The script is fully readable and the logic is transparent.
