---
title: "seg2cc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/seg2cc"
families: []                     # standalone corpus-callosum helper
recon_all_stage: autorecon2      # run at the "CC Seg" stage of recon-all
related:
  - "[[mri_cc]]"
  - "[[mergeseg]]"
  - "[[seg2recon]]"
  - "[[samseg2recon]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_info]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_label2vol]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether cc_up.lta is valid/needed when computed in the non-conformed (conform-then-map-back) path; the in-code comment is uncertain."
  - "The --ctab flag is parsed but the embedded-vs-default ctab choice is driven by $ctabdefault in the merge step; --ctab is not threaded into the conformed mri_cc branch."
tags:
  - segmentation
  - corpus-callosum
  - aseg
  - recon-all-helper
---

# seg2cc

## Summary

`seg2cc` adds a corpus-callosum (CC) segmentation to an existing `aseg`-style
volume that lacks one — for example, a [[wiki/tools/samseg|samseg]], SynthSeg, or
FastSurfer segmentation. It runs [[mri_cc]] on the CC-free segmentation
(`aseg.auto_noCCseg.mgz`) to label the five CC sub-segments (251–255) and writes
the result as `aseg.auto.mgz`. If the input is already 1 mm-conformed it calls
[[mri_cc]] directly; if not, it conforms a working copy, runs [[mri_cc]] there,
maps the CC labels back to the native grid, and splices them in with
[[mergeseg]]. It is the script [[wiki/pipelines/recon-all|recon-all]] invokes at
its **CC Seg** stage.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/seg2cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc)
- **Binary/script location:** `$FREESURFER_HOME/bin/seg2cc`
- **Key helpers invoked:** [`mri_info --conformed-to-min`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L89) (conform check), [`mri_cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L96) (CC segmentation), [`mri_convert --conform_min`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L113) and [`mri_label2vol --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L120) (conform / un-conform resampling), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L145), and [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L154) (splice CC labels back in). Also uses the FreeSurfer shell utilities `getfullpath`, `UpdateNeeded`, and `fs_time`.

## Purpose and Context

In the canonical recon-all stream the corpus callosum is labelled as a side
effect of `mri_ca_label`. When a subject is processed from an externally produced
segmentation (samseg / SynthSeg / FastSurfer / a hand `aseg`) that has no CC
labels, that step is skipped, so the CC must be added separately. `seg2cc` does
exactly that one job. The author's header comment notes it is "somewhat redundant
with [[seg2recon]] but that does a bunch of stuff I don't want to do, so I'm just
creating a new script" ([`scripts/seg2cc:1-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L1-L7)).

Within recon-all, the **CC Seg** stage runs `seg2cc --s $subjid` (plus `-lh`/`-rh`
if hemisphere-restricted), gated by `DoCCSeg`, and forces a subsequent
`aseg.auto` merge ([`scripts/recon-all:3066-3082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3066-L3082)). `DoCCSeg`
is enabled whenever `mri_ca_label` is run, so on a CA-labelled subject `seg2cc`
re-segments the CC outside `ca_label`; the comment flags this as "should be
refactored." Functionally the CC Seg stage is part of `autorecon2`.

## Inputs

### Required Inputs

- **Subject** (`--s`) — the only required argument. `seg2cc` reads everything
  else from `$SUBJECTS_DIR/$subject/mri/`
  ([`scripts/seg2cc:300-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L300-L313)):
  - `aseg.auto_noCCseg.mgz` (the CC-free input; name set by `--nocc`)
  - `norm.mgz` (intensity reference; name set by `--n`)

  Both must exist or the script aborts.

### Input Assumptions

