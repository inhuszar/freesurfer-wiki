---
title: "fsxvfb"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/fsxvfb"
families: []                       # standalone display-environment wrapper
recon_all_stage: null
related:
  - "[[fsvglrun]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tkmeditfv]]"
  - "[[mideface]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - display
  - gui
  - headless
  - xvfb
  - screenshot
---

# fsxvfb

## Summary

`fsxvfb` runs a graphical command under a **virtual X framebuffer** (`Xvfb`) so it
can execute "headless" — without a physical display or any windows popping up on
screen. This is the standard way to make [[wiki/tools/freeview|freeview]] (or
another X GUI) produce screenshots on a server or in a batch job. The script
finds a free X display number, starts an `Xvfb` server on it, points `DISPLAY`
at that server, runs the supplied command, and then tears the `Xvfb` down — while
handling Ctrl-C cleanly so the temporary server and its lock file are not left
behind.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/fsxvfb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsxvfb`
- **External tool wrapped:** `Xvfb` (the X virtual framebuffer server).

## Purpose and Context

FreeSurfer's GUIs (notably [[wiki/tools/freeview|freeview]]) can generate images
non-interactively with their `-ss`/screenshot options, but they still need an X
server to render against. On a headless server there is no display, and even on a
workstation you usually do not want a window flashing up for every automated
screenshot. `fsxvfb` provides a throwaway X server (`Xvfb`) for the duration of
one command, so rendering happens entirely off-screen.

It is a **launch-time shim**, not a recon-all stage. It is the headless
counterpart to [[fsvglrun]] (which instead accelerates *interactive* remote
GUIs). FreeSurfer scripts use it for exactly the screenshot/batch case: e.g.
[[mideface]] sets `set runxvfb = fsxvfb` ([`scripts/mideface:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L142))
to render its QA snapshots, and [[tkmeditfv]] prepends `fsxvfb` when run in
"screenshot-and-quit" mode ([`scripts/tkmeditfv:196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkmeditfv#L196)).

> [!gotcha] Source comments misspell the name several times
> The header help and error strings contain typos — "vrb"/"Xvrb" for `Xvfb`,
> "fsxvb" for `fsxvfb`, and a literal `fsxvrb` in the usage example
> ([`scripts/fsxvfb:3-9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L3-L9), [`scripts/fsxvfb:38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L38)). These are
> cosmetic; the actual command and the `Xvfb` binary it calls are spelled
> correctly.

## Inputs

### Required Inputs

- **A command and its arguments** — the GUI to run headless, e.g.
  `fsxvfb freeview -v orig.mgz -viewport x -ss pic1.jpg`. With no arguments the
  script prints `fsxvfb command` and exits 1 ([`scripts/fsxvfb:31-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L31-L34)).
- **`Xvfb` on `PATH`** — checked with `which Xvfb`; if absent the script errors
  and exits 1 ([`scripts/fsxvfb:36-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L36-L40)).

### Input Assumptions

> [!assumption] An X GUI that renders to $DISPLAY and then exits
> `fsxvfb` assumes the wrapped command draws to the X server pointed to by
> `DISPLAY` and terminates on its own (e.g. freeview with `-ss …` exits after
> writing the screenshot). It overrides `DISPLAY` for the child process; the
> command must honour that environment variable.

The script also assumes it can pick a free display by scanning lock files in
`/tmp`. It looks for an unused display number starting at **50** (despite the
header comment mentioning 10), incrementing until it finds one whose
`/tmp/.X<D>-lock` file does not exist ([`scripts/fsxvfb:42-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L42-L55)).

## Outputs

`fsxvfb` produces **no files of its own**; whatever the wrapped command writes
(typically screenshot image files such as `pic1.jpg`) is the output. Transient
artefacts during the run:

| Transient | Where | Lifetime |
|-----------|-------|----------|
| `Xvfb` server process on display `:<D>` | memory | started, then `kill`ed at exit |
| `/tmp/.X<D>-lock` lock file | `/tmp` | created by `Xvfb`; removed by the cleanup (`rm -f $lockfile`) ([`scripts/fsxvfb:72-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L72-L76)) |

The script exits with the wrapped command's status (`exit $st`,
[`scripts/fsxvfb:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L78)).

## Mathematical Foundations

None — this is a display-environment wrapper. The only computation is the linear
scan for a free display number (`@ D = $D + 1` in a `while` loop bounded at 1000,
[`scripts/fsxvfb:48-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L48-L55)).

## Configuration Options

### Complete Flag Reference

`fsxvfb` has **no flags of its own**; all arguments form the command to run. One
environment variable tunes the display search.

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| `command args …` | positional | *(required)* | The X GUI to run headless. Executed verbatim as `$argv` with `DISPLAY` set to the chosen virtual display ([`scripts/fsxvfb:66-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L66-L69)). |
| `FSXVFB_START_D` | env var (int) | `50` | Display number at which to start searching for a free X display ([`scripts/fsxvfb:45-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L45-L46)). Raise it if low display numbers are contended on your host. |

### Configuration Interactions

> [!gotcha] Free-display search starts at 50, not 10
> The header comment says the search begins at display 10, but the code defaults
> `FSXVFB_START_D` to **50** ([`scripts/fsxvfb:45-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L45-L46)) — chosen to avoid
> colliding with displays real users have open. Code is authoritative: the first
> tried display is `:50` unless you override `FSXVFB_START_D`.

