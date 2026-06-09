---
title: "fs_install_cuda"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # bash
source_files:
  - "scripts/fs_install_cuda"
families: []                       # standalone install/environment helper
recon_all_stage: null
related:
  - "[[fs_install_mcr]]"
  - "[[fspython]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The site-packages path is hard-coded to python3.8; whether a future fspython on a different minor version would still pass the post-install libtorch_cuda.so check is unverified."
tags:
  - install
  - gpu
  - cuda
  - python
  - fspython
---

# fs_install_cuda

## Summary

`fs_install_cuda` upgrades the PyTorch installed inside FreeSurfer's bundled
Python environment (**fspython**) from the CPU-only build to a CUDA-enabled
build, so that GPU-accelerated deep-learning tools (e.g. SynthSeg / SynthStrip /
SynthSR-style networks and other `torch`-based modules) can run on an NVIDIA
GPU. It inspects the currently installed `torch` version, and if that version is
the `+cpu` variant it uninstalls it and reinstalls the equivalent pure-version
`torch` wheel (which pulls in the matching NVIDIA CUDA runtime packages as
dependencies). It is an **interactive, one-shot environment fixer**, not a data-
or image-processing tool.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fs_install_cuda`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_install_cuda`
- **Operates on:** the fspython interpreter at `$FREESURFER_HOME/python/bin/python3`, via `python3 -m pip`.

## Purpose and Context

FreeSurfer 8 ships its own self-contained Python ([[fspython]]) with a **CPU-only**
build of PyTorch so that the distribution installs and runs on machines without a
GPU. On a machine that *does* have an NVIDIA GPU, that CPU build leaves
significant performance on the table for the neural-network tools. Rather than
ask users to hand-edit the embedded environment, FreeSurfer provides this helper
to swap the CPU wheel for the GPU wheel in place.

The script is meant to be **run once, by hand, after installation**, and only on
GPU hosts. Because it modifies files under `$FREESURFER_HOME`, it must be run
with write permission to that tree — which for an RPM/DEB install under
`/usr/local` means `sudo` (passing `FREESURFER_HOME` through, see the header
comment in [`scripts/fs_install_cuda:3-15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L3-L15)). It is **not**
part of [[wiki/pipelines/recon-all|recon-all]] or any automated pipeline.

> [!gotcha] It changes your fspython, not your data
> This tool mutates the FreeSurfer-bundled Python environment globally for the
> whole installation. Every fspython tool afterwards uses the CUDA `torch`. There
> is no per-user or per-run scoping; the change persists until you reinstall or
> revert `torch` yourself.

## Inputs

### Required Inputs

`fs_install_cuda` takes **no command-line arguments and no data files**. Its only
inputs are:

- The environment variable **`FREESURFER_HOME`** (must be set and point to an
  existing directory) — checked at [`scripts/fs_install_cuda:18-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L18-L29).
- A working fspython interpreter at `$FREESURFER_HOME/python/bin/python3` —
  checked at [`scripts/fs_install_cuda:31-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L31-L35).
- Network access to PyPI (the reinstall runs `pip install --no-cache-dir`).

### Input Assumptions

> [!assumption] An NVIDIA GPU host with a CPU-only torch already installed
> The script only does work when the installed `torch` reports a version of the
> form `X.Y.Z+cpu`. It assumes you are on (or targeting) a machine with a
> compatible NVIDIA GPU and CUDA driver; it does **not** itself check for a GPU,
> a driver, or a CUDA toolkit. Running it on a machine without a GPU will still
> install the CUDA wheel, which is simply larger and unused.

- The currently installed torch must be either `X.Y.Z+cpu` (will be replaced) or
  the bare `X.Y.Z` GPU/default build (treated as "already done"). Any other
  version string (e.g. a `+rocm` or `+cuNNN` local tag) is **not understood** and
  the script exits with an error ([`scripts/fs_install_cuda:80-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L80-L82)).
- The post-install success check looks for `libtorch_cuda.so` under a
  **python3.8** site-packages path (see Gotchas).

## Outputs

### Files Created

`fs_install_cuda` produces **no FreeSurfer data files**. Its side effects are
entirely within the fspython environment:

| Effect | Where | Notes |
|--------|-------|-------|
| `torch` CPU wheel removed | `$FREESURFER_HOME/python/.../site-packages` | `pip uninstall -y torch` |
| `torch` GPU wheel installed | same site-packages | `pip install --no-cache-dir torch==<numeric>` (pulls in `nvidia-*` CUDA runtime packages as dependencies) |
| Status messages | stdout | including `cuda install success` or an error |

### Output Specifications

There is no image, surface, or transform output. Success is reported by the
presence of the shared library `libtorch_cuda.so` inside the reinstalled `torch`
package ([`scripts/fs_install_cuda:69-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L69-L75)) and the printed
message `cuda install success`.

## Mathematical Foundations

None — this is a package-management/environment script. It performs no numerical
computation; it only parses a version string and drives `pip`. The version-string
handling is simple text manipulation: `pip freeze | grep torch` extracts the
installed version, and `sed 's;\+.*;;'` strips the `+cpu` (or any `+…`) local
tag to obtain the bare numeric version that is requested on reinstall
([`scripts/fs_install_cuda:45-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L45-L46)).

## Configuration Options

### Complete Flag Reference