> [!assumption] aseg-style labels; CC voxels currently unlabelled
> The input is assumed to be a FreeSurfer `aseg`-style label volume **without** a
> corpus callosum. [[mri_cc]] locates the CC from the surrounding white-matter
> labels, so the standard label numbering must be present. The volume need
> **not** be 1 mm-isotropic: `seg2cc` checks `mri_info --conformed-to-min`
> ([`scripts/seg2cc:88-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L88-L92)) and takes a conform/un-conform
> detour when it is not, because [[mri_cc]] itself requires conformed input.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `aseg.auto.mgz` (name from `--cc`) | `mri/` | the input segmentation **plus** CC labels 251–255 |
| `transforms/cc_up.lta` | `mri/transforms/` | the CC "up" transform produced by [[mri_cc]] |
| Non-conformed path only: `norm.conf.mgz`, `aseg.auto_noCCseg.conf.mgz`, `aseg.auto.conf.mgz`, `aseg.auto.noconf.mgz` | `mri/` | conformed working copies and the CC mapped back to native space ([`scripts/seg2cc:110-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L110-L160)) |
| `scripts/seg2cc.log` | `scripts/` | run log (default; `--log`/`--nolog` to change) |

### Output Specifications

`aseg.auto.mgz` has the same geometry and dimensions as the input
`aseg.auto_noCCseg.mgz` (the conform detour deliberately maps the CC labels back
into the original grid before merging, to avoid round-trip resampling of the
whole volume — see [Mathematical Foundations](#mathematical-foundations)). The
five CC labels written are **251 (CC_Posterior), 252 (CC_Mid_Posterior), 253
(CC_Central), 254 (CC_Mid_Anterior), 255 (CC_Anterior)**. A color table is
embedded in the merge step (default `FreeSurferColorLUT.txt`).

## Mathematical Foundations

`seg2cc` is an orchestration script; the CC localization math lives entirely in
[[mri_cc]]. Its only own logic is the **conform / un-conform handling**:

> [!math] Conform detour for non-isotropic input
> If `aseg.auto_noCCseg.mgz` is not conformed-to-min:
> 1. Conform `norm` → `norm.conf.mgz` ([`mri_convert --conform_min`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L113)).
> 2. Resample the seg into that grid with nearest-neighbour label handling
>    ([`mri_label2vol --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L120)) → `aseg.auto_noCCseg.conf.mgz`.
> 3. Run [[mri_cc]] in conformed space → `aseg.auto.conf.mgz`.
> 4. Map the conformed result back to native space
>    ([`mri_label2vol --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L138)) → `aseg.auto.noconf.mgz`.
> 5. For each CC label 251–255, binarize it from the native-space CC map and
>    [[mergeseg]] it onto the **original** `aseg.auto_noCCseg.mgz`
>    ([`scripts/seg2cc:144-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L144-L160)).

Step 5 splices only the CC labels into the untouched original aseg, so the rest
of the segmentation never makes the lossy 1 mm round trip. The in-code comment
spells this out: "Do not use the non-conf volume above because moving into and
out of 1mm space may create a problem" ([`scripts/seg2cc:142-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L142-L143)).

> [!internal] CC localization is in mri_cc
> The actual identification and five-way partition of the corpus callosum
> (rotation into the CC plane, thresholding, subdivision) is performed by
> [[mri_cc]]; `seg2cc` only feeds it conformed inputs and handles the geometry
> bookkeeping.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/seg2cc:190-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L190-L291)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name; inputs/outputs are taken from `$SUBJECTS_DIR/$subject/mri/`. |
| `--nocc` | string | `aseg.auto_noCCseg` | Basename (no `.mgz`) of the CC-free **input** segmentation. |
| `--cc` | string | `aseg.auto` | Basename (no `.mgz`) of the CC-bearing **output** segmentation. |
| `--n` | string | `norm` | Basename of the intensity (`norm`) volume used by [[mri_cc]]. (The usage text calls this `--normvol`, but the parser flag is `--n` — see contradiction below.) |
| `-lh`<br>`-lh-only`<br>`--lh-only` | bool | both hemis | Restrict [[mri_cc]] to the left hemisphere (passes `-lh`). |
| `-rh`<br>`-rh-only`<br>`--rh-only` | bool | both hemis | Restrict [[mri_cc]] to the right hemisphere (passes `-rh`). |
| `--ctab` | string | `FreeSurferColorLUT.txt` (in merge) | Color table for the seg. Parsed into `$ctab`, but the merge step embeds `$ctabdefault` (see gap). |
| `--threads` | int | — | Thread count (stored in `$threads`; passed through where applicable). |
| `--expert` | string | — | Expert options file; validated by `fsr-checkxopts`. Marked "Not used" in the source ([`scripts/seg2cc:228-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L228-L235)). |
| `--force-update`<br>`--no-force-update` | bool | off | Regenerate outputs even if `UpdateNeeded` says they are current. |
| `--log` | string | `scripts/seg2cc.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging. |
| `--tmp`<br>`--tmpdir` | string | auto (`/scratch` or `mri/tmp`) | Scratch directory; also implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory at the end. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!contradiction] Usage says `--normvol`, parser accepts `--n`
> The usage block prints `--normvol : name of norm volume`
> ([`scripts/seg2cc:346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L346)), but the argument parser only handles
> `--n` ([`scripts/seg2cc:213-216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L213-L216)); `--normvol` would hit the
> `default` case and error as unrecognized. Code is authoritative: use `--n`.

> [!gotcha] `-lh` and `-rh` are not mutually-exclusive-checked
> Setting both `-lh` and `-rh` would add **both** `-lh` and `-rh` to the
> [[mri_cc]] command line ([`scripts/seg2cc:97-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L97-L98)); the script does
> not guard against this. In practice recon-all sets at most one, mirroring its
> own `$LHonly`/`$RHonly`.

> [!gotcha] Skips work when the output is already up to date
> `check_params` runs `UpdateNeeded aseg.auto.mgz aseg.auto_noCCseg.mgz norm.mgz`
> and **exits 0 without doing anything** if no update is needed
> ([`scripts/seg2cc:318-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L318-L324)). Use `--force-update` to force
> regeneration after editing inputs.

- `--cc`/`--nocc` let you point at non-default basenames (e.g. to add the CC to a
  differently-named segmentation), but the output is always written into `mri/`.
- `--expert` is accepted and validated but, per the source comment, not actually
  applied here.

## Typical Use Cases

### Use Case 1: As recon-all runs it (CC Seg stage)

```bash
# Adds 251-255 to aseg.auto_noCCseg.mgz, producing aseg.auto.mgz.
seg2cc --s subj01
```

This is the exact invocation in [[wiki/pipelines/recon-all|recon-all]]'s CC Seg
block (with `-lh`/`-rh` appended only if the run is hemisphere-restricted).

### Use Case 2: Add CC to a samseg/SynthSeg aseg by hand

```bash
# After placing a CC-free aseg at mri/aseg.auto_noCCseg.mgz and a norm.mgz:
seg2cc --s subj01 --force-update
```

### Use Case 3: Non-default input/output names

```bash
seg2cc --s subj01 --nocc synthseg_noCC --cc synthseg_withCC --n norm
```

## Pipeline Context

`seg2cc` is the **CC Seg** step of [[wiki/pipelines/recon-all|recon-all]]
(`autorecon2`). recon-all calls `seg2cc --s $subjid` when `DoCCSeg` is set and
then forces an `aseg.auto` → manual-edit merge afterwards
([`scripts/recon-all:3066-3082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3066-L3082)). It can also be run
stand-alone to add a CC to any externally produced `aseg`.

**Predecessor:** a CC-free `aseg.auto_noCCseg.mgz` + `norm.mgz` (from
`mri_ca_label`, [[samseg2recon]], [[seg2recon]], SynthSeg, or FastSurfer) →
**seg2cc** → **Successor:** the manual-aseg-merge step and the rest of
`autorecon2`, which consumes `aseg.auto.mgz`.

## Gotchas and Caveats

> [!gotcha] mri_cc needs conformed input — handled transparently
> [[mri_cc]] only works on conformed volumes. `seg2cc` detects non-conformed
> input and performs a conform → segment → map-back → splice sequence so the
> caller does not have to conform first ([`scripts/seg2cc:106-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L106-L161)).
> This means a non-isotropic input yields several extra `*.conf.mgz`/`*.noconf.mgz`
> files in `mri/`.

> [!gotcha] CC labels are spliced, not the whole volume resampled
> In the non-conformed path the final `aseg.auto.mgz` is the **original** aseg
> with only the CC labels added via [[mergeseg]] — the bulk of the segmentation
> is never resampled to 1 mm and back, avoiding interpolation drift
> ([`scripts/seg2cc:142-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L142-L160)).

> [!gotcha] Hardcoded CC label set 251–255
> The merge loop is over exactly `251 252 253 254 255`
> ([`scripts/seg2cc:144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L144)). These are the five FreeSurfer CC
> sub-labels; the script is not parameterizable to other label ranges.

## Error Compensation and Guard Rails

- **Conform auto-detour.** Non-isotropic input is conformed for [[mri_cc]] and
  the result mapped back, rather than failing (see above).
- **Up-to-date skip.** `UpdateNeeded` short-circuits the whole run if the output
  is newer than its inputs ([`scripts/seg2cc:318-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L318-L324)); each
  internal step is likewise gated by `UpdateNeeded`/`$ForceUpdate`.
- **Input existence checks.** Both `aseg.auto_noCCseg.mgz` and `norm.mgz` are
  verified before any work ([`scripts/seg2cc:308-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L308-L313)).
- **Fail-fast.** Every sub-command checks `$status` and aborts via `error_exit`
  on failure.

## Related Tools

- [[mri_cc]] — does the actual corpus-callosum localization and 5-way partition.
- [[mergeseg]] — splices the CC labels back into the original aseg (non-conformed path).
- [[seg2recon]] — broader sibling that also seeds a full recon-all subject (and does the same CC step internally).
- [[samseg2recon]] — imports a samseg segmentation and likewise adds the CC.
- [[mri_info]] — `--conformed-to-min` conform check.
- [[wiki/tools/mri_convert|mri_convert]] / [[mri_label2vol]] — conform and un-conform resampling.
- [[mri_binarize]] — isolates each CC label before merging.
- [[wiki/pipelines/recon-all|recon-all]] — calls `seg2cc` at the CC Seg stage.

## Confidence and Gaps

**High confidence:** the conformed vs non-conformed control flow, the
five-label CC splice via [[mergeseg]], the recon-all CC-Seg call site, the full
flag set, and the `UpdateNeeded` skip — all read from
[`scripts/seg2cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc). The `--help` output matches the source.

> [!gap] cc_up.lta validity in the conform detour
> The script writes `transforms/cc_up.lta` from [[mri_cc]] in **both** paths, but
> the in-code comment for the non-conformed branch reads "Not sure if cc_up.lta
> will be valid (or needed)" ([`scripts/seg2cc:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L125)). Treat
> `cc_up.lta` from a non-conformed run as unverified.

> [!gap] `--ctab` not threaded into the conformed branch
> `--ctab` sets `$ctab`, but the [[mergeseg]] call hardcodes `$ctabdefault`
> (`FreeSurferColorLUT.txt`) for the embedded color table
> ([`scripts/seg2cc:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L155)), and the conformed-path [[mri_cc]] call
> does not take a ctab at all. A custom `--ctab` may not propagate as expected.

## References

- FreeSurfer source: [`scripts/seg2cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc) (v8.2.0).
- recon-all call site: [`scripts/recon-all:3066-3082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3066-L3082) (CC Seg stage).
- Built-in help: `seg2cc --help` (the `BEGINHELP` block is empty in this script, [`scripts/seg2cc:358-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L358-L362)).
