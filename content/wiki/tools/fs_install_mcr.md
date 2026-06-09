---
title: "fs_install_mcr"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # bash
source_files:
  - "scripts/fs_install_mcr"
families: []                       # standalone install/environment helper
recon_all_stage: null
related:
  - "[[fs_install_cuda]]"
  - "[[checkMCR.sh]]"
  - "[[segmentHA_T1.sh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "MathWorks download URL templates are version-specific and may rot over time; only the R2019b path is exercised by the FreeSurfer modules that require the MCR."
tags:
  - install
  - matlab
  - mcr
  - runtime
---

# fs_install_mcr

## Summary

`fs_install_mcr` downloads and installs a free **MATLAB Compiler Runtime (MCR)**
into the FreeSurfer installation tree so that FreeSurfer's compiled-MATLAB
modules can run on a machine without a full MATLAB license. Given an MCR release
name (e.g. `R2019b`) as its single argument, it fetches the correct
OS-specific installer from MathWorks, runs it silently in a temporary directory,
and moves the resulting runtime into `$FREESURFER_HOME/MCR<version>` (e.g.
`MCRv97`). It is an **interactive, one-shot install helper**, not a
data-processing tool.

## Source Information

- **Language:** bash shell script (`set -e`)
- **Source file:** [`scripts/fs_install_mcr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_install_mcr`
- **External tools used:** `curl` (download), `unzip` (extract), the MathWorks `install` script (silent install), and `mktemp`/`mv`/`ln` for placement.

## Purpose and Context

Several FreeSurfer modules are distributed as **compiled MATLAB applications**
rather than C/C++ binaries — most notably the hippocampal-subfield and
amygdala-nuclei segmentation and the brainstem-substructure segmentation
(`segmentHA_*`, `segmentBS.sh`). These require a matching MATLAB Compiler Runtime
to execute. The MCR is a large, free, redistributable package from MathWorks;
because of its size and licensing it is **not bundled** with FreeSurfer and must
be fetched on demand.

`fs_install_mcr` automates that fetch-and-place step. The companion checker
[[checkMCR.sh]] is what the segmentation scripts actually call at runtime; when
the runtime is missing it prints instructions to run **`fs_install_mcr R2019b`**
and points to the MatlabRuntime wiki page (see
[`scripts/checkMCR.sh:7-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L7-L27)). So the normal trigger for running this
tool is "a compiled-MATLAB module told me the MCR is missing."

Like its sibling [[fs_install_cuda]], it writes into `$FREESURFER_HOME` and so
typically needs `sudo` for a system install (passing `FREESURFER_HOME` through;
see [`scripts/fs_install_mcr:27-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L27-L32)). It is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **MCR release name** — the single positional argument, e.g. `R2019b`. Exactly
  one argument is required ([`scripts/fs_install_mcr:18-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L18-L24)). Recognised
  values map to specific MathWorks download URLs: `R2012a`, `R2012b`, `R2013a`
  (one URL template), `R2014a`, `R2014b` (a second), and `R2019b` (a third); any
  other value is rejected with `Unsupported runtime version`
  ([`scripts/fs_install_mcr:52-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L52-L61)).
- **`FREESURFER_HOME`** — must be set; the runtime is installed beneath it
  ([`scripts/fs_install_mcr:27-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L27-L32)).
- **Network access** to `ssd.mathworks.com` for the `curl` download.

### Input Assumptions

> [!assumption] A supported MCR release name and a writable FREESURFER_HOME
> The argument must be one of the hard-coded supported releases, and the running
> user must be able to write into `$FREESURFER_HOME` (hence `sudo` for
> `/usr/local` installs). The MathWorks download URLs are baked into the script
> and assume MathWorks keeps those exact paths available.

- OS is auto-detected: Linux → `glnxa64` installer; anything else → `maci64`
  (macOS) ([`scripts/fs_install_mcr:45-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L45-L49)).
- On **Apple-silicon (arm) macOS** the script patches the MathWorks `install`
  scripts to claim `arch=maci64`, so the x86_64 runtime installs under Rosetta
  ([`scripts/fs_install_mcr:73-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L73-L84)).

## Outputs

### Files Created

| Output | Where | Notes |
|--------|-------|-------|
| `MCR<version>/` runtime tree | `$FREESURFER_HOME/MCR<version>` (e.g. `$FREESURFER_HOME/MCRv97` for R2019b) | the installed runtime, moved from the temp install target ([`scripts/fs_install_mcr:90-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L90-L109)) |
| symlink `MCR<version>` (Apple M1 fallback only) | `$FREESURFER_HOME/MCR<version>` → `/Applications/MATLAB/MATLAB_Runtime/<version>` | created when the GUI installer placed the runtime in the default macOS path ([`scripts/fs_install_mcr:111-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L111-L125)) |

The version directory name (`v97`, `v84`, …) is whatever the MathWorks installer
emits as `v*`; FreeSurfer's `MCR` prefix is prepended. For R2019b the directory
is `MCRv97`, which is exactly what [[checkMCR.sh]] looks for.

### Output Specifications

No image/surface output. The deliverable is a directory tree containing the MCR
shared libraries (e.g. `bin/glnxa64/libmwlaunchermain.so` on Linux), which the
compiled-MATLAB modules dynamically link against.

## Mathematical Foundations

None — this is an installer. It performs no numerical computation; it downloads,
unzips, runs a vendor installer, and moves the result. The only non-trivial logic
is OS/architecture detection and the Apple-silicon `sed` patch that rewrites
`arch_in=...` to `arch_in=maci64` in the MathWorks `install`/`install_unix`
scripts ([`scripts/fs_install_mcr:7-15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L7-L15)).

## Configuration Options

### Complete Flag Reference

`fs_install_mcr` has **no option flags**; it takes exactly one positional
argument and reads one environment variable. Control beyond that is a single
interactive reinstall prompt.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `<MCR_VER>` (positional `$1`) | string | *(required)* | MCR release to install. Supported: `R2012a`, `R2012b`, `R2013a`, `R2014a`, `R2014b`, `R2019b`. Other values → `Unsupported runtime version` and exit 1 ([`scripts/fs_install_mcr:52-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L52-L61)). |
| `FREESURFER_HOME` | env var (string) | *(required)* | Install root; runtime goes to `$FREESURFER_HOME/MCR<version>`. |
| *(reinstall prompt)* | `y`/`n` keypress | — | If `$FREESURFER_HOME/MCR<version>` already exists, the script asks whether to reinstall; non-`y` exits 0 without changes ([`scripts/fs_install_mcr:96-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L96-L106)). |

### Configuration Interactions

> [!gotcha] Exactly one argument — `--help` is treated as a version
> The script checks `"$#" -ne 1` only for *count*, not validity. With no
> arguments it prints a usage hint and exits 1
> ([`scripts/fs_install_mcr:18-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L18-L22)). With one argument that is not a
> recognised release (including `--help`, `-h`, etc.) it falls through to the
> download `case` and exits with `Unsupported runtime version --help`. There is
> **no real help flag**; pass a supported release name.

> [!gotcha] Linux vs. macOS vs. Apple-silicon take different paths
> OS detection (`uname -s`) and CPU detection (`uname -p`) change both the
> downloaded installer and the placement logic. On arm macOS the installer is
> patched and, if the silent install does not land in the temp target, the script
> falls back to symlinking the default GUI-install location — which requires
> `sudo` and may prompt for a password ([`scripts/fs_install_mcr:111-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L111-L125)).

## Typical Use Cases

### Use Case 1: Install the runtime the hippocampal/brainstem modules need

```bash
# checkMCR.sh told you MCRv97 is missing; install it (root for /usr/local)
sudo FREESURFER_HOME=/usr/local/freesurfer/8.2.0 fs_install_mcr R2019b
# → installs $FREESURFER_HOME/MCRv97
```

### Use Case 2: Install into a user-writable FreeSurfer tree

```bash
export FREESURFER_HOME=$HOME/freesurfer/8.2.0
fs_install_mcr R2019b
```

After install, the compiled-MATLAB segmentation scripts (e.g.
[[segmentHA_T1.sh]], `segmentBS.sh`) find the runtime automatically via
[[checkMCR.sh]].

## Pipeline Context

`fs_install_mcr` is a **post-install / on-demand environment helper**. It is not
invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Its only
in-tree relationship is with [[checkMCR.sh]], which *recommends* running it (but
does not call it) when the MCR is absent, and with the compiled-MATLAB modules
that consume the installed runtime.

**Predecessor:** [[checkMCR.sh]] reports a missing runtime → **fs_install_mcr
R2019b** → **Successor:** compiled-MATLAB modules ([[segmentHA_T1.sh]],
`segmentBS.sh`, …) run against `$FREESURFER_HOME/MCRv97`.

## Gotchas and Caveats

> [!gotcha] `set -e` makes any failed step fatal
> The script runs under `set -e` ([`scripts/fs_install_mcr:5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L5)), so a
> failed `curl`, `unzip`, or vendor `install` aborts immediately. The `trap …
> EXIT` cleanup ([`scripts/fs_install_mcr:39-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L39-L43)) still removes the temp
> directory on any exit.

> [!gotcha] Hard-coded MathWorks URLs can rot
> Each supported release maps to a specific `ssd.mathworks.com` URL
> ([`scripts/fs_install_mcr:52-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L52-L61)). If MathWorks reorganises its
> download paths, `curl` will fail (often saving an HTML error page that `unzip`
> then rejects). The R2019b URL is the one the current FreeSurfer modules need.

> [!gotcha] Apple-silicon installs the x86_64 runtime under Rosetta
> The arm-mac patch deliberately tricks the MathWorks installer into installing
> the `maci64` (Intel) runtime ([`scripts/fs_install_mcr:73-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L73-L84)). The
> printed note warns that if the GUI installer prompts for a location you must
> accept the default `/Applications/MATLAB/MATLAB_Runtime` path or the install
> will be incomplete.

## Error Compensation and Guard Rails

- **Argument-count and FREESURFER_HOME pre-flight checks**
  ([`scripts/fs_install_mcr:18-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L18-L32)).
- **Temp-directory isolation with guaranteed cleanup**: all download/extract/install
  happens in a `mktemp -d` directory removed by an EXIT trap
  ([`scripts/fs_install_mcr:34-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L34-L43)).
- **Reinstall guard**: an existing `MCR<version>` is not clobbered without a `y`
  confirmation ([`scripts/fs_install_mcr:96-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L96-L106)).
- **Apple-silicon fallback**: if the silent install does not populate the temp
  target, the script looks for the runtime in the macOS default GUI path and
  symlinks it into the FreeSurfer tree ([`scripts/fs_install_mcr:111-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr#L111-L125)).

## Related Tools

- [[checkMCR.sh]] — the runtime checker that tells users to run this script and that the segmentation modules call at startup.
- [[fs_install_cuda]] — sibling post-install helper that GPU-enables fspython's `torch`.
- [[segmentHA_T1.sh]] — a representative compiled-MATLAB module that requires the MCR this script installs.

## Confidence and Gaps

**High confidence:** the single-argument contract, the supported-release list,
the OS/architecture branching, the install location (`$FREESURFER_HOME/MCR<ver>`),
the reinstall prompt, and the Apple-silicon handling were all read directly from
[`scripts/fs_install_mcr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr) and corroborated by [[checkMCR.sh]].

> [!gap] URL durability
> The MathWorks download URLs are version-pinned and outside FreeSurfer's
> control; only the R2019b path is in active use by current modules, so the
> older-release branches are not routinely exercised and may have rotted.

## References

- FreeSurfer source: [`scripts/fs_install_mcr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_mcr) (v8.2.0).
- Runtime checker that recommends this tool: [`scripts/checkMCR.sh:7-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/checkMCR.sh#L7-L27).
- FreeSurfer wiki: the **MatlabRuntime** page referenced by `checkMCR.sh`
  (`https://surfer.nmr.mgh.harvard.edu/fswiki/MatlabRuntime`).
