---
title: "wmedits2surf"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/wmedits2surf"
families: []                     # standalone edit-tracking script
recon_all_stage: null
related:
  - "[[bmedits2surf]]"
  - "[[mri_binarize]]"
  - "[[mri_vol2surf]]"
  - "[[wm.mgz]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The wm.mgz erase=1 / fill=255 voxel conventions are taken from how the script matches values; not independently re-derived from the FreeView editing GUI."
tags:
  - editing
  - quality-assurance
  - surface-mapping
  - white-matter
---

# wmedits2surf

## Summary

`wmedits2surf` is a tcsh script that detects where a subject's white-matter
segmentation [[wm.mgz]] has been **manually edited** and projects the
locations of those edits onto a cortical surface as binary overlays. It
distinguishes the two white-matter edit operations FreeView offers —
**erase** (delete a voxel from the white-matter mask, value `1`) and **fill**
(add a voxel to the white-matter mask, value `255`) — and writes one binary
surface map per operation per hemisphere, by default resampled to
[[fsaverage]] so that edits from many subjects can be pooled into a group
"edit-likelihood" map. It is the white-matter counterpart of
[[bmedits2surf]] and, like it, is a quality-assurance / edit-auditing utility
that is **not** part of the reconstruction stream.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/wmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf)
- **Binary/script location:** `$FREESURFER_HOME/bin/wmedits2surf`
- **Tools invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L92) (build and count the erase/fill masks, re-threshold the resampled overlays), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L102) (project the volume masks onto the surface), and the FreeSurfer shell utilities `fs_temp_dir`, `UpdateNeeded`, and `sources.csh`.

## Purpose and Context

After the recon-all white-matter segmentation step, the most common manual
correction is editing [[wm.mgz]] in [[wiki/tools/freeview|freeview]]:
**erasing** voxels where the segmentation wrongly included non-white-matter
(producing bumps or handles on the white surface) and **filling** voxels
where it wrongly excluded white matter (producing dents or holes). FreeSurfer
encodes these edits directly in the `wm.mgz` voxel values: a manually erased
voxel is set to `1` and a manually filled voxel is set to `255`, values that
the automatic segmentation does not otherwise produce, so the edits can be
recovered later simply by matching those values.

`wmedits2surf` answers *"where, on the cortical surface, did white-matter
editing happen?"* It matches the erase (`1`) and fill (`255`) voxels in
`wm.mgz`, paints each set onto the white-surface vertices, and (by default)
resamples to [[fsaverage]]. A cohort's fsaverage maps can then be
concatenated and averaged into a **spatial probability map of where
white-matter editing tends to be needed** — useful for QA, training, and
reproducibility studies.

