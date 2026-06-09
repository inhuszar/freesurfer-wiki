---
title: "tridec"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "tridec/tridec.cpp"
families: []
recon_all_stage: null
related:
  - "[[mri_make_bem_surfaces]]"
  - "[[mris_remesh]]"
  - "[[mri_watershed]]"
  - "[[mris_convert]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "tridec is a BEM .tri triangle-file utility that is not called by any shipped pipeline script in v8.2.0; its place in the historical MEG/EEG BEM mesh workflow is inferred from the file layout and from mri_make_bem_surfaces, not from a driver script."
tags:
  - bem
  - mesh
  - meg
  - eeg
  - surface
  - decimation
  - legacy
---

# tridec

## Summary

`tridec` is a small utility for building a boundary-element-model (BEM)
triangle mesh by **re-tessellating a fine BEM surface onto an icosahedral
template**. It reads a high-resolution BEM `.tri` surface from a subject's
`bem/` directory and an icosahedral template `.tri` from
`$FREESURFER_HOME/lib/bem/` (e.g. `ic4.tri`), copies the **first N vertex
coordinates** of the fine surface — where N is the template's vertex count — and
then appends the template's **triangle connectivity**, writing the combined mesh
to a new `.tri` file in the subject's `bem/` directory. The result is a surface
that carries the fine surface's geometry sampled at the standard icosahedral
vertex count and topology, which is the regular, fixed-size mesh that BEM
forward-model solvers (MEG/EEG) expect.

## Source Information

- **Language:** C++ (C-style file I/O; very small)
- **Source file:** [`tridec/tridec.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/tridec`
- **Companion data:** the icosahedral templates `$FREESURFER_HOME/lib/bem/ic0.tri … ic7.tri`

## Purpose and Context

MEG/EEG source modelling with a boundary element model needs the head's
conductivity boundaries (inner skull, outer skull, outer skin) represented as
**closed triangle meshes with a regular, predictable number of vertices and a
fixed connectivity**. FreeSurfer extracts those boundaries from the MRI (e.g. via
[[mri_watershed]] / [[mri_make_bem_surfaces]]) at high resolution. `tridec`
performs the "decimation"/re-tessellation step that maps such a fine boundary
onto a standard icosahedral tessellation so every subject's BEM surface has the
same vertex count and face list, differing only in the vertex positions.

It is a **legacy standalone tool** in the BEM toolchain. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or any other shipped v8.2.0 pipeline
script (verified by grep); it was run by hand or by the historical BEM-surface
scripts. Its natural sibling is [[mri_make_bem_surfaces]], which writes the
`.tri` boundary surfaces (using the same `lib/bem/ic*.tri` templates) that
`tridec` re-tessellates.

> [!gotcha] "Decimation" here is coordinate-truncation onto a template, not adaptive simplification
> Despite the name, `tridec` does not run a quadric/edge-collapse mesh
> simplification. It assumes the fine surface's first N vertices already
> correspond, in order, to the N icosahedral template vertices, takes those
> coordinates verbatim, and re-uses the template's face list. The geometric
> correspondence must already hold for the result to be a valid mesh.

## Inputs

### Required Inputs (four positional arguments, fixed order)

`tridec subject_name fine_file ico_file out_file`
([`tridec/tridec.cpp:40-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L40-L43))

| Argument | Meaning | Resolved path |
|----------|---------|---------------|
| `subject_name` | FreeSurfer subject ID | base `$SUBJECTS_DIR/<subject_name>` |
| `fine_file` | high-resolution BEM `.tri` surface | `$SUBJECTS_DIR/<subject_name>/bem/<fine_file>` ([`tridec/tridec.cpp:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L62)) |
| `ico_file` | icosahedral template `.tri` | `$FREESURFER_HOME/lib/bem/<ico_file>` ([`tridec/tridec.cpp:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L71)) |
| `out_file` | output `.tri` mesh name | `$SUBJECTS_DIR/<subject_name>/bem/<out_file>` ([`tridec/tridec.cpp:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L80)) |

Both **`$SUBJECTS_DIR`** and **`$FREESURFER_HOME`** must be set in the
environment; the tool exits if either is missing
([`tridec/tridec.cpp:45-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L45-L54)).

### Input Assumptions

> [!assumption] Both inputs are ASCII `.tri` meshes with a count-then-list layout
> A `.tri` file begins with a line giving the **vertex count**, followed by one
> line per vertex (`index x y z`), then a line giving the **face count**, followed
> by one line per triangle. `tridec` parses exactly this structure: it reads the
> template's vertex count `vnum2` and the fine file's vertex count `vnum1`, copies
> `vnum2` vertex lines from the fine file, then copies the template's `cnum2` face
> lines ([`tridec/tridec.cpp:90-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L90-L112)). See [[surface-format]] for FreeSurfer surface
> formats more broadly (the BEM `.tri` is a distinct ASCII format).

> [!assumption] Fine surface has at least as many vertices as the template, in correspondence
> The fine surface must contain ≥ `vnum2` vertices, and its first `vnum2` vertices
> must be the ones that correspond to the icosahedral template vertices. The tool
> does **not** check `vnum1 ≥ vnum2` and does not verify any geometric
> correspondence (see gotchas).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<out_file>` | `$SUBJECTS_DIR/<subject_name>/bem/` | A `.tri` mesh: `vnum2` vertex lines copied from the fine surface, followed by the template's `cnum2` triangle lines. |

The output therefore has the **icosahedral template's vertex count and exact face
connectivity**, but the **fine surface's vertex coordinates** for those vertices.

### Output Specifications

ASCII `.tri` format identical in structure to the inputs: a vertex-count header,
`vnum2` vertex lines (`index x y z`, taken verbatim from the fine file), a
face-count header (`cnum2`), and `cnum2` triangle lines (taken verbatim from the
template). On success the program prints `written triangle file <path>`
([`tridec/tridec.cpp:114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L114)).

