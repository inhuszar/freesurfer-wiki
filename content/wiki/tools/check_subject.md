---
title: "check_subject"
type: tool
fs_version: "8.2.0"
source_language: "Perl"
source_files:
  - "scripts/check_subject"
families: []                     # standalone per-subject surface-QA utility
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[check_recons.sh]]"
  - "[[mris_info]]"
  - "[[post-recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - recon-all
  - qa
  - surfaces
  - integrity-check
---

# check_subject

## Summary

`check_subject` is a small Perl script that sanity-checks the surface files of a
single reconstructed subject. Given a subject id (with `$SUBJECTS_DIR` set), it
enters the subject's `surf/` directory and, for each hemisphere, verifies that
the expected surface and morphometry files (`?h.orig`, `?h.smoothwm`,
`?h.inflated`, `?h.white`, `?h.pial`, `?h.sphere`, `?h.sphere.reg`, `?h.sulc`,
`?h.curv`, `?h.thickness`, `?h.area`, plus the contralateral `?h.sphere.reg`)
exist and are non-empty, that each file is **newer** than the file it is derived
from (a timestamp-ordering check), that the per-hemisphere surfaces all share the
same vertex count, and that the morphometry overlays are mutually consistent in
size. It prints a `WARN:` line for every problem found and exits with a status
equal to the number of problems (0 = clean). It is a read-only QA probe.

## Source Information

