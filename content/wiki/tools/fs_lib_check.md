---
title: "fs_lib_check"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/fs_lib_check"
families: []                     # standalone environment-check utility
recon_all_stage: null
related:
  - "[[fs-check-os]]"
  - "[[fs_update]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The required-library list is hard-coded and reflects the legacy Tcl/Tk/BLT GUI stack (tkmedit/tksurfer); whether it is still representative of v8.2.0's actual runtime dependencies (which lean on Qt-based freeview) is unverified."
tags:
  - infrastructure
  - environment-check
  - shared-libraries
  - dependencies
  - installation
---

# fs_lib_check

## Summary

`fs_lib_check` is an installation sanity-check that verifies the host Linux
system provides the handful of shared-library packages FreeSurfer's legacy
components depend on (JPEG, TIFF, Tcl 8, Tk 8, Tix 8, BLT, and GLUT). On an
RPM-based distribution it queries the RPM database (`rpm -qa | grep …`); on a
non-RPM distribution it inspects the dynamic-linker cache instead
(`ldconfig -p | grep lib…`). It prints one `[ ok ]` / `[ failure ]` line per
library and exits 0 only if every required library is found; the first missing
library causes an immediate exit with a descriptive error and code 2. It is a
diagnostic you run by hand after installing FreeSurfer when a GUI tool fails to
start with a "cannot open shared object" error.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fs_lib_check`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check)
- **Original author:** Rudolph Pienaar (initial design 18 August 2005,
  [`scripts/fs_lib_check:77-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L77-L81))
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_lib_check`
- **External programs used:** `rpm`, `ldconfig`, `uname`, `type`, `grep`,
  `awk`, `wc`

## Purpose and Context

FreeSurfer's older interactive tools and some helper binaries are dynamically
linked against system libraries (image codecs and the Tcl/Tk/Tix/BLT GUI stack)
that are not bundled with the distribution. When those libraries are missing or
the wrong major version, the tools fail at launch with cryptic dynamic-linker
errors. `fs_lib_check` exists to surface that problem cleanly *before* the user
hits it: it enumerates the expected libraries and reports, in plain language,
which ones the OS is missing, so the user knows exactly which package to install.

It is a stand-alone troubleshooting utility — it is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or other pipelines (only `CMakeLists.txt`
references it, for installation). It belongs to the same family of
environment-validation helpers as [[fs-check-os]] (which validates the OS
identity) and complements the runtime library handling done by
[[fs_run_from_mcr]].

> [!gotcha] The library list reflects the legacy GUI stack
> The hard-coded list — `jpeg`, `tiff`, `tcl-8`/`tcl8`, `tk-8`/`tk8`,
> `tix-8`/`tix8`, `blt`/`BLT`, `glut`
> ([`scripts/fs_lib_check:181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L181), [`scripts/fs_lib_check:187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L187)) — is the dependency
> set of the *old* Tcl/Tk tools (`tkmedit`, `tksurfer`) and GLUT-based viewers.
> Modern FreeSurfer's main GUI ([[wiki/tools/freeview|freeview]]) is Qt-based and
> does not need Tix/BLT, so a "failure" here does not necessarily mean
> [[wiki/pipelines/recon-all|recon-all]] or freeview will not run.

## Inputs

### Required Inputs

None on the command line — `fs_lib_check` takes only options. Its "input" is the
**state of the host system**: the RPM database (if `/etc/rpm` exists) or the
`ldconfig` dynamic-library cache.

### Input Assumptions

> [!assumption] A Linux host
> The script aborts on anything that is not Linux. It runs `uname -a` and counts
> how many lines contain "Linux"; if zero, it dies with "a non-Linux OS was
> found" ([`scripts/fs_lib_check:158-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L158-L167)). The synopsis explicitly notes
> it "will not currently work on Apple OS X"
> ([`scripts/fs_lib_check:66-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L66-L68)). A Darwin flag is computed
> ([`scripts/fs_lib_check:161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L161)) but never acted upon.

- **RPM mode** is auto-selected when `/etc/rpm` is a directory
  ([`scripts/fs_lib_check:137-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L137-L141)); it additionally requires the `rpm`
  executable to be on `PATH`, else it dies with code 3
  ([`scripts/fs_lib_check:169-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L169-L176)).
- **ldconfig mode** assumes the required libraries appear in the
  dynamic-linker cache; libraries installed somewhere not indexed by
  `ldconfig` will report as missing even if usable.

## Outputs

### Files Created

None. Output is entirely to the console: a banner, one aligned check line per
library ending in `[ ok ]` or `[ failure ]`, and either a congratulatory success
message or a `die` error block. The result is also conveyed by the **exit
status**.

