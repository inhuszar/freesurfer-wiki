---
title: "fs-check-os"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fs-check-os"
families: []                     # standalone runtime/environment-check utility
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[fs_lib_check]]"
  - "[[fs_update]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - infrastructure
  - environment-check
  - operating-system
  - recon-all
  - reproducibility
---

# fs-check-os

## Summary

`fs-check-os` answers one question: *is the operating system I am running on one
that the maintainer of this dataset has declared acceptable?* It derives a
compact OS identifier from `/etc/os-release` (the `PRETTY_NAME`, with spaces
turned into dashes and parentheses stripped) and compares it against a list of
allowed identifiers stored in `$SUBJECTS_DIR/fs-allowed-os.txt`. It exits 0 if
the current OS is in the list (or if checking is disabled, or if no list
exists), and exits 1 if the list exists but the current OS is not on it. The
sub-mode `--get` just prints the current OS identifier, which is how you build
the allow-list in the first place. [[wiki/pipelines/recon-all|recon-all]] calls
it at start-up to refuse to run on an OS the site has not blessed — a guard
against subtle, OS-dependent numerical differences in a longitudinal study.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fs-check-os`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs-check-os`
- **Reads:** `/etc/os-release` (Linux), `$SUBJECTS_DIR/fs-allowed-os.txt`
- **Calls itself:** `fs-check-os --get` is invoked from within the script
  ([`scripts/fs-check-os:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L52))

## Purpose and Context

FreeSurfer results are not bit-for-bit identical across operating systems and
compiler/library stacks; the same subject reconstructed on two different Linux
distributions can differ slightly. For a longitudinal or multi-site study this
is a reproducibility hazard. `fs-check-os` lets a study enforce that every
reconstruction is performed on an OS that matches a recorded, approved set. The
site curator runs `fs-check-os --get` on a known-good machine to capture its OS
string into `$SUBJECTS_DIR/fs-allowed-os.txt`; thereafter
[[wiki/pipelines/recon-all|recon-all]] (which calls `fs-check-os --check` during
its start-up checks, [`scripts/recon-all:8579-8583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8579-L8583)) aborts on any host
whose OS is not listed.

The check is **opt-in by data**: if `fs-allowed-os.txt` does not exist in the
subjects directory, `fs-check-os` exits 0 and nothing is enforced
([`scripts/fs-check-os:45-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L45-L50)). This keeps the default user experience
unchanged while making the guard available to studies that want it.

## Inputs

### Required Inputs

- **`$SUBJECTS_DIR`** must be defined (the script errors out otherwise,
  [`scripts/fs-check-os:140-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L140-L143)). It may instead be supplied with
  `--sd <dir>`.
- **`/etc/os-release`** must exist and contain a `PRETTY_NAME=` line for `--get`
  to produce a meaningful identifier (Linux only).

The allow-list file `$SUBJECTS_DIR/fs-allowed-os.txt` is an *optional* input: its
absence disables the check rather than causing an error.

### Input Assumptions

> [!assumption] Linux with `/etc/os-release`, and single-token OS names
> The OS identifier is built solely from `/etc/os-release`'s `PRETTY_NAME`, so
> the tool is effectively Linux-only (macOS has no `/etc/os-release`). The
> identifier must contain **no spaces** because the comparison loop reads the
> allow-list with a tcsh `foreach … (\`cat $osfile\`)` that splits on whitespace
> ([`scripts/fs-check-os:60-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L60-L68)). `--get` enforces this by replacing
> every space with a dash and deleting parentheses
> ([`scripts/fs-check-os:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L99-L101)), e.g.
> `PRETTY_NAME="Rocky Linux 9.6 (Blue Onyx)"` → `Rocky-Linux-9.6-Blue-Onyx`.

## Outputs

### Files Created

None. `fs-check-os` writes only to stdout (and only when `--get` or `--v` is
used) and communicates its result through the **exit status**. The allow-list
file is created by *you* via shell redirection of `--get` output, not by the
script itself.

### Output Specifications — exit status

| Exit | Condition |
|------|-----------|
| **0** | `FS_CHECK_OS` is 0 (checking disabled, [`scripts/fs-check-os:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L37-L42)); **or** `fs-allowed-os.txt` does not exist ([`scripts/fs-check-os:45-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L45-L50)); **or** the current OS matches a line in the file ([`scripts/fs-check-os:61-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L61-L68)). Also 0 after `--get` and `--version`. |
| **1** | Checking is on, `fs-allowed-os.txt` exists, and the current OS is **not** in it ([`scripts/fs-check-os:70-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L70-L73)); also 1 for usage/argument errors and undefined `SUBJECTS_DIR`. |

