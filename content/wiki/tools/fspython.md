---
title: "fspython"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # bash wrapper around a bundled CPython
source_files:
  - "python/fspython"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[checkMCR.sh]]"
  - "[[fs_install_mcr]]"
  - "[[mri_synthstrip]]"
  - "[[mri_synthseg]]"
  - "[[wiki/tools/samseg|samseg]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "On Apple ARM64, CMake installs a different launcher (python/fspython.local) renamed to fspython, rather than this script. The contents of fspython.local were not read, so the macOS-ARM behaviour is described only from the CMake install logic, not from that script's source."
  - "The exact Python version and the full set of packages under $FREESURFER_HOME/python/packages are install-time artefacts and are not enumerable from this wrapper."
tags:
  - python
  - environment
  - interpreter
  - wrapper
---

# fspython

## Summary

`fspython` is a thin shell wrapper that launches **FreeSurfer's own bundled
Python 3 interpreter** in a deliberately isolated environment. It sets
`PYTHONPATH` to point exclusively at FreeSurfer's installed packages
(`$FREESURFER_HOME/python/packages`), disables user-site packages, suppresses
pip's upgrade nag, and then `exec`s `$FREESURFER_HOME/python/bin/python3`,
forwarding all arguments. The goal is reproducibility: FreeSurfer's
Python-based tools (e.g. SynthStrip, SynthSeg, SAMSEG helpers) run against a
known interpreter and a known set of dependencies, insulated from whatever
Python and packages the user happens to have installed.

## Source Information

- **Language:** bash shell script (`#!/usr/bin/env bash`)
- **Source file:** [`python/fspython`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython)
- **Binary/script location:** `$FREESURFER_HOME/bin/fspython`
- **Bundled interpreter it invokes:** `$FREESURFER_HOME/python/bin/python3`
- **Bundled packages it exposes:** `$FREESURFER_HOME/python/packages`
- **Installed by:** `fspython_script_install()` in
  [`python/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/CMakeLists.txt#L121-L135)
  — `install(PROGRAMS fspython DESTINATION bin)` on most platforms; on Apple
  ARM64 a separate `fspython.local` is installed under the name `fspython`
  instead.

## Purpose and Context

Modern FreeSurfer tools are increasingly written in Python and depend on
specific versions of scientific packages (NumPy, SciPy, PyTorch/`torch`,
Nibabel, Surfa, etc.). Running these tools with an arbitrary system or conda
Python risks version conflicts and non-reproducible results. `fspython` exists
to guarantee that FreeSurfer's Python code runs with **the interpreter and the
packages FreeSurfer shipped**, regardless of the user's Python setup.

Python-based FreeSurfer commands are typically launched through `fspython`
(directly, or via a one-line wrapper whose first line invokes it). Users also
run `fspython` interactively to import FreeSurfer's Python modules or to execute
their own scripts inside the FreeSurfer Python environment.

> [!gotcha] `PYTHONPATH` is overwritten, not extended (by default)
> By default `fspython` **replaces** `PYTHONPATH` entirely with
> `$FREESURFER_HOME/python/packages`, intentionally hiding any packages the user
> had on `PYTHONPATH`
> ([`python/fspython:38-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L38-L44)).
> To prepend your own location instead of losing your path, set
> `FS_LOCAL_PYTHONPATH` (see flag table). User-site packages are additionally
> blocked via `PYTHONNOUSERSITE=1`
> ([`python/fspython:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L57)).

## Inputs

### Required Inputs

- **A working FreeSurfer installation** with `$FREESURFER_HOME` set. The script
  exits immediately with `error: freesurfer has not been properly sourced` if
  `$FREESURFER_HOME` does not exist
  ([`python/fspython:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L4)).
- **Whatever arguments you want passed to Python.** Everything on the
  `fspython` command line (`"$@"`) is forwarded verbatim to `python3` at
  [`python/fspython:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L65)
  — e.g. a script path, `-c "code"`, `-m module`, or nothing (interactive REPL).

### Input Assumptions

> [!assumption] The bundled interpreter must exist
> `fspython` assumes `$FREESURFER_HOME/python/bin/python3` is present. If it is
> not, the script prints
> `error: fspython has not been configured correctly` and exits `1`
> ([`python/fspython:64-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L64-L69)).

## Outputs

### Files Created

None of its own. `fspython` produces no output files; any files written are
produced by the Python code it runs. It writes only diagnostic/error lines and
then hands off to the interpreter.

