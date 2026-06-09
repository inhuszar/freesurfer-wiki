---
title: "bmedits2surf"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/bmedits2surf"
families: []                     # standalone edit-tracking script
recon_all_stage: null
related:
  - "[[wmedits2surf]]"
  - "[[mri_binarize]]"
  - "[[mri_vol2surf]]"
  - "[[mri_concat]]"
  - "[[brainmask.mgz]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact voxel encoding produced by a FreeView brainmask erase vs. clone (value 1 for erase) is taken from how the script interprets the diff; not independently re-derived from the editing GUI."
tags:
  - editing
  - quality-assurance
  - surface-mapping
  - brainmask
  - de-identification
---

# bmedits2surf

## Summary

`bmedits2surf` is a tcsh script that detects where a subject's
[[brainmask.mgz]] has been **manually edited** (relative to the
automatically generated `brainmask.auto.mgz`) and projects the locations of
those edits onto a cortical surface as binary overlays. It distinguishes the
two edit operations FreeView offers on the brain mask — **erase** (voxels
forced to background) and **clone** (voxels copied back in from another
volume) — and writes one binary surface map per operation per hemisphere,
by default resampled to [[fsaverage]] space so that edits from many subjects
can be pooled into a group "edit-likelihood" map. It is a quality-assurance /
edit-auditing utility, not part of the reconstruction stream.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/bmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf)
- **Binary/script location:** `$FREESURFER_HOME/bin/bmedits2surf`
- **Tools invoked:** [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L91) (paired difference of the two mask volumes), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L95) (build and count binary edit masks), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L114) (project the volume masks onto the surface), and the FreeSurfer shell utilities `fs_temp_dir`, `UpdateNeeded`, and `sources.csh`.

## Purpose and Context

When a FreeSurfer reconstruction needs manual intervention, one of the most
common fixes is editing the skull-strip result: the recon-all stream writes
`brainmask.auto.mgz` automatically and then copies it to `brainmask.mgz`,
which the user edits in [[wiki/tools/freeview|freeview]]. Two edit
operations are typically used: **erasing** voxels that the skull strip left
in (dura, eyeballs, sinus, residual skull) and **cloning/recovering** voxels
of brain that were incorrectly removed.

`bmedits2surf` answers the question *"where, on the cortical surface, did I
(or many users) have to intervene?"* It compares the edited
[[brainmask.mgz]] against the unedited `brainmask.auto.mgz`, isolates the
erased and cloned voxels, and paints each onto the white-surface vertices.
Because the default output is on [[fsaverage]], the resulting binary maps
from a cohort can simply be concatenated and averaged to produce a spatial
**probability map of where brain-mask editing tends to be needed** — useful
for QA, for training, and for studies of reconstruction reliability.

It is run **by hand** after a subject has been edited and re-processed; it is
not invoked by [[wiki/pipelines/recon-all|recon-all]]. Its white-matter
counterpart is [[wmedits2surf]], which does the analogous job for `wm.mgz`
edits.

## Inputs

### Required Inputs

- **`--s subject`** — a FreeSurfer subject directory under `$SUBJECTS_DIR`
  that has been fully reconstructed (so that the surfaces and both brain-mask
  volumes exist). The script reads two volumes from it:
  - `$SUBJECTS_DIR/<subject>/mri/brainmask.mgz` — the (possibly edited) brain mask ([`scripts/bmedits2surf:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L53)).
  - `$SUBJECTS_DIR/<subject>/mri/brainmask.auto.mgz` — the automatically produced brain mask, used as the unedited reference ([`scripts/bmedits2surf:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L54)).
- The white surfaces (`lh.white`, `rh.white`) and the header geometry used by
  `mri_vol2surf --regheader` must already exist for the requested
  hemisphere(s).

### Input Assumptions

> [!assumption] Edits are the difference between brainmask.mgz and brainmask.auto.mgz
> The script's entire notion of "an edit" is the voxelwise difference between
> the edited `brainmask.mgz` and the automatic `brainmask.auto.mgz`. If
> `brainmask.mgz` was regenerated without editing (so the two files are
> identical), the difference is empty and all output maps are zero. If the two
> files differ for any reason other than manual editing (e.g. a re-run with a
> different skull-strip parameter), that difference is reported as an "edit".

