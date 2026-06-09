---
title: "stim_polar"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "stim_polar/stim_polar.cpp"
families: []                     # standalone OpenGL visual-stimulus program
recon_all_stage: null
related:
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The installed v8.2.0 binary cannot run its stimulus: main() begins with a stdin-reading debug block that exits(0) before any GLUT setup, so the documented behaviour is the intended/historical behaviour read from source, not observed output."
  - "No FSFAST/recon-all caller references stim_polar; how its presentation timing was meant to be logged and aligned with acquisition is not specified in this file."
tags:
  - retinotopy
  - visual-stimulus
  - opengl
  - fmri
  - eccentricity
---

# stim_polar

## Summary

`stim_polar` is an OpenGL/GLUT visual-stimulus presentation program for
retinotopic mapping fMRI. It draws a flickering polar-coordinate checkerboard
(rings × radial spokes) on screen and animates an **expanding or contracting
ring (eccentricity) annulus** that sweeps the checkerboard from the centre
outward (or from the periphery inward) with a logarithmic radial profile. It is
a *stimulus generator* for an eccentricity-mapping experiment, not an analysis
tool: it produces the moving visual pattern a subject views in the scanner. The
checkerboard reversal pattern can be driven either by a simple alternating
contrast or by a binary **m-sequence**.

> [!contradiction] The installed v8.2.0 binary does nothing — it exits at startup
> `main()` opens with a debug block that reads a single character from `stdin`,
> prints `c = <char>`, and calls `exit(0)` **before** any version handling,
> argument parsing, or GLUT initialisation
> ([`stim_polar/stim_polar.cpp:460-468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L460-L468)). Running
> `stim_polar --help` simply prints `c = ` and quits; **no stimulus is ever
> displayed**. This block looks like left-in debugging scaffolding. Everything
> below this section describes the program's *intended* behaviour as read from
> the source; the shipped binary is, in effect, non-functional. Code is truth:
> the binary's actual behaviour is the early exit.

## Source Information

- **Language:** C++ (OpenGL + GLUT + X11)
- **Source file:** [`stim_polar/stim_polar.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/stim_polar` (built only when
  `BUILD_GUIS AND OPENGL_FOUND`, per
  [`stim_polar/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/CMakeLists.txt))
- **Internal usage name:** the usage string calls the program `eccen`
  (eccentricity), suggesting the source was adapted from an eccentricity-mapping
  stimulus ([`stim_polar/stim_polar.cpp:488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L488)).

## Purpose and Context

Retinotopic mapping uses periodic visual stimuli — a rotating polar wedge for
**polar-angle** maps and an expanding/contracting ring for **eccentricity**
maps — to drive a travelling wave of activity across visual cortex whose phase
encodes visual-field position. `stim_polar` implements the stimulus-presentation
side of such an experiment: a high-contrast radial checkerboard that reverses
(flickers) to maximise V1 drive, with a grey annulus mask that reveals only a
moving band of the checkerboard, sweeping eccentricity over a fixed period.

It is a **standalone** program. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or by any script in the FreeSurfer tree
(no caller found under `scripts/`), and it produces no files — its only output
is the on-screen animation. The fMRI *analysis* of the resulting data
(phase-encoded retinotopy: per-voxel Fourier component at the stimulus frequency)
is performed by separate FreeSurfer/FSFAST tools, not here.

> [!gotcha] This is a stimulus, not an analysis — there is no Fourier/phase code
> Despite living near retinotopy analysis, `stim_polar` contains **no** Fourier
> transform, phase estimation, or any fMRI time-series math. Its only signal
> processing is generating a maximum-length binary m-sequence to control the
> checkerboard pattern ([`stim_polar/stim_polar.cpp:554-584`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L554-L584)).

## Inputs

`stim_polar` takes seven **positional** arguments after any options
([`stim_polar/stim_polar.cpp:487-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L487-L499)):

```
stim_polar [-mseq] <flickerFreq> <stimPeriod(ms)> <minEcc> <maxEcc> <numRings> <numSpokes> <OUTWARD>
```

### Required Inputs (positional)