`fs_install_cuda` has **no flags**. It parses no options and ignores any
arguments passed to it (the `$@` shown in the usage hint at
[`scripts/fs_install_cuda:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L21) refers only to forwarding
`FREESURFER_HOME` under `sudo`, not to script options). Its single point of
control is an interactive confirmation prompt.

| "Option" | Type | Default | Description |
|----------|------|---------|-------------|
| *(interactive prompt)* | `y`/`n` keypress | — | At [`scripts/fs_install_cuda:49-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L49-L54) the script prints which `torch` it will replace and waits for a single `y`/`n` keystroke. Anything other than `y`/`Y` aborts cleanly (`exit 0`). |
| `FREESURFER_HOME` | env var (string) | *(required)* | Installation root whose `python/` environment is modified. |

### Configuration Interactions

There are no flags to interact, but two **state-dependent behaviours** matter:

> [!gotcha] The outcome depends entirely on the currently installed torch tag
> - If torch is `X.Y.Z+cpu` → it is uninstalled and `X.Y.Z` is installed (the
>   intended path).
> - If torch is the bare `X.Y.Z` → the script declares "non-cpu version …
>   already installed — nothing to do" and exits 0
>   ([`scripts/fs_install_cuda:76-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L76-L79)). It does **not** verify that this
>   existing build is actually CUDA-enabled; it only checks the absence of the
>   `+cpu` tag.
> - Any other tag → hard error ([`scripts/fs_install_cuda:80-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L80-L82)).

## Typical Use Cases

### Use Case 1: Enable GPU torch after a normal (non-root) install

```bash
# fspython lives under a user-writable $FREESURFER_HOME
export FREESURFER_HOME=/usr/local/freesurfer/8.2.0
fs_install_cuda
# answer 'y' at the prompt
```

### Use Case 2: Enable GPU torch after an RPM/DEB install under /usr/local

```bash
# system install: needs root to write into $FREESURFER_HOME, pass the var through
sudo FREESURFER_HOME=/usr/local/freesurfer/8.2.0 fs_install_cuda
```

## Pipeline Context

`fs_install_cuda` is a **post-install environment helper**, not a processing
stage. It is not called by [[wiki/pipelines/recon-all|recon-all]], `trac-all`, or
any other script in the distribution (it has no callers in `scripts/`). It runs
once to prepare fspython for GPU execution; the *successors* are the actual
deep-learning tools (the `torch`-based segmentation / synthesis commands) that
then benefit from CUDA.

**Predecessor:** FreeSurfer install → **fs_install_cuda** → **Successor:** any
fspython GPU tool (`torch`-based networks).

## Gotchas and Caveats

> [!gotcha] The success check hard-codes a python3.8 site-packages path
> The post-install verification looks for
> `$FREESURFER_HOME/python/lib/python3.8/site-packages/torch/lib/libtorch_cuda.so`
> ([`scripts/fs_install_cuda:69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L69)). In the 8.2.0 install fspython is
> indeed python3.8, so this matches. If a future fspython moved to a different
> minor version, the `pip install` could succeed yet this check would fail and
> the script would report an error even though CUDA torch was installed.

> [!gotcha] `--help` does not print help
> The script parses no options, so `fs_install_cuda --help` falls straight into
> the torch logic. (In practice it reaches the confirmation prompt and, with no
> input, prints `Install aborted - exiting.` and exits 0.) There is no usage
> text; consult this page or the header comment in the source.

> [!gotcha] Five-second pause before uninstall
> After you confirm, the script `sleep 5` before touching `torch`
> ([`scripts/fs_install_cuda:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L55)) — a deliberate last chance to Ctrl-C.
> This is expected, not a hang.

## Error Compensation and Guard Rails

- **Pre-flight checks**: aborts early if `FREESURFER_HOME` is unset
  ([`scripts/fs_install_cuda:18-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L18-L23)), if that directory does not exist
  ([`scripts/fs_install_cuda:26-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L26-L29)), or if the fspython binary is
  missing ([`scripts/fs_install_cuda:31-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L31-L35)).
- **Failure-aware pip calls**: it checks the exit status of `pip freeze`,
  `pip uninstall`, and `pip install` and stops on any failure
  ([`scripts/fs_install_cuda:37-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L37-L41),
  [`scripts/fs_install_cuda:58-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L58-L67)). On uninstall failure it
  explicitly suggests retrying with `sudo`.
- **Idempotence**: re-running on an already-GPU torch is a no-op (it exits 0
  with an informational message rather than reinstalling).

## Related Tools

- [[fs_install_mcr]] — the sibling installer that adds the MATLAB Compiler Runtime to `$FREESURFER_HOME`; same "post-install helper" family.
- [[fspython]] — the bundled Python environment whose `torch` package this script swaps.

## Confidence and Gaps

**High confidence:** the script is short and was read in full; the no-argument
behaviour, the `+cpu` → bare-version swap, the interactive prompt, the
pre-flight checks, and the success criterion are all read directly from
[`scripts/fs_install_cuda`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda).

> [!gap] python3.8 path assumption
> The hard-coded `python3.8` in the `libtorch_cuda.so` check is correct for the
> 8.2.0 fspython but is brittle across fspython upgrades. Whether the maintainers
> intend to keep fspython pinned to 3.8 is not determinable from this script
> alone.

## References

- FreeSurfer source: [`scripts/fs_install_cuda`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda) (v8.2.0).
- Header comment block with the `sudo FREESURFER_HOME=… fs_install_cuda` usage:
  [`scripts/fs_install_cuda:3-15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_install_cuda#L3-L15).
