---
title: "fixup_mni_paths"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fixup_mni_paths"
families: []                     # standalone install/maintenance utility
recon_all_stage: null
related:
  - "[[mri_nu_correct.mni]]"
  - "[[talairach]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - installation
  - maintenance
  - mni
  - minc
  - perl
---

# fixup_mni_paths

## Summary

`fixup_mni_paths` is an installation-time maintenance tcsh script that repairs
the **hard-coded Perl interpreter path and MNI install prefix** baked into the
bundled MINC toolkit Perl scripts. The MNI/MINC tools (used by FreeSurfer for
N3/N4 intensity correction and Talairach registration) were compiled on a
build machine where `perl` lived at a fixed path; if that build is shipped to
a system with a different Perl location, those scripts break. `fixup_mni_paths`
rewrites the offending paths in place — substituting the current machine's
`perl` and the actual MINC install directory — so the MNI tools run correctly.
It is a one-shot fixer, not part of any image-processing pipeline.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fixup_mni_paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths)
- **Binary/script location:** `$FREESURFER_HOME/bin/fixup_mni_paths`
- **Original author:** Nick Schmansky
- **Tools invoked:** standard Unix `which`, `sed`, `mv`, `chmod`, `diff`, `rehash`, and finally `nu_correct` (run with no arguments as a smoke test) ([`scripts/fixup_mni_paths:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L98)).

## Purpose and Context

FreeSurfer ships a copy of the MNI MINC toolkit. Several of its programs are
Perl scripts whose `#!` shebang and internal path references were written by
the MNI build system to absolute, machine-specific locations
(`/usr/pubsw/bin/perl`, `/usr/local/bin/perl`) and to a fixed install prefix
(`/usr/pubsw/packages/mni/1.0.4`, `.../current`). When a pre-built FreeSurfer
is unpacked on a host where Perl is elsewhere, or the MNI prefix differs, those
scripts fail to launch. `fixup_mni_paths` is the documented remedy: it
`sed`-replaces all four patterns with the correct values for the current
install. The affected programs include the N3 non-uniformity tools
(`nu_correct`, `nu_estimate`, …) and the Talairach registration driver
(`mritotal`), which FreeSurfer's intensity-correction and registration steps
depend on (see [[mri_nu_correct.mni]] and [[talairach]]).

It is run **once, by hand or by an install script**, after relocating a
pre-built FreeSurfer/MNI tree — never as part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

`fixup_mni_paths` takes **no command-line arguments**. Its behaviour is driven
entirely by two environment variables and the files it finds in the MINC bin
directory:

- **`MINC_BIN_DIR`** (required) — the MNI/MINC toolkit `bin` directory whose
  scripts will be patched. Normally set automatically by
  `$FREESURFER_HOME/FreeSurferEnv.csh`. The script aborts if it is unset or
  does not exist ([`scripts/fixup_mni_paths:44-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L44-L53)).
- **`MY_PERL`** (optional) — an explicit path to the `perl` to substitute in.
  If unset, the script uses `which perl`; if that also fails, it exits with an
  error telling the user that the MNI tools require Perl
  ([`scripts/fixup_mni_paths:33-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L33-L40)).

### Input Assumptions

> [!assumption] A relocated, pre-built MNI/MINC toolkit with FreeSurfer's environment sourced
> The script assumes you have sourced FreeSurfer's setup (so `MINC_BIN_DIR` is
> defined and points at a real directory) and that the thirteen MNI Perl
> scripts it expects are present and writable in that directory. It edits files
> **in place** (saving `.old` backups), so it must be run with write
> permission on `$MINC_BIN_DIR`.

The exact list of patched files is fixed in the script
([`scripts/fixup_mni_paths:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L70)): `autocrop`, `field2imp`, `imp2field`,
`make_template`, `mritoself`, `mritotal`, `nu_correct`, `nu_estimate`,
`nu_estimate_np_and_em`, `nu_evaluate`, `resample_labels`, `sharpen_volume`,
`xfmtool`.

## Outputs

### Files Created / Modified

| File | Where | Effect |
|------|-------|--------|
| each of the 13 MNI scripts | `$MINC_BIN_DIR/` | rewritten in place with corrected Perl and MNI-prefix paths; made executable (`chmod a+x`) |
| `<script>.old` | `$MINC_BIN_DIR/` | a backup copy of each original, pre-patch script |

No image data is produced. The intermediate `sedfile1`…`sedfile4` and
`<script>.1/.2/.3` temporaries are created and then removed
([`scripts/fixup_mni_paths:80-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L80-L84)).

## Mathematical Foundations

None — this is a text-substitution maintenance script. It performs four
literal `sed` replacements:

| `sed` pattern | Replaced with |
|---------------|---------------|
| `/usr/pubsw/bin/perl` | `$MY_PERL` |
| `/usr/local/bin/perl` | `$MY_PERL` |
| `/usr/pubsw/packages/mni/1.0.4` | `$MINC_HOME_DIR` (= `$MINC_BIN_DIR` minus the trailing `/bin`) |
| `/usr/pubsw/packages/mni/current` | `$MINC_HOME_DIR` |

defined at [`scripts/fixup_mni_paths:57-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L57-L67). `MINC_HOME_DIR` is derived
by stripping `/bin` from `MINC_BIN_DIR` ([`scripts/fixup_mni_paths:63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L63)).

