---
title: "fsvglrun"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # bash
source_files:
  - "scripts/fsvglrun"
families: []                       # standalone display-environment wrapper
recon_all_stage: null
related:
  - "[[fsxvfb]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tkmeditfv]]"
  - "[[tksurferfv]]"
  - "[[tkregisterfv]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - display
  - gui
  - virtualgl
  - remote
  - opengl
---

# fsvglrun

## Summary

`fsvglrun` is a wrapper that runs an OpenGL GUI command under **VirtualGL**
(`vglrun`) when, and only when, several conditions for safe/beneficial remote
GPU rendering are met. VirtualGL redirects an application's OpenGL calls to a
server-side GPU and ships the rendered frames to a remote desktop, which makes
3D applications such as [[wiki/tools/freeview|freeview]] far more responsive over
remote-desktop sessions (e.g. NoMachine/NX). If the preconditions are not met,
`fsvglrun` simply runs the command unwrapped, so it is always safe to prefix a
GUI launch with it. The FreeSurfer GUI launcher scripts (`tkmeditfv`,
`tksurferfv`, `tkregisterfv`, `fvcompare`, `mideface`, `topofit`, …) call it for
exactly this reason.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fsvglrun`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsvglrun`
- **External tool wrapped:** `vglrun` (VirtualGL), found on `PATH` or at `/usr/pubsw/bin/vglrun`.

## Purpose and Context

OpenGL applications render slowly over plain X11 forwarding because every GL
primitive is round-tripped to the remote client. VirtualGL solves this by doing
the GL rendering on the server's GPU and streaming only the resulting pixels.
However, using `vglrun` is only appropriate in specific circumstances, and using
it for a *local* display can be unnecessary or harmful. `fsvglrun` encapsulates
the FreeSurfer policy for "should this GUI be launched through VirtualGL?" so
that every GUI launcher does not have to re-implement that decision.

It is a **launch-time shim**: it never processes data and is not a recon-all
stage. Its companion [[fsxvfb]] handles the opposite need — running a GUI with
*no* display at all (headless screenshots).

> [!gotcha] VirtualGL is off unless you opt in
> The single most important fact about `fsvglrun` is that VirtualGL is **disabled
> by default**. You must export `FS_ALLOW_VGLRUN` to a non-empty, non-zero value
> ([`scripts/fsvglrun:20-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L20-L22)). With it unset, `fsvglrun` always
> `exec`s the command directly.

## Inputs

### Required Inputs

- **A command and its arguments** — the GUI to run, e.g.
  `fsvglrun freeview orig.mgz`. At least one argument is required; with none, it
  prints `USAGE: fsvglrun command args ...` and exits 1
  ([`scripts/fsvglrun:15-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L15-L18)).

### Input Assumptions

> [!assumption] A remote OpenGL GUI launch you have opted into
> `fsvglrun` assumes the wrapped command is an OpenGL application being run in a
> remote session and that you want GPU-accelerated rendering. It does not check
> that the command is actually a GUI; it only checks the VirtualGL preconditions
> and the `DISPLAY` value.

The four conditions that must **all** hold for VirtualGL to be used
([`scripts/fsvglrun:20-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L20-L44)):

1. `FS_ALLOW_VGLRUN` is set to non-zero.
2. `vglrun` is found on `PATH` (else `/usr/pubsw/bin/vglrun`).
3. VirtualGL is installed, evidenced by `/etc/opt/VirtualGL/vgl_xauth_key`.
4. The session is **not** local — `DISPLAY` does not end in `:0` or `:0.0`.

If any condition fails, `FS_ALLOW_VGLRUN` is forced to 0 and the command runs
unwrapped.

## Outputs

`fsvglrun` produces **no files of its own**. It `exec`s the wrapped command
(either directly or via `vglrun`), so the outputs are entirely those of the GUI
being launched (e.g. a freeview window, or screenshots freeview writes). On the
VirtualGL path it prints `Using VGL` to stdout before exec
([`scripts/fsvglrun:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L51)).

## Mathematical Foundations

None — this is a launch wrapper. It performs no computation; the only logic is a
sequence of environment/file/`DISPLAY` tests that decide whether to prepend
`vglrun` to the command.

## Configuration Options

### Complete Flag Reference

`fsvglrun` has **no flags of its own**; everything after the script name is the
command to run. Its behaviour is controlled by one environment variable plus
auto-detected system state.

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| `FS_ALLOW_VGLRUN` | env var (0/non-0) | `0` (unset → 0) | Master switch. Must be non-zero to even consider VirtualGL ([`scripts/fsvglrun:20-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L20-L22)). Forced back to 0 if any precondition fails. |
| `vglrun` on `PATH` | auto-detected | — | If `which vglrun` succeeds it is used; else `/usr/pubsw/bin/vglrun` if present; else VirtualGL is disabled ([`scripts/fsvglrun:24-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L24-L34)). |
| `/etc/opt/VirtualGL/vgl_xauth_key` | file presence | — | Taken as proof VirtualGL is installed; missing → disabled ([`scripts/fsvglrun:35-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L35-L38)). |
| `DISPLAY` | env var | — | If it ends in `:0`/`:0.0` the session is deemed local and VirtualGL is disabled ([`scripts/fsvglrun:40-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L40-L44)). |
| `command args …` | positional | *(required)* | The program to run; passed to `exec` (optionally via `vglrun`). |

