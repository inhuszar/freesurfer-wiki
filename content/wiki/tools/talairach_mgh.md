---
title: "talairach_mgh"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/talairach_mgh"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[talairach]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The mri_em_register.old binary referenced in the script — whether it still exists in FreeSurfer 8.2.0 is uncertain."
tags:
  - talairach
  - registration
  - MGH
  - legacy
---

# talairach_mgh

## Summary

`talairach_mgh` is a very short tcsh script that performs Talairach registration using an old MGH-specific method: it calls `mri_em_register.old` (a legacy binary using an older GCA-based registration) to align a subject's brain volume to a young normal brain GCA atlas (`talairach_young_new_b.gca`). This is a legacy/experimental alternative to the standard `talairach` (mritotal-based) and `talairach_avi` methods.

## Source Information

- **Language:** tcsh shell script
- **Source file(s):** `scripts/talairach_mgh`
- **Binary/script location:** `$FREESURFER_HOME/bin/talairach_mgh`
- **Note:** References `mri_em_register.old` and `talairach_young_new_b.gca` — both are likely legacy/deprecated in FreeSurfer 8.2.0.

## Purpose and Context

This script represents an historical MGH-specific approach to Talairach registration that uses GCA-based expectation-maximization registration (`mri_em_register`) rather than the MNI `mritotal` tool. It was designed for cases where the standard mritotal registration was unavailable or failed. The registration target is `talairach_young_new_b.gca` — a GCA model trained on young normal subjects.

> [!gotcha] Legacy tool — likely deprecated
> This script calls `mri_em_register.old` (an old binary with `.old` suffix) and references a GCA atlas `talairach_young_new_b.gca`. Both may not be present in FreeSurfer 8.2.0. This script is almost certainly not called by `recon-all` in modern FreeSurfer.

## Inputs

### Required Inputs

(Single positional argument: `$1` = subject ID)

- **`$1`** — FreeSurfer subject ID. The script reads from `$SUBJECTS_DIR/$s/mri/`.

`SUBJECTS_DIR` must be set.
`$FREESURFER_HOME/bin/mri_em_register.old` must exist.
`$FREESURFER_HOME/average/talairach_young_new_b.gca` must exist.

### Input Assumptions

> [!assumption] Brain volume at mri/brain
> The script reads `$SUBJECTS_DIR/$s/mri/brain` (COR format, no extension — very old convention).

> [!assumption] Orig at mri/orig
> The GCA registration uses `$SUBJECTS_DIR/$s/mri/orig` as input.

## Outputs

### Files Created

- **`mri/transforms/talairach.xfm`** — output Talairach LTA transform (written to `transforms/` directory which is created by the script).
- Several directories are created: `mri/fsamples`, `mri/norm`, `mri/transforms`.

## Mathematical Foundations

Uses `mri_em_register` (EM registration to GCA atlas) rather than `mritotal` (correlation-based registration). The GCA model encodes spatial priors and intensity distributions of brain tissues in atlas space. Registration maximizes the posterior probability of alignment.

## Configuration Options

No command-line flags. Single positional argument: subject ID.

## Typical Use Cases

This tool is not recommended for new analyses. It is documented here for historical completeness.

```bash
talairach_mgh subject_id
```

## Pipeline Context

`talairach_mgh` is NOT called by standard `recon-all`. It is a standalone legacy utility.

## Gotchas and Caveats

> [!gotcha] mri_em_register.old likely absent
> The binary `mri_em_register.old` is referenced explicitly. In modern FreeSurfer, only `mri_em_register` (without `.old` suffix) is present. This script will fail if `mri_em_register.old` does not exist.

> [!gotcha] COR format expected
> Input paths have no extension (e.g., `mri/brain`, `mri/orig`), expecting COR (coronal raw) format directory layout. This is obsolete in FreeSurfer 7.x+.

> [!gotcha] One commented-out command
> The script has a commented-out alternative command that included `-fsamples` and `-norm` flags. This suggests the script was modified experimentally and may not reflect current best practice.

## Related Tools

- [[talairach]] — standard mritotal-based registration (the current approach)
- [[talairach_avi]] — FreeSurfer's preferred registration method
- [[mri_em_register]] — the modern (non-`.old`) version of the EM-based registration
- [[coordinate-systems]] — Talairach coordinate system definitions

## Confidence and Gaps

Confidence is **high** for the script content (fully read). Whether the tools it calls exist in FreeSurfer 8.2.0 is uncertain.

> [!gap] mri_em_register.old availability
> Verify whether `mri_em_register.old` and `talairach_young_new_b.gca` are present in the installed FreeSurfer 8.2.0.