- **Erase convention.** A brain-mask *erase* sets the voxel value to `1`
  (rather than to 0), which is how the script can tell an erased voxel from
  ordinary background: erased voxels are those equal to `1` inside the
  difference mask ([`scripts/bmedits2surf:103-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L103-L104)).
- **Clone = everything else in the diff.** Cloned (recovered) voxels are the
  remaining differing voxels after the erased ones are removed
  ([`scripts/bmedits2surf:132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L132)).
- Both mask volumes must share voxel geometry (they always do, being two
  views of the same conformed `mri/` volume).

## Outputs

### Files Created

By default (`--fsaverage`, the default) maps are resampled to fsaverage and
carry the `.fsa.` infix; with `--self` they stay in the subject's own surface
space and the infix is dropped.

| File | Where | Contents |
|------|-------|----------|
| `lh.bmerase[.fsa].mgh`, `rh.bmerase[.fsa].mgh` | `<subject>/surf/` | binary surface map of vertices near an **erased** brain-mask voxel ([`scripts/bmedits2surf:112-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L112-L113)) |
| `lh.bmclone[.fsa].mgh`, `rh.bmclone[.fsa].mgh` | `<subject>/surf/` | binary surface map of vertices near a **cloned/recovered** brain-mask voxel ([`scripts/bmedits2surf:147-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L147-L148)) |
| `bm.erase.dat` | `<subject>/stats/` | one number: count of erased voxels ([`scripts/bmedits2surf:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L102)) |
| `bm.clone.dat` | `<subject>/stats/` | one number: count of cloned voxels ([`scripts/bmedits2surf:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L138)) |
| `bmedits2surf.log` | `<subject>/surf/` | run log (every command, build stamp, timing); suppressed/redirected by `--log`/`--nolog` |

