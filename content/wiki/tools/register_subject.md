---
title: "register_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register_subject"
families: []                     # legacy GCA/atlas registration driver
recon_all_stage: null
related:
  - "[[mri_em_register]]"
  - "[[register_child]]"
  - "[[register_elderly_subject]]"
  - "[[register_subject_flash]]"
  - "[[register_subject_mixed]]"
  - "[[reregister_subject_mixed]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[talairach.lta]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The default GCA atlas (average/young_new_b.gca) is not shipped with FreeSurfer 8.2.0; the script cannot run as-is against a stock install without supplying an atlas."
tags:
  - registration
  - atlas
  - gca
  - legacy
  - talairach
---

# register_subject

## Summary

`register_subject` is a thin legacy driver script that runs
[[mri_em_register]] to compute the linear (affine, 12-DOF) registration of a
subject's brain volume to a Gaussian Classifier Array (**GCA**) atlas, writing
the result as a `talairach.lta` transform. It hard-wires a specific
whole-brain GCA atlas, creates the required output sub-directories under
`$SUBJECTS_DIR/<subj>/mri`, and invokes `mri_em_register` with a fixed set of
options. It is the **canonical member** of a small family of age- and
contrast-specific variants ([[register_child]],
[[register_elderly_subject]], [[register_subject_flash]],
[[register_subject_mixed]], [[reregister_subject_mixed]]) that differ only in
which atlas and parameters they select.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/register_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/register_subject`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L32) (the only external program it calls)

## Purpose and Context

FreeSurfer's whole-brain subcortical segmentation (`aseg`) is driven by an
EM-based registration of the subject to a probabilistic atlas (the GCA).
`register_subject` is the historical driver that performed this atlas
registration step before it was folded directly into
[[wiki/pipelines/recon-all|recon-all]]. It exists so that the EM-registration
step could be launched stand-alone (and re-launched with a different atlas)
during the development of the segmentation pipeline at MGH.

The script does three things ([`scripts/register_subject:21-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L21-L32)):

1. Selects the GCA atlas by setting `setenv GCA $FREESURFER_HOME/average/young_new_b.gca`.
2. Creates the `fsamples`, `norm`, and `transforms` sub-directories under
   `$SUBJECTS_DIR/<subj>/mri`.
3. Runs `mri_em_register` to produce `transforms/talairach.lta`.

> [!gotcha] This is the legacy ancestor of recon-all's EM-registration step
> Modern [[wiki/pipelines/recon-all|recon-all]] performs the equivalent
> registration inline with
> `mri_em_register -uns 3 -mask <mask> nu.mgz ${GCADIR}/RB_all_*.gca transforms/talairach.lta`
> ([`scripts/recon-all:2665-2675`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2665-L2675)),
> using a current atlas (e.g. `RB_all_2019_10_25.talxfm.mni305.gca`) operating
> on `nu.mgz`. `register_subject` operates on the older `orig` volume and the
> `young_new_b.gca` atlas, and is invoked only by the legacy
> [[segment_subject_sc]] driver. Prefer recon-all for new work.

## Inputs

### Required Inputs

