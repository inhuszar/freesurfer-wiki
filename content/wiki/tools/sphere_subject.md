---
title: "sphere_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/sphere_subject"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[sphere_subject-lh]]"
  - "[[sphere_subject-rh]]"
  - "[[mris_sphere]]"
  - "[[reinflate_subject]]"
  - "[[surfreg]]"
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
---

# sphere_subject

## Summary

`sphere_subject` is a two-line convenience wrapper that maps **both** cortical
hemispheres of a subject onto a sphere. It launches [[sphere_subject-lh]] and
[[sphere_subject-rh]] (which each run [[mris_sphere]] on one hemisphere) and then
`wait`s for both to finish. Because the two child scripts are started without a
trailing `&`, in practice they run sequentially under tcsh; the `wait` is a
guard that ensures control does not return until any backgrounded work has
completed. The end result is `surf/lh.sphere` and `surf/rh.sphere` for the named
subject — the spherical surfaces required for surface-based registration.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/sphere_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/sphere_subject`
- **Scripts invoked:** [`sphere_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject#L21), [`sphere_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject#L22) (each in turn runs [[mris_sphere]])

## Purpose and Context

Surface-based inter-subject analysis in FreeSurfer requires each hemisphere to be
mapped onto a sphere, because registration to an atlas is performed by warping
spheres rather than folded surfaces. `sphere_subject` is the user-facing
shortcut for producing both spheres in one call, mirroring the
[[wiki/pipelines/recon-all|recon-all]] `-sphere` stage. It is most useful when
re-running the spherical-mapping step outside the full pipeline — for example
after manually editing the inflated surfaces or repairing topology.

The single positional argument `$1` is the **subject ID** (resolved under
`$SUBJECTS_DIR`), passed straight through to both children.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`surf/lh.inflated` and `surf/rh.inflated`** — the inflated surfaces for both
  hemispheres (from [[mris_inflate]]); see [[surface-format]].

### Input Assumptions

> [!assumption] Both inflated hemispheres must already exist with corrected topology
> `sphere_subject` does no checking of its own; it relies on the child scripts,
> which in turn rely on [[mris_sphere]] finding `surf/?h.inflated`. The topology
> of each inflated surface must already be correct. `$SUBJECTS_DIR` must be set.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `lh.sphere` | `$SUBJECTS_DIR/$1/surf/` | Left hemisphere mapped to a sphere (via [[sphere_subject-lh]]) |
| `rh.sphere` | `$SUBJECTS_DIR/$1/surf/` | Right hemisphere mapped to a sphere (via [[sphere_subject-rh]]) |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Each child appends a provenance block (command line, user, date, host) |

### Output Specifications

Each `?h.sphere` is a binary FreeSurfer surface file preserving the vertex count
and connectivity of the corresponding `?h.inflated`; only the coordinates change
to lie on a sphere. They are the inputs to the registration step that produces
`?h.sphere.reg`.

## Mathematical Foundations

None in this wrapper — it is pure orchestration.

> [!internal] The mapping math is in `mris_sphere`
> Each hemisphere's inflation-to-sphere energy minimisation is performed by
> [[mris_sphere]], invoked by the child scripts. See that page for the
> functional.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`, forwarded to [[sphere_subject-lh]] and [[sphere_subject-rh]]. |

The fixed body is ([`scripts/sphere_subject:21-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject#L21-L24)):

```bash
sphere_subject-lh $1
sphere_subject-rh $1
wait
```

### Configuration Interactions

None — there are no flags. The only behavioural subtlety is hemisphere ordering
(left then right) and the trailing `wait`.

## Typical Use Cases

### Re-create both spherical maps for a subject

```bash
# Regenerate lh.sphere and rh.sphere after editing the inflated surfaces.
sphere_subject bert
```

This is the manual equivalent of re-running the `recon-all -sphere` stage for
both hemispheres.

## Pipeline Context

`sphere_subject` reproduces the [[wiki/pipelines/recon-all|recon-all]] `-sphere`
stage (which itself calls [[mris_sphere]] per hemisphere at
[`scripts/recon-all:4184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4184)). recon-all does **not** call `sphere_subject`;
the wrapper is a standalone convenience.

**Predecessor:** [[reinflate_subject]] / [[mris_inflate]] (write `?h.inflated`) →
**sphere_subject** (writes `?h.sphere`) → **Successor:** [[surfreg]] /
`mris_register` (writes `?h.sphere.reg`).

## Gotchas and Caveats

> [!gotcha] Children run sequentially despite the `wait`
> The two child scripts are launched **without** a trailing `&`, so each runs to
> completion before the next line executes; the `wait`
> ([`scripts/sphere_subject:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject#L24)) therefore has nothing
> outstanding to wait for in the common case. To parallelise the two hemispheres
> you would have to background them yourself (or use the per-hemisphere threading
> inside [[mris_sphere]] that recon-all uses via `-threads`).

> [!gotcha] No argument or output checking
> The wrapper performs no validation. An empty `$1` is forwarded to the children,
> whose `pushd` then fails. Existing `?h.sphere` files are overwritten without
> warning.

## Error Compensation and Guard Rails

None at this level. The script does not run with `-e`, so a non-zero exit from
either child does not abort the parent — the right hemisphere is attempted even
if the left failed. Numerical guard rails live in [[mris_sphere]].

## Related Tools

- [[sphere_subject-lh]] / [[sphere_subject-rh]] — the per-hemisphere workers this script launches.
- [[mris_sphere]] — the binary that performs the inflation-to-sphere mapping.
- [[reinflate_subject]] — the companion wrapper that regenerates `?h.smoothwm`/`?h.inflated` (the inputs to this step).
- [[mris_inflate]] — produces the inflated surfaces consumed here.
- [[surfreg]] — registers the resulting spheres to an atlas, producing `?h.sphere.reg`.

## Confidence and Gaps

**High confidence:** The script is three effective lines; the child invocations,
argument forwarding, and `wait` are read directly from
[`scripts/sphere_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject). No gaps.

## References

- FreeSurfer source: [`scripts/sphere_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sphere_subject) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207.
