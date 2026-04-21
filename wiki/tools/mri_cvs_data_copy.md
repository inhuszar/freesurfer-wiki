---
title: "mri_cvs_data_copy"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "mri_cvs_register/mri_cvs_data_copy"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_cvs_register]]"
  - "[[mri_cvs_check]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - cvs
  - registration
  - data-management
---

# mri_cvs_data_copy

## Summary

`mri_cvs_data_copy` creates a minimal tar archive of a FreeSurfer subject's files required for CVS registration. It reads the required file list from `$FREESURFER_HOME/bin/mri_cvs_requiredfiles.txt` and packages those files from the source subject directory into a tar.gz archive in the destination directory.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `mri_cvs_register/mri_cvs_data_copy`
- **Original author:** Lilla Zollei

## Purpose and Context

Running CVS registration on a compute cluster often requires copying subject data to a cluster filesystem. Rather than copying the entire FreeSurfer subject directory (which can be several GB), `mri_cvs_data_copy` extracts only the files needed by [[mri_cvs_register]] into a compact archive. The required file list is maintained in `$FREESURFER_HOME/bin/mri_cvs_requiredfiles.txt`.

## Inputs

- **`--subjid subjid`**: subject ID
- **`--olddir olddir`**: source directory containing the subject (i.e., `olddir/subjid/` must exist)
- **`--newdir newdir`**: destination directory where the archive will be created

## Outputs

`newdir/subjid/subjid.cvsrequiredfiles.tar.gz` — a compressed tar archive of the required CVS files.

## Mathematical Foundations

None — file archiving only.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--subjid` | string | Subject ID |
| `--olddir` | path | Source base directory |
| `--newdir` | path | Destination base directory |

## Configuration Interactions

Depends on `$FREESURFER_HOME/bin/mri_cvs_requiredfiles.txt` existing and being readable. The list format is one relative file path per line.

## Typical Use Cases

Archive a subject's CVS-required files:
```bash
mri_cvs_data_copy \
  --subjid subject001 \
  --olddir /data/freesurfer \
  --newdir /cluster/cvs_data
```

## Pipeline Context

Used as a data staging step before running [[mri_cvs_register]] on a remote or cluster node.

## Gotchas and Caveats

> [!gotcha] Requires pushd/popd
> The script uses `pushd $olddir/$subjid` and `popd` to change directory. This requires the paths to exist and be accessible.

> [!gotcha] Archive format
> The archive is always `.tar.gz`. Ensure the destination has sufficient disk space.

## Related Tools

- [[mri_cvs_check]] — validate required files before registration
- [[mri_cvs_register]] — the main CVS registration pipeline

## Confidence and Gaps

Confidence is **high**. The script is short and transparent.
