---
title: "checkMCR.sh"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/checkMCR.sh"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[fs_install_mcr]]"
  - "[[fspython]]"
  - "[[segmentHA_T1.sh]]"
  - "[[segment_subregions]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The set of modules that source checkMCR.sh is not enumerable from this snapshot: the compiled-MATLAB wrapper scripts (segmentHA_T1.sh, segmentBS.sh, segmentThalamicNuclei.sh, etc.) are generated/installed elsewhere and were not present under scripts/ in the read tree, so the exact call sites could not be confirmed from source."
  - "The hard-coded runtime directory is MCRv97 (MATLAB R2019b). Whether any v8.2.0 module ships against a different MCR version is not verifiable from this file alone."
tags:
  - install
  - matlab
  - mcr
  - runtime
  - preflight-check
---

# checkMCR.sh

## Summary

`checkMCR.sh` is a tiny preflight check that verifies the free **MATLAB Compiler
Runtime (MCR)** for MATLAB R2019b is installed in the FreeSurfer tree before a
compiled-MATLAB module is allowed to run. It tests for a single shared-library
file inside `$FREESURFER_HOME/MCRv97` (the Linux `.so` or the macOS `.dylib`).
If the file is present it exits `0` (success, silently); if it is absent it
prints an explanatory error pointing the user at [[fs_install_mcr]] and exits
`1`. It performs no processing and takes no arguments — it is purely a gate.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/checkMCR.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh)
- **Binary/script location:** `$FREESURFER_HOME/bin/checkMCR.sh`
- **Installed by:** `install_configured(...)` in
  [`scripts/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L26)
  (listed among the configured shell scripts copied into `bin/`).

## Purpose and Context

Several FreeSurfer segmentation modules — the hippocampal/amygdala subfields,
the brainstem substructures, the thalamic nuclei, and related subregion tools —
are distributed as **compiled MATLAB** programs rather than as C/C++ binaries or
plain scripts. Compiled-MATLAB programs cannot run on their own; they require
the matching MATLAB Compiler Runtime to be installed. FreeSurfer ships these
modules against **MATLAB R2019b**, whose runtime FreeSurfer installs into
`$FREESURFER_HOME/MCRv97` (the `v97` corresponds to the R2019b runtime version).

`checkMCR.sh` is the small guard those modules use to fail fast with a helpful
message instead of crashing deep inside the MATLAB launcher when the runtime is
missing. The module wrapper sources or calls `checkMCR.sh`; if the runtime is
not found, the user is told to run [[fs_install_mcr]] and is given the
documentation URL.

> [!gotcha] It checks for a launcher library, not the whole MCR
> The script does not validate the entire runtime installation — it only checks
> for the presence of **one** file, `libmwlaunchermain.so` (Linux) /
> `libmwlaunchermain.dylib` (macOS), under `MCRv97/bin/`. A partial or corrupted
> MCR install that happens to contain that one library would pass this check.
> The leading comment in the source notes that this probe file was deliberately
> changed: under FreeSurfer v8.0 the script looked for `libdctprocess.so`, but
> that file is **not present** in the v8.0 runtime, so the check was switched to
> `libmwlaunchermain.so`
> ([`scripts/checkMCR.sh:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L3)).

## Inputs

### Required Inputs

None. `checkMCR.sh` takes no command-line arguments and reads no input data.

### Input Assumptions

- **`$FREESURFER_HOME` is set** in the environment (FreeSurfer has been sourced).
  The script dereferences `${FREESURFER_HOME}` directly; if it is unset, the test
  paths collapse to `/MCRv97/...`, which will not exist, so the script reports the
  runtime as missing.

> [!assumption] Runtime location is fixed
> The runtime is expected at the hard-coded path `$FREESURFER_HOME/MCRv97`
> (MATLAB R2019b). The script has no flag to point at an alternate location.

## Outputs

### Files Created

None. The script writes only to standard output/standard error and communicates
its result through its **exit status**.

### Output Specifications

- **Exit `0`** — the launcher library was found under `$FREESURFER_HOME/MCRv97`;
  no output is printed
  ([`scripts/checkMCR.sh:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L29)).
- **Exit `1`** — the library was not found; a multi-line error block is printed
  to stdout describing the expected paths, naming the affected modules
  (hippocampal/amygdala and brainstem), instructing the user to run
  `fs_install_mcr R2019b`, and giving the MatlabRuntime wiki URL
  ([`scripts/checkMCR.sh:7-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L7-L27)).

## Mathematical Foundations

None. This is an environment/filesystem check with no numerical content.

## Configuration Options

### Complete Flag Reference

`checkMCR.sh` defines **no command-line flags or options**. Its entire behaviour
is governed by one environment variable and two fixed probe paths.

