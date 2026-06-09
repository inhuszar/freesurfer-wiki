---
title: "morph_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_subject-lh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_subject]]"
  - "[[morph_subject-rh]]"
  - "[[morph_only_subject-lh]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[map_central_sulcus]]"
  - "[[morph_rgb-lh]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "map_central_sulcus now defers to `recon-all -s <subj> -hemi <hemi> -avglabels`; the historical mris_spherical_average central-sulcus mapping it replaced is commented out and not exercised here."
  - "The dead post-`exit 0` mri-structvits block is documented as inert; whether it was ever the live tables path is not confirmable from this script alone."
tags:
  - surface
  - registration
  - morphometry
  - spherical
  - legacy
---

# morph_subject-lh

## Summary

`morph_subject-lh` is the **left-hemisphere worker** of the legacy
`morph_subject` morphometry pipeline. Despite the `-lh` suffix it is not a thin
hemisphere wrapper: it runs the full surface-morphing sequence for one subject's
left hemisphere — inflate-to-sphere (`mris_sphere`), spherical registration to
the left-hemisphere average template, a second *reversed* registration against
the right-hemisphere template, and a central-sulcus label mapping
(`map_central_sulcus`). It is invoked once per hemisphere by the canonical
driver [[morph_subject]] (which also calls [[morph_subject-rh]]). It writes its
products into the subject's `surf/` directory and appends a provenance stamp to
the subject `NOTES` file.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on the first error
  and on use of an unset variable)
- **Source file:** [`scripts/morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_subject-lh`
- **FreeSurfer tools invoked:**
  [`mris_sphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L59),
  [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L62-L65)
  (twice), and
  [`map_central_sulcus`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L80).

## Purpose and Context

This script belongs to a **legacy morphometry helper family** that predates the
fully integrated surface stream of modern [[wiki/pipelines/recon-all|recon-all]].
Its job is to take an already-reconstructed cortical surface (specifically the
inflated surface and curvature/sulc maps produced earlier in reconstruction) and
register it into the FreeSurfer spherical atlas so that per-vertex morphometry
can be compared across subjects. In the current FreeSurfer (v8.2.0) the
equivalent work is performed inside `recon-all` (the `-sphere`,
`-surfreg`/`-jacobian_white` and label-mapping stages); `morph_subject-lh`
survives as a stand-alone, hand-run path to (re)build only the spherical
registration for one hemisphere.

It is **not called by `recon-all`** (no reference exists in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)).
It is reached only through its own family: the driver [[morph_subject]] and the
cluster-submission wrapper `morph_subject_on_seychelles` (which `pbsubmit`s the
`-lh` and `-rh` workers separately). `make_average_subject` and
`make_average_surface`/`make_average_volume` mention `morph_subject` in their
"SEE ALSO" help text but do **not** invoke it.

> [!gotcha] Despite the name, this is the real worker — not a wrapper
> The hemisphere is fixed at the top with `set hemi = lh`
> ([`scripts/morph_subject-lh:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L24)),
> but everything else in the script is substantive pipeline logic. The
> right-hemisphere twin [[morph_subject-rh]] is byte-for-byte identical except
> for that one line.

## Inputs

### Required Inputs

- **Subject ID** — the single positional argument (`$1`). The script requires
  exactly one argument
  ([`scripts/morph_subject-lh:26-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L26-L30))
  and resolves it against `$SUBJECTS_DIR`.
- **An existing subject directory** `$SUBJECTS_DIR/<subjid>`, checked for
  existence
  ([`scripts/morph_subject-lh:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L32-L36)).
- **`surf/lh.inflated`** — the inflated left-hemisphere surface; the input to
  `mris_sphere`.
- **`surf/lh.sulc`** and curvature data — `mris_register` is run with `-curv`,
  so it aligns folding patterns using the curvature/sulc geometry of the surface.
- **Atlas templates** under `$FREESURFER_HOME/average/`: `lh.average.tif` and
  `rh.average.tif` (the latter for the reversed registration).

### Input Assumptions