With `--get`, stdout is the single OS-identifier string and the script exits 0
immediately ([`scripts/fs-check-os:97-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L97-L104)).

## Mathematical Foundations

None — this is a string-comparison guard. The only "computation" is the
text normalisation of `PRETTY_NAME` (a chain of `sed` substitutions removing
quotes, replacing spaces with dashes, and stripping `(`/`)`,
[`scripts/fs-check-os:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L100)) and an exact, case-sensitive string match in
the `foreach` loop ([`scripts/fs-check-os:61-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L61-L68)).

## Configuration Options

### Complete Flag Reference

All flags are parsed in the loop at
[`scripts/fs-check-os:87-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L87-L132). Unrecognised flags are a hard error
([`scripts/fs-check-os:125-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L125-L129)). Note the flags use a **double dash**.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--check` | bool | (implied) | Perform the OS check (sets `FS_CHECK_OS 1`). This is the mode recon-all invokes. [`scripts/fs-check-os:107-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L107-L109) |
| `--get` | bool | — | Print the current OS identifier (normalised `PRETTY_NAME`) and exit 0. Use this to build/append the allow-list. [`scripts/fs-check-os:97-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L97-L105) |
| `--no-check` | bool | — | Disable checking for this run (sets `FS_CHECK_OS 0`); the script then exits 0. [`scripts/fs-check-os:111-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L111-L113) |
| `--sd` | string (dir) | `$SUBJECTS_DIR` | Override the subjects directory in which to look for `fs-allowed-os.txt`. [`scripts/fs-check-os:115-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L115-L118) |
| `--v` | bool | off | Verbose: explain on stdout exactly why it is exiting with the status it chose. [`scripts/fs-check-os:93-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L93-L95) |
| `--debug` | bool | off | tcsh `set echo`/`verbose` script tracing. [`scripts/fs-check-os:120-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L120-L123) |
| `-help` | bool | — | Print usage and the `BEGINHELP` block, exit non-zero. Matched before normal parsing via a `grep` on `argv` ([`scripts/fs-check-os:18-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L18-L22)). |
| `-version` | bool | — | Print the version string and exit 0 ([`scripts/fs-check-os:23-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L23-L27)). See the `$Id$` gotcha below. |

### Environment Variables

| Variable | Default | Effect |
|----------|---------|--------|
| `FS_CHECK_OS` | unset → treated as on | If 0, the check is skipped and the script exits 0 ([`scripts/fs-check-os:34-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L34-L42)). Set indirectly by `--check` / `--no-check`. |
| `SUBJECTS_DIR` | — (required) | Directory searched for `fs-allowed-os.txt`; overridable with `--sd`. |

### Configuration Interactions

> [!gotcha] `--get` short-circuits everything
> `--get` is handled inside the argument loop and calls `exit 0` immediately
> after printing ([`scripts/fs-check-os:97-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L97-L104)). Any flags placed after
> `--get` on the command line are never seen. `--get` does no checking and does
> not consult `fs-allowed-os.txt`.

> [!gotcha] `--no-check` makes the tool a guaranteed success
> Passing `--no-check` sets `FS_CHECK_OS 0`, which the main body then reads to
> exit 0 unconditionally ([`scripts/fs-check-os:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L37-L42)). This is the
> escape hatch for running on an unlisted OS deliberately. Because the variable
> is read from the environment, exporting `setenv FS_CHECK_OS 0` before
> `recon-all` achieves the same thing globally.

- `--check` and `--no-check` both just set `FS_CHECK_OS`; whichever appears
  later wins, and an inherited `FS_CHECK_OS` from the environment is overridden
  by either.
- `--sd` must precede the implicit check — but since the check happens after the
  whole parse loop, ordering relative to `--check` does not matter.

## Typical Use Cases

### 1. Discover the current OS identifier

```bash
fs-check-os --get
# Rocky-Linux-9.6-Blue-Onyx
```

### 2. Create an allow-list for a study (one approved OS)

```bash
# On the blessed machine:
cd $SUBJECTS_DIR
fs-check-os --get > fs-allowed-os.txt
```

### 3. Allow several operating systems

```bash
# Run on each approved machine and APPEND (>>) so all are listed:
cd $SUBJECTS_DIR
fs-check-os --get >> fs-allowed-os.txt   # machine A
# ... on machine B ...
fs-check-os --get >> fs-allowed-os.txt   # machine B
```

### 4. Manually check the current host, with reasoning

```bash
fs-check-os --check
echo $status           # 0 = allowed, 1 = not allowed
# If it printed nothing and returned 1, re-run verbosely to see why:
fs-check-os --v --check
```

### 5. Bypass the check for one recon-all run

```bash
setenv FS_CHECK_OS 0          # tcsh   (or: export FS_CHECK_OS=0  in bash)
recon-all -s subj01 -all      # OS check now a guaranteed pass
```

## Pipeline Context

`fs-check-os` is a start-up *gate*, not a processing stage. Inside
[[wiki/pipelines/recon-all|recon-all]], it runs in the early sanity-check block,
right after the version check ([`scripts/recon-all:8578-8583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8578-L8583)):

```tcsh
# Check OS
fs-check-os --check
if($status) then # If it fails, run again verbosely
  fs-check-os --v --check
  exit 1
endif
```

So if the OS is not on the study's allow-list, recon-all prints the verbose
reasoning and aborts before any reconstruction begins.

**Predecessor:** `fs-check-version` (the immediately preceding recon-all
start-up check) → **fs-check-os** → **Successor:** the rest of
[[wiki/pipelines/recon-all|recon-all]]'s `FREESURFER_HOME`/environment checks and
then the processing stages.

## Gotchas and Caveats

> [!gotcha] `--version` prints the literal `$Id$`
> The version is set to the unexpanded RCS keyword `set VERSION = '$Id$'`
> ([`scripts/fs-check-os:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L10)). Because this file is not run through RCS
> keyword expansion in the v8.2.0 tree, `fs-check-os -version` literally prints
> `$Id$` rather than a version number or date. Unlike most FreeSurfer scripts it
> does **not** use the `@FS_VERSION@` token.

> [!contradiction] `setenv FS_CHECK_OS = 1` is malformed tcsh, but harmless
> The default-setting block writes `setenv FS_CHECK_OS = 1`
> ([`scripts/fs-check-os:35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L35)). tcsh's `setenv` takes `setenv NAME value`
> with **no** `=`, so this actually sets `FS_CHECK_OS` to the string `=`
> (the first token after the name). Since the subsequent test
> `if(! $FS_CHECK_OS)` treats the non-empty, non-zero string `=` as **true**,
> the check still runs as intended. The bug is therefore latent — the net
> behaviour matches the documented intent ("unset → on"), so no user impact, but
> the assignment is incorrect. This block is only reached when `FS_CHECK_OS` is
> unset; once `--check`/`--no-check` set it properly (`setenv FS_CHECK_OS 1`/`0`,
> [`scripts/fs-check-os:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L108), [`scripts/fs-check-os:112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L112)) the value is a clean `0`/`1`.

> [!gotcha] The OS match is exact and case-sensitive
> A line in `fs-allowed-os.txt` must equal the `--get` output **exactly**
> (`if("$os" == "$osnow")`, [`scripts/fs-check-os:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L62)). A minor point
> release bump (e.g. `Rocky-Linux-9.6-…` → `…-9.7-…`) changes `PRETTY_NAME` and
> will fail the check, because `PRETTY_NAME` typically includes the version.
> Re-run `--get >> fs-allowed-os.txt` after an OS upgrade to re-bless the host.

> [!gotcha] An empty or whitespace-only allow-list never matches
> Because the file is split on whitespace by `foreach`, a file that exists but
> contains only blank lines yields no tokens, no match, and exit 1
> ([`scripts/fs-check-os:61-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L61-L73)). The "file absent ⇒ pass" shortcut does
> not apply to an empty file.

## Error Compensation and Guard Rails

- **Disabled-by-default-data.** Absence of `fs-allowed-os.txt` is treated as "no
  policy" and yields exit 0 ([`scripts/fs-check-os:45-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L45-L50)), so the guard never
  surprises users who have not opted in.
- **Global kill switch.** `FS_CHECK_OS=0` (or `--no-check`) bypasses the check
  entirely, providing a deliberate override path.
- **`SUBJECTS_DIR` validation.** The script refuses to run if `SUBJECTS_DIR` is
  undefined ([`scripts/fs-check-os:140-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L140-L143)) — though note the typo in the
  message ("SUBJETS_DIR").

## Known Bugs

- [[00151]] — the post-parse default block does `setenv FS_CHECK_OS = 1`, which is invalid tcsh (`setenv` takes no `=`): it aborts with "Too many arguments", leaves `FS_CHECK_OS` undefined, and the next line `if(! $FS_CHECK_OS)` then dies with "Undefined variable".

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — calls `fs-check-os --check` at start-up and aborts (verbosely) if the host OS is not on the study allow-list.
- [[fs_lib_check]] — complementary environment check: verifies the *shared libraries* FreeSurfer needs are present, whereas `fs-check-os` checks the *OS identity*.
- [[fs_update]] — another `$FREESURFER_HOME`-environment maintenance utility (downloads patches).
- `fs-check-version` *(no wiki page yet)* — the version-acceptability check that runs immediately before `fs-check-os` in recon-all's start-up sequence.

## Confidence and Gaps

**High confidence:** the exit-status logic, all double-dash flags, the
`--get` normalisation, the environment-variable behaviour, the recon-all call
site, and the `$Id$` / `setenv =` source quirks were all read directly from
[`scripts/fs-check-os`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os) and confirmed against the installed `-help` output.

> [!gap] No multi-version wildcarding
> There is no facility for "any 9.x release" — every acceptable `PRETTY_NAME`
> string must be enumerated verbatim in `fs-allowed-os.txt`. Whether the
> developers intend matching to ever be looser is not indicated by the code.

## References

- FreeSurfer source: [`scripts/fs-check-os`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os) (v8.2.0).
- recon-all call site: [`scripts/recon-all:8578-8583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8578-L8583).
- Built-in help: `fs-check-os -help` (the `BEGINHELP` block, [`scripts/fs-check-os:178-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs-check-os#L178-L210)).
