---
title: "segpons"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segpons"
families: []                     # standalone segmentation utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mni152reg]]"
  - "[[mri_vol2vol]]"
  - "[[mri_binarize]]"
  - "[[mergeseg]]"
  - "[[apas2aseg]]"
  - "[[xcerebralseg]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Behaviour of mergeseg when the incoming pons mask overlaps non-brainstem labels in the source seg (the merge precedence rule) is internal to mergeseg and was not traced; here it is irrelevant because pons is pre-masked to brainstem, but the general rule is unverified."
tags:
  - segmentation
  - pons
  - brainstem
  - atlas
  - mni152
---

# segpons

## Summary

`segpons` produces an **approximate** segmentation of the **pons** and adds it
(as label **174**) to an existing FreeSurfer segmentation volume. It works by
atlas transfer: the pons is pre-labelled in MNI152 2 mm space
(`pons.mni152.2mm.mgz`); `segpons` linearly registers the subject to MNI152 with
[[mni152reg]], maps that pons mask back into the subject's anatomical space with
[[mri_vol2vol]] (nearest-neighbour), intersects it with the **brainstem** label
(16) from the subject's `aseg`, and merges the result into the source
segmentation. The output is `aseg+pons.mgz` (or a variant) — the input
segmentation with a pons label inserted. It is explicitly a "fast-and-dirty"
approximation, intended for situations where a rough pons region is good enough.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/segpons`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons)
- **Binary/script location:** `$FREESURFER_HOME/bin/segpons`
- **Pons template:** `$FREESURFER_HOME/average/pons.mni152.2mm.mgz` (the pons hand-labelled in MNI152 2 mm space)
- **FreeSurfer tools invoked:** [`apas2aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L69) (refine aseg from the surface parcellation, default), [`mni152reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L83) (linear subject↔MNI152 registration), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L90) (map the pons mask into subject space), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L97) (extract the brainstem mask), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L104) (intersect masks and assign label 174), and [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L110) (insert the pons into the source seg). Uses the helpers `fs_temp_dir` and `fname2stem`.

## Purpose and Context

FreeSurfer's standard subcortical segmentation (`aseg`) labels the whole
**brainstem** as a single structure (label 16, "Brain-Stem"); it does not
sub-divide it into midbrain, pons, and medulla. Some applications — e.g. defining
a pons reference region for PET normalization, or a brainstem-subregion ROI —
need at least an approximate **pons** label. `segpons` provides one cheaply
without a dedicated brainstem model.

The strategy is pure atlas propagation. A pons region was drawn once in the
**MNI152 2 mm** template space and stored as `pons.mni152.2mm.mgz`. For a given
subject, `segpons`:

1. obtains a source segmentation (by default a surface-refined aseg from
   [[apas2aseg]]);
2. computes (or reuses) the subject→MNI152 linear registration with
   [[mni152reg]];
3. resamples the MNI152 pons mask into the subject's anatomical grid;
4. **intersects** it with the subject's own brainstem (so the pons can never fall
   outside the FreeSurfer brainstem), labelling the intersection 174; and
5. merges that pons label into the source segmentation.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is a stand-alone
add-on run after a normal reconstruction. A conceptually similar but
finer-grained pons label is also produced inside [[xcerebralseg]] (and the IXI
head GCA), and a much more accurate brainstem-substructure segmentation is
available from the dedicated FreeSurfer brainstem module — see
[Related Tools](#related-tools).

> [!gotcha] This is explicitly approximate
> The help calls it *"a 'fast-and-dirty' way to get an APPROXIMATE segmentation
> of pons"* ([`scripts/segpons:286-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L286-L292)). The pons boundary comes from a
> **linear** MNI152 registration of a single template label, then clipped to the
> brainstem — it is not an individualized model and should not be treated as an
> anatomically precise pons.

## Inputs

### Required Inputs

