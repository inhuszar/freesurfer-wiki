---
title: "seg2filled"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/seg2filled"
families: []                     # standalone segmentation-to-surface helper
recon_all_stage: null            # not a direct recon-all stage; called by samseg2recon --fill
related:
  - "[[samseg2recon]]"
  - "[[seg2recon]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_binarize]]"
  - "[[mri_volcluster]]"
  - "[[mri_pretess]]"
  - "[[mri_concat]]"
  - "[[mri_mask]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether a single-hemisphere run (--lh or --rh) correctly writes the output: the else-branch builds the mri_convert command but does not execute it (no `$cmd` line), so a one-hemisphere call appears to skip the final write."
tags:
  - segmentation
  - surface
  - filled
  - samseg
  - recon-all-helper
---

# seg2filled

## Summary

`seg2filled` derives a `filled.mgz`-style white-matter volume directly from an
`aseg`-style segmentation, bypassing the canonical [[wiki/pipelines/recon-all|recon-all]]
volume stream that normally builds it. For each hemisphere it binarizes the
subcortical/white-matter labels into a solid "subcortical mass", keeps the
largest connected component, fills any interior cavities, and runs
[[mri_pretess]] to make the result topologically suitable for tessellation. The
two hemispheres are encoded with the standard `filled` intensities (255 = left,
127 = right) and combined into a single uchar volume. Optionally it can also
tessellate each hemisphere directly into a surface. It was written so a
[[wiki/tools/samseg|samseg]] (or other) segmentation can seed surface placement
without re-running recon-all's WM segmentation.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/seg2filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled)
- **Binary/script location:** `$FREESURFER_HOME/bin/seg2filled`
- **Key helpers invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L114) (mass / mask / cavity binarization and surface generation), [`mri_volcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L124) (connected-component extraction), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L182) (voxelwise sum), [`mri_pretess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L192) (topology pre-conditioning), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L225), and [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L231) (cast to uchar). Also uses the FreeSurfer shell utility `fname2stem`.

## Purpose and Context

In a standard recon-all run the `filled.mgz` (which marks left- and right-
hemisphere white matter with distinct intensities) is the product of a long
chain: WM segmentation → `wm.mgz` → cutting planes → fill. `seg2filled` short-
circuits that chain when you already have a trustworthy subcortical/WM
segmentation — typically from [[wiki/tools/samseg|samseg]], but equally from
SynthSeg, FastSurfer, or a hand-edited `aseg`. It reconstructs the hemispheric
WM mass purely from labels, so the surfaces can be placed without recon-all's
intensity-based WM stream.

It is normally invoked **by [[samseg2recon]]** under its `--fill` option
([`scripts/samseg2recon:411`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L411)), not by the user directly,
and it is **not** a stage of recon-all itself. The in-code header notes the
intent: "use a SAMSEG segmentation to create the filled so [you] don't have to
do it using the recon-all volume stream"
([`scripts/seg2filled:3-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L3-L7)). It can also be driven by a
single `--s subject` argument, which fills in canonical paths
(`aseg.presurf.mgz` → `aseg.filled.mgz`, plus a `?h.orig.aseg.nofix` surface).

## Inputs

### Required Inputs

- **Segmentation** (`--seg`) — an `aseg`-style label volume. Must exist
  ([`scripts/seg2filled:324-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L324-L331)). The script reads specific
  FreeSurfer subcortical/WM label IDs from it (see below).
- **Normalization volume** (`--norm`) — an intensity volume (e.g. `norm.mgz`)
  passed to [[mri_pretess]] as the reference for its topology fix-ups. Must
  exist ([`scripts/seg2filled:333-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L333-L340)).
- **Output** (`--o`) — the `filled.mgz` to write.

Alternatively, **`--s subject`** supplies all three from the subject directory
([`scripts/seg2filled:392-402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L392-L402)): `seg = aseg.presurf.mgz`,
`norm = norm.mgz`, `output = aseg.filled.mgz`, and it additionally writes
`?h.orig.aseg.nofix` surfaces into `surf/`.

### Input Assumptions