> [!gotcha] Help text and code disagree on the stats filenames
> The `BEGINHELP` block advertises `subject/stats/bmclone.dat` and
> `subject/stats/bmerase.dat` ([`scripts/bmedits2surf:334-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L334-L335)),
> but the code actually writes **`bm.erase.dat`** and **`bm.clone.dat`** (with
> the extra dot) ([`scripts/bmedits2surf:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L102), [`scripts/bmedits2surf:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L138)). Code is authoritative.

### Output Specifications

The surface outputs are single-frame `mgh` overlays, one value per vertex of
the target surface (the subject's own white surface, or fsaverage's). Values
are binary (0/1): when projected to fsaverage the overlay is re-thresholded
at `--min .0001` so that any non-zero resampled value becomes 1
([`scripts/bmedits2surf:122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L122), [`scripts/bmedits2surf:157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L157)).
The two `.dat` files are plain ASCII counts.

## Mathematical Foundations

There is no novel numerical method here; the script is a chain of
volume/surface set operations. The two interesting steps are how an *edit* is
isolated and how a *volume* edit becomes a *surface* label.

**1. Isolating the edited voxels.** The unedited and edited masks are
differenced and the magnitude of the change is binarized:

$$ D = \left| \texttt{brainmask.auto} - \texttt{brainmask} \right|,\qquad
   M_{\text{edit}} = \mathbb{1}\!\left[\, D \ge 0.5 \,\right] $$

computed by [`mri_concat --paired-diff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L91) followed by
[`mri_binarize --abs --min .5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L95). Within that change mask, erased
voxels are the ones whose edited value is exactly `1`
($M_{\text{erase}} = M_{\text{edit}} \wedge \mathbb{1}[\texttt{brainmask}=1]$,
[`scripts/bmedits2surf:103-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L103-L104)), and cloned voxels are the rest
($M_{\text{clone}} = M_{\text{edit}} - M_{\text{erase}}$, a second paired
diff, [`scripts/bmedits2surf:132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L132)).

**2. Volume → surface projection.** Each binary volume mask is sampled onto
the white surface with [`mri_vol2surf … --projfrac-max 0 2 .3 --interp nearest`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L114-L115).

> [!math] `--projfrac-max 0 2 .3` — sampling outward from the white surface
> For each vertex, `mri_vol2surf` walks **along the surface normal** from a
> fractional cortical-thickness distance of `0` (the white surface itself)
> out to `2` (twice the local cortical thickness, i.e. well past the pial
> surface toward the skull) in steps of `0.3`, and assigns the vertex the
> **maximum** value sampled. Because the mask is binary, a vertex is set to 1
> if *any* sample along that outward segment hits an edited voxel. The outward
> (0 → 2) range is appropriate for brain-mask edits because skull-strip
> corrections occur at and *outside* the cortical boundary (dura, eyes,
> sinus). Contrast [[wmedits2surf]], which samples inward as well (`-1 → 1`)
> because white-matter edits sit at and *inside* the white surface.

When the target is fsaverage (`--regheader $subject … --trgsubject fsaverage`)
the per-vertex values are resampled onto the common template and
re-binarized.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/bmedits2surf:187-268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L187-L268)). All flags are spelled with a
double dash. Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name under `$SUBJECTS_DIR`. |
| `--fsaverage`<br>`--fsa` | bool | **on** | Resample the edit maps onto [[fsaverage]] (adds the `.fsa.` infix). This is the default. |
| `--self`<br>`--no-fsaverage`<br>`--no-fsa` | bool | off | Keep the maps in the subject's own surface space instead (no `.fsa.` infix). |
| `--lh` | bool | both | Process the left hemisphere only. |
| `--rh` | bool | both | Process the right hemisphere only. |
| `--overwrite` | bool | off | Recompute even if the outputs are newer than the inputs (otherwise an up-to-date result is skipped — see Guard Rails). |
| `--no-overwrite` | bool | on | Honour the up-to-date check (default). |
| `--no-surfs` | bool | off | Compute only the voxel counts (`.dat` files), skip the surface projection. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use this scratch directory for intermediate masks; implies `--nocleanup`. |
| `--cleanup` | bool | on | Delete the scratch directory at the end (default). |
| `--nocleanup` | bool | off | Keep the scratch directory for inspection. |
| `--log` | string | `<surf>/bmedits2surf.log` | Write the log to this file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` shell tracing. |
| `--help` | bool | — | Print usage plus the `BEGINHELP` block and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--lh`/`--rh` overwrite, not accumulate
> `--lh` sets the hemisphere list to exactly `lh`, and `--rh` sets it to
> exactly `rh` ([`scripts/bmedits2surf:211-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L211-L217)). Because each assignment
> replaces the list rather than adding to it, passing `--lh --rh` does **not**
> mean "both"; the last one wins (here `rh`). Omit both flags to get both
> hemispheres (the default).

- `--self` vs `--fsaverage` choose the target surface and the output filename
  infix; they are mutually exclusive in effect (the last one on the command
  line wins). With `--self` the intermediate fsaverage re-binarization step is
  skipped.
- `--no-surfs` short-circuits the `mri_vol2surf` calls but still runs the
  volume `mri_binarize` steps, so the `.dat` counts are produced while the
  per-hemisphere surface maps are not.