- **Subject ID** (`--s`) — a reconstructed `$SUBJECTS_DIR/<subj>` directory.
- **Source segmentation** — chosen by mode:
  - default (`--aseg`): a surface-refined aseg generated on the fly by
    [[apas2aseg]] ([`scripts/segpons:67-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L67-L72));
  - `--apas`: the existing `mri/aparc+aseg.mgz`;
  - `--seg <vol>`: any user-supplied segmentation in `mri/`.
  Whichever is used **must contain the brainstem label 16**, because the pons is
  defined as `pons_mask ∩ brainstem`.
- **MNI152 pons template** — `$FREESURFER_HOME/average/pons.mni152.2mm.mgz`
  (overridable with `--pons152`); existence is checked
  ([`scripts/segpons:249-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L249-L252)).

### Input Assumptions

> [!assumption] A standard recon-all subject with a brainstem label
> `segpons` assumes the subject has been processed enough to have an `aseg`
> (and, for the default refined path, the surface parcellation that
> [[apas2aseg]] needs). The source segmentation must contain
> brainstem label 16; if it does not, the intersection is empty and the merged
> output gains no pons. The subject→MNI152 registration is **linear** (12-dof via
> [[mni152reg]]), so accuracy degrades for atypical anatomy.

- If `mri/transforms/reg.mni152.2mm.dat` does not already exist, `segpons` creates
  it by calling [[mni152reg]] ([`scripts/segpons:81-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L81-L87)); otherwise it reuses
  the existing registration.

## Outputs

### Files Created

| File | Where | When | Contents |
|------|-------|------|----------|
| `aseg+pons.mgz` | `$SUBJECTS_DIR/<subj>/mri/` | default (`--aseg`) | refined aseg with pons (label 174) inserted |
| `apas+pons.mgz` | `.../mri/` | `--apas` | `aparc+aseg.mgz` with pons inserted ([`scripts/segpons:171-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L171-L174)) |
| `<stem>+pons.mgz` | `.../mri/` | `--seg <vol>` | the supplied seg with pons inserted; `<stem>` from `fname2stem` ([`scripts/segpons:181-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L181-L187)) |
| `reg.mni152.2mm.dat` | `.../mri/transforms/` | if absent | subject→MNI152 linear registration (created by [[mni152reg]]) |
| `<outvol>.log` | `.../scripts/` | always | command log, named after the output volume ([`scripts/segpons:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L53)) |

The output name is overridable with `--o`; if not set it defaults to
`aseg+pons.mgz` ([`scripts/segpons:239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L239)) (and to the mode-specific names above
when `--apas`/`--seg` are used).

### Output Specifications

- The output is an integer-labelled volume on the **source segmentation's**
  geometry (the `aseg`/`aparc+aseg` grid, conformed 256³ 1 mm — see [[mgz]]),
  identical to the input seg except that voxels in the pons region now carry
  label **174** ("Pons" in `FreeSurferColorLUT.txt`).
- Because the pons is intersected with brainstem before merging, every added 174
  voxel was label 16 in the source — the pons is carved out of the brainstem.

## Mathematical Foundations

The only quantitative step `segpons` performs directly is a **voxelwise mask
intersection with relabelling**, executed by [[fscalc]]:

> [!math] Pons = (brainstem) ∩ (registered MNI152 pons mask), labelled 174
> Let $B(x)$ be the binary brainstem mask (1 where the source seg = 16) and
> $P_0(x)$ the MNI152 pons mask after nearest-neighbour resampling into subject
> space. The pons label volume is
> $$\mathrm{pons}(x) = 174 \cdot \big[\,B(x)\cdot P_0(x) > 0\,\big],$$
> computed as `fscalc B mul P0 mul 174` ([`scripts/segpons:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L104)). Since
> $B,P_0\in\{0,1\}$, the product is 1 only in their intersection, and multiplying
> by the constant 174 sets the pons label there.

Everything else (the registration itself, the resampling, the binarization, the
merge precedence) is delegated:

> [!internal] Registration, resampling, and merging are in the called tools
> The 12-dof MNI152 registration is computed by [[mni152reg]]; the mask is mapped
> with [[mri_vol2vol]] (`--interp nearest`); the brainstem mask is extracted with
> [[mri_binarize]] (`--match 16`); and the pons is inserted into the source seg by
> [[mergeseg]]. See those pages for the underlying algorithms.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/segpons:148-231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L148-L231)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--o` | string | `aseg+pons.mgz` (mode-dependent) | Output volume name, relative to `<subj>/mri/`. Overrides the per-mode default name. |
| `--aseg` | bool | **on** | Use a surface-refined aseg (via [[apas2aseg]]) as the source; output `aseg+pons.mgz` ([`scripts/segpons:166-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L166-L169)). This is the default mode. |
| `--no-refine` | bool | refine on | With `--aseg`, skip the [[apas2aseg]] refinement and read `mri/aseg.mgz` directly ([`scripts/segpons:177-179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L177-L179), [`scripts/segpons:73-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L73-L78)). |
| `--apas` | bool | off | Use `mri/aparc+aseg.mgz` as the source; output `apas+pons.mgz` ([`scripts/segpons:171-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L171-L174)). |
| `--seg` | string | off | Use the named segmentation in `mri/` as the source; output `<stem>+pons.mgz` ([`scripts/segpons:181-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L181-L187)). |
| `--pons152` | string | `$FREESURFER_HOME/average/pons.mni152.2mm.mgz` | Override the MNI152-space pons mask template. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use a specific temporary directory; also disables cleanup. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | on | Remove the temporary directory at the end (default). |
| `--log` | string | `<scripts>/<outvol>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--aseg` / `--apas` / `--seg` are last-wins and re-set the output name
> These three source-selection flags each overwrite `srcsegvol`, `UseASeg`, and
> (for `--apas`/`--seg`) `outvol` ([`scripts/segpons:166-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L166-L187)). They are
> processed in command-line order with no mutual-exclusion check, so the **last
> one wins**, and it also dictates the default output filename. If you also pass
> `--o`, beware ordering: `--o foo.mgz --apas` leaves `outvol=apas+pons.mgz`
> (because `--apas` sets it after `--o`), whereas `--apas --o foo.mgz` yields
> `foo.mgz`.

> [!gotcha] `--no-refine` only matters in `--aseg` mode
> `RefineASeg` is consulted only on the `UseASeg` path
> ([`scripts/segpons:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L67)). With `--apas` or `--seg` (which set `UseASeg=0`),
> refinement is already off and `--no-refine` has no additional effect.

- **Registration reuse.** `segpons` only runs [[mni152reg]] if
  `reg.mni152.2mm.dat` is missing ([`scripts/segpons:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L82)); an existing
  registration is reused as-is (no freshness check). Delete the file to force a
  recompute.

## Typical Use Cases

### 1. Default — add pons to a refined aseg

```bash
# Produces mri/aseg+pons.mgz (label 174 = pons)
segpons --s subj01

# Check the result:
tkmedit subj01 orig.mgz -seg aseg.mgz -aux-seg aseg+pons.mgz -opacity 1
```

The QC command is printed by the script on completion
([`scripts/segpons:132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L132)).

### 2. Add pons to the cortical-parcellation aseg

```bash
segpons --s subj01 --apas        # → mri/apas+pons.mgz
```

### 3. Add pons to your own segmentation

```bash
segpons --s subj01 --seg mycustom.mgz   # → mri/mycustom+pons.mgz
```

### 4. Skip the surface refinement (faster, uses raw aseg)

```bash
segpons --s subj01 --aseg --no-refine
```

## Pipeline Context

`segpons` is a stand-alone, post-reconstruction add-on. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all` (grep of both returns
nothing).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (must have produced an
`aseg`, and for the default mode the surface parcellation that
[[apas2aseg]] consumes) → **segpons** → **Successor:** any
analysis needing a pons ROI — e.g. PET reference-region extraction, or
[[mri_segstats]] over `aseg+pons.mgz`. The subject→MNI152 registration it creates
(`reg.mni152.2mm.dat`) is also reusable by other MNI152-space tools.

## Gotchas and Caveats

> [!gotcha] Pons is clipped to the FreeSurfer brainstem
> By construction the pons label can only appear where the source seg already
> labelled brainstem (16). If FreeSurfer mis-segmented the brainstem, the pons
> inherits that error; and a template pons voxel falling outside the subject's
> brainstem is simply dropped ([`scripts/segpons:97-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L97-L107)).