### Output Specifications — exit status

| Exit | Condition | Source |
|------|-----------|--------|
| **0** | All required libraries found | [`scripts/fs_lib_check:203-206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L203-L206) |
| **1** | Host is not Linux | [`scripts/fs_lib_check:163-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L163-L167) |
| **2** | A required library/package was not found (first failure aborts) | [`scripts/fs_lib_check:197-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L197-L200) |
| **3** | RPM mode selected but no `rpm` executable on `PATH` | [`scripts/fs_lib_check:172-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L172-L175) |
| **0** | `-h`/`-v`/unknown option (synopsis or version, then exit) | [`scripts/fs_lib_check:148-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L148-L154) |

## Mathematical Foundations

None. The script's "logic" is a sequence of presence tests: for each library
name it runs a grep against either `rpm -qa` output or `ldconfig -p` output and
checks the exit status ([`scripts/fs_lib_check:193-201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L193-L201)). Boolean flags
(`b_RPM`, `b_LINUX`, `b_DARWIN`, `b_RPMexe`) are computed by counting matching
lines with `wc -l` and tested with bash arithmetic `(( … ))`.

## Configuration Options

### Complete Flag Reference

Options are parsed with `getopts vhlr`
([`scripts/fs_lib_check:143-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L143-L155)), so they use a **single dash** and may be
bundled. There are no positional arguments.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-l` | bool | auto | Force **ldconfig** mode: check the dynamic-linker cache instead of RPM. Useful on an RPM host where the libraries were built from source and so are unknown to the RPM database. Sets `b_RPM=0`. [`scripts/fs_lib_check:146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L146) |
| `-r` | bool | auto | Force **RPM** mode: check installed packages with `rpm -qa`. Sets `b_RPM=1`. [`scripts/fs_lib_check:147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L147) |
| `-v` | bool | — | Print the version string (`fs_lib_check 8.2.0`) and exit 0. [`scripts/fs_lib_check:148-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L148-L149) |
| `-h` | bool | — | Show the synopsis and exit 0. [`scripts/fs_lib_check:150-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L150-L151) |
| *(unknown)* | — | — | Any unrecognised option (`\?`) also shows the synopsis and exits 0. [`scripts/fs_lib_check:152-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L152-L153) |

By default neither `-l` nor `-r` is needed: the mode is chosen automatically from
the presence of `/etc/rpm` ([`scripts/fs_lib_check:137-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L137-L141)).

### The checked libraries

The list and the grep target differ by mode:

| Mode | Trigger label | Library tokens grepped |
|------|---------------|------------------------|
| RPM (`rpm -qa \| grep -i`) | `rpm package` | `jpeg tiff tcl-8 tk-8 tix-8 blt glut` ([`scripts/fs_lib_check:180-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L180-L183)) |
| ldconfig (`ldconfig -p \| grep lib`) | `lib` | `jpeg tiff tcl8 tk8 tix8 BLT glut` ([`scripts/fs_lib_check:185-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L185-L189)) |

Note the token spellings deliberately differ between modes (`tcl-8` vs `tcl8`,
`blt` vs `BLT`) to match each subsystem's naming. The RPM grep is
case-insensitive (`-i`); the ldconfig grep is case-sensitive, hence `BLT`.

### Configuration Interactions

> [!gotcha] `-l` and `-r` together are explicitly unspecified
> The synopsis states: "If -r and -l are both specified concurrently, then
> behaviour is unspecified" ([`scripts/fs_lib_check:54-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L54-L56)). In practice
> `getopts` processes them left to right and each just assigns `b_RPM`
> ([`scripts/fs_lib_check:146-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L146-L147)), so the **last** of the two on the
> command line wins. Do not rely on this; pass exactly one.

- Forcing `-r` on a host with no RPM database/executable triggers the code-3 die
  ([`scripts/fs_lib_check:169-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L169-L176)).
- Forcing `-l` is the recommended workaround when libraries were installed from
  source (and so are present on disk and in `ldconfig`, but absent from the RPM
  database).

## Typical Use Cases

### 1. Default check after installing FreeSurfer

```bash
fs_lib_check
# FreeSurfer library check
# checking for rpm package jpeg...           [ ok ]
# checking for rpm package tiff...           [ ok ]
# ...
#         Congratulations!
#         All necessary libs for running FreeSurfer were found.
echo $status   # 0 on success
```

### 2. RPM host, but libraries built from source

```bash
# The RPM DB doesn't know about source-installed Tcl/Tk; check the linker cache:
fs_lib_check -l
```

### 3. Use the exit code in an install script

```bash
if ! fs_lib_check >/dev/null 2>&1 ; then
  echo "Missing a required system library — see: fs_lib_check"
fi
```

## Pipeline Context

`fs_lib_check` is **not** part of any FreeSurfer processing pipeline. It is a
post-installation diagnostic that a user runs manually (or that documentation
points to) when a GUI/legacy tool fails to load shared libraries. The only
in-tree reference is the build's `CMakeLists.txt`, which installs it.

**Predecessor:** FreeSurfer installation / unpacking → **fs_lib_check** →
**Successor:** *(diagnostic only — informs the user which system package to
install; nothing consumes its output programmatically)*.

## Gotchas and Caveats

> [!gotcha] First missing library aborts the rest of the report
> The loop runs `ret_check $? || die …` per library
> ([`scripts/fs_lib_check:197-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L197-L200)), so the **first** failure exits with
> code 2 and you never see whether the *later* libraries are present too. To get
> a full picture you may have to install the first reported missing library and
> re-run.

> [!gotcha] ldconfig mode can false-negative on usable libraries
> `ldconfig -p` lists only libraries in the linker's indexed paths. A library
> present under a directory not in `/etc/ld.so.conf*` (or only reachable via a
> tool-specific `LD_LIBRARY_PATH`) will report `[ failure ]` even though the
> tools can load it. Conversely, RPM mode can false-negative when a needed `.so`
> was installed outside the package manager.

> [!gotcha] Substring matching can over-match
> Each check is a `grep` for a bare token (`jpeg`, `tiff`, …) anywhere in the
> package list or library cache. A package whose name merely *contains* the
> token (e.g. a `-devel` variant) satisfies the check. This favours
> false-positives ("ok") over precision; the test confirms "something matching
> the name exists", not "the exact runtime library is present".

> [!gotcha] Darwin is detected but unhandled
> `b_DARWIN` is computed ([`scripts/fs_lib_check:161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L161)) yet never used; on
> macOS the script simply hits the not-Linux `die` first. There is no macOS code
> path despite the variable's presence.

## Error Compensation and Guard Rails

- **Auto mode selection.** The script picks RPM vs ldconfig from `/etc/rpm` so
  the default invocation works on both distro families without a flag
  ([`scripts/fs_lib_check:137-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L137-L141)).
- **Manual override.** `-l`/`-r` let the user correct that choice when the
  package database and the on-disk reality disagree.
- **Pre-flight executable check.** Before using RPM, it verifies the `rpm`
  binary exists and dies cleanly (code 3) if not, rather than emitting "command
  not found" noise ([`scripts/fs_lib_check:169-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L169-L176)).
- **All greps silence their output** (`2>/dev/null >/dev/null`,
  [`scripts/fs_lib_check:196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L196)) so the report stays clean and is driven only by
  exit status.

## Related Tools

- [[fs-check-os]] — companion environment check: validates the OS *identity* against a study allow-list, whereas `fs_lib_check` validates the presence of required *shared libraries*.
- [[fs_run_from_mcr]] — runtime library-path wrapper; relevant because library-loading problems (which `fs_lib_check` diagnoses) are exactly what `fs_run_from_mcr` exists to avoid for MCR tools.
- [[fs_update]] — sibling `$FREESURFER_HOME` maintenance utility (patch download).
- [[wiki/tools/freeview|freeview]] — the modern Qt GUI; if it launches fine, a Tix/BLT `[ failure ]` from `fs_lib_check` is likely irrelevant (it pertains to the legacy Tcl/Tk tools).

## Confidence and Gaps

**High confidence:** the mode-selection logic, the full option set, the exact
library lists per mode, the per-library check mechanism, the exit codes, and the
first-failure-aborts behaviour were read directly from
[`scripts/fs_lib_check`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check) and confirmed against the installed `-h` output.

> [!gap] Is the hard-coded list current for v8.2.0?
> The required-library list dates to 2005 and targets the Tcl/Tk/Tix/BLT/GLUT
> GUI stack. v8.2.0's primary GUI ([[wiki/tools/freeview|freeview]]) is Qt-based.
> Whether these specific libraries are still genuine hard requirements of any
> shipped v8.2.0 component (vs. legacy `tkmedit`/`tksurfer` only) is not
> determinable from this script alone and would need cross-checking against the
> binaries' actual `ldd` output.

## References

- FreeSurfer source: [`scripts/fs_lib_check`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check) (v8.2.0).
- Built-in synopsis: `fs_lib_check -h` (the `$G_SYNOPSIS` here-string, [`scripts/fs_lib_check:21-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_lib_check#L21-L82)).
