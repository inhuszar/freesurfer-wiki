---
title: "remove_talairach"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/remove_talairach"
families: []                     # standalone Talairach maintenance helper
recon_all_stage: null
related:
  - "[[talairach]]"
  - "[[show_tal]]"
  - "[[tal_compare]]"
  - "[[mri_transform_to_COR]]"
  - "[[coordinate-systems]]"
  - "[[subject-directory]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Operates on the legacy COR-.info text headers, not on modern .mgz volumes or talairach.xfm; on a v8 .mgz-based subject there are usually no COR-.info files for it to touch."
tags:
  - talairach
  - cor
  - legacy
  - maintenance
  - registration
---

# remove_talairach

## Summary

`remove_talairach` strips the embedded Talairach transform out of a subject's
legacy **COR** volume headers. Given a single subject name, it walks a fixed list
of `mri/` sub-directories (`orig`, `T1`, `brain`, `wm`, …) and, for each one that
contains a `COR-.info` file, deletes the `xform` line from that header (keeping a
`.bak` backup). The effect is to make those COR volumes behave as if no Talairach
registration had been computed, without otherwise altering the image data.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/remove_talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach)
- **Binary/script location:** `$FREESURFER_HOME/bin/remove_talairach`
- **External tools invoked:** none — it uses only shell built-ins plus `rm`, `mv`, and `grep`.

## Purpose and Context

In the legacy **COR** representation (see [[mri_transform_to_COR]] and
[[subject-directory]]), each volume directory carries a text header named
`COR-.info`, and the Talairach registration is stored *inside* that header on an
`xform` line that names the transform file. Some tools and older pipelines read
that line to locate the Talairach transform.

`remove_talairach` exists to **un-set** that link across every COR volume in a
subject's `mri/` tree at once — for example after a bad Talairach registration,
when you want to force tools to fall back to "no transform" or to recompute it
from scratch with [[talairach]]. It does this purely by editing the header text;
the image bytes are untouched.

This is a **legacy maintenance** utility. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] (no caller exists in the script tree). On
a modern `.mgz`-based v8 subject, where the Talairach transform lives in
`mri/transforms/talairach.xfm` rather than in COR headers, there are typically no
`COR-.info` files for it to modify (see the gap below).

## Inputs

### Required Inputs

- **Subject name** — a single positional argument (`$1`). The script `cd`s into
  `$SUBJECTS_DIR/$1/mri` ([`scripts/remove_talairach:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L21)). It relies on
  `$SUBJECTS_DIR` being set.

### Input Assumptions

> [!assumption] A legacy COR-based subject under $SUBJECTS_DIR
> The script assumes `$SUBJECTS_DIR/$1/mri/<dir>/COR-.info` files exist. It only
> touches a directory if its `COR-.info` is present
> ([`scripts/remove_talairach:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L23)); directories without one are silently
> skipped. There is **no** argument validation — a missing subject simply makes
> the initial `cd` fail. Because the shebang is `#!/bin/tcsh -ef`
> ([`scripts/remove_talairach:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L1)), the `-e` flag makes a failed `cd`
> abort the script.

The fixed list of directories scanned is:
`orig`, `T1`, `brain`, `wm`, `seg`, `seg_edited`, `cma_seg`, `filled`, `aseg`,
`fsamples`, `temporal_lobe`, `norm`, `tmp`
([`scripts/remove_talairach:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L22)).

## Outputs

### Files Created / Modified

For each scanned directory `<d>` that contains a `COR-.info`:

| File | Action |
|------|--------|
| `<d>/COR-.info.bak` | Any pre-existing backup is first removed, then the **current** `COR-.info` is moved here (`mv -f`), preserving the original (with the `xform` line) as a backup. |
| `<d>/COR-.info` | Rewritten from the backup with every `xform` line removed (`grep -v '^xform'`). |

The transformation is performed at
[`scripts/remove_talairach:25-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L25-L27).

### Output Specifications

The output is the same COR header text **minus** any line beginning with
`xform`. No image data, geometry, or other header fields are changed. After this
runs, tools that read the Talairach transform from `COR-.info` will find none,
i.e. the volume is treated as un-registered to Talairach space (see
[[coordinate-systems]]).

## Mathematical Foundations

None — this is a text edit. It performs no geometric computation; it only removes
a line of text that *names* a transform.

## Configuration Options

### Complete Flag Reference

`remove_talairach` has **no flags**. Its only input is the positional subject
name (`$1`). The list of directories it operates on is hard-coded
([`scripts/remove_talairach:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L22)) and cannot be changed from the
command line.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject name; the script edits `COR-.info` files under `$SUBJECTS_DIR/$1/mri/`. |