> [!gotcha] Output name is tied to the source mode
> The default output differs per mode (`aseg+pons.mgz` / `apas+pons.mgz` /
> `<stem>+pons.mgz`). Scripts expecting a fixed name should pass `--o`
> explicitly **after** the mode flag (see the ordering gotcha above).

> [!gotcha] Existing MNI152 registration is reused blindly
> If `reg.mni152.2mm.dat` is stale (e.g. from a different `orig`), `segpons` will
> reuse it rather than recompute. Remove it to force a fresh [[mni152reg]] run.

## Error Compensation and Guard Rails

- **Existence checks.** The subject directory, the source seg (in the
  non-refined/explicit paths), and the MNI152 pons template are all checked before
  use ([`scripts/segpons:74-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L74-L78), [`scripts/segpons:244-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L244-L252)).
- **Registration auto-creation.** A missing `reg.mni152.2mm.dat` is generated
  automatically rather than erroring ([`scripts/segpons:81-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L81-L87)).
- **Fail-fast.** Each [[mni152reg]]/[[mri_vol2vol]]/[[mri_binarize]]/[[fscalc]]/[[mergeseg]]
  call has its exit status checked, jumping to `error_exit` on failure
  ([`scripts/segpons:72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L72), [`scripts/segpons:94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L94), [`scripts/segpons:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L100), [`scripts/segpons:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L107), [`scripts/segpons:113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L113)).
- The intersection with brainstem is itself a guard rail: it prevents the linear
  atlas registration from placing pons outside plausible anatomy.

## Related Tools

- [[mni152reg]] — computes the subject↔MNI152 linear registration `segpons` depends on.
- [[mri_vol2vol]] — maps the MNI152 pons template into subject space (nearest-neighbour).
- [[mri_binarize]] — extracts the brainstem (label 16) mask used to clip the pons.
- [[mri_segstats]] — typical downstream consumer (pons volume/intensity from `aseg+pons.mgz`).
- [[xcerebralseg]] — also produces a pons label (174) and a related "PonsBellyArea" (267) via the IXI head GCA / samseg; a different route to a pons region within a whole-head seg.
- [[apas2aseg]] — builds the surface-refined aseg used as the default source.
- [[mergeseg]] — inserts the pons label into the source segmentation.
- `fscalc` *(no wiki page yet)* — performs the mask intersection / relabelling.
- The dedicated FreeSurfer **brainstem-substructures** module (`segmentBS`/`mri_segment_brainstem`) — a model-based, far more accurate alternative for midbrain/pons/medulla/SCP; prefer it when accuracy matters.

## Confidence and Gaps

**High confidence:** complete flag set, the three source modes and their output
names, the registration-reuse logic, the exact intersection arithmetic (`fscalc B
mul P0 mul 174`), the label number (174), and the clip-to-brainstem behaviour —
all read directly from
[`scripts/segpons`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons).

> [!gap] `--thresh` is set but unused
> The script defines `set thresh = 10` ([`scripts/segpons:8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L8)) but no code path
> or flag ever reads it; it appears to be vestigial. There is no user-facing
> threshold control in this version.

> [!gap] mergeseg overlap precedence
> The general rule [[mergeseg]] uses when the merged label overlaps existing
> non-target labels is internal to that tool and was not traced. It is moot here
> because the pons is pre-clipped to brainstem, but it would matter if a future
> caller merged a non-masked label.

## References

- FreeSurfer source: [`scripts/segpons`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons) (v8.2.0).
- Built-in help: `segpons --help` (the `BEGINHELP` block, [`scripts/segpons:284-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L284-L292)).
- Pons template: `$FREESURFER_HOME/average/pons.mni152.2mm.mgz`.
- Label definition: 174 = "Pons" in `$FREESURFER_HOME/FreeSurferColorLUT.txt`.
