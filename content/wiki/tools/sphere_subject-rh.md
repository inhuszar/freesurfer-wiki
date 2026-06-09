---
title: "sphere_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/sphere_subject-rh"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[sphere_subject]]"
  - "[[sphere_subject-lh]]"
  - "[[mris_sphere]]"
  - "[[reinflate_subject-rh]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - sphere
  - inflation
  - wrapper
  - right-hemisphere
---

# sphere_subject-rh

## Summary

`sphere_subject-rh` is a thin right-hemisphere wrapper that inflates the
right inflated surface all the way to a topologically correct **sphere**. It
records a provenance note in the subject's `NOTES` file and then runs
[[mris_sphere]] once on the right hemisphere, mapping `surf/rh.inflated` to
`surf/rh.sphere`. It is the mirror image of [[sphere_subject-lh]] and is normally
launched through the [[sphere_subject]] parent so the two hemispheres can run in
parallel.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/sphere_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/sphere_subject-rh`
- **Tool invoked:** [`mris_sphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh#L31)

## Purpose and Context

The spherical map projects the folded cortex onto a unit sphere so that subjects
can be registered to one another or to an atlas by warping their spheres. This
script is the right-hemisphere half of that mapping step. It is functionally the
same operation that [[wiki/pipelines/recon-all|recon-all]] performs in its
`-sphere` stage and is normally invoked through its [[sphere_subject]] parent.

The single positional argument `$1` is the **subject ID** (resolved under
`$SUBJECTS_DIR`).

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`surf/rh.inflated`** — the inflated right-hemisphere surface produced by
  [[mris_inflate]] (see [[surface-format]]); the source passed to
  [[mris_sphere]].

### Input Assumptions

> [!assumption] Topologically corrected, inflated right hemisphere must already exist
> The script assumes `$SUBJECTS_DIR/$1/surf/rh.inflated` exists with corrected
> topology. `mris_sphere` fails if it is missing, and the output is only
> meaningful for a clean two-manifold surface. `$SUBJECTS_DIR` must be set and
> the subject's `scripts/` directory must exist.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `rh.sphere` | `$SUBJECTS_DIR/$1/surf/` | Right hemisphere mapped to a sphere (a [[surface-format]] file with the original topology but spherical vertex coordinates) |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Appends a provenance block: the command line, `whoami`, `date`, and `hostname` ([`scripts/sphere_subject-rh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh#L21-L28)) |

### Output Specifications

`rh.sphere` is a binary FreeSurfer surface file that preserves the vertex count
and triangle connectivity of `rh.inflated`; only the per-vertex coordinates
change (they now lie on a sphere). It is the predecessor of `rh.sphere.reg`,
produced later by the registration step ([[surfreg]] / `mris_register`).

## Mathematical Foundations

The mathematics lives entirely in the invoked binary, not in this wrapper.

> [!internal] Inflation-to-sphere energy minimisation is in `mris_sphere`
> [[mris_sphere]] projects the inflated surface onto a sphere by minimising a
> metric-distortion energy that keeps local areas and distances close to the
> original. See [[mris_sphere]] for the functional.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**. The
[[mris_sphere]] call is hard-coded.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |

The fixed [[mris_sphere]] command is
([`scripts/sphere_subject-rh:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh#L31)):

```bash
mris_sphere -w 0 ../surf/rh.inflated ../surf/rh.sphere
```

`-w 0` sets `write_iterations = 0`, suppressing the periodic
intermediate-surface snapshots `mris_sphere` would otherwise write during
optimisation. Only the final `rh.sphere` is written.

### Configuration Interactions

None — there are no flags to combine. Behaviour is fixed apart from the subject
argument.

## Typical Use Cases

### Re-create only the right spherical map

```bash
# After repairing rh.inflated, regenerate only the right sphere.
sphere_subject-rh bert
```

Most users call the [[sphere_subject]] parent instead, which launches this
script together with [[sphere_subject-lh]].

## Pipeline Context

This script reproduces the right-hemisphere portion of the
[[wiki/pipelines/recon-all|recon-all]] `-sphere` stage. In recon-all the
equivalent command is `mris_sphere -threads N ../surf/?h.inflated
../surf/?h.sphere` ([`scripts/recon-all:4184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4184)); recon-all does **not**
call `sphere_subject-rh` itself — this wrapper is a standalone convenience for
re-running the step by hand.

**Predecessor:** [[mris_inflate]] (writes `rh.inflated`) → **sphere_subject-rh**
(writes `rh.sphere`) → **Successor:** [[surfreg]] / `mris_register` (writes
`rh.sphere.reg`).

## Gotchas and Caveats

> [!gotcha] No overwrite guard
> The script does not check whether `rh.sphere` already exists; re-running it
> overwrites the previous sphere. There is no argument validation either — an
> empty `$1` makes the `pushd` fail.

> [!gotcha] Relative paths require the subject's `scripts/` directory
> The `mris_sphere` arguments are relative to `scripts/`
> (`../surf/rh.inflated`); the script `pushd`es into
> `$SUBJECTS_DIR/$1/scripts` first.

## Error Compensation and Guard Rails

None in the wrapper itself. It does not set `-e`, so a failure of `mris_sphere`
is not propagated as a script-level error. All numerical guard rails belong to
[[mris_sphere]].

## Related Tools

- [[sphere_subject]] — the parent that runs this script together with [[sphere_subject-lh]] in parallel.
- [[sphere_subject-lh]] — the left-hemisphere counterpart (identical except for the hemisphere).
- [[mris_sphere]] — the binary that performs the actual inflation-to-sphere mapping.
- [[mris_inflate]] — produces the `rh.inflated` input.
- [[reinflate_subject-rh]] — the companion helper that regenerates `rh.smoothwm`/`rh.inflated` upstream of this step.
- [[surfreg]] — registers the resulting `rh.sphere` to an atlas, producing `rh.sphere.reg`.

## Confidence and Gaps

**High confidence:** The script is six effective lines; the fixed `mris_sphere`
invocation, the `-w 0` semantics, the `NOTES` provenance write, and the output
file are all read directly from
[`scripts/sphere_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh). No gaps.

## References

- FreeSurfer source: [`scripts/sphere_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-rh) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207 — describes the inflation-to-sphere mapping implemented by `mris_sphere`.