It is run **by hand** after a subject has been reconstructed and edited; it is
not invoked by [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **`--s subject`** — a fully reconstructed FreeSurfer subject under
  `$SUBJECTS_DIR`. The script reads one volume from it:
  - `$SUBJECTS_DIR/<subject>/mri/wm.mgz` — the (possibly edited) white-matter
    segmentation ([`scripts/wmedits2surf:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L53)).
- The white surfaces (`lh.white`, `rh.white`) and the header geometry used by
  `mri_vol2surf --regheader` must already exist for the requested
  hemisphere(s).

### Input Assumptions

> [!assumption] Edits are recovered from wm.mgz voxel values, not from a diff
> Unlike [[bmedits2surf]] (which diffs against an `auto` reference),
> `wmedits2surf` reads only `wm.mgz` and relies on the FreeSurfer editing
> convention that erased voxels hold the value `1` and filled voxels hold the
> value `255`. Any voxel that happens to carry those exact values — for
> whatever reason — is reported as an edit; conversely, an edit that did not
> use those values would be missed.

- **Erase = 1.** Manually erased white-matter voxels are matched as value `1`
  ([`scripts/wmedits2surf:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L92)).
- **Fill = 255.** Manually filled white-matter voxels are matched as value
  `255` ([`scripts/wmedits2surf:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L121)). (Note that `255` is also the value
  the automatic fill assigns; `wmedits2surf` does not separate auto-fill from
  manual-fill — see the gap below.)

## Outputs

### Files Created

By default (`--fsaverage`, the default) maps are resampled to fsaverage and
carry the `.fsa.` infix; with `--self` they stay in the subject's own surface
space and the infix is dropped.

| File | Where | Contents |
|------|-------|----------|
| `lh.wmerase[.fsa].mgh`, `rh.wmerase[.fsa].mgh` | `<subject>/surf/` | binary surface map of vertices near an **erased** white-matter voxel ([`scripts/wmedits2surf:100-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L100-L101)) |
| `lh.wmfill[.fsa].mgh`, `rh.wmfill[.fsa].mgh` | `<subject>/surf/` | binary surface map of vertices near a **filled** white-matter voxel ([`scripts/wmedits2surf:129-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L129-L130)) |
| `wm.erase.dat` | `<subject>/stats/` | one number: count of erased voxels ([`scripts/wmedits2surf:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L91)) |
| `wm.fill.dat` | `<subject>/stats/` | one number: count of filled voxels ([`scripts/wmedits2surf:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L120)) |
| `wmedits2surf.log` | `<subject>/surf/` | run log (every command, build stamp, timing); suppressed/redirected by `--log`/`--nolog` |

### Output Specifications

The surface outputs are single-frame `mgh` overlays, one binary (0/1) value
per vertex of the target surface (the subject's own white surface, or
fsaverage's). When projected to fsaverage the overlay is re-thresholded at
`--min .0001` so that any non-zero resampled value becomes 1
([`scripts/wmedits2surf:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L110), [`scripts/wmedits2surf:139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L139)). The two
`.dat` files are plain ASCII counts.

## Mathematical Foundations

The script is a chain of volume/surface set operations; the two operations of
interest are isolating the edited voxels and turning a volume edit into a
surface label.

**1. Isolating the edited voxels.** Erase and fill masks are obtained by exact
value matching on `wm.mgz`:

$$ M_{\text{erase}} = \mathbb{1}\!\left[\,\texttt{wm}=1\,\right],\qquad
   M_{\text{fill}}  = \mathbb{1}\!\left[\,\texttt{wm}=255\,\right] $$

via [`mri_binarize --match 1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L92) and
[`mri_binarize --match 255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L121), each with `--count` to record the
voxel total.

**2. Volume → surface projection.** Each binary volume mask is sampled onto
the white surface with [`mri_vol2surf … --projfrac-max -1 1 .3 --interp nearest`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L102-L103).

> [!math] `--projfrac-max -1 1 .3` — sampling inward and outward
> For each vertex, `mri_vol2surf` walks **along the surface normal** from a
> fractional cortical-thickness distance of `-1` (one thickness *inward*, into
> the white matter) to `+1` (one thickness *outward*, into cortex) in steps of
> `0.3`, and assigns the vertex the **maximum** value sampled. Because the mask
> is binary, a vertex is set to 1 if *any* sample along that segment hits an
> edited voxel. The inward reach (negative fractions) is what distinguishes
> this from [[bmedits2surf]] (which samples `0 → 2`, purely outward): white-
> matter edits sit at and *inside* the white surface, so the normal must be
> followed inward to catch them.

When the target is fsaverage (`--regheader $subject … --trgsubject fsaverage`)
the per-vertex values are resampled onto the common template and
re-binarized.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/wmedits2surf:169-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L169-L251)). All flags are spelled with a
double dash. Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name under `$SUBJECTS_DIR`. |
| `--fsaverage`<br>`--fsa` | bool | **on** | Resample the edit maps onto [[fsaverage]] (adds the `.fsa.` infix). This is the default. |
| `--self`<br>`--no-fsaverage`<br>`--no-fsa` | bool | off | Keep the maps in the subject's own surface space instead (no `.fsa.` infix). |
| `--lh` | bool | both | Process the left hemisphere only. |
| `--rh` | bool | both | Process the right hemisphere only. |
| `--overwrite` | bool | off | Recompute even if the outputs are newer than `wm.mgz` (otherwise an up-to-date result is skipped — see Guard Rails). |
| `--no-overwrite` | bool | on | Honour the up-to-date check (default). |
| `--no-surfs` | bool | off | Compute only the voxel counts (`.dat` files), skip the surface projection. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use this scratch directory for intermediate masks; implies `--nocleanup`. |
| `--cleanup` | bool | on | Delete the scratch directory at the end (default). |
| `--nocleanup` | bool | off | Keep the scratch directory for inspection. |
| `--log` | string | `<surf>/wmedits2surf.log` | Write the log to this file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` shell tracing. |
| `--help` | bool | — | Print usage plus the `BEGINHELP` block and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--lh`/`--rh` overwrite, not accumulate
> `--lh` sets the hemisphere list to exactly `lh`, and `--rh` sets it to
> exactly `rh` ([`scripts/wmedits2surf:193-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L193-L199)). Because each assignment
> replaces the list rather than adding to it, `--lh --rh` does **not** mean
> "both"; the last one wins. Omit both flags to get both hemispheres (the
> default).

- `--self` vs `--fsaverage` choose the target surface and the output filename
  infix; they are mutually exclusive in effect (the last one on the command
  line wins). With `--self` the intermediate fsaverage re-binarization is
  skipped.
- `--no-surfs` short-circuits the `mri_vol2surf` calls but still runs the
  volume `mri_binarize` steps, so the `.dat` counts are produced while the
  per-hemisphere surface maps are not.
- `--tmp`/`--tmpdir` implies `--nocleanup` ([`scripts/wmedits2surf:224-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L224-L229)).

> [!gotcha] No `brainmask.auto` reference is used
> Where [[bmedits2surf]] needs both `brainmask.mgz` and `brainmask.auto.mgz`,
> `wmedits2surf` reads only `wm.mgz`. There is no "auto" comparison file and
> none is required; the erase/fill information is encoded in the voxel values
> themselves.

## Typical Use Cases

### Use Case 1: Map one subject's white-matter edits to fsaverage

```bash
# Default: both hemispheres, output on fsaverage
wmedits2surf --s sub-001
# → surf/{lh,rh}.wmerase.fsa.mgh, {lh,rh}.wmfill.fsa.mgh
#   stats/wm.erase.dat, stats/wm.fill.dat
```

### Use Case 2: Keep the maps on the subject's own surface

```bash
wmedits2surf --s sub-001 --self
# → surf/{lh,rh}.wmerase.mgh, {lh,rh}.wmfill.mgh (subject space)
```

### Use Case 3: Just count edited voxels (no surface maps)

```bash
wmedits2surf --s sub-001 --no-surfs
# → only stats/wm.erase.dat and stats/wm.fill.dat
```

### Use Case 4: Build a group edit-probability map

```bash
foreach s ($subjlist)
  wmedits2surf --s $s
end
mri_concat $SUBJECTS_DIR/*/surf/lh.wmfill.fsa.mgh --mean \
  --o lh.wmfill.prob.mgh
```

The averaged overlay estimates, per fsaverage vertex, the fraction of
subjects that needed a white-matter fill there.

## Pipeline Context

`wmedits2surf` is a stand-alone QA/auditing tool, run **after** a subject has
been reconstructed and (optionally) edited. It is not part of
[[wiki/pipelines/recon-all|recon-all]] and recon-all never calls it.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (produces `wm.mgz`
and the white surfaces) + manual FreeView white-matter editing →
**wmedits2surf** → **Successor:** group analysis ([[mri_concat]] to pool,
[[wiki/tools/freeview|freeview]] to view the overlay).

## Gotchas and Caveats

> [!gotcha] Help text mislabels the counts as "cloned"
> The `BEGINHELP` block says the first number in each `.dat` file is "the
> number of voxels cloned/edited" ([`scripts/wmedits2surf:318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L318)). "Clone"
> is brain-mask terminology copied from [[bmedits2surf]]; for white matter the
> operations are **erase** and **fill**, and the two files count erased and
> filled voxels respectively.

> [!gotcha] Output is binary, not graded
> Vertices are 0/1; the maps say *whether* a location was edited, not by how
> much. Voxel totals live only in the `.dat` counts.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Unless `--overwrite` is given, `UpdateNeeded`
  compares each output surface map against `wm.mgz`; if every output is newer
  the script prints `update not needed` and exits 0
  ([`scripts/wmedits2surf:56-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L56-L70)).

> [!gotcha] The up-to-date check has a bug that can mis-detect freshness
> In the `UpdateNeeded` loop, `set UpdateNeeded = \`UpdateNeeded $fname $wm\``
> is **assigned** (not OR-accumulated) on each iteration over the four output
> files ([`scripts/wmedits2surf:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L62)), so only the result for the *last*
> file (`rh.wmfill[.fsa].mgh`) actually governs the decision; an out-of-date
> `lh.wmerase` would be missed if `rh.wmfill` happened to be current. Use
> `--overwrite` to force a clean recomputation if in doubt.

- **Hard stop on subject errors.** Exits with an error if `--s` is missing or
  the subject directory does not exist
  ([`scripts/wmedits2surf:257-266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L257-L266)), and aborts (`exit 1`) the moment any
  internal `mri_*` command returns non-zero.
- No conforming or intensity correction is performed; `wm.mgz` is used exactly
  as found on disk.

## Known Bugs

- [[00179]] — freshness loop assigns `$UpdateNeeded` each pass instead of OR-accumulating, so only the last overlay decides whether to recompute; stale earlier overlays are silently kept.

## Related Tools

- [[bmedits2surf]] — the brain-mask analogue; diffs `brainmask.mgz` against `brainmask.auto.mgz`, detects erase/clone edits, and samples purely outward (`0 → 2`).
- [[mri_binarize]] — matches the erase (`1`) and fill (`255`) voxels, counts them, and re-thresholds the resampled overlays.
- [[mri_vol2surf]] — projects the volume edit masks onto the surface with `--projfrac-max -1 1 .3`.
- [[wm.mgz]] — the edited input volume.
- [[wiki/tools/freeview|freeview]] — where the white-matter edits are made and where the overlays are viewed.

## Confidence and Gaps

**High confidence:** the complete flag set, the erase=`1`/fill=`255` value
matching, the `--projfrac-max -1 1 .3` inward+outward sampling, the default-on
fsaverage targeting, the output filenames, the help-vs-code "clone" wording
mismatch, and the `UpdateNeeded`-loop assignment bug — all read directly from
[`scripts/wmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf).

> [!gap] Manual-fill vs. automatic-fill are not distinguished
> Both manual fills and the automatic white-matter fill use value `255`, so
> `--match 255` cannot, on its own, tell a user fill from an algorithm fill.
> Whether `wm.mgz` in a given subject contains auto-`255` regions at the time
> this tool runs (and would therefore inflate `wm.fill.dat`) was not verified
> for this page.

## References

- FreeSurfer source: [`scripts/wmedits2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf) (v8.2.0).
- Built-in help: `wmedits2surf --help` (the `BEGINHELP` block, [`scripts/wmedits2surf:300-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmedits2surf#L300-L321)).