- **Language:** Perl
- **Source file:** [`scripts/check_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/check_subject`
- **External tool invoked:** [`mris_info --nvertices`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L61) (to read each surface's vertex count).

## Purpose and Context

A successful exit from [[wiki/pipelines/recon-all|recon-all]] (a
`recon-all.done` file, as checked by [[check_recons.sh]]) means the *pipeline*
ran to completion, but it does not by itself prove the *surfaces are internally
consistent*. `check_subject` performs that deeper, file-level verification for
one subject: it confirms the surface reconstruction produced every expected
hemisphere file, that the files were generated in the right dependency order
(e.g. `inflated` newer than `smoothwm`, which is newer than `orig`), that all
surfaces of a hemisphere describe the same mesh (identical vertex count), and
that the scalar overlays match in size. It is meant to catch partial, stale, or
corrupt reconstructions that the coarse done/error markers would miss.

It is a standalone QA tool, run by hand on individual subjects; it is not part of
recon-all and recon-all does not call it.

## Inputs

### Required Inputs

- **Subject id** — the single positional argument `$ARGV[0]`
  ([`scripts/check_subject:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L3)).
- **`$SUBJECTS_DIR`** — read from the environment to locate the subject
  ([`scripts/check_subject:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L4)). The script `chdir`s into
  `$SUBJECTS_DIR/$subj/surf` and dies if it cannot
  ([`scripts/check_subject:9-12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L9-L12)).

The subject must therefore already have a `surf/` directory populated by
recon-all.

### Input Assumptions

> [!assumption] A reconstructed subject with a populated `surf/` directory
> The check assumes a normal recon-all surface reconstruction: both hemispheres,
> the standard set of surface and morphometry files, and a `?h.qsphere`. Files
> that are missing or zero-length are reported (not fatal); only an unreadable
> subject or `surf/` directory is fatal (`die`). The script reasons purely about
> **file existence, size, modification time, and vertex count** — it does not
> open or geometrically validate the meshes beyond the vertex count obtained from
> [[mris_info]].

## Outputs

### Files Created

`check_subject` writes no persistent output. It only creates and immediately
removes a transient temp file while reading vertex counts (see the gotcha below)
and prints to **stderr** (`warn`).

### Output Specifications

- **stderr:** a leading `CHECKING SUBJECT <subj>` line
  ([`scripts/check_subject:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L7)) followed by one `WARN: …` line per detected
  problem.
- **Exit status:** the integer count of problems found (`$status`), returned via
  `exit $status` ([`scripts/check_subject:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L110)). **0 means all checks
  passed**; any non-zero value is the number of warnings emitted. Scripts should
  test the exit code.

The specific checks, per hemisphere (`rh` then `lh`,
[`scripts/check_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L30)):

| Check | Condition that emits a WARN | Source |
|-------|-----------------------------|--------|
| File present & non-empty | `?h.<ext>` is empty or missing (`! -s`) | [`:37-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L37-L39) |
| Dependency order | `?h.<ext>` is **older** than the file it derives from (per the `%order` map) | [`:41-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L41-L46) |
| Vertex-count consistency | a surface's vertex count differs from `?h.smoothwm`'s | [`:52-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L52-L74) |
| Overlay size consistency | `?h.sulc`/`?h.curv`/`?h.thickness` differ in byte size from each other | [`:89-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L89-L102) |
| qsphere not degenerate | `?h.qsphere` has the **same** byte size as `?h.orig` | [`:104-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L104-L106) |

## Mathematical Foundations

None — this is a file-integrity/consistency checker. The "ordering" logic relies
on Perl's `-M` operator (file age in days since script start): a file is flagged
as out-of-order when `(-M $file) > (-M $prerequisite)`, i.e. the derived file is
older than its source ([`scripts/check_subject:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L43)). Vertex counts come
from [[mris_info]]; sizes come from `-s` (byte length).

The dependency graph it enforces is encoded in the `%order` hash
([`scripts/check_subject:14-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L14-L26)):

| File (`?h.<ext>`) | Must be newer than |
|-------------------|--------------------|
| `orig` | `qsphere` |
| `smoothwm` | `orig` |
| `inflated` | `smoothwm` |
| `sphere` | `inflated` |
| `sphere.reg` | `sphere` |
| `white` | `inflated` |
| `pial` | `white` |
| `sulc`, `curv`, `thickness`, `area` | `orig` |
| `rh.sphere.reg` (added on the `lh` pass) | `sphere` |

## Configuration Options

### Complete Flag Reference

`check_subject` has **no flags or options** — only one positional argument:

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<subject>` | string | *(required)* | Subject id under `$SUBJECTS_DIR` to check ([`scripts/check_subject:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L3)). |

There is no `--help`, `--version`, or any other switch; an absent or wrong
argument simply causes the `chdir` to fail and the script to `die`.

### Configuration Interactions

None — there is nothing to configure. The only behavioural branch is the
hemisphere loop, which on the `lh` pass additionally registers `rh.sphere.reg` as
a checked file ([`scripts/check_subject:31-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L31-L34)), so the contralateral
registration surface is validated too.

## Typical Use Cases

### Use Case 1: Check one subject

```bash
export SUBJECTS_DIR=/data/study/freesurfer
check_subject bert
echo "problems found: $?"     # 0 = clean
```

### Use Case 2: Check every completed subject in a study

```bash
export SUBJECTS_DIR=/data/study/freesurfer
for s in $(ls $SUBJECTS_DIR); do
  [ -e "$SUBJECTS_DIR/$s/scripts/recon-all.done" ] || continue
  check_subject "$s" 2>&1 | grep -q WARN && echo "ISSUES: $s"
done
```

This pairs naturally with [[check_recons.sh]]: use that first to find the
COMPLETED subjects, then run `check_subject` on each to verify surface integrity.

## Pipeline Context

`check_subject` is a **per-subject QA probe** that runs after
[[wiki/pipelines/recon-all|recon-all]]. It is not a recon-all stage and is not
invoked by recon-all. Its role is one level finer than [[check_recons.sh]]:
where that tool reports *which runs finished/failed/stalled* across a directory,
`check_subject` inspects the *contents* of a single finished subject's `surf/`
tree to confirm the surfaces are complete, correctly ordered, and consistent.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (produces `surf/`) and
[[check_recons.sh]] (tells you which subjects to check) → **check_subject** →
**Successor:** manual review / re-running recon-all stages for any subject that
warns, then [[post-recon-all]].

## Gotchas and Caveats

> [!gotcha] Vertex-count temp-file mismatch reads the wrong file
> The script writes the per-surface `mris_info` output to a process-unique temp
> file `/tmp/chsubj.$$.dat`, but then opens `/tmp/chsubj.dat` (without the `$$`
> PID) to read the vertex count ([`scripts/check_subject:59-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L59-L65)). The
> filenames do not match: the value parsed therefore comes from a stale or
> non-existent `/tmp/chsubj.dat` rather than the file just written (and the
> subsequent `rm` removes the `$$` file, not the one read). The vertex-count
> consistency check is consequently unreliable — it may read nothing, or a value
> left over from a previous/other run. The file-existence, ordering, overlay-size,
> and qsphere checks are unaffected. Treat this as a bug in the script, not
> intended behaviour.

> [!gotcha] Output goes to stderr, and the count is the exit code
> All messages are emitted with `warn` (stderr), not stdout, and the exit status
> equals the number of warnings ([`scripts/check_subject:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L110)). When
> capturing output, redirect `2>&1`; when scripting, branch on `$?` rather than on
> captured text.

> [!gotcha] Missing files are non-fatal but skip their other checks
> An empty/missing `?h.<ext>` produces one WARN and then `next`
> ([`scripts/check_subject:37-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L37-L40)), so the ordering check for that file
> is skipped. Only an unreadable subject or `surf/` directory is fatal (`die`,
> [`scripts/check_subject:9-12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L9-L12)).

> [!gotcha] `qsphere` same size as `orig` is treated as an error
> If `?h.qsphere` has exactly the same byte size as `?h.orig`, a WARN is emitted
> ([`scripts/check_subject:104-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L104-L106)). This is a heuristic for a failed
> quasi-homeomorphic sphere step (the file being a stray copy of `orig` rather
> than a genuine spherical inflation).

> [!gotcha] The disabled size-equality block is intentional
> An earlier "file size equal to previous surface" check is commented out
> ([`scripts/check_subject:77-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L77-L85)) with the note "File size is no longer a
> good determinant of status" — surface files legitimately differ in size, so the
> vertex-count test replaced it. Only the *overlay* size-equality check (sulc /
> curv / thickness, which genuinely should match) remains active.

## Error Compensation and Guard Rails

- **Fatal guards.** `die`s if it cannot `cd` into `$SUBJECTS_DIR/$subj` or into
  `surf/` ([`scripts/check_subject:9-12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject#L9-L12)).
- **Soft warnings.** Every other problem is a non-fatal `warn` that increments the
  status counter; the script always continues to the end and reports the total
  through its exit code.
- It is **non-destructive** apart from its own `/tmp` scratch file, so there is
  nothing in the subject tree to compensate for.

## Known Bugs

- [[00176]] — the vertex-count check writes `mris_info` output to `/tmp/chsubj.$$.dat` (PID-suffixed) but reads back `/tmp/chsubj.dat` (no PID), so the check reads the wrong/missing file and never fires.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — produces the surfaces this tool checks.
- [[check_recons.sh]] — coarse batch-level done/error/running status; the usual
  first pass before running `check_subject` per completed subject.
- [[mris_info]] — used internally to read each surface's vertex count.
- [[post-recon-all]] — what you would run on a subject once it passes this check.

## Confidence and Gaps

**High confidence:** the per-hemisphere file list, the `%order` dependency graph,
the empty/missing and ordering checks, the overlay-size and qsphere checks, the
exit-status-equals-warning-count contract, and the temp-file naming mismatch were
all read directly from the 110-line
[`scripts/check_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject).
The `mris_info --nvertices --o` invocation was confirmed against
[`mris_info/mris_info.cpp:432`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_info/mris_info.cpp#L432) (it writes an `nvertices <N>` line).

## References

- FreeSurfer source: [`scripts/check_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_subject) (v8.2.0).
- Vertex-count reader: [`mris_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_info/mris_info.cpp) `--nvertices`/`--o`.
