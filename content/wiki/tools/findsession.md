---
title: "findsession"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash wrapper around a site-local binary
source_files:
  - "scripts/findsession"
families: []                     # site-specific session locator (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[dcmunpack]]"
  - "[[mri_parse_sdcmdir]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The actual locator is /usr/pubsw/bin/findsession, an MGH/Martinos-Center site binary that is NOT in the FreeSurfer source tree; its implementation cannot be audited from the FreeSurfer repo. Flags below are taken from its --help on a Martinos host, not from source."
tags:
  - dicom
  - site-specific
  - martinos
  - data-management
---

# findsession

## Summary

`findsession` searches the scanner **session archive** for sessions whose subject
name (or subject ID) matches a given substring, and prints the on-disk path(s) to
the raw data, so you can locate a scan to import. **The version shipped in the
FreeSurfer source tree is a one-line wrapper** that hands off to a separate,
**site-specific** executable at `/usr/pubsw/bin/findsession` — the database of
sessions it queries exists only at the MGH/Martinos Center. On a system without
that binary and archive, `findsession` will not work.

## Source Information

- **Language:** bash wrapper (the real tool is a separate site binary)
- **Source file:** [`scripts/findsession`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/findsession)
- **Binary/script location:** `$FREESURFER_HOME/bin/findsession`
- **What it runs:** the entire body is a single `exec`
  ([`scripts/findsession:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/findsession#L19)):

  ```bash
  exec /usr/pubsw/bin/findsession "$@"
  ```

  i.e. it replaces itself with `/usr/pubsw/bin/findsession`, forwarding all
  arguments unchanged. That target is a **Martinos Center `pubsw` binary**, not
  part of the FreeSurfer distribution and not present in the source tree.

## Purpose and Context

At a busy imaging centre, raw scanner data for many subjects accumulates in a
shared, dated archive (e.g. `Trio-20501-20031120-101329-093000`-style session
directories). Before you can convert or process a scan you have to find **where**
on the cluster filesystem that subject's session was deposited. `findsession`
answers exactly that: "given a subject name/ID substring, where is the data?"

It is a **convenience locator** that sits at the very front of the import workflow
— you run it to obtain a path, then feed that path to a DICOM importer such as
[[dcmunpack]] (or inspect it with [[mri_parse_sdcmdir]]) and ultimately
[[wiki/pipelines/recon-all|recon-all]]. It is **not** part of recon-all or
trac-all, and it does not appear anywhere else in the FreeSurfer scripts; it is a
standalone helper for Martinos users.

> [!gotcha] Site-specific tool
> `findsession` depends on `/usr/pubsw/bin/findsession` and the Martinos session
> database. On any other installation the `exec` fails ("No such file or
> directory") and there is nothing the FreeSurfer-shipped wrapper can do about it.
> Outside Martinos, locate your raw data by other means and skip straight to
> [[dcmunpack]].

## Inputs

### Required Inputs

- **A subject substring** — the trailing positional `<subject>` argument; the tool
  matches sessions whose subject **name** contains that substring. A substring of
  `%` matches **all** subjects. (From the binary's `--help`; see
  [Configuration Options](#configuration-options).)

### Input Assumptions

> [!assumption] Runs on a Martinos host with archive access
> The tool assumes it is executing on a machine where `/usr/pubsw/bin/findsession`
> exists and the caller has filesystem-group permission for the matched sessions'
> projects. Permission and archival-status caveats (older data moved to cloud
> archive; just-pushed data sitting in the incoming spool) are described in the
> binary's own help text.

## Outputs

### Files Created

None. Matching session(s) and their archive **paths** are printed to **stdout**.

### Output Specifications

A human-readable listing of matched sessions and the filesystem path to each
session's data. The exact column layout is defined by the external binary and is
not specified here.

## Mathematical Foundations

None — this is a database/substring lookup over a session archive. No computation.

## Configuration Options

### Complete Flag Reference

> [!contradiction] Flags come from the binary, not the FreeSurfer source
> The FreeSurfer-shipped script defines **no** options of its own — it forwards
> everything to `/usr/pubsw/bin/findsession`. The table below is transcribed from
> that binary's `--help` output on a Martinos host (FreeSurfer 8.2.0 install) and
> therefore cannot be verified against FreeSurfer source. Treat it as
> site-documentation, not code-audited.

Usage (from `findsession --help`):
`findsession [-ertI] [-s|-o <YYYY-MM-DD>] [-i <ID>] [-p <prj>] <subject>`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<subject>` | string (positional) | *(required)* | Substring matched against the subject name; `%` matches all subjects. |
| `-e` | bool | substring match | Require an **exact** subject-name match instead of a substring match. |
| `-f` | string | all bays | List only sessions for the given scanner bay (e.g. `bay1`). |
| `-i` | string | — | Show only matches whose **session ID** contains this substring (e.g. `Trio-20501-20031120-101329-093000`). |
| `-I` | bool | search by name | Search on subject **ID** rather than subject name. |
| `-p` | string | all projects | Restrict to sessions matched to the given project. |
| `-o` | date `YYYY-MM-DD` | — | Show only sessions acquired **on** the given date. |
| `-s` | date `YYYY-MM-DD` | — | Show only sessions acquired **since** the given date. |
| `-r` | bool | off | Show only sessions acquired in the last 4 months. |
| `-t` | bool | off | Show only sessions acquired **today**. |
| `-O` | string | — | Match sessions with the given string in the **operator** field. |
| `-x` | string | — | Match sessions with the given string in the **experimenter** field. |
| `-h` | bool | — | Print the help message. |

### Configuration Interactions

- `-s` (since a date) and `-o` (on a date) are alternative date filters — the
  usage string lists them as `[-s|-o <YYYY-MM-DD>]`, i.e. choose one.
- `-e` (exact) refines the subject match; `-I` switches whether the subject term
  is matched against the name or the ID.
- The date/recency filters (`-o`, `-s`, `-r`, `-t`) narrow the result set and are
  most useful when a subject substring matches many historical sessions.

> [!gap] Interaction semantics are unverified
> Because the implementation is an external binary, the precise behaviour when
> several filters are combined (AND vs. OR, precedence) is not documented here.
> Use `findsession -h` on the host for the authoritative, version-current help.

## Typical Use Cases

### 1. Find a subject's sessions by name

```bash
# All sessions whose subject name contains "bert"
findsession bert
```

### 2. Narrow by date and project

```bash
# Sessions for project "myproj" acquired since a date
findsession -p myproj -s 2024-01-01 bert
```

### 3. Locate then import

```bash
# Use the returned path as the DICOM source for dcmunpack
set sesspath = `findsession -e subj_007 | ...`   # pick the path field
dcmunpack -src $sesspath -targ /data/unpacked/subj_007 -auto-runseq nii.gz
```

## Pipeline Context

`findsession` is a front-of-pipeline **data-locator** specific to the Martinos
Center. It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or
`trac-all`.

**Predecessor:** a scan acquired and pushed to the centre's session archive →
**findsession** returns the path → **Successor:** [[dcmunpack]] (convert the
DICOMs) or [[mri_parse_sdcmdir]] (inventory a Siemens directory), then
[[wiki/pipelines/recon-all|recon-all]] on the resulting volume.

## Gotchas and Caveats

> [!gotcha] Only works at Martinos
> The wrapper `exec`s a hard-coded path under `/usr/pubsw/bin`. Outside that
> environment it fails immediately. There is no fallback and no configuration to
> point it elsewhere ([`scripts/findsession:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/findsession#L19)).

> [!gotcha] Permission and archival caveats
> The binary's help warns that (a) a "Permission Denied" on a session path means
> you are not in the right filesystem group for that project; (b) data over a year
> old may have been moved offline to cloud archive; and (c) very recently pushed
> data may still be in the incoming spool and could be deleted at any time. These
> are environmental, not anything the FreeSurfer wrapper controls.

## Error Compensation and Guard Rails

The FreeSurfer-shipped wrapper performs **no** validation, defaulting, or error
handling of its own — it is a single `exec`. All argument checking, matching, and
error reporting are done by `/usr/pubsw/bin/findsession`. If that binary is
absent, the shell's `exec` failure is the only diagnostic.

## Related Tools

- [[dcmunpack]] — the multi-vendor DICOM importer you typically run on the path `findsession` returns.
- [[mri_parse_sdcmdir]] — inventory a located Siemens DICOM directory.
- [[wiki/pipelines/recon-all|recon-all]] — downstream consumer of the imported anatomical volume.

## Confidence and Gaps

**High confidence (code-truth):** the FreeSurfer source for `findsession` is
exactly a one-line `exec /usr/pubsw/bin/findsession "$@"`
([`scripts/findsession:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/findsession#L19)) — it adds no logic and is fully a pass-through to a
site binary.

> [!gap] The real implementation is external and unauditable
> `/usr/pubsw/bin/findsession` is an MGH/Martinos `pubsw` binary that is not part
> of the FreeSurfer source tree. The flag table and behaviour above were taken
> from its `--help` on a Martinos host and may differ at other sites or in other
> versions; they cannot be verified against FreeSurfer source. On non-Martinos
> installs the tool is non-functional.

## References

- FreeSurfer source: [`scripts/findsession`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/findsession) (v8.2.0) — the one-line wrapper.
- Built-in help: `findsession -h` / `findsession --help` (served by the external `/usr/pubsw/bin/findsession` binary; documents the flags and the permission/archival caveats).