## Mathematical Foundations

There is **no numerical computation**: `tridec` performs a structural splice of
two `.tri` files.

> [!math] What the splice produces
> Let the fine surface have vertices $V_{\text{fine}} = \{v_1, v_2, \dots,
> v_{n_1}\}$ and the icosahedral template have $n_2$ vertices and face set
> $F_{\text{ico}}$. The output mesh is
> $$\big(\,\{v_1, \dots, v_{n_2}\},\; F_{\text{ico}}\,\big),$$
> i.e. the first $n_2$ fine-surface coordinates wired up with the template's
> triangles. No interpolation, averaging, or projection is done; the geometry is
> assumed to already match the template ordering.

## Configuration Options

### Complete Flag Reference

`tridec` has **no option flags**. It takes exactly four positional arguments in a
fixed order. The only special argument handling is the standard FreeSurfer
version option, processed by `handleVersionOption`
([`tridec/tridec.cpp:35-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L35-L38)). Running it with the wrong number of arguments — or
with `--help` — prints the usage line and exits
([`tridec/tridec.cpp:40-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L40-L43)):

```
Usage: tridec subject_name fine_file ico_file out_file
```

| Argument (positional) | Type | Description |
|-----------------------|------|-------------|
| `subject_name` | string | Subject ID under `$SUBJECTS_DIR`. |
| `fine_file` | string | Fine BEM `.tri` in the subject's `bem/` dir; supplies vertex coordinates. |
| `ico_file` | string | Icosahedral template `.tri` in `$FREESURFER_HOME/lib/bem/`; supplies vertex count and faces. |
| `out_file` | string | Output `.tri` name in the subject's `bem/` dir. |

### Configuration Interactions

> [!gotcha] Argument order is fixed and unchecked beyond the count
> The four arguments are strictly positional. There is no flag parsing, so a
> mis-ordered call (e.g. swapping `fine_file` and `ico_file`) is not detected and
> will produce a wrong or malformed mesh. The only validation is "exactly 4
> arguments" and that each file opens.

## Typical Use Cases

### Use Case 1: Re-tessellate an inner-skull BEM surface onto ic4

```bash
setenv SUBJECTS_DIR /path/to/subjects
# Fine inner-skull mesh -> 2562-vertex ic4 tessellation
tridec subj1 inner_skull_fine.tri ic4.tri inner_skull_ic4.tri
# -> $SUBJECTS_DIR/subj1/bem/inner_skull_ic4.tri
```

### Use Case 2: Build all three BEM boundaries at a common resolution

```bash
tridec subj1 inner_skull_fine.tri ic4.tri inner_skull.tri
tridec subj1 outer_skull_fine.tri ic4.tri outer_skull.tri
tridec subj1 outer_skin_fine.tri  ic4.tri outer_skin.tri
```

