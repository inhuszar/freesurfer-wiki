---
title: "fix_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject"
families: []                     # standalone legacy topology-fix driver
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[fix_subject-lh]]"
  - "[[fix_subject-rh]]"
  - "[[fix_subject_corrected]]"
  - "[[mris_fix_topology]]"
  - "[[mris_euler_number]]"
  - "[[mris_sphere]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The commented-out mri_fill line suggests the driver historically (re)built the filled volume before tessellation; in the shipped script that step is disabled, so the caller must have produced ?h.orig and ?h.inflated beforehand."
tags:
  - surface
  - topology
  - legacy
  - reconstruction
---

# fix_subject

## Summary

`fix_subject` is a tiny legacy tcsh driver that runs FreeSurfer's surface
topology-correction step for **both hemispheres** of one subject. It changes into
the subject's `scripts/` directory and calls the two hemisphere workers
[[fix_subject-lh]] and [[fix_subject-rh]] in turn. Each worker generates a
quasi-homeomorphic sphere, runs [[mris_fix_topology]] to remove handles and holes
from the white-matter surface, and re-smooths and re-inflates the result. It is a
historical, manually-invoked alternative to the topology-fixing stage that
[[wiki/pipelines/recon-all|recon-all]] now performs internally; `recon-all` does
**not** call `fix_subject`.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/fix_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject`
- **Scripts invoked:** [`fix_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L23) and [`fix_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L24) (one per hemisphere), which in turn call [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], and [[mris_inflate]].

## Purpose and Context

FreeSurfer reconstructs each cortical hemisphere as a triangulated surface that
must be topologically equivalent to a sphere (Euler number 2, i.e. no handles or
holes). Tessellating the white-matter volume almost always introduces topological
defects, so a dedicated correction step rebuilds the surface to be defect-free.

`fix_subject` is the original, stand-alone way to run that step for an entire
subject. It exists so a user could (re-)fix topology by hand — for example after
manually editing the white-matter volume — without re-running the whole
reconstruction. It is a thin orchestrator: all real work is delegated to the
per-hemisphere scripts.

> [!gotcha] Not part of modern recon-all
> Despite doing the same conceptual job, `fix_subject` is **not** invoked by
> [[wiki/pipelines/recon-all|recon-all]]. `recon-all` runs [[mris_fix_topology]]
> directly in its own `autorecon2`/surface stage (see
> [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)),
> with `-mgz -sphere qsphere.nofix -ga -seed 1234` and a post-check via
> [[mris_euler_number]]. `fix_subject` is a legacy convenience driver retained in
> the distribution; prefer `recon-all -fix` semantics for production work.

## Inputs

### Required Inputs

- **`$1` — subject ID.** The only positional argument; used to locate
  `$SUBJECTS_DIR/$1/`. The script `cd`s into
  `$SUBJECTS_DIR/$1/scripts` at [`scripts/fix_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L21).
- **`$SUBJECTS_DIR`** must be set in the environment.
- The subject directory must already contain the per-hemisphere inputs the
  workers need — principally `surf/?h.orig` and `surf/?h.inflated` (see
  [[fix_subject-lh]] for the exact file list).

### Input Assumptions

