---
title: "mksubjdirs"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mksubjdirs"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[subject-directory]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The 'bem' directory noted in a source comment is not created; reason unclear"
  - "No documentation on whether mksubjdirs is still recommended vs. letting recon-all create the directory tree"
tags:
  - utility
  - subject-directory
  - setup
---

# mksubjdirs

## Summary

`mksubjdirs` is a short tcsh script that creates the standard FreeSurfer subject directory tree for a new subject. Given a subject name, it creates the top-level directory and all required subdirectories (`mri`, `scripts`, `surf`, `tmp`, `label`, `morph`, `mpg`, `tiff`, `touch`, `stats`, `mri/transforms`, `mri/orig`), sets group-write permissions, and prints a reminder to set the correct group ownership with `chgrp`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mksubjdirs`
- **Script location:** `$FREESURFER_HOME/bin/mksubjdirs`

## Purpose and Context

Before running `recon-all` on a new subject, the subject directory tree must exist. `mksubjdirs` automates the creation of this directory structure so that all FreeSurfer tools find the expected paths relative to `$SUBJECTS_DIR/<subject>`.

In practice, `recon-all -s <subject> -i <T1.mgz>` will also create the subject directory if it does not exist. `mksubjdirs` is useful when the user wants to set up the directory manually before populating it (e.g., to pre-stage raw DICOM files in `mri/orig/`), or in scenarios where `recon-all` is not being invoked.

## Inputs

### Required Inputs

- One positional argument: `<subj_name>` — the name of the subject directory to create.

The script does **not** read `$SUBJECTS_DIR`. It creates the directory at the path given as the argument, relative to the current working directory (or as an absolute path if one is provided). The caller is responsible for `cd`-ing to `$SUBJECTS_DIR` first, or for passing an absolute path.

### Input Assumptions

> [!assumption] Directory must not already exist
> The script checks with `-e $1` (tcsh file-exists test) and exits with an error if the directory already exists. It will not create subdirectories inside an existing subject directory. There is no `--force` or `--update` mode.

> [!assumption] Group write permissions require correct umask
> The script sets `chmod g+rws` on the top-level directory and `chmod -R g+rw` on all contents. If the user's umask is not `002`, new files created subsequently inside the directory will not be group-writable. The script warns about this but does not abort.

## Outputs

### Files Created

The following directory structure is created under `<subj_name>/`:

```
<subj_name>/
├── mri/
│   ├── orig/
│   └── transforms/
├── scripts/
├── surf/
├── tmp/
├── label/
├── morph/
├── mpg/
├── tiff/
├── touch/
└── stats/
```

All directories are created with group-write permissions (`chmod -R g+rw`). The top-level directory additionally has the setgid bit set (`chmod g+rws`).

> [!gotcha] `bem` directory is not created despite source comment
> The source code contains the comment `#bem rgb` immediately before the `mkdir` command, but the `bem` directory is **not** included in the directory list. This appears to be a leftover comment. FreeSurfer BEM-related tools (for EEG/MEG forward modelling) expect `bem/` to exist; it must be created separately if needed.

### Output Specifications

No MRI files, transforms, or data files are created. Only directory structure and permissions are established.

## Mathematical Foundations

Not applicable. `mksubjdirs` performs only filesystem operations.

## Configuration Options

### Complete Flag Reference

`mksubjdirs` accepts no flags. It takes exactly one positional argument.

| Argument | Type | Default | Effect |
|----------|------|---------|--------|
| `<subj_name>` | string (path) | — | Name or path of the subject directory to create |

The script prints a usage message and exits if any number of arguments other than 1 is provided:

```tcsh
if ($#argv != 1) then
  echo "usage: mksubjdirs <subj_name>"
  exit
endif
```

### Configuration Interactions

No flags; no interactions.

## Typical Use Cases

### Create a new subject directory before running recon-all

```bash
cd $SUBJECTS_DIR
mksubjdirs bert
recon-all -s bert -i /data/bert_T1.dcm -all
```

### Create directory with an absolute path

```bash
mksubjdirs /path/to/subjects/bert
```

### Fix group ownership after creation

```bash
cd $SUBJECTS_DIR
mksubjdirs bert
chgrp -R mylab bert
```

The script reminds the user to run `chgrp` after creation if the directory needs to be readable by a specific group.

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]] directly. Used as a preparatory step before the pipeline.

`mksubjdirs` → populate `mri/orig/` → [[wiki/pipelines/recon-all|recon-all]]

In modern FreeSurfer usage, `recon-all` handles directory creation itself, so `mksubjdirs` is semi-redundant. However, it remains useful for:

- Setting up the tree before running individual pipeline stages manually.
- Environments where group ownership must be set before any files are created.
- Scripted batch setup of subject directories before any MRI data is available.

## Gotchas and Caveats

> [!gotcha] The script creates the directory relative to the current working directory
> Unlike most FreeSurfer tools, `mksubjdirs` does not honour `$SUBJECTS_DIR`. If you run it from a different directory, the subject directory will be created in the wrong place. Always `cd $SUBJECTS_DIR` first, or pass an absolute path.

> [!gotcha] Will not update an existing directory
> If `$SUBJECTS_DIR/bert` already exists, `mksubjdirs bert` will print an error and exit. There is no way to add missing subdirectories to an existing subject directory using this script.

> [!gotcha] `morph`, `mpg`, `tiff` directories are legacy artifacts
> The `morph`, `mpg`, and `tiff` directories are created for historical reasons and are not written by the current (v8.x) pipeline. They exist to support legacy workflows and older tools.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — main pipeline that also creates the subject directory tree on first run; preferred for new subjects in standard workflows
- [[subject-directory]] — concept page describing the full expected directory structure and the purpose of each subdirectory

## Confidence and Gaps

High confidence — the script is 67 lines of straightforward tcsh; all behaviour is directly visible.

> [!gap] `bem` directory omission
> The source comment `#bem rgb` suggests the `bem` directory was once intended to be created but was left out. It is unclear whether this was intentional (to keep the script minimal) or an oversight.

> [!gap] Recommended usage vs. recon-all
> It is not documented in the script or in the FreeSurfer wiki (as of the accession date) whether `mksubjdirs` should be preferred over simply letting `recon-all -i` create the directory. Developer guidance on this point would be useful.