> [!gotcha] Stale lock files block displays
> A display is considered taken if `/tmp/.X<D>-lock` exists
> ([`scripts/fsxvfb:49-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L49-L53)). If a previous `fsxvfb` was killed in a way
> that bypassed cleanup, the lock can linger and that display number is skipped
> until you delete the file (and kill any orphaned `Xvfb`) by hand, or reboot —
> as the header comment explains ([`scripts/fsxvfb:11-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L11-L19)).

## Typical Use Cases

### Use Case 1: Make a freeview screenshot on a headless server

```bash
# Render a sagittal view to pic1.jpg with no window appearing
fsxvfb freeview -v orig.mgz -viewport x -ss pic1.jpg
```

### Use Case 2: Avoid a crowded display range

```bash
# Start the search higher if :50+ are already in use on a shared node
setenv FSXVFB_START_D 200
fsxvfb freeview -v brain.mgz -ss qa.png
```

### Use Case 3: As used internally for QA snapshots

```bash
# mideface and tkmeditfv prepend fsxvfb when generating screenshots in batch;
# e.g. tkmeditfv's screenshot-and-quit mode runs:  fsxvfb <freeview cmd>
```

## Pipeline Context

`fsxvfb` is a **headless GUI launch wrapper**, not a processing stage; it is not
part of [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Within the
distribution it is invoked by tools that need off-screen rendering for QA images:
[[mideface]] (`set runxvfb = fsxvfb`, [`scripts/mideface:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L142))
and [[tkmeditfv]] in screenshot-and-quit mode
([`scripts/tkmeditfv:196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkmeditfv#L196)). It is the headless counterpart to
[[fsvglrun]]; together they are the FreeSurfer display-environment helpers around
[[wiki/tools/freeview|freeview]].

**Predecessor:** a tool needs an off-screen render → **fsxvfb** provides a
throwaway `Xvfb` display → **Successor:** [[wiki/tools/freeview|freeview]] (or
another X GUI) renders to it and writes images.

## Gotchas and Caveats

> [!gotcha] Ctrl-C is caught, but the cleanup label also runs on normal exit
> The script installs `onintr myint` so an interrupt jumps to the `myint:` label,
> which kills the `Xvfb`, unsets `DISPLAY`, and removes the lock file
> ([`scripts/fsxvfb:67-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L67-L76)). Because there is no `goto`/`exit` before the
> label, control also *falls through* into `myint:` after a normal run — that is
> intentional, so the same cleanup runs whether the command finished or was
> interrupted. The `$normalexit` flag only changes the printed message
> ([`scripts/fsxvfb:73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L73)).

> [!gotcha] `xvfb-run` was avoided deliberately
> The header notes that the Debian `xvfb-run` helper "is supposed to do this" but
> the author could never get it working ([`scripts/fsxvfb:21-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L21-L22)), hence this
> hand-rolled script.

## Error Compensation and Guard Rails

- **Xvfb presence check**: aborts with an error if `Xvfb` is not on `PATH`
  ([`scripts/fsxvfb:36-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L36-L40)).
- **Free-display discovery**: scans lock files to pick an unused display rather
  than assuming one, bounded at display 1000 ([`scripts/fsxvfb:48-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L48-L55)).
- **Guaranteed teardown**: the `Xvfb` process is `kill`ed and the lock file
  removed on both normal completion and interrupt
  ([`scripts/fsxvfb:67-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L67-L76)), so it does not leak a server per run.
- **Status propagation**: the wrapped command's exit status is captured and
  returned ([`scripts/fsxvfb:69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L69), [`scripts/fsxvfb:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb#L78)).

## Related Tools

- [[fsvglrun]] — complementary helper that accelerates *interactive* remote OpenGL GUIs via VirtualGL (rather than running them headless).
- [[wiki/tools/freeview|freeview]] — the primary GUI run under `fsxvfb` to produce screenshots non-interactively.
- [[mideface]], [[tkmeditfv]] — FreeSurfer scripts that invoke `fsxvfb` to render QA/screenshot images off-screen.

## Confidence and Gaps

**High confidence:** the free-display search (starting at 50, overridable via
`FSXVFB_START_D`), the lock-file convention, the `Xvfb` start/`DISPLAY`
override/`kill` lifecycle, the `onintr`/`myint:` cleanup, and the
status-propagation behaviour were all read directly from
[`scripts/fsxvfb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb), and the caller usage was confirmed in
[[mideface]] and [[tkmeditfv]]. No open behavioural questions remain.

## References

- FreeSurfer source: [`scripts/fsxvfb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsxvfb) (v8.2.0).
- `Xvfb` (X.Org virtual framebuffer) documentation — the server this script starts.
- Representative caller: `set runxvfb = fsxvfb` in [`scripts/mideface:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mideface#L142).