### Output Specifications

- **Exit status** is that of the `exec`'d `python3` process (because `exec`
  replaces the shell), or `1` on the two early-exit error conditions above.
- The process inherits the Python program's stdout/stderr unchanged.

## Mathematical Foundations

None. `fspython` is an environment-setup launcher and contains no numerical
logic.

## Configuration Options

### Complete Flag Reference

`fspython` parses **no flags of its own** — it is transparent, forwarding every
argument to the bundled `python3`. Its behaviour is instead controlled by
environment variables, which it reads and sets:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FREESURFER_HOME` | env (in) | (must be set) | Must point to a real path or the script aborts. After locating the Python distribution it may be **re-pointed** to the fspython tree (see `FREESURFER_FSPYTHON`). Checked at [`python/fspython:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L4). |
| `FREESURFER_FSPYTHON` | env (in/out) | unset → derived from `$FREESURFER_HOME/../fspython` if that exists | Location of a **split-install** Python distribution. If set (and the path exists), or if a sibling `fspython` directory is found, the script overrides `FREESURFER_HOME` to that tree and prepends its `bin` to `PATH` so model files and packages resolve there. Logic at [`python/fspython:24-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L24-L33). |
| `FS_LOCAL_PYTHONPATH` | env (in) | unset | If unset, `PYTHONPATH` is set to **only** `$FREESURFER_HOME/python/packages`. If set, `PYTHONPATH` becomes `$FS_LOCAL_PYTHONPATH:$FREESURFER_HOME/python/packages` (your path takes precedence), and the effective `PYTHONPATH` is echoed for the record. [`python/fspython:38-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L38-L44). |
| `FS_PYTHON_DEBUG` | env (in) | unset / `0` | When set to a non-zero value, prints a debug banner, the interpreter path, and a full `printenv` dump before launching — useful for diagnosing environment problems. [`python/fspython:47-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L47-L53). |
| `PYTHONNOUSERSITE` | env (out) | set to `1` | Forced on so the user's `~/.local` site-packages are ignored, keeping the environment isolated. [`python/fspython:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L57). |
| `PYTHONUSERBASE` | env (out) | unset | Explicitly unset to further detach from any user package base. [`python/fspython:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L58). |
| `PIP_DISABLE_PIP_VERSION_CHECK` | env (out) | set to `1` | Suppresses pip's "a new release is available" message so it does not confuse users. [`python/fspython:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L61). |

### Configuration Interactions

- **`FREESURFER_FSPYTHON` redefines `FREESURFER_HOME`.** When a split-install
  Python tree is in use, the script exports
  `FREESURFER_HOME="${FREESURFER_FSPYTHON}"` (saving the original as
  `FREESURFER_HOME_FALLBACK`) so that all subsequent `$FREESURFER_HOME`-relative
  lookups — including the `PYTHONPATH` packages dir and the `python3` binary —
  resolve inside the fspython distribution
  ([`python/fspython:14-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L14-L23)).
  This means the `$FREESURFER_HOME` seen by the launched Python code may differ
  from the one the user exported.
- **`FS_LOCAL_PYTHONPATH` is the *only* sanctioned way to inject your own
  packages.** Setting `PYTHONPATH` yourself before calling `fspython` is futile
  in the default case because the script overwrites it; use
  `FS_LOCAL_PYTHONPATH` instead, which is prepended.

> [!gotcha] Split-install can silently change `$FREESURFER_HOME`
> If a directory named `fspython` exists as a sibling of `$FREESURFER_HOME`
> (i.e. `$FREESURFER_HOME/../fspython`), `fspython` will auto-detect it and
> re-point `FREESURFER_HOME` to it even when you did not set
> `FREESURFER_FSPYTHON`. Code run under `fspython` should not assume
> `$FREESURFER_HOME` equals the value the user sourced.

## Typical Use Cases

### Use Case 1: Run a Python-based FreeSurfer tool in its intended environment

```bash
# Execute a FreeSurfer Python script against the bundled interpreter + packages
fspython $FREESURFER_HOME/python/scripts/some_tool.py --in input.mgz --out result.mgz
```

This is how FreeSurfer's Python tools are meant to be invoked so they see the
shipped versions of NumPy/PyTorch/Nibabel/Surfa, etc.

### Use Case 2: Interactive use of FreeSurfer's Python modules

```bash
# Open the FreeSurfer Python REPL and import a bundled module
fspython
>>> import surfa as sf      # resolves from $FREESURFER_HOME/python/packages
```

### Use Case 3: Run your own script while still using FreeSurfer's Python, plus your own package dir

```bash
# Prepend a personal package directory without losing FreeSurfer's packages
FS_LOCAL_PYTHONPATH=/path/to/my/libs fspython my_analysis.py
```

### Use Case 4: Diagnose a broken environment

```bash
# Dump the full environment and interpreter path before Python starts
FS_PYTHON_DEBUG=1 fspython -c "import sys; print(sys.executable)"
```

## Pipeline Context

`fspython` is infrastructure, not a stage of `recon-all` (`recon_all_stage:
null`). It is the launcher beneath FreeSurfer's Python-based commands. Tools
commonly run through it (directly or via thin wrappers) include
[[mri_synthstrip]], [[mri_synthseg]], and Python components used around
[[wiki/tools/samseg|samseg]]. It complements [[checkMCR.sh]]/[[fs_install_mcr]], which provide the
analogous "is the runtime present?" guarantee for FreeSurfer's compiled-MATLAB
modules.

**Predecessor:** (FreeSurfer sourced; `$FREESURFER_HOME` set) → **This tool** (sets up isolated Python env) → **Successor:** the Python program it `exec`s (e.g. [[mri_synthstrip]])

## Gotchas and Caveats

> [!gotcha] `exec` replaces the shell
> The final line `exec ${FREESURFER_HOME}/python/bin/python3 "$@"` replaces the
> wrapper process with Python
> ([`python/fspython:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L65)).
> Nothing after the `exec` runs, and the exit code you observe is Python's.