## Configuration Options

`fixup_mni_paths` has **no command-line flags** — there is no argument-parsing
loop and no `--help`. The only user-tunable input is the optional `MY_PERL`
environment variable (to override the auto-detected `perl` path); `MINC_BIN_DIR`
selects the target directory.

> [!gotcha] No `--help`; running it does the work immediately
> Because there is no argument parsing, invoking `fixup_mni_paths` with any
> argument (including `--help`) simply runs the patcher. It will attempt to
> `cd $MINC_BIN_DIR` and rewrite the 13 scripts straight away. There is no
> dry-run mode; the `.old` backups are the only safety net.

## Configuration Interactions

> [!gotcha] Set MY_PERL to override a wrong auto-detected interpreter
> If `which perl` returns a Perl you do not want the MNI scripts to use (e.g. a
> conda Perl ahead on `PATH`), export `MY_PERL=/path/to/correct/perl` before
> running. When `MY_PERL` is already set, the auto-detection is skipped
> entirely ([`scripts/fixup_mni_paths:33-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L33-L41)).

## Typical Use Cases

### Use Case 1: Fix a relocated FreeSurfer/MNI install

```bash
source $FREESURFER_HOME/SetUpFreeSurfer.csh   # defines MINC_BIN_DIR
fixup_mni_paths
# Patches nu_correct, mritotal, etc.; prints diffs; then runs `nu_correct`
# with no args as a smoke test (a version/usage banner should appear).
```

### Use Case 2: Force a specific Perl

```bash
setenv MY_PERL /usr/bin/perl
source $FREESURFER_HOME/SetUpFreeSurfer.csh
fixup_mni_paths
```

## Pipeline Context

Stand-alone install/maintenance utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or any processing pipeline; it is a
prerequisite-repair step so that the MNI tools those pipelines call
(`nu_correct` via [[mri_nu_correct.mni]], `mritotal` via the [[talairach]]
registration) will run on a relocated install.

**Predecessor:** relocating/unpacking a pre-built FreeSurfer + MNI tree →
**fixup_mni_paths** → **Successor:** normal FreeSurfer processing
([[wiki/pipelines/recon-all|recon-all]] intensity correction / Talairach
stages).

## Gotchas and Caveats

> [!gotcha] Edits files in place — backups are `.old`
> Each patched script's original is moved to `<script>.old` before rewriting.
> Re-running the script a second time would overwrite those `.old` backups with
> the already-patched versions, so keep an external copy if you need the true
> originals.

> [!gotcha] "may not show any differences" is normal
> The script ends by `diff`-ing each patched file against its `.old` backup and
> notes that not all systems require a patch
> ([`scripts/fixup_mni_paths:87-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L87-L94)). Empty diffs mean the hard-coded paths
> already matched this machine; that is success, not failure.

> [!gotcha] Final `nu_correct` smoke test is intentional
> After patching, the script runs `nu_correct` with no arguments and tells you
> a version/usage banner "should have been displayed"
> ([`scripts/fixup_mni_paths:96-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L96-L99)). This is a quick check that the
> patched Perl path now works; a Perl error here means the substitution did not
> resolve to a working interpreter.

## Error Compensation and Guard Rails

- Aborts early with a clear message if Perl cannot be found
  ([`scripts/fixup_mni_paths:35-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L35-L39)), if `MINC_BIN_DIR` is unset
  ([`scripts/fixup_mni_paths:45-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L45-L49)), or if it does not exist
  ([`scripts/fixup_mni_paths:50-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths#L50-L53)).
- Keeps a `.old` backup of every file it touches, so a bad patch can be undone
  manually.
- Cleans up its `sed` script files and per-file temporaries on completion.

## Related Tools

- [[mri_nu_correct.mni]] — FreeSurfer wrapper around the MNI `nu_correct` N3 tool that this script patches.
- [[talairach]] — Talairach registration that drives the MNI `mritotal` script patched here.

## Confidence and Gaps

**High confidence:** the script was read in full. The required `MINC_BIN_DIR`
and optional `MY_PERL` environment variables, the four `sed` substitution
patterns, the fixed 13-file patch list, the in-place edit with `.old` backups,
and the closing `nu_correct` smoke test are all read directly from
[`scripts/fixup_mni_paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths).

## References

- FreeSurfer source: [`scripts/fixup_mni_paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fixup_mni_paths) (v8.2.0).
- MNI MINC toolkit (N3 / `mritotal`), bundled with FreeSurfer under `$MINC_BIN_DIR`.