- `--tmp`/`--tmpdir` implies `--nocleanup` (the directory you supplied is left
  in place) ([`scripts/bmedits2surf:241-246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L241-L246)).

## Typical Use Cases

### Use Case 1: Map one subject's brain-mask edits to fsaverage

```bash
# Default: both hemispheres, output on fsaverage
bmedits2surf --s sub-001
# → surf/{lh,rh}.bmerase.fsa.mgh, {lh,rh}.bmclone.fsa.mgh
#   stats/bm.erase.dat, stats/bm.clone.dat
```

### Use Case 2: Keep the maps on the subject's own surface

```bash
bmedits2surf --s sub-001 --self
# → surf/{lh,rh}.bmerase.mgh, {lh,rh}.bmclone.mgh (subject space)
```

### Use Case 3: Just count edited voxels (no surface maps)

```bash
bmedits2surf --s sub-001 --no-surfs
# → only stats/bm.erase.dat and stats/bm.clone.dat
```

### Use Case 4: Build a group edit-probability map

```bash
# Run per subject, then average the fsaverage overlays across a cohort
foreach s ($subjlist)
  bmedits2surf --s $s
end
mri_concat $SUBJECTS_DIR/*/surf/lh.bmerase.fsa.mgh --mean \
  --o lh.bmerase.prob.mgh
```

The averaged overlay estimates, per fsaverage vertex, the fraction of
subjects that needed a brain-mask erase there.

## Pipeline Context

`bmedits2surf` is a stand-alone QA/auditing tool, run **after** a subject has
been reconstructed and (optionally) edited. It is not part of
[[wiki/pipelines/recon-all|recon-all]] and recon-all never calls it.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (produces
`brainmask.auto.mgz`, `brainmask.mgz`, and the white surfaces) + manual
FreeView brain-mask editing → **bmedits2surf** → **Successor:** group
analysis ([[mri_concat]] to pool, [[wiki/tools/freeview|freeview]] to view
the overlay).

## Gotchas and Caveats

> [!gotcha] brainmask.finalsurfs.mgz edits are not captured
> The help text notes that the comparison does **not** include edits made to
> `brainmask.finalsurfs.mgz` ([`scripts/bmedits2surf:330-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L330-L331)). Only the
> `brainmask.mgz`-vs-`brainmask.auto.mgz` difference is analysed, so
> later-stage skull-strip corrections are invisible to this tool.

> [!gotcha] Any auto-vs-edited difference counts as an "edit"
> The tool cannot tell a manual edit from a re-run that regenerated
> `brainmask.mgz` with different parameters; both appear as differences. If
> `brainmask.mgz` and `brainmask.auto.mgz` diverged for non-editing reasons,
> the maps will mislabel that divergence as editing.

> [!gotcha] Output is binary, not graded
> Vertices are 0/1; the maps say *whether* a location was edited, not by how
> much. Magnitude information lives only in the `.dat` voxel counts.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Unless `--overwrite` is given, `UpdateNeeded`
  compares each output surface map against both input volumes; if every output
  is newer than the inputs the script prints `update not needed` and exits 0
  ([`scripts/bmedits2surf:57-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L57-L71)).
- **Hard stop on subject errors.** It exits with an error if `--s` is missing
  or the subject directory does not exist
  ([`scripts/bmedits2surf:274-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L274-L284)), and aborts (`exit 1`) the moment any
  internal `mri_*` command returns non-zero.
- No automatic conforming or intensity correction is performed; the two mask
  volumes are used exactly as found on disk.

## Known Bugs

- [[00179]] — freshness loop assigns `$UpdateNeeded` each pass instead of OR-accumulating, so only the last overlay decides whether to recompute; stale earlier overlays are silently kept.

## Related Tools

- [[wmedits2surf]] — the white-matter analogue; same machinery, but reads `wm.mgz`, detects erase/fill edits, and samples inward as well as outward along the normal.
- [[mri_concat]] — computes the paired difference of the two mask volumes (and is the natural tool for pooling the fsaverage overlays across subjects).
- [[mri_binarize]] — builds and counts the binary erase/clone masks and re-thresholds the resampled overlays.
- [[mri_vol2surf]] — projects the volume edit masks onto the surface with `--projfrac-max`.
- [[brainmask.mgz]] — the edited input volume (compared against `brainmask.auto.mgz`).
- [[wiki/tools/freeview|freeview]] — where the brain-mask edits are made and where the resulting overlays are viewed.

## Confidence and Gaps

**High confidence:** the complete flag set, the erase/clone detection logic,
the `--projfrac-max 0 2 .3` outward sampling, the default-on fsaverage
targeting, the output filenames (including the help-vs-code stats-filename
discrepancy), and the `UpdateNeeded` skip — all read directly from
[`scripts/bmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf).

> [!gap] Erase value convention
> The script treats an edited voxel equal to `1` as an *erase*. This matches
> FreeSurfer's brain-mask editing convention, but the exact value the FreeView
> recon-edit "erase" brush writes was not re-derived from the GUI source for
> this page; it is inferred from how the script partitions the difference.

## References

- FreeSurfer source: [`scripts/bmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf) (v8.2.0).
- Built-in help: `bmedits2surf --help` (the `BEGINHELP` block, [`scripts/bmedits2surf:317-339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bmedits2surf#L317-L339)).