> [!gotcha] Isolation is the point — your packages are hidden
> Because `PYTHONPATH` is overwritten, `PYTHONNOUSERSITE=1` is set, and
> `PYTHONUSERBASE` is unset, packages you installed for your normal Python are
> deliberately invisible to `fspython`. This is intended (reproducibility); use
> `FS_LOCAL_PYTHONPATH` if you must add your own.

> [!gotcha] macOS ARM64 uses a different launcher
> On Apple Silicon, the CMake install renames `python/fspython.local` to
> `fspython` instead of installing this script, so the macOS-ARM `fspython` may
> behave differently (it is documented in CMake as allowing local packages with
> the system/Anaconda Python). See the Gaps section.

## Error Compensation and Guard Rails

`fspython` guards against two common misconfigurations with explicit, friendly
errors: FreeSurfer not sourced (missing `$FREESURFER_HOME`,
[`python/fspython:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L4))
and a missing bundled interpreter
([`python/fspython:64-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython#L64-L69)).
It does not modify user data. Its main "compensatory" action is environment
hardening (overwriting `PYTHONPATH`, disabling user-site) so that stray
user-level Python state cannot silently break FreeSurfer's Python tools.

## Related Tools

- [[checkMCR.sh]] — the MATLAB-runtime analogue of `fspython`: both are "is the required runtime/interpreter available and isolated?" guards.
- [[fs_install_mcr]] — installs the MATLAB runtime for compiled modules, as `fspython` provides the Python runtime for Python modules.
- [[mri_synthstrip]] — a Python/PyTorch FreeSurfer tool that runs under the bundled interpreter.
- [[mri_synthseg]] — another deep-learning Python tool that relies on the bundled Python environment.
- [[wiki/tools/samseg|samseg]] — segmentation pipeline with Python components run in this environment.

## Confidence and Gaps

The wrapper is short and fully read; its environment manipulation and exit
behaviour are documented with high confidence.

> [!gap] macOS ARM64 launcher not read
> On Apple ARM64 the installed `fspython` is actually `python/fspython.local`
> (renamed during `install`), whose source was not read. Behaviour on that
> platform is described only from the CMake install logic
> ([`python/CMakeLists.txt:121-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/CMakeLists.txt#L121-L135)),
> not from the script itself.

> [!gap] Bundled package set is install-time
> The precise Python version under `python/bin/python3` and the contents of
> `python/packages` are produced at build/install time (see
> [`python/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/CMakeLists.txt));
> they cannot be enumerated from this wrapper.

## References

- [`python/fspython`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fspython) — the wrapper source.
- [`python/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/CMakeLists.txt) — how `fspython` and the bundled distribution are built and installed.
