---
title: "segment_subject_sc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject_sc"
families: []                     # legacy white-matter/tissue segmentation driver variant
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[mri_em_register]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_label]]"
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[mri_fill]]"
  - "[[inflate_subject]]"
  - "[[talairach]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "register_subject sets the GCA atlas via $GCA but does not export it before calling mri_em_register; whether $GCA is inherited from the environment at run time (so the registration uses young_new_b.gca) is not fully determinable from the script alone."
tags:
  - segmentation
  - white-matter
  - subcortical
  - aseg
  - gca
  - legacy
  - driver-script
---

# segment_subject_sc

## Summary

`segment_subject_sc` is the **subcortical** (`sc`) variant of the
[[segment_subject]] driver. On top of the standard white-matter sequence —
Talairach → intensity-normalise → watershed skull-strip → white-matter label —
it adds the full **automatic subcortical labelling** chain (the `aseg`
pathway): GCA-atlas linear registration (`register_subject` → [[mri_em_register]]),
non-linear registration + atlas normalisation + voxel labelling
(`label_subject` → [[mri_ca_register]] / [[mri_ca_normalize]] / [[mri_ca_label]]),
and then a **segmentation-aware** hemisphere fill and inflation
(`inflate_subject_sc`, which feeds the resulting `aseg` to [[mri_fill]]). It
takes one argument, the subject ID (`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject_sc`
- **FreeSurfer tools it invokes:** [`talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L42) ([[talairach]]), [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L45) ([[mri_normalize]]), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L51) ([[mri_watershed]]), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L54) ([[mri_segment]]), [`register_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L55) (→ [[mri_em_register]]), [`label_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L56) (→ [[mri_em_register]] / [[mri_ca_normalize]] / [[mri_ca_register]] / [[mri_ca_label]]), and [`inflate_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L57) (→ [[mri_fill]] `-segmentation`).

## Purpose and Context

The plain [[segment_subject]] family stops at cerebral white matter and cortical
surfaces; it produces no subcortical segmentation. `segment_subject_sc` extends
the driver to produce a full subcortical labelling (`mri/aseg`) using
FreeSurfer's GCA / computational-anatomy tools, then uses that segmentation to
improve the hemisphere fill before surface inflation. In effect it is the
legacy single-script analogue of what the modern
[[wiki/pipelines/recon-all|recon-all]] `-autorecon2` subcortical stage does with
[[mri_ca_register]] + [[mri_ca_label]]. The driver itself is standalone and not
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all` in v8.2.0; see
[[segment_subject]] for the shared skeleton.

## What This Variant Changes (relative to `segment_subject`)

| Aspect | `segment_subject` | `segment_subject_sc` |
|--------|-------------------|----------------------|
| Shebang | `#!/bin/tcsh -f` | `#!/bin/tcsh -ef` (**stops on error**) |
| `brain.dat` copy | unconditional | guarded by `if (-e …)` |
| Working dirs | tmp, T1, wm, filled, brain, surf | **+ `mri/transforms`, `mri/aseg`, `mri/fsamples`** ([`:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L32)) |
| Talairach / normalise / watershed / segment | identical | identical |
| **Subcortical registration** | none | **`register_subject $1`** ([[mri_em_register]] to GCA) |
| **Subcortical labelling** | none | **`label_subject $1`** ([[mri_ca_register]] + [[mri_ca_normalize]] + [[mri_ca_label]] → `aseg`) |
| **Inflation** | `inflate_subject` (plain [[mri_fill]]) | **`inflate_subject_sc`** ([[mri_fill]] `-segmentation ../mri/aseg`) |

The three added stages, in order:

1. **`register_subject`** — masks with `brain` and runs
   `mri_em_register -p .5 … orig $GCA transforms/talairach.lta`, producing a
   linear atlas alignment ([`scripts/register_subject:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject#L32)).
2. **`label_subject`** — runs (NU-correcting first if needed) the chain
   `mri_em_register` → `mri_ca_normalize` → `mri_ca_register` (non-linear,
   `talairach.m3z`) → `mri_ca_label`, writing `mri/aseg.mgz`
   ([`scripts/label_subject:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L60-L63)).
3. **`inflate_subject_sc`** — like `inflate_subject` but passes the segmentation
   to fill: `mri_fill -segmentation ../mri/aseg ../mri/wm ../mri/filled`
   ([`scripts/inflate_subject_sc:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L30)),
   so the hemisphere cut/fill is guided by the subcortical labels.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — subject under `$SUBJECTS_DIR` with `mri/orig`
  populated in COR- format.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — watershed parameters,
  copied if present.
- **GCA atlas** — required by `register_subject`/`label_subject` (via the
  `$GCA` environment variable; `register_subject` sets it to
  `young_new_b.gca`). The non-linear stage uses [[mri_ca_register]].

### Input Assumptions

> [!assumption] Old-style COR- tree plus GCA atlas for subcortical labelling
> Same base assumption as [[segment_subject]] (`mri/orig` in COR- format,
> T1 contrast). Additionally, the subcortical stages assume the GCA atlas
> (`young_new_b.gca`) and the `mri_ca_*` / `mri_em_register` binaries are
> available, and that `label_subject` can NU-correct (`nu_correct`, MINC) the
> input if `mri/nu` is absent.

## Outputs

Everything [[segment_subject]] produces, **plus** the subcortical-labelling
products. All paths relative to `$SUBJECTS_DIR/<subject>/`.

| File / directory | Created by | Contents |
|------------------|-----------|----------|
| `mri/transforms/talairach.xfm` | [[talairach]] | linear Talairach transform |
| `mri/transforms/talairach.lta` | `register_subject` ([[mri_em_register]]) | linear GCA alignment |
| `mri/transforms/talairach.m3z` | `label_subject` ([[mri_ca_register]]) | non-linear (morph) atlas registration |
| `mri/norm.mgz` | `label_subject` ([[mri_ca_normalize]]) | atlas-normalised intensity volume |
| `mri/nu(.mgz)` | `label_subject` (`nu_correct`, if needed) | non-uniformity-corrected volume |
| `mri/aseg.mgz` | `label_subject` ([[mri_ca_label]]) | **automatic subcortical segmentation** |
| `mri/fsamples`, `mri/T1`, `mri/brain`, `mri/wm` | various | as in [[segment_subject]] |
| `mri/filled/` | `inflate_subject_sc` ([[mri_fill]] `-segmentation`) | segmentation-guided hemisphere fill |
| `surf/{lh,rh}.*` | `inflate_subject_sc` | tessellated / inflated cortical surfaces |

> [!gotcha] Mixed COR- and `.mgz` outputs
> The white-matter spine still writes legacy COR- volumes (`mri/T1`,
> `mri/brain`, `mri/wm`), but the subcortical stages write modern single-file
> `.mgz` volumes (`aseg.mgz`, `norm.mgz`, `talairach.m3z`). `label_subject`
> contains explicit `if (-e …mgz)` branches to cope with either layout for its
> inputs ([`scripts/label_subject:32-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L32-L42)).

## Mathematical Foundations

The driver does no computation. The subcortical stages add the GCA /
computational-anatomy math absent from [[segment_subject]]:

> [!internal] GCA registration, normalisation, and labelling
> Linear EM registration to the GCA atlas is [[mri_em_register]]; non-linear
> morph is [[mri_ca_register]] (writes `talairach.m3z`); atlas-driven intensity
> normalisation is [[mri_ca_normalize]]; Bayesian voxel labelling against the
> atlas is [[mri_ca_label]] (writes `aseg.mgz`). See those pages for the
> probabilistic-atlas model. The white-matter spine's math is unchanged from
> [[segment_subject]].

## Configuration Options

No option flags. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Subject directory under `$SUBJECTS_DIR`. Forwarded to every sub-step (`talairach`, `register_subject`, `label_subject`, `inflate_subject_sc`, …). No `--help`/`--version`. |

### Configuration Interactions

None at the driver level — no flags. The internal dependency worth noting is
ordering: `inflate_subject_sc` consumes `mri/aseg`, so `label_subject` (which
creates it) **must** run first; the script enforces this by sequence, and under
`-ef` a failure in `register_subject`/`label_subject` aborts before inflation.

> [!gotcha] `$GCA` is set inside `register_subject`/`label_subject`, not exported here
> `segment_subject_sc` does not set `$GCA`; `register_subject` sets
> `setenv GCA …/young_new_b.gca` for its own run, and `label_subject` relies on
> `$GCA` being defined in the environment when it reaches `mri_em_register`
> ([`scripts/label_subject:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L60)).
> If `$GCA` is not exported into `label_subject`'s environment, that step can
> fail; the safe invocation sets `GCA` before calling the driver.

## Typical Use Cases

### Use Case 1: White matter **and** subcortical segmentation in one pass

```bash
setenv SUBJECTS_DIR /space/data/subjects
# (ensure the GCA atlas is available to the subcortical stages)
segment_subject_sc bert
# → mri/wm (white matter), mri/aseg.mgz (subcortical), segmentation-guided
#   mri/filled and surf/{lh,rh}.* surfaces.
```

Use this instead of [[segment_subject]] when you also need an `aseg` subcortical
segmentation and a fill that respects it.

## Pipeline Context

Standalone legacy driver; not invoked by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all` in v8.2.0. It bundles, for one subject, the white-matter stream of
[[segment_subject]] **and** the subcortical-labelling stream that in modern
FreeSurfer lives in the `-autorecon2` portion of
[[wiki/pipelines/recon-all|recon-all]] ([[mri_ca_register]] + [[mri_ca_label]]).

**Predecessor:** anatomical in `mri/orig` → **segment_subject_sc** →
**Successor:** `aseg.mgz` and the cortical surfaces under `surf/`, consumed by
later surface/statistics tools.

## Gotchas and Caveats

> [!gotcha] Much heavier than the other variants
> Unlike the trivial `_notal*`/`_talmgh`/`_old_skull_strip` variants (which swap
> a single step), `segment_subject_sc` runs three additional, computationally
> expensive stages ([[mri_em_register]], [[mri_ca_register]], [[mri_ca_label]],
> plus NU correction). Expect a substantially longer runtime.

> [!gotcha] Segmentation-aware fill changes the surfaces
> Because `inflate_subject_sc` passes `-segmentation ../mri/aseg` to
> [[mri_fill]], the hemisphere split and filled volume differ from the plain
> `inflate_subject` used by every other variant. The resulting `surf/` surfaces
> are therefore not byte-identical to those from [[segment_subject]] even when
> the white-matter `wm` volume is the same.

## Error Compensation and Guard Rails

- Creates the extra `mri/transforms`, `mri/aseg`, `mri/fsamples` directories up
  front ([`:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L32)).
- `label_subject` **auto-runs `nu_correct`** if `mri/nu` is missing, then cleans
  up its MINC scratch files ([`scripts/label_subject:46-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L46-L59)) —
  a guard rail absent from the plain driver.
- `label_subject` selects COR- vs `.mgz` inputs automatically via existence
  tests.
- Runs under `-ef`: any failing stage aborts the whole driver (so a failed
  atlas registration will not silently proceed to mislabelling).

## Related Tools

- [[segment_subject]] — the canonical white-matter-only driver this extends.
- [[mri_em_register]] — linear GCA registration (`register_subject`, and the first step of `label_subject`).
- [[mri_ca_register]] — non-linear atlas morph (`talairach.m3z`).
- [[mri_ca_normalize]] — atlas-driven intensity normalisation (`norm.mgz`).
- [[mri_ca_label]] — Bayesian subcortical voxel labelling (`aseg.mgz`).
- [[mri_fill]] — hemisphere fill; here run segmentation-aware via `inflate_subject_sc`.
- [[mri_normalize]], [[mri_watershed]], [[mri_segment]], [[talairach]] — the shared white-matter spine.

## Confidence and Gaps

**High confidence:** the added working directories, the `register_subject` →
`label_subject` → `inflate_subject_sc` sequence, and the use of the
segmentation-aware fill — all read directly from
[`scripts/segment_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc)
and cross-checked against `scripts/register_subject`, `scripts/label_subject`,
and `scripts/inflate_subject_sc`.

> [!gap] `$GCA` propagation into `label_subject`
> `register_subject` sets `$GCA` only within its own process; `label_subject`
> reads `$GCA` from the environment. Whether the intended `young_new_b.gca` is
> in scope when `label_subject` runs depends on the caller's environment and is
> not guaranteed by the script itself.

## References

- FreeSurfer source: [`scripts/segment_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc) (v8.2.0).
- Sub-step scripts: [`scripts/register_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject), [`scripts/label_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject), [`scripts/inflate_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc).
- Base driver: [[segment_subject]]; atlas tools: [[mri_em_register]], [[mri_ca_register]], [[mri_ca_normalize]], [[mri_ca_label]].