> [!assumption] aseg-style labels in FreeSurfer's standard scheme
> The hemisphere masses are built from a **fixed list of label IDs** taken
> straight from the FreeSurfer color LUT — left: `2 4 9 10 11 12 13 26 27 28 29
> 30 31 78 81 (+77)`, right: `41 43 48 49 50 51 52 58 59 60 61 62 63 79 82
> (+77)` ([`scripts/seg2filled:87-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L87-L99)). These are cerebral WM,
> ventricles, caudate/putamen/pallidum/thalamus/accumbens/VentralDC, and WM
> hypointensities (77, unlateralized). Lateral-ventricle CSF, hippocampus,
> amygdala, cerebellum, and the corpus callosum (251–255) are deliberately
> **excluded**. A segmentation that uses a different numbering will produce an
> empty or wrong mass.

The input should be at the resolution at which you want the `filled` (the script
does no conforming of its own; it operates in the segmentation's native grid).
[[mri_pretess]] is given `norm` as the intensity reference, so `norm` and `seg`
must share geometry.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<filled>` (`--o`, default `filled.mgz` / `aseg.filled.mgz` in `--s` mode) | output dir | uchar WM volume: 255 = left hemi, 127 = right hemi |
| `?h.<surfname>` | `--surfdir` (default = output dir) or `surf/` in `--s` mode | per-hemisphere tessellated surface, only if `--surf` is given (or in `--s` mode, where `surfname = orig.aseg.nofix`) |
| `<base>.log` | alongside the output | run log (`base` from `fname2stem` of the output); `--nolog`/`--log` to change |

### Output Specifications

The `filled` volume is cast to **uchar** with scaling disabled
([`mri_convert … -odt uchar --no_scale 1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L231)), matching the
convention expected by recon-all's tessellation. Left hemisphere = intensity
**255**, right hemisphere = **127** ([`scripts/seg2filled:104-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L104-L110)).
Geometry equals the input segmentation. When `--surf` is requested, the surface
is produced by [[mri_binarize]]'s `--surf` marching-cubes tessellation of the
matching hemisphere intensity.

## Mathematical Foundations

The core operation is **connected-component analysis with cavity filling**,
performed per hemisphere:

> [!math] Largest component, then fill interior holes
> 1. **Mass:** binarize the seg over the hemisphere label list →
>    `subcortmass0`.
> 2. **Largest component:** run [[mri_volcluster]] and keep cluster 1 (the
>    biggest connected component, [`mri_binarize --i ocn --match 1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L132)).
>    This discards edge/corner specks off the main mass.
> 3. **Cavity detection:** invert the main component, mask to a dilated brain
>    region (for speed), and cluster the inverse. If more than one inverse
>    cluster exists, the extra clusters are **interior cavities** (holes fully
>    enclosed by WM): the largest inverse cluster (the exterior) is removed and
>    the remaining inverse clusters are added back into the mass
>    ([`scripts/seg2filled:163-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L163-L188)).
> 4. **Pretess:** [[mri_pretess]] removes the remaining tetrahedral/edge
>    configurations that would create handles in the tessellation; the result is
>    re-binarized (pretess perturbs intensities) back to the hemisphere value.

Combining hemispheres is a voxelwise sum
([`mri_concat … --sum`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L210)); any voxel that ended up in **both**
hemispheres (which [[mri_pretess]] can occasionally cause) is dropped by keeping
only voxels whose summed value is exactly 127 or 255
([`mri_binarize --match 127 255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L220) then [[mri_mask]]). The
in-code comment flags this last step as "a little hacky"
([`scripts/seg2filled:215-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L215-L218)).

> [!internal] Topology correction lives in mri_pretess
> The connectivity-rule enforcement that makes the mass tessellation-safe is
> [[mri_pretess]]; `seg2filled` only orchestrates it. The author notes that,
> because of this, "it should not be necessary to run `mri_pretess` on the
> output" again ([`scripts/seg2filled:450-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L450-L453)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/seg2filled:284-385`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L284-L385)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--seg` | string | *(required, or via `--s`)* | Input `aseg`-style segmentation. Must exist. |
| `--norm` | string | *(required, or via `--s`)* | Intensity reference volume for [[mri_pretess]] (e.g. `norm.mgz`). Must exist. |
| `--o` | string | *(required, or via `--s`)* | Output `filled` volume. |
| `--s` | string | — | Subject name: auto-sets seg=`aseg.presurf.mgz`, norm=`norm.mgz`, output=`aseg.filled.mgz`, and writes `?h.orig.aseg.nofix` surfaces. The subject dir must exist. |
| `--surf` | string | off | Also tessellate each hemisphere into `?h.<surfname>` via [[mri_binarize]] `--surf`. |
| `--surfdir` | string | = output dir | Directory for the `--surf` outputs. |
| `--lh` | bool | both hemis | Process the **left** hemisphere only (see gap below). |
| `--rh` | bool | both hemis | Process the **right** hemisphere only (see gap below). |
| `--ndil` | int | `1` | Dilation radius for the speed-up mask used during cavity detection ([`scripts/seg2filled:151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L151)). Larger values widen the search region for cavities. |
| `--cavity` | bool | off | **Testing only:** drop pallidum (13/52) from the label lists to deliberately create a cavity, exercising the fill logic ([`scripts/seg2filled:89-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L89-L94)). |
| `--log` | string | `<base>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging. |
| `--tmp`<br>`--tmpdir` | string | `<outdir>/tmpdir.seg2filled.$$` | Scratch directory; also implies `--nocleanup`. Note the default is under the **output** dir, not `/scratch`, because the run can generate a lot of intermediate volumes. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory at the end. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--lh`/`--rh` change the output path logic, not just the label set
> With both hemispheres (`#hemilist == 2`) the script builds the combined uchar
> `filled` through the concat/mask/convert path
> ([`scripts/seg2filled:206-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L206-L234)). With a single hemisphere it
> takes the `else` branch, which builds — but **does not run** — the final
> [[wiki/tools/mri_convert|mri_convert]] ([`scripts/seg2filled:235-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L235-L237)).
> See [Confidence and Gaps](#confidence-and-gaps); treat `--lh`/`--rh` as
> primarily a testing/inspection mode.

> [!gotcha] `--s` overrides `--seg`/`--norm`/`--o`
> If `--s subject` is given, the canonical subject paths are assigned in
> `check_params` ([`scripts/seg2filled:392-402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L392-L402)) regardless of any
> `--seg`/`--norm`/`--o` you also passed. Use one style or the other.

> [!gotcha] `--cavity` is not for production
> `--cavity` intentionally **removes anatomy** (the pallidum) to manufacture a
> hole and verify the cavity-filling branch. Never use it on real data.

- `--ndil` only affects the cavity-search mask (a speed/coverage trade-off); it
  does not dilate the final WM mass.
- `--surfdir` only matters when `--surf` is set; otherwise it defaults to the
  output directory and is unused.

## Typical Use Cases

### Use Case 1: Build a filled.mgz from a SAMSEG aseg (as samseg2recon does)

```bash
# Inside a subject's mri/ directory, using the samseg-derived aseg + norm.
seg2filled --seg aseg.auto.mgz --norm norm.mgz --o filled.mgz
```

This is exactly the call [[samseg2recon]] issues under `--fill`. The resulting
`filled.mgz` can be tessellated by recon-all without re-deriving `wm.mgz`.

### Use Case 2: Subject-driven run with surface output

```bash
# Reads aseg.presurf.mgz + norm.mgz, writes aseg.filled.mgz and
# surf/?h.orig.aseg.nofix
seg2filled --s subj01
```

### Use Case 3: Filled plus an explicit nofix surface

```bash
seg2filled --seg aseg.mgz --norm norm.mgz --o filled.mgz \
  --surf orig.aseg.nofix --surfdir /path/to/surf
```

## Pipeline Context

`seg2filled` is a **helper** that substitutes for recon-all's WM/fill volume
stream. It is **not** invoked directly by recon-all; instead
[[samseg2recon]] calls it when run with `--fill`
([`scripts/samseg2recon:407-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L407-L430)), and in that same block
`samseg2recon` also creates a placeholder `wm.mgz` (norm masked by filled) so the
downstream topology fixer has an input.

**Predecessor:** an `aseg`-style segmentation + `norm.mgz` (e.g. from
[[samseg2recon]] / [[wiki/tools/samseg|samseg]]) → **seg2filled** → **Successor:**
recon-all tessellation/surface placement (`-autorecon2-samseg` continuing into
the surface stream), which consumes `filled.mgz`.

## Gotchas and Caveats

> [!gotcha] Corpus callosum is excluded from the WM mass
> Labels 251–255 are intentionally **not** in the hemisphere lists
> ([`scripts/seg2filled:84-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L84-L88)). The `filled` is the hemispheric
> WM mass; the CC is handled separately (it is what splits the two hemispheres in
> the canonical fill). Do not expect the CC to appear as filled WM.

> [!gotcha] WM hypointensities (77) are folded into both hemispheres
> Label 77 is appended to **both** the left and right lists
> ([`scripts/seg2filled:98-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L98-L99)) because hypos are not lateralized.
> A hypo voxel can therefore in principle be claimed by both hemispheres; the
> final `--match 127 255` mask removes any voxel that summed to an unexpected
> value ([`scripts/seg2filled:219-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L219-L228)).

> [!gotcha] No conforming — operates in the segmentation's grid
> Unlike [[seg2cc]]/[[seg2recon]], `seg2filled` has no conform-to-min logic. It
> assumes `seg` and `norm` already share the grid you want the `filled` in. Feed
> it volumes that are already in the target space.

## Error Compensation and Guard Rails

- **Edge/corner cleanup for free.** Taking only the largest connected component
  ([`scripts/seg2filled:130-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L130-L135)) discards stray specks of the
  mass that sit on the boundary, which would otherwise create tessellation
  defects.
- **Automatic cavity filling.** Interior holes in the WM mass are detected and
  filled ([`scripts/seg2filled:163-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L163-L188)) so the surface does not
  dip into segmentation holes.
- **Topology pre-conditioning.** [[mri_pretess]] enforces the connectivity rules
  needed for a manifold tessellation; the author states re-running pretess
  downstream should be unnecessary.
- **Double-claimed-voxel removal.** The `--match 127 255` + [[mri_mask]] step
  guards against pretess having pushed a voxel into both hemispheres.
- **Fail-fast.** Every sub-command's `$status` is checked; any failure jumps to
  `error_exit` ([`scripts/seg2filled:117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L117) and following).

## Related Tools

- [[samseg2recon]] — the primary caller (`--fill`); also builds the placeholder `wm.mgz` from the result.
- [[seg2recon]] — sibling script that seeds a recon-all subject from a segmentation (but builds `nu`/`norm`/CC, not the `filled`).
- [[wiki/tools/samseg|samseg]] — typical source of the input segmentation.
- [[mri_volcluster]] — connected-component extraction (mass + cavities).
- [[mri_pretess]] — topology pre-conditioning of the WM mass.
- [[mri_binarize]] — label-list binarization, cavity masking, and `--surf` tessellation.
- [[mri_concat]] / [[mri_mask]] / [[wiki/tools/mri_convert|mri_convert]] — combine hemispheres and cast to uchar.

## Confidence and Gaps

**High confidence:** the per-hemisphere label lists, the largest-component +
cavity-fill algorithm, the 255/127 hemisphere encoding, the uchar cast, the
pretess step, and the full flag set — all read from
[`scripts/seg2filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled). The `--help` output matches the source.

> [!gap] Single-hemisphere (`--lh`/`--rh`) final write
> In the two-hemisphere path the combined `filled` is written by the
> [[wiki/tools/mri_convert|mri_convert]] at [`scripts/seg2filled:231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L231).
> In the single-hemisphere `else` branch
> ([`scripts/seg2filled:235-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L235-L237)) the command is **assigned to
> `$cmd` but never executed** (there is no `$cmd` invocation line as in the
> other branch). As written, a `--lh`-only or `--rh`-only run appears to skip
> writing the final output file. This looks like a defect; treat `--lh`/`--rh`
> as experimental until confirmed with a developer.

## References

- FreeSurfer source: [`scripts/seg2filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled) (v8.2.0).
- Built-in help: `seg2filled --help` (the `BEGINHELP` block, [`scripts/seg2filled:448-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2filled#L448-L453)).