- **Subject ID** — the sole positional argument (`$1`,
  [`scripts/register_subject:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L24)).
  The subject must already exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/orig`** — the input volume to be registered
  (passed as the moving image to `mri_em_register`). Conventionally the
  conformed T1 ([[mgz]]/COR).
- **`$SUBJECTS_DIR/<subj>/mri/brain`** — the brain-extracted volume, used as a
  mask (`-mask`) to confine the registration to brain tissue.
- **GCA atlas** — `$FREESURFER_HOME/average/young_new_b.gca`, hard-coded.

### Input Assumptions

> [!assumption] Skull-stripped, intensity-normalisable T1 in subject space
> The script assumes a fully-prepared FreeSurfer subject directory: an `orig`
> volume to register and a `brain` mask alongside it. It runs the registration
> in the subject's native `mri/` geometry; the atlas supplies the target
> Talairach/MNI305 space. No conforming or resampling is done here — that is
> assumed already complete (e.g. by [[segment_subject_sc]] before it calls
> this script).

> [!contradiction] The hard-coded atlas is not shipped with FreeSurfer 8.2.0
> `register_subject` sets `GCA = $FREESURFER_HOME/average/young_new_b.gca`,
> but `young_new_b.gca` is **absent** from the 8.2.0 `average/` directory
> (which ships `RB_all_*.gca`, `talairach_mixed_with_skull.gca`, etc.). The
> script therefore cannot run unmodified against a stock install; you must
> supply the legacy atlas or point `GCA` at a current one. Code is
> authoritative for the *intent*; the missing data file is an artefact of the
> atlas set having been modernised.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `transforms/talairach.lta` | `$SUBJECTS_DIR/<subj>/mri/transforms/` | the linear subject→atlas transform ([[talairach.lta]], LINEAR_VOX_TO_VOX LTA) |
| `fsamples*` | `$SUBJECTS_DIR/<subj>/mri/fsamples/` | transformed GCA control-point samples written by `mri_em_register -fsamples` (one per registration scale) |
| `norm` | `$SUBJECTS_DIR/<subj>/mri/norm/` | intensity-normalised volume written by `mri_em_register -norm` |
| `talairach.lta.log` | `transforms/` | per-iteration log written by `mri_em_register` (base name derived from the output) |

The three sub-directories `fsamples`, `norm`, and `transforms` are created up
front ([`scripts/register_subject:27-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L27-L29)).

### Output Specifications

The transform is an [[lta]] of type `LINEAR_VOX_TO_VOX` mapping the subject's
`orig` voxel grid onto the GCA atlas space. Geometry, data types and the
optimisation are entirely the domain of [[mri_em_register]]; this wrapper adds
no numerical processing. See [[coordinate-systems]] for what the Talairach LTA
represents.

## Mathematical Foundations

None in the script itself — `register_subject` is a pure driver. The maximum
a-posteriori EM registration of the subject intensities to the GCA atlas
(searching over translation, rotation and scale) lives entirely in
`mri_em_register`.

> [!internal] The registration math lives in mri_em_register
> The 9-/12-parameter affine search, the GCA likelihood model, and the
> control-point sampling are implemented in
> [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
> See [[mri_em_register]].

## Configuration Options

`register_subject` takes **no flags** — only a single positional subject-id
argument. Its behaviour is fixed by the hard-coded environment and the literal
`mri_em_register` command line
([`scripts/register_subject:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L32)).

### Fixed `mri_em_register` invocation

| Token | Meaning (resolved against [[mri_em_register]]) |
|-------|------------------------------------------------|
| `-mask $sdir/brain` | mask the input with the brain volume so only brain voxels drive the fit |
| `-p .5` | use the top **50 %** of white-matter points as control points (`ctl_point_pct`; the option string is upper-cased internally, so `-p` ≡ `-P`) |
| `-fsamples $sdir/fsamples` | write the transformed GCA samples to `fsamples/` |
| `-norm $sdir/norm` | intensity-normalise the input and write to `norm/` |
| `$sdir/orig` | moving volume (subject) |
| `$GCA` | target GCA atlas (`young_new_b.gca`) |
| `$sdir/transforms/talairach.lta` | output transform |

### Configuration Interactions

> [!gotcha] The atlas is the only thing that varies across the family
> Every variant in this family sets a different `GCA` (and, for some, different
> `-p`/`-flash` parameters) and then calls `mri_em_register` identically. To
> change behaviour you edit the `setenv GCA …` line, not a flag. See
> [Related Tools](#related-tools) for the per-variant differences.

## Typical Use Cases

### Register a subject to the default (young-adult) atlas

```bash
# orig and brain must already exist under $SUBJECTS_DIR/<subj>/mri
register_subject bert
# → $SUBJECTS_DIR/bert/mri/transforms/talairach.lta
```

### Substitute a current atlas (because young_new_b.gca is no longer shipped)

```bash
setenv GCA $FREESURFER_HOME/average/RB_all_2019_10_25.talxfm.mni305.gca
# then run the mri_em_register line by hand, or edit the script's GCA value
```

## Pipeline Context

`register_subject` is **not** called by modern
[[wiki/pipelines/recon-all|recon-all]]. It is the atlas-registration step of
the legacy MGH segmentation driver [[segment_subject_sc]], which runs it
between white-matter labelling and surface inflation
([`scripts/segment_subject_sc:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L55)):

**Predecessor:** `mri_segment` (white-matter labelling) →
**register_subject** (`mri_em_register` → `talairach.lta`) →
**Successor:** `label_subject` (GCA-based labelling using the transform).

The same `talairach.lta` is the product that recon-all now generates inline via
`mri_em_register` at its **EM Registration** step (autorecon2-equivalent,
[`scripts/recon-all:2654-2676`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2654-L2676)).

## Gotchas and Caveats

> [!gotcha] `-ef` shebang: any failed command aborts immediately
> The script uses `#!/bin/tcsh -ef`, so the first nonzero exit (e.g. a missing
> `orig`, a missing atlas, or a `mri_em_register` failure) terminates the whole
> script without further messages.

> [!gotcha] No argument checking
> The subject id is taken from `$1` with no validation. Running it with no
> arguments still proceeds and `mri_em_register` will fail on the empty paths.

## Error Compensation and Guard Rails

Minimal. The only guard rails are `mkdir -p` for the output sub-directories
(idempotent) and the implicit fail-fast behaviour of `tcsh -ef`. All real
input checking (readability of the atlas, the moving volume, the mask) is
delegated to [[mri_em_register]], which `ErrorExit`s on unreadable inputs.

## Related Tools

- [[mri_em_register]] — the EM atlas-registration engine this script wraps; all options and math live there.
- [[register_child]] — same wrapper, selects the **paediatric** atlas (`talairach_children_b.gca`) and omits `-p`.
- [[register_elderly_subject]] — selects the `mixed.gca` atlas and uses `-p .75` (top 75 % WM control points).
- [[register_subject_flash]] — intended for **multi-echo FLASH** input (passes a FLASH/tissue-parameters flag; see its page for an important defect).
- [[register_subject_mixed]] — selects a mixed-contrast atlas (`mixed_a1_ma.gca` under `$CMA`), no `-p`/`-mask`.
- [[reregister_subject_mixed]] — re-runs the mixed registration starting from the previously **normalised** volume.
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline that performs this registration inline.
- [[lpcregister]] — an unrelated linear (LPC) registration tool in the same `scripts/` directory.

## Confidence and Gaps

**High confidence:** the script is 13 lines of substance; the GCA selection,
the directory creation, and the exact `mri_em_register` command line are read
directly from [`scripts/register_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject),
and the meaning of each `mri_em_register` flag is verified against
[`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).

> [!gap] Provenance of the `young_new_b.gca` atlas
> The young-adult atlas referenced here is not in the 8.2.0 distribution; what
> training population it was built from, and which current atlas best
> reproduces it, is not recoverable from the source tree.

## References

- FreeSurfer source: [`scripts/register_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
- Legacy driver that calls it: [`scripts/segment_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc).