| Position | Name | Meaning |
|----------|------|---------|
| 1 | `flickerFreq` | Checkerboard contrast-reversal (flicker) frequency, Hz. Sets the frame interval `timeTick = 1000/flickerFreq` ms ([`stim_polar/stim_polar.cpp:367`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L367)). |
| 2 | `stimPeriod` | Period of one full eccentricity sweep, in **milliseconds** (`T` in the annulus equations). |
| 3 | `minEcc` | Inner radius of the stimulus (minimum eccentricity), in the program's screen units. Must exceed `1e-6`. |
| 4 | `maxEcc` | Outer radius (maximum eccentricity). |
| 5 | `numRings` | Number of concentric checkerboard rings (radial subdivisions). |
| 6 | `numSpokes` | Number of angular wedges (spokes) around the circle. |
| 7 | `OUTWARD` | `1` = expanding (centre → periphery) sweep; otherwise contracting (periphery → centre) ([`stim_polar/stim_polar.cpp:137-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L137-L279)). |

The numeric arguments are parsed with `atof`/`atoi` and stored in module globals
([`stim_polar/stim_polar.cpp:493-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L493-L499)).

### Input Assumptions

> [!assumption] A working OpenGL/GLUT display and a finite inner radius
> The program needs an X display with OpenGL double-buffered RGB visuals
> (`glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB)`). The window is fixed at
> 500×500 px with an orthographic projection spanning −50…+50 in each axis
> ([`stim_polar/stim_polar.cpp:446-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L446-L453), [`#L507-L510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L507-L510)), so `minEcc`/`maxEcc`
> are interpreted in that ±50 coordinate frame, not in degrees of visual angle —
> any mapping to visual-field degrees is the experimenter's responsibility.
> `minEcc` must be `> 1e-6` or the program exits, because the logarithmic radial
> profile takes `log(minEcc)` ([`stim_polar/stim_polar.cpp:501-504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L501-L504)).

## Outputs

**None.** `stim_polar` writes no files and prints only incidental status
(`generating m-sequence…`, the debug `c =` line). Its product is the real-time
visual animation rendered to the GLUT window. Timing relevant to fMRI alignment
(when each sweep begins) is implicit in `stimPeriod` and the GLUT elapsed-time
clock; it is not logged.

## Mathematical Foundations

### Checkerboard geometry (log-spaced rings)

The checkerboard is drawn as `numRings` concentric annuli, each subdivided into
`numSpokes` wedges via `gluPartialDisk`. Ring radii grow **geometrically** so
that each ring spans an equal *logarithmic* eccentricity step — matching the
roughly logarithmic cortical magnification of the visual field. With

$$
s = \left(\frac{\text{maxEcc}}{\text{minEcc}}\right)^{1/\text{numRings}},
$$

the $k$-th ring runs from inner radius $\text{minEcc}\cdot s^{k}$ to
$\text{minEcc}\cdot s^{k+1}$ ([`stim_polar/stim_polar.cpp:88-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L88-L122)). Each
wedge spans $360/\text{numSpokes}$ degrees; the black/white assignment of a
$(\text{ring}, \text{spoke})$ cell flips with ring parity and spoke parity, and
the whole board reverses contrast each frame to produce the flicker.

### Eccentricity annulus sweep (log-linear in time)

A grey annulus mask reveals only a band of the checkerboard whose inner/outer
radii move with time. Let $T=\text{stimPeriod}$, $t$ the time within the current
cycle, and define the eccentricity range in log space
$\Delta = \log(\text{maxEcc}) - \log(\text{minEcc})$
([`stim_polar/stim_polar.cpp:135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L135)). The revealed band's edges advance
**linearly in $\log(\text{radius})$** at rate $\Delta/T$, e.g. for the expanding
half-cycle the trailing edge is

$$
r_{\text{out}}(t) = \exp\!\Big(\log(\text{minEcc}) + \Delta\,\tfrac{t}{T}\Big),
$$

with the leading edge offset by half the log-range, and wrapping handled by a
second annulus near the cycle midpoint ([`stim_polar/stim_polar.cpp:137-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L137-L279)).
The contracting case (`OUTWARD != 1`) is the same construction with the sign of
the log-rate reversed. Each edge is clamped to `[minEcc, maxEcc]` (with a ±1
overcover so the grey mask fully hides the checkerboard outside the band).

> [!math] Why log-spacing
> Both the ring boundaries and the annulus motion are uniform in
> $\log(\text{eccentricity})$. A sweep that is linear in log-radius spends equal
> time per octave of eccentricity, which (given cortical magnification) drives
> the travelling activity wave at a more uniform cortical speed than a
> linear-in-radius sweep would.

### m-sequence checkerboard drive (`-mseq`)

With `-mseq`, instead of a plain alternating reversal the per-cell on/off pattern
is taken from a **maximum-length linear-feedback shift-register (LFSR)
sequence** of order `mseq_order` (default 16, period $2^{16}-1 = 65535$) with a
feedback tap mask `mseq_tap` (default 45)
([`stim_polar/stim_polar.cpp:53-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L53-L59), [`#L554-L584`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L554-L584)). The generator
shifts a register $R$ and XORs in `tap` when the high bit is set:

$$
R \leftarrow (R \ll 1)\ \oplus\ \text{tap (if high bit set)},\quad
m_i = R\ \&\ 1,
$$

raising an error if the chosen tap does not produce a full-length sequence
(detected by revisiting a register state). Each $(\text{ring},\text{spoke})$ cell
is assigned a different phase of the sequence by an integer delay
$\text{nbr\_delay} = \mathrm{round}(2^{\text{order}}/(\text{numRings}\cdot\text{numSpokes}))$,
so the cells form a spatially shifted m-sequence ensemble across `numFrames`
(1024) precomputed frames ([`stim_polar/stim_polar.cpp:392-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L392-L419)). This is
the classic approach for deconvolving spatial receptive fields with white-noise
(m-sequence) stimulation.

> [!internal] No FreeSurfer math libraries are used
> Unlike most FreeSurfer C/C++ tools, `stim_polar` does not use the `matrix`/`mri`
> numerics; the only non-GL computation is the LFSR and the radius arithmetic
> above, all local to this file. It links `utils` for `ErrorExit`/`DiagInit`
> only.

## Configuration Options

### Complete Flag Reference

There is exactly **one** option, parsed in `get_option`
([`stim_polar/stim_polar.cpp:536-552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L536-L552)). Any other `-x` flag prints
`unknown option` and exits.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mseq` | bool | off | Drive the checkerboard reversal pattern from an m-sequence (LFSR) instead of plain frame-by-frame contrast alternation. Uses order 16, tap 45 (compiled-in). |

Everything else (flicker frequency, sweep period, radii, ring/spoke counts,
sweep direction) is supplied positionally — see [Inputs](#inputs). The
m-sequence order (`mseq_order = 16`) and tap (`mseq_tap = 45`) are compile-time
constants with no command-line override
([`stim_polar/stim_polar.cpp:55-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L55-L56)).

`--version`/`-version` is handled by the shared `handleVersionOption` helper
*after* the early-exit debug block — so in practice it is unreachable in the
shipped binary ([`stim_polar/stim_polar.cpp:470-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L470-L473)).

### Configuration Interactions

- **`-mseq` changes only the temporal pattern, not the geometry.** Ring/spoke
  counts and the eccentricity sweep are identical with or without it; `-mseq`
  swaps the per-cell flicker for a shifted LFSR ensemble in the precomputed frame
  buffer ([`stim_polar/stim_polar.cpp:392-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L392-L442)).
- **`OUTWARD` selects the sweep direction** of the annulus mask in the
  ring-drawing path; note the non-`-mseq` display callback wired up in `main()`
  (`display_all`) renders the precomputed checkerboard frames, while the
  expanding-annulus logic lives in `display_expanding_rings` — see the gap below.

## Typical Use Cases

> The shipped binary exits immediately (see the contradiction callout); the
> commands below are the **intended** invocations and would apply to a build with
> the startup debug block removed.

### 1. Expanding-ring eccentricity stimulus

```bash
# 8 Hz flicker, 32 s sweep period, radii 1..40, 8 rings x 24 spokes, expanding.
stim_polar 8 32000 1 40 8 24 1
```

### 2. Contracting-ring stimulus

```bash
# Same geometry, sweep periphery -> centre (OUTWARD = 0).
stim_polar 8 32000 1 40 8 24 0
```

### 3. m-sequence checkerboard

```bash
# Drive cells with an order-16 m-sequence instead of plain reversal.
stim_polar -mseq 8 32000 1 40 8 24 1
```

## Pipeline Context

`stim_polar` is a **stimulus-delivery** program that runs on the presentation
computer during a retinotopy scan, not a step in any FreeSurfer processing
pipeline.

**Predecessor:** experiment design / scan setup → **stim_polar** (subject views
the animation while the scanner acquires) → **Successor:** phase-encoded
retinotopy *analysis* of the fMRI time series (separate FSFAST / surface
retinotopy tools), which estimates the per-vertex response phase at the stimulus
frequency and projects it onto the cortical surface for viewing in
[[wiki/tools/freeview|freeview]].

It has no recon-all stage and writes nothing that downstream tools read; the
link to analysis is only through the experimental timing (`stimPeriod`) that the
analysis must be told.

## Gotchas and Caveats

> [!gotcha] Startup debug block makes the binary unusable
> As above ([`stim_polar/stim_polar.cpp:460-468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L460-L468)): the very first thing
> `main()` does is block on `stdin`, print one character, and `exit(0)`. The
> stimulus code below it is never reached in v8.2.0.

> [!gotcha] `stimPeriod` is in milliseconds, radii are in ±50 screen units
> `stimPeriod` is read as milliseconds (it is compared directly against the GLUT
> elapsed-time clock, which is ms), while `minEcc`/`maxEcc` are in the
> orthographic ±50 frame, **not** degrees of visual angle. Calibrate to your
> display geometry separately.

> [!gotcha] Window size and projection are fixed
> The window is hard-coded to 500×500 px and the projection to −50…+50; there is
> no flag to set display size, viewing distance, or fixation point
> ([`stim_polar/stim_polar.cpp:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L45), [`#L446-L453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L446-L453)).

> [!gotcha] m-sequence tap must be valid
> If a tap that does not generate a maximal-length sequence is used, the
> generator aborts with `tap … does not generate an m-sequence`
> ([`stim_polar/stim_polar.cpp:566-568`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L566-L568)). The compiled default (order 16,
> tap 45) is valid; alternative taps are listed in source comments but cannot be
> selected from the command line.

## Error Compensation and Guard Rails

- **Inner-radius guard.** `minEcc < 1e-6` exits with a message, preventing
  `log(0)` in the radial profile ([`stim_polar/stim_polar.cpp:501-504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L501-L504)).
- **Argument-count guard.** After option parsing, exactly 8 `argv` entries
  (program + 7 positionals) are required, else the `eccen` usage is printed and
  the program exits ([`stim_polar/stim_polar.cpp:487-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L487-L491)).
- **m-sequence validity check** as above.
- **No graceful fallback for the startup exit** — the early `exit(0)` is
  unconditional and is the dominant "behaviour" of the program.

## Known Bugs

- [[00160]] — `main()` opens with a leftover debug block that reads one stdin character and calls `exit(0)` before any argument/GLUT code, so the program prints `c =` and quits; it is non-functional as shipped.

## Related Tools

- [[wiki/tools/freeview|freeview]] — used downstream to view the phase-encoded retinotopy maps that analysis of `stim_polar`-driven scans produces (the stimulus and the viewer are otherwise unrelated).

> [!gap] No sibling polar-wedge / analysis tool was located
> The internal name `eccen` and the "polar" filename suggest a companion
> polar-angle (rotating wedge) stimulus and a retinotopy analysis program, but no
> such partner tool was found in the v8.2.0 source tree for cross-linking.

## Confidence and Gaps

**High confidence:** the single `-mseq` flag, the seven positional arguments and
their meanings, the log-spaced ring geometry, the log-linear-in-time annulus
sweep with `OUTWARD` direction control, the order-16/tap-45 m-sequence generator
and its per-cell delay scheme, the fixed 500×500/±50 display, and — critically —
the startup `stdin`/`exit(0)` debug block that renders the binary inert. All read
directly from [`stim_polar/stim_polar.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp).

> [!gap] Which display callback actually runs
> `main()` registers `display_all` (the precomputed-frame checkerboard renderer)
> as the GLUT display function, whereas the expanding/contracting **annulus**
> logic lives in `display_expanding_rings`, which `main()` does not register
> ([`stim_polar/stim_polar.cpp:517`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L517) vs.
> [`#L65-L287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp#L65-L287)). As wired, only the flickering checkerboard
> would be shown and the moving eccentricity band would not — another sign the
> file is mid-refactor. Resolving the intended wiring needs developer input.

> [!gap] Timing / fMRI alignment
> Nothing in this file records sweep onsets or synchronises with the scanner
> trigger, so how a `stim_polar` run was meant to be time-locked to acquisition
> for phase-encoded analysis is not documented here.

## References

- FreeSurfer source: [`stim_polar/stim_polar.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stim_polar/stim_polar.cpp) (v8.2.0).
- Background (phase-encoded retinotopy method, for the downstream analysis this
  stimulus feeds): Sereno et al., *Science* 268:889–893 (1995); Engel,
  Glover & Wandell, *Cereb. Cortex* 7:181–192 (1997). The m-sequence
  white-noise mapping approach: Sutter, in *Nonlinear Vision* (1992).