### Configuration Interactions

> [!gotcha] All four preconditions are ANDed; any one missing turns VGL off
> Setting `FS_ALLOW_VGLRUN=1` is necessary but not sufficient. If `vglrun` is not
> found, or `/etc/opt/VirtualGL/vgl_xauth_key` is absent, or `DISPLAY` looks
> local, the script silently resets `FS_ALLOW_VGLRUN=0` and runs the command
> plainly. This is by design — it guarantees the GUI still launches even on hosts
> without VirtualGL.

> [!gotcha] `VGL_DISPLAY=:0` is intentionally not exported
> The script contains a commented-out `export VGL_DISPLAY=:0`
> ([`scripts/fsvglrun:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L52)), with a "is this needed?" note. By default VGL
> uses its own configured display; if your VirtualGL server GPU is on a specific
> display you may need to set `VGL_DISPLAY` yourself in the environment.

## Typical Use Cases

### Use Case 1: Run freeview accelerated over a remote desktop

```bash
# On a NoMachine/NX session on a host with VirtualGL + a GPU
export FS_ALLOW_VGLRUN=1
fsvglrun freeview orig.mgz
# prints "Using VGL" and launches freeview through vglrun
```

### Use Case 2: Safe universal prefix in a launcher script

```bash
# Works whether or not VGL is available/enabled — falls back to a direct run
fsvglrun freeview -v brain.mgz -f lh.white
```

This is exactly how the FreeSurfer GUI wrappers invoke it, e.g. `fsvglrun $cmd`
in [[tkmeditfv]] ([`scripts/tkmeditfv:233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkmeditfv#L233)),
[[tksurferfv]] ([`scripts/tksurferfv:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tksurferfv#L119)), and
[[tkregisterfv]] ([`scripts/tkregisterfv:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L192)).

## Pipeline Context

`fsvglrun` is a **GUI launch wrapper**, not a processing stage; it is not part of
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Within the distribution it
is a shared helper invoked by the FreeView/legacy-GUI launcher scripts:
[[tkmeditfv]], [[tksurferfv]], [[tkregisterfv]], `fvcompare`, `mideface`, and
`topofit` all wrap their `freeview`/`tk*` launch in `fsvglrun`. Its sibling
[[fsxvfb]] covers the headless-rendering case; the two are complementary
display-environment helpers around [[wiki/tools/freeview|freeview]].

**Predecessor:** a GUI launcher builds a command → **fsvglrun** decides
plain-vs-VirtualGL → **Successor:** [[wiki/tools/freeview|freeview]] (or another
OpenGL GUI) runs.

## Gotchas and Caveats

> [!gotcha] `exec` replaces the process — code after it never runs
> Both the fallback path ([`scripts/fsvglrun:46-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L46-L49)) and the VGL path
> ([`scripts/fsvglrun:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L53)) use `exec`, so `fsvglrun` becomes the wrapped
> program. The trailing `exit $status` lines are dead code. Moreover `$status`
> is a **csh** variable; in this bash script it is undefined/empty, so those
> `exit $status` statements would be no-ops even if reached. Harmless, because
> `exec` already transfers the exit status of the GUI to the caller.

> [!gotcha] "local display" detection is purely `DISPLAY`-string based
> The local-vs-remote test only inspects whether `DISPLAY` ends in `:0`/`:0.0`
> ([`scripts/fsvglrun:40-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L40-L44)). A remote session that happens to present
> `DISPLAY=:0` (or a local one on a non-zero display) will be misclassified. The
> header comment even notes it "might not hurt to use vglrun if it is local."

## Error Compensation and Guard Rails

- **Always-launch guarantee**: every failed precondition degrades gracefully to a
  direct `exec "$@"`, so a missing or misconfigured VirtualGL never prevents the
  GUI from starting.
- **Two-location `vglrun` search**: `PATH` first, then the Martinos `pubsw`
  location `/usr/pubsw/bin/vglrun` ([`scripts/fsvglrun:24-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L24-L34)).
- **Usage guard**: empty argument list prints usage and exits 1
  ([`scripts/fsvglrun:15-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun#L15-L18)).

## Related Tools

- [[fsxvfb]] — complementary helper that runs a GUI under a virtual framebuffer for fully headless rendering.
- [[wiki/tools/freeview|freeview]] — the primary OpenGL GUI that benefits from VirtualGL acceleration; commonly launched as `fsvglrun freeview …`.
- [[tkmeditfv]], [[tksurferfv]], [[tkregisterfv]] — FreeView-based launcher scripts that wrap their command in `fsvglrun`.

## Confidence and Gaps

**High confidence:** the four VirtualGL preconditions, the default-off behaviour
of `FS_ALLOW_VGLRUN`, the `vglrun` search order, the local-display heuristic, and
the `exec`-based dispatch were all read directly from
[`scripts/fsvglrun`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun), and the caller usage was confirmed in the
GUI launcher scripts. No open behavioural questions remain.

## References

- FreeSurfer source: [`scripts/fsvglrun`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsvglrun) (v8.2.0).
- VirtualGL project documentation (the `vglrun` command this wraps).
- Representative caller: `fsvglrun $cmd` in [`scripts/tkmeditfv:233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkmeditfv#L233).