Producing the three conductivity boundaries with the same vertex count and
connectivity, as a BEM solver expects.

## Pipeline Context

`tridec` is a **standalone BEM-mesh utility** and is not part of
[[wiki/pipelines/recon-all|recon-all]] or any other shipped v8.2.0 pipeline
(verified by grep across the source tree). It belongs to the MEG/EEG BEM
head-model preparation workflow.

**Predecessor:** [[mri_watershed]] / [[mri_make_bem_surfaces]] producing the fine
BEM boundary `.tri` surfaces (the latter also using the `lib/bem/ic*.tri`
templates) → **tridec** (splice onto the icosahedral template) → **Successor:** a
BEM forward-model solver (external MEG/EEG software such as MNE) that consumes the
regular `.tri` boundaries.

## Gotchas and Caveats

> [!gotcha] No `vnum1 ≥ vnum2` check
> The code reads `vnum2` vertices from the fine file without verifying the fine
> file actually has that many ([`tridec/tridec.cpp:90-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L90-L99)). If the fine surface
> has fewer vertices than the chosen template, the reads run past the data and the
> output is corrupt. Choose a template (`ic*`) no finer than the fine surface.

> [!gotcha] Correspondence is assumed, not computed
> `tridec` trusts that the first `vnum2` vertices of the fine file are the ones
> matching the template. If they are not (e.g. a generic dense surface that was
> not built against the icosahedral ordering), the spliced mesh will have
> mismatched geometry and connectivity even though it is structurally well-formed.

> [!gotcha] Final status message prints the template path, not the output path
> The closing `printf("written triangle file %s", fname)` reports `fname`, which
> at that point still holds the **output** path — but note the variable was last
> assigned the output name at [`tridec/tridec.cpp:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L80), so the message is
> correct; the file actually written is the subject `bem/<out_file>`.

## Error Compensation and Guard Rails

- **Environment checks:** exits with a clear message if `$SUBJECTS_DIR` or
  `$FREESURFER_HOME` is unset ([`tridec/tridec.cpp:45-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L45-L54)).
- **File-open checks:** each of the fine, template, and output files is checked;
  a missing input or unwritable output prints "File … not found" / "can't write to
  file …" and exits ([`tridec/tridec.cpp:66-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L66-L88)).
- **Argument-count check:** wrong argument count prints usage and exits with
  status 10 ([`tridec/tridec.cpp:40-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp#L40-L43)).
- **No data-consistency guard:** as noted above, vertex-count sufficiency and
  geometric correspondence are *not* validated — the main risk surface of this
  tool.

## Related Tools

- [[mri_make_bem_surfaces]] — generates the BEM boundary `.tri` surfaces from the
  MRI using the same `lib/bem/ic*.tri` templates; the natural upstream companion.
- [[mri_watershed]] — extracts the inner-skull / outer-skull / scalp surfaces used
  for BEM modelling.
- [[mris_remesh]] — the modern adaptive surface remeshing tool (true
  decimation/refinement of FreeSurfer surfaces), in contrast to `tridec`'s
  template splice.
- [[mris_convert]] — convert between FreeSurfer surface formats (note the BEM
  `.tri` ASCII format is distinct).
- [[surface-format]] — FreeSurfer surface format reference.

## Confidence and Gaps

**High confidence** in what the program does: the four-argument interface, the
two-file splice, the path resolution under `$SUBJECTS_DIR/bem` and
`$FREESURFER_HOME/lib/bem`, the `.tri` count-then-list parsing, and the lack of
any consistency checks were all read directly from the (short) source and the
shipped `lib/bem/ic*.tri` templates confirm the file format.

> [!gap] No driver script in v8.2.0
> `tridec` is not referenced by any shipped pipeline or wrapper script in this
> version. Its exact historical role in the BEM/MEG workflow (which fine surfaces
> it was paired with, and whether a script ever orchestrated it) is inferred from
> [[mri_make_bem_surfaces]] and the `bem/` file layout, not observed from a
> caller.

## References

- FreeSurfer source: [`tridec/tridec.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/tridec/tridec.cpp) (v8.2.0).
- Companion tool source: [`mri_make_bem_surfaces/mri_make_bem_surfaces.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_make_bem_surfaces/mri_make_bem_surfaces.cpp) (uses the same `lib/bem/ic4.tri` template).
- BEM templates shipped at `$FREESURFER_HOME/lib/bem/ic0.tri … ic7.tri`.
