---
title: "sphere_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/sphere_subject-lh"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[sphere_subject]]"
  - "[[sphere_subject-rh]]"
  - "[[mris_sphere]]"
  - "[[reinflate_subject-lh]]"
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
  - left-hemisphere
---

# sphere_subject-lh

## Summary

`sphere_subject-lh` is a thin left-hemisphere wrapper that inflates the
left inflated surface all the way to a topologically correct **sphere**. It
records a provenance note in the subject's `NOTES` file and then runs
[[mris_sphere]] once on the left hemisphere, mapping `surf/lh.inflated` to
`surf/lh.sphere`. It exists so that the left and right spherical mappings can be
launched independently (and, via the [[sphere_subject]] parent, in parallel).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/sphere_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/sphere_subject-lh`
- **Tool invoked:** [`mris_sphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh#L31)

## Purpose and Context

The spherical map is the substrate on which all of FreeSurfer's surface-based
inter-subject registration and atlas alignment is performed: vertices on the
folded cortical surface are projected onto a unit sphere so that two subjects
can be brought into correspondence by rotating/warping their spheres. This
script is the left-hemisphere half of that mapping step. It is normally invoked
through its [[sphere_subject]] parent rather than directly, and is functionally
the same operation that [[wiki/pipelines/recon-all|recon-all]] performs in its
`-sphere` stage (see [Pipeline Context](#pipeline-context)).

The single positional argument `$1` is the **subject ID** (resolved under
`$SUBJECTS_DIR`).

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`surf/lh.inflated`** — the inflated left-hemisphere surface produced by
  [[mris_inflate]] (see [[surface-format]]). This is the source surface passed
  to [[mris_sphere]].

### Input Assumptions

> [!assumption] Topologically corrected, inflated left hemisphere must already exist
> The script assumes `$SUBJECTS_DIR/$1/surf/lh.inflated` exists and that its
> topology has already been corrected (no handles/holes). `mris_sphere` will
> fail if the surface is missing; the result is only meaningful if the surface
> is a clean two-manifold sphere-equivalent. `$SUBJECTS_DIR` must be set, and
> the subject's `scripts/` directory must exist (the script `pushd`es into it).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `lh.sphere` | `$SUBJECTS_DIR/$1/surf/` | Left hemisphere mapped to a sphere (a [[surface-format]] file with the original topology but spherical vertex coordinates) |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Appends a provenance block: the command line, `whoami`, `date`, and `hostname` ([`scripts/sphere_subject-lh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh#L21-L28)) |

### Output Specifications

`lh.sphere` is a binary FreeSurfer surface file. It preserves the vertex count
and triangle connectivity of `lh.inflated`; only the per-vertex `(x, y, z)`
coordinates change (they now lie on a sphere centred near the origin). It is a
predecessor of `lh.sphere.reg`, which is produced later by the registration step
([[surfreg]] / `mris_register`).

## Mathematical Foundations

The mathematics lives entirely in the invoked binary, not in this wrapper.

> [!internal] Inflation-to-sphere energy minimisation is in `mris_sphere`
> [[mris_sphere]] minimises a metric-distortion energy that projects the
> inflated surface onto a sphere while keeping local areas and distances as
> close to the original as possible. See [[mris_sphere]] for the functional.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**. The
[[mris_sphere]] call is hard-coded.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |

The fixed [[mris_sphere]] command is
([`scripts/sphere_subject-lh:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh#L31)):

```bash
mris_sphere -w 0 ../surf/lh.inflated ../surf/lh.sphere
```

`-w 0` sets `write_iterations = 0`, i.e. it **suppresses the periodic
intermediate-surface snapshots** that `mris_sphere` would otherwise write during
optimisation (the default is to snapshot every 1000 iterations). Only the final
`lh.sphere` is written.

### Configuration Interactions

None — there are no flags to combine. Behaviour is fixed apart from the subject
argument.

## Typical Use Cases

### Re-create only the left spherical map

```bash
# After editing/repairing lh.inflated, regenerate only the left sphere.
sphere_subject-lh bert
```

This is the manual counterpart to re-running the `recon-all -sphere` stage for a
single hemisphere. Most users call the [[sphere_subject]] parent instead, which
launches this script together with [[sphere_subject-rh]].

## Pipeline Context

This script reproduces the left-hemisphere portion of the
[[wiki/pipelines/recon-all|recon-all]] `-sphere` stage. In recon-all the
equivalent command is `mris_sphere -threads N ../surf/?h.inflated
../surf/?h.sphere` (recon-all `-sphere` block,
[`scripts/recon-all:4184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4184)); recon-all does **not** call
`sphere_subject-lh` itself — this wrapper is a standalone convenience for
re-running the step by hand.

**Predecessor:** [[mris_inflate]] (writes `lh.inflated`) → **sphere_subject-lh**
(writes `lh.sphere`) → **Successor:** [[surfreg]] / `mris_register` (writes
`lh.sphere.reg`).

## Gotchas and Caveats

> [!gotcha] No overwrite guard
> Unlike [[surfreg]], this script does not check whether `lh.sphere` already
> exists; re-running it will overwrite the previous sphere. There is also no
> argument validation — calling it with no subject expands `$1` to empty and the
> `pushd` will fail.

> [!gotcha] Relative paths require the subject's `scripts/` directory
> The `mris_sphere` arguments are written relative to `scripts/`
> (`../surf/lh.inflated`). The script `pushd`es into
> `$SUBJECTS_DIR/$1/scripts`; if that directory does not exist the relative
> paths resolve incorrectly.

## Error Compensation and Guard Rails

Essentially none in the wrapper itself. It does not set `-e`, so a failure of
`mris_sphere` is not propagated as a script-level error; the (success of the)
`NOTES` provenance write happens before the heavy computation regardless of
outcome. All numerical guard rails belong to [[mris_sphere]].

## Related Tools

- [[sphere_subject]] — the parent that runs this script together with [[sphere_subject-rh]] in parallel.
- [[sphere_subject-rh]] — the right-hemisphere counterpart (identical except for the hemisphere).
- [[mris_sphere]] — the binary that performs the actual inflation-to-sphere mapping.
- [[mris_inflate]] — produces the `lh.inflated` input.
- [[reinflate_subject-lh]] — the companion helper that regenerates `lh.smoothwm`/`lh.inflated` upstream of this step.
- [[surfreg]] — registers the resulting `lh.sphere` to an atlas, producing `lh.sphere.reg`.

## Confidence and Gaps

**High confidence:** The script is six effective lines; the fixed `mris_sphere`
invocation, the `-w 0` semantics, the `NOTES` provenance write, and the output
file are all read directly from
[`scripts/sphere_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh). No gaps.

## References

- FreeSurfer source: [`scripts/sphere_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject-lh) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207 — describes the inflation-to-sphere mapping implemented by `mris_sphere`.