| Item | Type | Default | Description |
|------|------|---------|-------------|
| `$FREESURFER_HOME` | env var | (must be set) | Root of the FreeSurfer install. The runtime is sought at `$FREESURFER_HOME/MCRv97`. Used at [`scripts/checkMCR.sh:7-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L7-L8). |
| Linux probe | fixed path | `MCRv97/bin/glnxa64/libmwlaunchermain.so` | Existence of this file means the R2019b runtime is installed on Linux. |
| macOS probe | fixed path | `MCRv97/bin/maci64/libmwlaunchermain.dylib` | macOS equivalent of the above. The check passes if **either** probe exists. |

### Configuration Interactions

The two probe paths are combined with a logical AND of two `! -e` negations
inside one `if`
([`scripts/checkMCR.sh:7-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L7-L8)):
the error branch is taken only when **neither** the Linux library **nor** the
macOS library exists. In practice only one of the two can exist on a given
platform, so this reduces to "the runtime is present for this OS." There are no
mutually exclusive flags because there are no flags.

## Typical Use Cases

### Use Case 1: Preflight guard inside a compiled-MATLAB module

```bash
# Inside a module wrapper (conceptual): bail out early if the MCR is missing
checkMCR.sh || exit 1
# ... proceed to invoke the compiled-MATLAB segmentation binary ...
```

The module runs `checkMCR.sh` first; a non-zero exit aborts the module with the
runtime-installation instructions already printed.

### Use Case 2: Manual verification that the MCR is installed

```bash
# Run by hand to confirm the R2019b runtime is in place; prints nothing on success
checkMCR.sh && echo "MCR R2019b is installed"
```

Useful when troubleshooting a failed hippocampal/brainstem run to distinguish a
missing-runtime problem from an actual processing error.

## Pipeline Context

`checkMCR.sh` is **not** part of the `recon-all` cortical stream
(`recon_all_stage: null`). It sits in front of the optional compiled-MATLAB
segmentation modules that are run **after** a standard `recon-all`, e.g.
[[segmentHA_T1.sh]] (hippocampal subfields and amygdala nuclei),
[[segment_subregions]] (the unified brainstem/thalamus/hippocampus subregion
driver), and their relatives. The runtime it checks for is installed by
[[fs_install_mcr]].

**Predecessor:** [[fs_install_mcr]] (installs `MCRv97`) → **This tool** (verifies it) → **Successor:** the compiled-MATLAB module (e.g. [[segmentHA_T1.sh]], [[segment_subregions]])

## Gotchas and Caveats

> [!gotcha] The shebang is tcsh, not bash
> Unlike most newer FreeSurfer helper scripts, `checkMCR.sh` is a **tcsh**
> script (`#!/bin/tcsh -f`). It relies on `tcsh` being available on the host.

> [!gotcha] Error text is printed to stdout, not stderr
> All `echo` lines in the failure branch go to standard output. A caller that
> only captures stderr will not see the "cannot find Matlab 2019b runtime"
> guidance.

> [!gotcha] Version is pinned to R2019b / MCRv97
> The directory name `MCRv97` and the suggested install command
> `fs_install_mcr R2019b` are hard-coded. If a future module were compiled
> against a different MATLAB release, this script would not detect that runtime.

## Error Compensation and Guard Rails

`checkMCR.sh` is itself a guard rail: it exists to convert a confusing
deep-in-MATLAB failure into a clear, actionable message. It does **not** attempt
to download or repair anything — it only detects the missing runtime and refers
the user to [[fs_install_mcr]]. It does not modify any data.

## Related Tools

- [[fs_install_mcr]] — downloads and installs the very runtime (`MCRv97`) that this script checks for; named explicitly in the failure message.
- [[fspython]] — the other "is the environment set up?" wrapper in FreeSurfer, but for the bundled Python interpreter rather than the MATLAB runtime.
- [[segmentHA_T1.sh]] — a compiled-MATLAB module that depends on the MCR this script verifies.
- [[segment_subregions]] — the subregion segmentation driver whose compiled-MATLAB back ends require the MCR.

## Confidence and Gaps

The script is short and fully read, so its behaviour (probe paths, exit codes,
error text) is documented with high confidence.

> [!gap] Exact call sites not confirmed from source
> The compiled-MATLAB wrapper scripts that source or invoke `checkMCR.sh`
> (e.g. `segmentHA_T1.sh`, `segmentBS.sh`, `segmentThalamicNuclei.sh`) were not
> present under `scripts/` in the read snapshot, so the precise list of callers
> and the exact invocation pattern (sourced vs. executed) could not be verified
> from code. The relationship is inferred from the runtime they share.

## References

- FreeSurfer MatlabRuntime wiki page (cited by the script):
  <https://surfer.nmr.mgh.harvard.edu/fswiki/MatlabRuntime>
- [[fs_install_mcr]] — companion installer.