> [!assumption] An earlier reconstruction stage has already run
> `fix_subject` assumes the white-matter surface was tessellated and inflated
> before it is called. The `mri_fill`, `mri_tessellate`, and initial
> `mris_smooth`/`mris_inflate` commands that would produce those inputs are
> present only as **comments** in the driver and the hemisphere scripts
> (e.g. [`scripts/fix_subject:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L22)).
> If `surf/?h.orig` and `surf/?h.inflated` do not exist, the workers fail.

## Outputs

`fix_subject` writes no files of its own; the outputs are those produced by
[[fix_subject-lh]] and [[fix_subject-rh]]. For each hemisphere these are the
topologically-corrected surface and its re-derived smoothed/inflated forms:

| File (per hemisphere) | Written by | Contents |
|-----------------------|------------|----------|
| `surf/?h.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere used to locate defects |
| `surf/?h.orig` | [[mris_fix_topology]] | topology-corrected white-matter surface (overwrites the input `?h.orig`) |
| `surf/?h.smoothwm` | [[mris_smooth]] | smoothed white-matter surface |
| `surf/?h.inflated` | [[mris_inflate]] | re-inflated surface |

See [[fix_subject-lh]] / [[fix_subject-rh]] for the exact `mris_fix_topology`
output naming (the plain driver uses the **default** output name, so it replaces
`?h.orig` in place — contrast with [[fix_subject_corrected]], which writes a
parallel `*_corrected` family).

## Mathematical Foundations

None in this script — it is a pure dispatcher. The topology-correction
mathematics (genus reduction / defect retessellation to enforce Euler number 2)
lives in [[mris_fix_topology]]; the spherical mapping is computed by
[[mris_sphere]].

> [!internal] Algorithm lives in the surface library
> The retessellation and Euler-number logic are implemented in
> `mris_fix_topology` and the FreeSurfer surface (`mrisurf`) library, not here.
> See [[mris_fix_topology]] and [[mris_euler_number]].

## Configuration Options

### Complete Flag Reference

`fix_subject` parses **no options** — only one positional argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | FreeSurfer subject ID under `$SUBJECTS_DIR`. Passed straight through to `fix_subject-lh` / `fix_subject-rh`. |

Because the script is run with `tcsh -ef`, any non-zero exit from either
hemisphere worker aborts the whole driver (see
[Error Compensation](#error-compensation-and-guard-rails)).

### Configuration Interactions

None — there are no flags to interact. The only behavioural variation is the
choice of driver: plain `fix_subject` (this page, default output names) versus
[[fix_subject_corrected]] (writes a `_corrected` surface family and additionally
builds white/pial surfaces).

## Typical Use Cases

### Re-fix topology for one subject (both hemispheres)

```bash
setenv SUBJECTS_DIR /data/subjects
fix_subject bert
# → runs fix_subject-lh bert, then fix_subject-rh bert
```

Use this after editing `mri/wm`/`mri/filled` and re-tessellating, when you want a
clean, defect-free `?h.orig` for both hemispheres without re-running the full
pipeline.

## Pipeline Context

`fix_subject` is a stand-alone, manually-invoked driver. It is **not** a stage of
[[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** white-matter tessellation + inflation (historically
`mri_tessellate` → [[mris_smooth]] → [[mris_inflate]], now produced by
`recon-all`) → **fix_subject** → **Successors:** [[fix_subject-lh]] and
[[fix_subject-rh]] (the actual per-hemisphere correction), after which the
corrected `?h.orig`/`?h.inflated` feed spherical registration and surface
generation.

**Predecessor:** [[mris_inflate]] → **This tool** → **Successor:** [[fix_subject-lh]] / [[fix_subject-rh]]

## Gotchas and Caveats

> [!gotcha] Overwrites `?h.orig` in place
> The plain driver lets [[mris_fix_topology]] use its default output name, so the
> corrected surface replaces the existing `surf/?h.orig`. The original
> (uncorrected) tessellation is not preserved unless you backed it up. Use
> [[fix_subject_corrected]] if you want the corrected surfaces written under
> `_corrected` names alongside the originals.

> [!gotcha] `cd` then relative paths
> The driver `cd`s into `$SUBJECTS_DIR/$1/scripts`, and the hemisphere workers use
> paths relative to that directory (e.g. `../surf/lh.inflated`). The script must
> be able to change into that directory or it stops immediately.

## Error Compensation and Guard Rails

- **Fail-fast.** The shebang is `#!/bin/tcsh -ef`
  ([`scripts/fix_subject:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L1)):
  `-e` aborts on the first command that returns non-zero, and `-f` skips the
  user's `.cshrc`. If `fix_subject-lh` fails, `fix_subject-rh` is **not** run.
- No input validation, no `--help`, and no compensation logic of its own — all
  guard rails are in the underlying `mris_*` binaries.

## Related Tools

- [[fix_subject-lh]] / [[fix_subject-rh]] — the per-hemisphere workers this driver calls.
- [[fix_subject_corrected]] — the "corrected" sibling driver that writes a `_corrected` surface family and also builds white/pial surfaces with [[mris_make_surfaces]].
- `fix_subject_on_seychelles` *(no wiki page)* — a cluster variant that submits the two hemisphere jobs via `pbsubmit` instead of running them serially.
- [[mris_fix_topology]] — the actual topology-correction program.
- [[mris_euler_number]] — reports the Euler number used to verify a surface is defect-free.
- [[mris_sphere]], [[mris_smooth]], [[mris_inflate]] — surface steps run by the workers.
- [[wiki/pipelines/recon-all|recon-all]] — performs the equivalent topology fix internally (does not call this script).

## Confidence and Gaps

**High confidence:** the driver's control flow (both hemispheres, serial, fail
fast) and its delegation to the `-lh`/`-rh` workers are read directly from
[`scripts/fix_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject).

> [!gap] Disabled `mri_fill` step
> Line [`scripts/fix_subject:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject#L22)
> shows a commented-out `mri_fill ../mri/wm ../mri/filled`. In the shipped script
> the filled volume is **not** rebuilt, so the required tessellated/inflated
> surfaces must already exist. Whether this step was meant to be re-enabled in
> certain workflows is not determinable from the code alone.

## References

- FreeSurfer source: [`scripts/fix_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject) (v8.2.0).
- Registered as an installed script in [`scripts/CMakeLists.txt:56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L56).
- Fischl, Liu & Dale (2001), *Automated manifold surgery: constructing geometrically accurate and topologically correct models of the human cerebral cortex.* IEEE TMI 20(1):70–80 — the topology-correction method implemented by [[mris_fix_topology]].