### Configuration Interactions

None — there are no options to interact. The only implicit dependency is on the
`$SUBJECTS_DIR` environment variable, which must point at the subjects tree
containing the named subject.

## Typical Use Cases

### 1. Clear the Talairach transform from a subject's COR headers

```bash
# Remove the xform line from every COR-.info under bert/mri/
setenv SUBJECTS_DIR /path/to/subjects
remove_talairach bert
```

Each affected directory prints `removing xform line from directory <d>` and
leaves a `COR-.info.bak` alongside the rewritten `COR-.info`.

### 2. Recover the original headers

```bash
# The originals (with the xform line) are preserved as .bak files:
cd $SUBJECTS_DIR/bert/mri
foreach d (orig T1 brain wm)
  mv -f $d/COR-.info.bak $d/COR-.info
end
```

(The script itself provides no "undo"; restoration is manual from the `.bak`
files it leaves behind.)

## Pipeline Context

`remove_talairach` is a **standalone maintenance** helper. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or any current pipeline (no caller exists
in the script tree).

**Predecessor:** a COR-based subject with a Talairach `xform` line in its
`COR-.info` headers (e.g. after [[talairach]]) → **remove_talairach** →
**Successor:** the same subject with the Talairach link removed, ready to be
re-registered or used as un-transformed. The companion display tools
[[show_tal]] and [[tal_compare]] visualise a Talairach transform; this tool
removes one.

## Gotchas and Caveats

> [!gotcha] Edits COR headers, not talairach.xfm
> This tool removes the `xform` line from legacy `COR-.info` text headers. It does
> **not** delete or modify `mri/transforms/talairach.xfm`, and it does not touch
> `.mgz` volumes. Removing the COR `xform` line does not, by itself, undo a
> Talairach registration stored elsewhere.

> [!gotcha] Hard-coded, possibly stale directory list
> The scanned directory list ([`scripts/remove_talairach:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L22)) reflects an
> older `mri/` layout (`seg_edited`, `cma_seg`, `temporal_lobe`, …). Any COR
> volume in a directory **not** on that list is left untouched.

## Error Compensation and Guard Rails

- **Backup before edit.** The original `COR-.info` is preserved as
  `COR-.info.bak` before being rewritten, so the `xform` line can be restored
  manually ([`scripts/remove_talairach:25-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L25-L26)).
- **Existence guard.** A directory is only modified if its `COR-.info` exists
  ([`scripts/remove_talairach:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach#L23)).
- **`-ef` shebang.** The `-e` option means the script aborts on the first error
  (e.g. a failed `cd` into a non-existent subject), rather than continuing
  blindly.

## Related Tools

- [[talairach]] — computes the Talairach registration whose `xform` link this tool removes.
- [[show_tal]] — displays a subject's Talairach transform (the QA counterpart).
- [[tal_compare]] — compares two Talairach transforms for the same subject.
- [[mri_transform_to_COR]] — produces the COR directories (with `COR-.info` headers) this tool edits.
- [[coordinate-systems]] — background on Talairach/MNI space and how the transform is interpreted.
- [[subject-directory]] — inventory of the `mri/` tree the COR directories live in.

## Confidence and Gaps

**High confidence:** the script is tiny and fully read; the subject argument, the
hard-coded directory list, the backup-then-`grep -v '^xform'` rewrite, and the
COR-only scope are confirmed directly from
[`scripts/remove_talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach).

> [!gap] Relevance on modern .mgz subjects
> On a v8 subject processed entirely in `.mgz`, the Talairach transform lives in
> `mri/transforms/talairach.xfm`, and `COR-.info` files are usually absent — in
> which case this tool finds nothing to edit and is effectively a no-op. Its
> practical use is limited to legacy COR-based trees.

## References

- FreeSurfer source: [`scripts/remove_talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/remove_talairach) (v8.2.0).
