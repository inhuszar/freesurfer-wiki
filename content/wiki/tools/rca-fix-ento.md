---
title: "rca-fix-ento"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-fix-ento"
families: []                     # recon-all component / fixer script (rca-* family)
recon_all_stage: null            # standalone fixer; not called by recon-all in v8.2.0 (use recon-all -fix-ento-wm instead)
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_entowm_seg]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_synthseg]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - entorhinal
  - white-matter
  - surface-accuracy
  - editing
  - deep-learning
  - recon-all
---

# rca-fix-ento

## Summary

`rca-fix-ento` **fixes the entorhinal white matter** in a finished (or
in-progress) FreeSurfer subject. The entorhinal cortex — and especially the white
matter of the gyrus ambiens — is so thin that it is often invisible in the
intensity image, so the white and pial surfaces there are typically inaccurate.
This script segments the WM around the entorhinal region with a deep-learning
network ([[mri_entowm_seg]], output `mri/entowm.mgz`), then uses
[[mri_edit_wm_with_aseg]] to fold that segmentation into `mri/wm.mgz` (and
optionally `mri/brain.finalsurfs.manedit.mgz`) **as if it were a manual edit** —
adding the entorhinal/gyrus-ambiens WM at value 255. After running it you re-run
`recon-all -autorecon2-cp -autorecon3` to re-place the surfaces with the corrected
WM. It is a **standalone, temporary fix for FreeSurfer 7.3 and earlier**; in 8.x
the equivalent is built into recon-all as `-fix-ento-wm`, and recon-all does not
call this script.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-fix-ento`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-fix-ento`
- **Tools invoked:** [`mri_entowm_seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L98) (deep-learning entorhinal-WM segmentation), [`mri_edit_wm_with_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L110) (apply the segmentation as edits, via its `-sa-fix-ento-wm` standalone mode). Helpers: `UpdateNeeded`, plus optional `sbatch` submission.

## Purpose and Context