> [!assumption] A reconstructed surface up to the inflated stage must already exist
> The script begins at `mris_sphere ../surf/lh.inflated …`
> ([`scripts/morph_subject-lh:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L59)),
> so it assumes `recon-all` (or equivalent) has already produced
> `lh.inflated` and the associated `lh.sulc`/curvature. There is **no check** that
> these files exist; if `lh.inflated` is missing, `mris_sphere` fails and the
> `-ef` shell aborts the run.

- Required environment: `$SUBJECTS_DIR` (subject root) and `$FREESURFER_HOME`
  (atlas templates). Neither is validated; an unset `$FREESURFER_HOME` would make
  the template path resolve incorrectly.
- The script `pushd`es into `$SUBJECTS_DIR/<subjid>/scripts` and refers to
  surfaces via the relative path `../surf/…`, so it implicitly assumes the
  standard subject directory layout.

## Outputs

### Files Created

All surface outputs land in `$SUBJECTS_DIR/<subjid>/surf/`:

| File | Created by | Contents |
|------|-----------|----------|
| `lh.sphere` | `mris_sphere` ([`:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L59)) | the inflated surface mapped to a sphere (minimal-distortion spherical embedding) |
| `lh.sphere.reg` | `mris_register` ([`:62-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L62-L65)) | the sphere warped into register with the **left** average atlas (`lh.average.tif`) |
| `lh.rh.sphere.reg` | `mris_register -reverse` ([`:68-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L68-L71)) | the same sphere registered to the **right** atlas (`rh.average.tif`) with the hemisphere reversed — used for cross-hemisphere / left-right symmetry studies |
| `lh-*` central-sulcus labels | `map_central_sulcus` → `recon-all … -avglabels` | atlas central-sulcus label mapped onto the subject (see [[map_central_sulcus]]) |

The script also creates `$SUBJECTS_DIR/<subjid>/scripts/` if absent
([`scripts/morph_subject-lh:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L49))
and appends a provenance block (command line, version, user, date, host) to
`$SUBJECTS_DIR/<subjid>/NOTES`
([`scripts/morph_subject-lh:40-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L40-L47)).

### Output Specifications

`lh.sphere`, `lh.sphere.reg`, and `lh.rh.sphere.reg` are FreeSurfer surface
geometry files (see [[surface-format]]): topologically spherical meshes with the
same vertex count and connectivity as `lh.inflated`, where the registered
versions carry per-vertex spherical coordinates aligned to the atlas. See
[[mris_register]] for the registration coordinate model.

## Mathematical Foundations

> [!internal] All numerics live in `mris_sphere` and `mris_register`
> `morph_subject-lh` performs no computation of its own — it is a sequence of
> tool calls. The spherical inflation energy is solved by
> [[mris_sphere]]; the folding-pattern alignment (a spherical, curvature-driven
> diffeomorphic registration to a probabilistic atlas) is solved by
> [[mris_register]]. Consult those pages for the energy functionals and the
> spherical-atlas formulation.

The only design choices visible in *this* script are: registration is driven by
curvature (`-curv`), iteration write-out is disabled (`-w 0`, no intermediate
snapshots), and the second registration runs the atlas in reverse (`-reverse`)
to align the left hemisphere to the right template.

## Configuration Options

### Complete Flag Reference

`morph_subject-lh` takes **no option flags** — only a single positional subject
ID. The hemisphere is hard-coded.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`. Exactly one argument is required; any other count prints usage and exits 1 ([`scripts/morph_subject-lh:26-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L26-L30)). |

The fixed arguments it passes to its sub-tools are: `mris_sphere -w 0`;
`mris_register -w 0 -curv` (forward) and `mris_register -w 0 -curv -reverse`
(reverse).

### Configuration Interactions

There are no user-facing flag interactions (no flags). The internal interaction
worth knowing is the **reverse registration's hard-coded right template**:

> [!gotcha] The reverse step always uses `rh.average.tif`, even in the lh script
> The forward registration uses `$hemi.average.tif` (= `lh.average.tif`), but the
> reverse registration is hard-coded to `$FREESURFER_HOME/average/rh.average.tif`
> ([`scripts/morph_subject-lh:68-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L68-L71)),
> not `$hemi.average.tif`. This is intentional: `lh.rh.sphere.reg` registers the
> left hemisphere against the *right* atlas for left-right symmetry analysis. The
> right-hemisphere twin [[morph_subject-rh]] contains the identical line, so on
> the right side the reverse step is `rh → rh`, which is effectively a second
> same-template registration.

## Typical Use Cases

### Use Case 1: Driven for both hemispheres (normal path)

```bash
# Do not run -lh directly; the canonical driver runs both hemispheres:
morph_subject bert
```

`morph_subject` validates the subject and then calls `morph_subject-lh bert`
followed by `morph_subject-rh bert`.

### Use Case 2: Re-build only the left spherical registration

```bash
# After a surface edit, regenerate just the left hemisphere's sphere + registration
export SUBJECTS_DIR=/data/subjects
morph_subject-lh bert
```

This is the reason to call `-lh` on its own: to redo one hemisphere without
touching the other.

## Pipeline Context

`morph_subject-lh` is a leaf of the legacy `morph_subject` family and is **not**
part of the `recon-all` stream.

**Predecessor:** [[morph_subject]] (driver) → **This tool** →
**internally:** [[mris_sphere]] → [[mris_register]] (×2) →
[[map_central_sulcus]].

In modern FreeSurfer the work it does is folded into
[[wiki/pipelines/recon-all|recon-all]]'s own spherical-registration stages; this
script is the manual, single-hemisphere equivalent. The optional rendering step
[[morph_rgb-lh]] (commented out at
[`scripts/morph_subject-lh:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L74))
was historically run afterwards to produce RGB snapshots of the registered
surface.

