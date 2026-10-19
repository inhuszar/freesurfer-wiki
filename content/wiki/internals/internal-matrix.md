---
title: "internal-matrix"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/matrix.h"
  - "utils/matrix.cpp"
related:
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
  - "[[register.dat]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps:
  - "Full enumeration of MatrixXxx() entry points not traced; this page documents the data structure and the most load-bearing operations."
tags:
  - internal
  - linear-algebra
  - matrix
---

# internal-matrix

## Summary

`matrix.h` / `matrix.cpp` define FreeSurfer's general dense linear-algebra
type, `MATRIX`, and the large family of `Matrix*()` functions that operate on
it. Almost every geometric computation in FreeSurfer — coordinate transforms,
registration matrices, least-squares fits, eigen-decompositions — flows
through this type. It is compiled into `libutils` and is one of the most
widely linked headers in the tree.

## Data structure

From [`include/matrix.h:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/matrix.h#L33):

```c
struct MATRIX {
  int     rows;
  int     cols;
  float **rptr;    /* pointer to an array of rows (1-based) */
  float  *data;    /* pointer to base of data */
};
typedef MATRIX VECTOR;
```

> [!gotcha] Indexing is 1-based
> Matrix elements are accessed as `m->rptr[r][c]` with **r, c starting at 1**
> (Fortran/NR convention), not 0. `VECTOR` is just a `MATRIX` typedef with
> `cols == 1` (row vectors use `rows == 1`); element access for a vector is
> often written `VECTOR_ELT(v,i)` = `v->rptr[i][1]`.

> [!gotcha] Storage is single-precision `float`
> The default `MATRIX` stores `float`, not `double`. Accumulated round-off in
> long chains of single-precision matrix products is the root cause behind
> several numerical bug reports; a parallel double-precision path exists for
> some operations but is not the default. Allocate with `MatrixAlloc(rows,
> cols, MATRIX_REAL)`.

## Role and consumers

`MATRIX` is the lingua franca for:

- **Coordinate transforms** — the vox2ras, ras2vox, tkreg, and Talairach
  matrices described in [[coordinate-systems]] are `MATRIX` objects.
- **Registration** — [[lta-format|`.lta`]] and [[register.dat]] both
  materialise as a 4×4 `MATRIX`; `LTAchangeType` and friends manipulate them.
- **Fitting / statistics** — design matrices and pseudo-inverses in
  [[wiki/tools/mri_glmfit|mri_glmfit]] and the surface GLM tools.

Because so many tools depend on it, defects in `matrix.cpp` have broad reach;
several [[bugs/00003|bug pages]] anchor here.

## Related

- [[coordinate-systems]] — the transforms that are stored as `MATRIX`.
- [[lta-format]], [[register.dat]] — on-disk transforms backed by `MATRIX`.
- [[internal-gcamorph]] — the non-linear warp counterpart.