In a standard FreeSurfer reconstruction the entorhinal WM is frequently
under-segmented because its intensity is close to grey matter; the resulting
surfaces cut into the cortex around the gyrus ambiens. `rca-fix-ento` corrects this
by bringing in a dedicated CNN that segments the entorhinal-region WM and
distinguishes generic peri-entorhinal WM from the more problematic gyrus-ambiens
(GA) WM ([`scripts/rca-fix-ento#L341-L358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L341-L358)). That segmentation is then written
into `wm.mgz` at 255 so it "looks like manual edits," and the user re-runs the
surface stages.

This is positioned as a **bridge for older FreeSurfer versions**. The very first
line of the help reads: "this program is a temporary fix for FS version 7.3 and
earlier. For later versions, you can run recon-all with `-fix-ento-wm`"
([`scripts/rca-fix-ento#L338-L339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L338-L339)). In the v8.2.0 tree the script ships, but
recon-all has no call to it — the entorhinal fix is an integrated recon-all option
(`-fix-ento-wm`), so `recon_all_stage` is `null`.

> [!gotcha] Single-use guard: it refuses to run twice
> The script writes a completion stamp `scripts/rca-fix-ento.txt` and **errors out
> if that file already exists** ([`scripts/rca-fix-ento#L296-L302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L296-L302)). To re-run it
> you must delete that file first. This prevents accidentally applying the
> entorhinal edits to `wm.mgz` twice (the `wm.mgz` edit uses input==output, so it
> is not idempotent-safe under `UpdateNeeded`).

## Inputs

### Required Inputs

- **`--s <subject>`** — a FreeSurfer subject under `$SUBJECTS_DIR` that has been
  processed at least through white-matter segmentation. The script operates in
  `mri/`.
- **`mri/nu.mgz`** — the intensity-normalised volume; the input to
  [[mri_entowm_seg]] ([`scripts/rca-fix-ento#L93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L93)).
- **`mri/wm.mgz`** and **`mri/brain.finalsurfs.mgz`** — required to exist
  (checked in `check_params`, [`scripts/rca-fix-ento#L286-L294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L286-L294)); `wm.mgz` is the
  volume that receives the entorhinal edits.

### Input Assumptions

> [!assumption] A reconstruction that has reached wm.mgz
> The subject must already have `nu.mgz`, `wm.mgz`, and `brain.finalsurfs.mgz`
> (i.e. recon-all has run at least to white-matter segmentation). `filled.mgz` is
> explicitly **not** required — the check loop excludes it because it is absent in
> longitudinal subjects ([`scripts/rca-fix-ento#L289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L289)). The entorhinal CNN runs
> on `nu.mgz`; `--conform` is passed so high-resolution data is handled and the
> result is unchanged for already-conformed data ([`scripts/rca-fix-ento#L97-L98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L97-L98)).

> [!assumption] ~20 GB of memory, no GPU needed
> The deep-learning model "may require as much as 20GB (GPU not needed)"
> ([`scripts/rca-fix-ento#L357-L358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L357-L358)); the `--submit` path requests 14 GB on a
> basic SLURM partition ([`scripts/rca-fix-ento#L46-L50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L46-L50)).

## Outputs

### Files Created

All under `$SUBJECTS_DIR/<subject>/`.

| File / path | Produced by | Contents |
|-------------|-------------|----------|
| `mri/entowm.mgz` | [[mri_entowm_seg]] | Entorhinal-region WM segmentation, distinguishing generic peri-entorhinal WM from gyrus-ambiens (GA) WM. |
| `mri/wm.mgz` (modified in place) | [[mri_edit_wm_with_aseg]] `-sa-fix-ento-wm entowm.mgz 3 255 255 wm.mgz wm.mgz` | The WM segmentation with entorhinal+GA WM filled in at 255 (looks like a manual edit). |
| `mri/brain.finalsurfs.manedit.mgz` | (only with `--brain-mask`) `mri_edit_wm_with_aseg -sa-fix-ento-wm entowm.mgz 2 255 255 …` | GA WM set to 255 in the manedit volume; created from `brain.finalsurfs.mgz` if absent. |
| `mri/backup.brain.finalsurfs.manedit.mgz` | (only with `--brain-mask`, if a manedit already existed) | Backup of the pre-existing manedit before editing. |
| `scripts/rca-fix-ento.txt` | written at completion | Single-run completion stamp (blocks re-running). |
| `scripts/log/rca-fix-ento.*.log` | written | Per-run log. |

### Output Specifications

The `mri_edit_wm_with_aseg -sa-fix-ento-wm` standalone mode takes the form
`-sa-fix-ento-wm entowm.mgz <level> <lhval> <rhval> <invol> <outvol>`
([`mri_edit_wm_with_aseg.cpp:331-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp#L331-L352)). The **level** selects what is
filled — 1 = entowm only, 2 = gyrus ambiens only (conservative), 3 = both — and
`<lhval>`/`<rhval>` are the fill values per hemisphere. `rca-fix-ento` uses:

| Target volume | level | lhval | rhval | Meaning |
|---------------|-------|-------|-------|---------|
| `wm.mgz` | 3 | 255 | 255 | Fill both entowm and GA WM at 255 in both hemispheres. |
| `brain.finalsurfs.manedit.mgz` (`--brain-mask`) | 2 | 255 | 255 | Fill only the GA WM at 255. |
| `filled.mgz` (disabled `if(0)` block) | 3 | 255 | 127 | Would fill both, lh=255/rh=127 — **not executed**. |

The edited volumes keep their original geometry/data type; only the labelled
entorhinal voxels are changed.

## Mathematical Foundations

The script does no math itself. The segmentation is a deep convolutional network.

> [!internal] The model and the fill rule live in the called tools
> The entorhinal-WM segmentation is implemented in [[mri_entowm_seg]] (a CNN; the
> script passes `--conform --threads`). The geometric fill that turns the
> segmentation into WM edits is `MRIfixEntoWM()` inside
> [[mri_edit_wm_with_aseg]] ([`mri_edit_wm_with_aseg.cpp:348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp#L348)); the
> level/value semantics are documented in the source comment there
> ([`mri_edit_wm_with_aseg.cpp:333-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp#L333-L338)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-fix-ento#L183-L269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L183-L269)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subject>` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `--threads <n>` | integer | `1` | Threads passed to [[mri_entowm_seg]]. |
| `--brain-mask`<br>`--no-brain-mask` | bool | **off** | Also apply the GA fix to `brain.finalsurfs.manedit.mgz`. **Off by default** because the 255 fill would be clipped to 0 by `mris_place_surfaces` unless it gains a `--restore255` option (see gotcha). |
| `--submit`<br>`--no-submit` | bool | off | Re-submit the job to SLURM via `sbatch` (1 thread, 14 GB, 10-minute limit) and exit; the submitted job re-invokes the script with `--threads 1 --no-submit`. |
| `--account <acct>` | string | `fhs` | SLURM account used with `--submit`. |
| `--force`<br>`--no-force` | bool | off | Force the EntoWM segmentation even if `entowm.mgz` is newer than `nu.mgz` (bypass `UpdateNeeded`). |
| `--log <file>` | string | auto (`scripts/log/rca-fix-ento.*.log`) | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir <dir>` | string | auto | Temp directory (sets `cleanup=0`); not actively used in v8.2.0 (the cleanup line is commented out). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp cleanup (no effect, as above). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

There is no flag to disable the core EntoWM step: the internal `FixEntoWM` switch
is hard-set to 1 and has no command-line toggle ([`scripts/rca-fix-ento#L14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L14)).

### Configuration Interactions

> [!gotcha] `--brain-mask` is off for a reason (the 255 clipping problem)
> Applying the entorhinal fix to `brain.finalsurfs.manedit.mgz` is **disabled by
> default**. The in-code comment explains: "This has to be turned off unless
> `--restore255` can be added to `mris_place_surfaces`, otherwise it will clip
> them to 0" ([`scripts/rca-fix-ento#L126-L128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L126-L128)). Enabling `--brain-mask` on a
> build whose `mris_place_surfaces` lacks `--restore255` can therefore make the
> intended bright edits vanish. Leave it off unless you know your build supports
> the restore.

- `--submit` is terminal: it builds the `sbatch` command, submits, and exits
  before any processing ([`scripts/rca-fix-ento#L44-L54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L44-L54)); the actual work happens
  in the re-launched `--no-submit` job. `--account` only matters with `--submit`.
- The single-run stamp (`scripts/rca-fix-ento.txt`) interacts with re-running: it
  must be deleted before a second run, independent of `--force` (which only
  affects the `UpdateNeeded` skip of the segmentation step).

## Typical Use Cases

### 1. Fix entorhinal WM, then re-place surfaces

```bash
rca-fix-ento --s subj01 --threads 8
# then, as the script's usage instructs:
recon-all -s subj01 -autorecon2-cp -autorecon3
```

### 2. Submit to a cluster

```bash
rca-fix-ento --s subj01 --submit --account mylab
# re-submits itself with --threads 1 --no-submit (14 GB, 10-min SLURM job)
```

### 3. Re-run after deleting the completion stamp

```bash
rm $SUBJECTS_DIR/subj01/scripts/rca-fix-ento.txt
rca-fix-ento --s subj01 --threads 8 --force
```

## Pipeline Context

In v8.2.0, `rca-fix-ento` is **not** part of [[wiki/pipelines/recon-all|recon-all]]
(`recon_all_stage: null`); the entorhinal fix is built into recon-all as the
`-fix-ento-wm` option, and that is the recommended route on 8.x. This script is a
standalone bridge for **FreeSurfer 7.3 and earlier**.

Used standalone, it sits **after** white-matter segmentation and **before** a
re-run of the control-point/surface stages:

**Predecessor:** a recon-all run through `wm.mgz` (so `nu.mgz`, `wm.mgz`,
`brain.finalsurfs.mgz` exist) → **rca-fix-ento** (segment with
[[mri_entowm_seg]]; edit `wm.mgz` via [[mri_edit_wm_with_aseg]]) → **Successor:**
`recon-all -autorecon2-cp -autorecon3` to regenerate the surfaces with the
corrected WM ([`scripts/rca-fix-ento#L327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L327)).

> [!gotcha] The edits must be in wm.mgz, in base and long, or surface edits are lost
> The comment at the WM-edit step notes the fix is applied to `wm.mgz` (rather than
> only `filled.mgz`/`brainmask.finalsurfs`) deliberately: in longitudinal subjects
> there is no `filled.mgz`, and if the edits are not in `wm.mgz` the edits in
> `brainmask.finalsurfs` "might be ignored" ([`scripts/rca-fix-ento#L107-L114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L107-L114)).

## Gotchas and Caveats

> [!gotcha] Not idempotent — guarded by a one-shot stamp
> Because the `wm.mgz` edit reads and writes the same file, running it twice would
> add the entorhinal voxels on top of an already-edited volume. The completion
> stamp `scripts/rca-fix-ento.txt` blocks a second run until you delete it
> ([`scripts/rca-fix-ento#L296-L302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L296-L302)).

> [!gotcha] Existing manual edits are preserved unless they conflict
> When `--brain-mask` is used and a `brain.finalsurfs.manedit.mgz` already exists,
> it is backed up and then edited; existing manual edits are kept "unless they
> conflict with the entowm edits" ([`scripts/rca-fix-ento#L350-L357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L350-L357)).

> [!gotcha] The `filled.mgz` edit is dead code
> A block that would also fix `filled.mgz` (level 3, lh=255/rh=127) is wrapped in
> `if(0)` and never runs ([`scripts/rca-fix-ento#L116-L124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L116-L124)), with a comment that
> the `wm.mgz` edit should suffice and that `filled.mgz` is absent in longitudinal
> subjects.

## Error Compensation and Guard Rails

- **Single-run stamp** (`scripts/rca-fix-ento.txt`) prevents non-idempotent
  double application of the `wm.mgz` edits.
- **Skip-if-up-to-date** only on the segmentation step: `entowm.mgz` is recomputed
  only when older than `nu.mgz` (or with `--force`); the `wm.mgz` edit cannot use
  `UpdateNeeded` because input and output are the same file, so it runs every time
  the script runs ([`scripts/rca-fix-ento#L107-L114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L107-L114)).
- **`--conform` to mri_entowm_seg** so high-resolution `nu.mgz` is handled without
  changing already-conformed data.
- **`--brain-mask` disabled by default** to avoid the 255-clipping problem in
  `mris_place_surfaces`.
- **Required-input checks** for `wm.mgz` and `brain.finalsurfs.mgz` (but not
  `filled.mgz`) in `check_params`.

## Related Tools

- [[mri_entowm_seg]] — the deep-learning network that produces `entowm.mgz`.
- [[mri_edit_wm_with_aseg]] — applies the segmentation as WM edits via its `-sa-fix-ento-wm` standalone mode.
- [[wiki/pipelines/recon-all|recon-all]] — on v8.x, the integrated `-fix-ento-wm` option supersedes this standalone script; re-run `-autorecon2-cp -autorecon3` afterwards.
- [[mri_synthseg]] — related contrast-agnostic segmentation network used elsewhere in the rca-* prep scripts.

## Confidence and Gaps

**High confidence:** the complete flag set, the hard-set `FixEntoWM`, the exact
`mri_edit_wm_with_aseg -sa-fix-ento-wm` level/value arguments (cross-checked
against the tool's own source comment), the single-run stamp, the `--brain-mask`
255-clipping rationale, the dead `filled.mgz` block, the `--submit` SLURM path, and
the "use `recon-all -fix-ento-wm` on later versions" positioning — all read
directly from
[`scripts/rca-fix-ento`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento) and
[`mri_edit_wm_with_aseg.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp).

## References

- FreeSurfer source: [`scripts/rca-fix-ento`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento) (v8.2.0).
- Fill semantics: [`mri_edit_wm_with_aseg.cpp:327-353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp#L327-L353) (`-sa-fix-ento-wm` / `MRIfixEntoWM`).
- Built-in help: `rca-fix-ento --help` (the `BEGINHELP` block, [`scripts/rca-fix-ento#L336-L358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-fix-ento#L336-L358)).