## Gotchas and Caveats

> [!gotcha] `mris_sphere` always re-runs — no skip-if-exists guard is active
> An `if (-e …/lh.sphere == 0)` guard around `mris_sphere` is present but
> **commented out** ([`scripts/morph_subject-lh:52-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L52-L54)),
> so `lh.sphere` is regenerated unconditionally on every run — even if it already
> exists. If you only need to (re)register an existing sphere, use the lighter
> [[morph_only_subject-lh]], which skips `mris_sphere`.

> [!gotcha] Code after `exit 0` is dead
> Everything below
> [`scripts/morph_subject-lh:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L87)
> (the `#--- Ignore ---` block that would build `svit` structure vectors via
> `mri-structvits`) never executes — it sits after `exit 0`. That table-building
> work is instead provided by the separate [[morph_tables-lh]] script.

> [!gotcha] `-ef` makes the whole run brittle
> The shebang `#!/bin/tcsh -ef` aborts on the first non-zero exit **and** on any
> unset variable. A missing input surface, an unset `$FREESURFER_HOME`, or a
> single failed sub-tool stops the script immediately with no cleanup.

## Error Compensation and Guard Rails

- **Argument-count check:** exactly one argument or it prints usage and exits 1
  ([`scripts/morph_subject-lh:26-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L26-L30)).
- **Subject-directory existence check** before doing any work
  ([`scripts/morph_subject-lh:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L32-L36)).
- **`mkdir -p scripts`** so the working directory always exists
  ([`scripts/morph_subject-lh:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L49)).
- **No input-surface existence check** — missing `lh.inflated`/`lh.sulc` is
  caught only when a sub-tool fails (then `-ef` aborts).
- **Timing report:** prints start/end timestamps around the work
  ([`scripts/morph_subject-lh:56,82-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L82-L83)).

## Related Tools

- [[morph_subject]] — the canonical driver that runs this script and its rh twin.
- [[morph_subject-rh]] — the right-hemisphere twin (identical except `hemi=rh`).
- [[morph_only_subject-lh]] — the lighter variant that **skips** `mris_sphere`
  and only registers an existing sphere.
- [[mris_sphere]] — builds `lh.sphere` from `lh.inflated`.
- [[mris_register]] — performs the curvature-driven spherical atlas registration.
- [[map_central_sulcus]] — maps the atlas central-sulcus label onto the subject
  (now via `recon-all -avglabels`).
- [[morph_rgb-lh]] — optional RGB rendering of the registered surface
  (historically chained after this step; currently commented out).

## Confidence and Gaps

**High confidence:** the call sequence, the exact sub-tool command lines, the
hard-coded reverse template, the dead skip-guard and post-`exit 0` block, and
the lack of input validation — all read directly from
[`scripts/morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh).

> [!gap] Central-sulcus mapping is delegated
> `map_central_sulcus` now simply calls `recon-all -s <subj> -hemi <hemi>
> -avglabels`; the original `mris_spherical_average` label-mapping it replaced is
> commented out. The exact set of label files produced therefore depends on the
> `-avglabels` stage of `recon-all`, documented on [[map_central_sulcus]].

## References

- FreeSurfer source: [`scripts/morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh) (v8.2.0).
- Driver: [`scripts/morph_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject).
- Surface registration method: Fischl, Sereno, Tootell & Dale, "High-resolution
  intersubject averaging and a coordinate system for the cortical surface,"
  *Human Brain Mapping* 8(4):272-284, 1999 — the algorithm behind
  [[mris_register]].
