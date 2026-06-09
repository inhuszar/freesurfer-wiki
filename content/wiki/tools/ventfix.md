---
title: "ventfix"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "ventfix/ventfix_main.cpp"
  - "utils/ventfix.cpp"
  - "include/ventfix.h"
families: []                     # standalone segmentation-repair utility
recon_all_stage: null
related:
  - "[[aseg.presurf.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "ventfix_main.cpp exposes only three positional arguments and hard-codes threshmin/niters/nmax/topo; the richer VentFix API (relabelSegANeighboringSegB, per-iteration limits, JSON centroid output) is present in utils/ventfix.cpp but unreachable from this binary in v8.2.0."
  - "Whether ventfix is wired into any recon-all / samseg post-processing path in v8.2.0 was not confirmed; no caller was found under scripts/."
tags:
  - segmentation
  - ventricles
  - aseg
  - cluster
  - repair
---

# ventfix

## Summary

`ventfix` repairs under-labelled lateral ventricles in a FreeSurfer
segmentation. FreeSurfer's automatic subcortical segmentation
([[aseg.presurf.mgz]]) frequently fails to fill enlarged or atrophic
ventricles completely, leaving pockets of CSF that are inside the brain but were
never assigned a ventricle label. `ventfix` finds those unlabelled CSF islands,
identifies which ones touch an existing ventricle segment, and grows the
ventricle label outward into them by region-growing under a topology constraint,
writing a corrected segmentation volume. The command-line program is a thin
driver around `VentFix::fixasegps()` in the FreeSurfer `utils` library; it reads
the segmentation and the brain mask for one subject, fixes the requested segment
ids, and writes `newseg.<subject>.mgz` to the current directory.

## Source Information

- **Language:** C++
- **Source files:**
  [`ventfix/ventfix_main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp) (the `main()` entry point),
  [`utils/ventfix.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp) (the `VentFix` class with the algorithm), and
  [`include/ventfix.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/ventfix.h) (the class declaration).
- **Binary/script location:** `$FREESURFER_HOME/bin/ventfix`
- **Core routine:** `VentFix::fixasegps()`
  ([`utils/ventfix.cpp:26-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L26-L108)), which calls the private
  `ExpandSegIndices()` region-grower
  ([`utils/ventfix.cpp:123-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L123-L264)).

## Purpose and Context

The aseg ventricle labels (lateral ventricle 4/43, inferior lateral ventricle
5/44) are derived from an atlas and a fixed-intensity model. In subjects with
ventriculomegaly the ventricles can be much larger than the atlas prior expects,
so the atlas-driven label stops short and a contiguous "lake" of CSF inside the
ventricle is left as background or unknown. `ventfix` is a post-hoc correction
for exactly this failure mode: it locates the unlabelled CSF islands and absorbs
the one(s) that are continuous with the existing ventricle label into that
label.

The tool was developed (the in-source example points at a
`bigvent.subjects` directory) to clean up big-ventricle cases before downstream
surface placement or volumetric statistics. It is a **standalone utility**, not
part of [[wiki/pipelines/recon-all|recon-all]]; no caller for it was found under
`scripts/` in v8.2.0. It operates purely in voxel space on label volumes and
does not touch surfaces or intensities.

> [!gotcha] The binary is a minimal positional-argument driver, not a full CLI
> `ventfix_main.cpp` takes exactly three positional arguments and passes
> **hard-coded** values for the binarization threshold, iteration count, maximum
> voxels, and topology to `VentFix::fixasegps()`
> ([`ventfix/ventfix_main.cpp:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L42)). There are no `--flags`, no
> `--help`, and no way to change those parameters from the command line in this
> version. A larger feature set (relabelling segment A where it neighbours
> segment B, per-segment iteration limits, JSON centroid output) exists in
> [`utils/ventfix.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp) but is `#if 0`-disabled or simply not wired up in
> `main()`.

## Inputs

`ventfix` takes three positional arguments and reads `SUBJECTS_DIR` from the
environment ([`ventfix/ventfix_main.cpp:14-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L14-L24)):

```
ventfix <subject> <aseg-filename> <segids>
```

### Required Inputs

- **`<subject>`** (`argv[1]`) — a subject name; combined with `$SUBJECTS_DIR` to
  form `$SUBJECTS_DIR/<subject>/mri`.
- **`<aseg-filename>`** (`argv[2]`) — the basename of the segmentation inside
  that `mri` directory, normally [[aseg.presurf.mgz]]. Read with `MRIread`
  ([`ventfix/ventfix_main.cpp:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L27)).
- **`<segids>`** (`argv[3]`) — a comma-separated list of segment ids to repair,
  e.g. `4,43` for the left and right lateral ventricles. Parsed with
  `strtok_r` inside `fixasegps` ([`utils/ventfix.cpp:85-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L85-L103)).
- **Brain mask** — not an argument; `ventfix` always reads
  `$SUBJECTS_DIR/<subject>/mri/brainmask.mgz` ([[brainmask.mgz]]) alongside the
  segmentation ([`ventfix/ventfix_main.cpp:23-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L23-L40)).

### Input Assumptions

> [!assumption] A standard subject `mri/` directory
> Both the segmentation and `brainmask.mgz` must exist in
> `$SUBJECTS_DIR/<subject>/mri/`, must share the same voxel grid (same
> dimensions and geometry — they are combined voxel-for-voxel via `MRImask`),
> and the segment ids passed in `<segids>` must use the
> [aseg label conventions]([[color-lut]]) (e.g. 4 = Left-Lateral-Ventricle,
> 43 = Right-Lateral-Ventricle). `SUBJECTS_DIR` must be set; there is no
> `--sd` flag.

> [!gotcha] Missing arguments dereference null pointers
> The driver does not validate argument count: with no arguments, `argv[1]` is
> `NULL` and the constructed path becomes `.../(null)/mri/...`, producing an
> `mri_read()` error rather than a usage message
> ([`ventfix/ventfix_main.cpp:21-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L21-L27)). Always pass all three arguments.

## Outputs

### Files Created

- **`newseg.<subject>.mgz`** — the corrected segmentation, written to the
  **current working directory** (not into the subject's `mri/` directory)
  ([`ventfix/ventfix_main.cpp:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L44-L47)). It is a copy of the input aseg in
  which voxels grown into the chosen ventricle islands now carry the
  corresponding `segid`.

The richer outputs that `VentFix::ExpandSegIndices()` can emit (a `.dat` voxel
list, a `.json` centroid point set) are **not** produced by this binary — those
arguments are passed as `NULL` from `fixasegps`, and the GUI/point-set path is
in the disabled `#if 0` block of `main()`
([`ventfix/ventfix_main.cpp:54-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L54-L86)). A centroid RAS coordinate per repaired
segment is, however, **printed to stdout**
([`utils/ventfix.cpp:247-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L247-L249)).

### Output Specifications

`newseg.<subject>.mgz` has the identical grid, data type, and geometry as the
input segmentation (it is produced by `MRIcopy` of the aseg with header and
pulse parameters copied,
[`utils/ventfix.cpp:126-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L126-L129)). Only voxel **labels** change; no resampling
occurs. An attached colour table labelling the detected CSF islands
(`Cluster-001`, `Cluster-002`, …) is built for the internal cluster volume but
is not written to disk by this binary
([`utils/ventfix.cpp:61-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L61-L68)).

## Mathematical Foundations

`ventfix` is a discrete morphological / connected-components operation on a label
volume; there is no floating-point model. The fixed pipeline inside
`VentFix::fixasegps()` is ([`utils/ventfix.cpp:26-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L26-L108)):

1. **Binarize the "unlabelled" mask.** Threshold the aseg so that every voxel
   *not* assigned to a segment becomes 1 and every labelled voxel becomes 0:
   $$
   b(\mathbf{x}) =
   \begin{cases}
   1, & \mathrm{aseg}(\mathbf{x}) < \theta \\
   0, & \mathrm{aseg}(\mathbf{x}) \ge \theta
   \end{cases}
   \qquad \theta = 0.5,
   $$
   via `MRIbinarize` ([`utils/ventfix.cpp:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L44)). With $\theta=0.5$ this
   selects exactly the voxels whose aseg value is 0 (background/unknown).
2. **Cut to the brain.** Multiply the binary volume by the brain mask
   (`MRImask`), discarding extracerebral CSF and leaving only *interior*
   unlabelled CSF ([`utils/ventfix.cpp:47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L47)).
3. **Connected components.** Run `clustGetClusters` on the masked binary volume
   to partition the interior unlabelled CSF into clusters (islands), then write
   those cluster ids back into an "OCN" label volume `ocn` whose voxel values are
   the cluster numbers, sorted by size
   ([`utils/ventfix.cpp:51-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L51-L57)). The largest cluster (number 1) is
   typically the background lake and is excluded from growth (see below).
4. **Region-grow each requested segment into its island.** For each `segid`,
   call `ExpandSegIndices()`.

The region-grower `ExpandSegIndices()`
([`utils/ventfix.cpp:123-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L123-L264)) is a flood fill seeded from the existing
label:

- **Iteration 1:** record the voxel coordinates of every voxel already equal to
  `segid` ([`utils/ventfix.cpp:141-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L141-L158)).
- **Iterations 2…:** for every voxel currently in the set, examine its 26
  neighbours and add a neighbour $\mathbf{x}'$ to the segment iff all of:
  - it satisfies the **topology constraint**
    $\lvert dc\rvert+\lvert dr\rvert+\lvert ds\rvert \le \text{topo}$, where
    `topo = 1` keeps only the 6 face neighbours, `2` adds the 12 edge
    neighbours, `3` adds the 8 corner neighbours
    ([`utils/ventfix.cpp:186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L186));
  - it lies in a *growable* OCN cluster, enforced as cluster value
    $\ge 1.5$, i.e. cluster number $\ge 2$ — this is the rule that **excludes
    cluster 1 (the background)** ([`utils/ventfix.cpp:191-203`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L191-L203));
  - it is currently unlabelled in the output (`newseg == 0`)
    ([`utils/ventfix.cpp:204-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L204-L207)).
  Added voxels are set to `segid` in the output and their coordinates appended.
- **Termination:** stop when an explicit iteration cap is hit (`niters > 0` and
  `iter == niters`), when no voxel changed, or when the number of added voxels
  exceeds `nmax` ([`utils/ventfix.cpp:230-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L230-L232)).
- **Centroid:** the mean voxel coordinate of all added voxels is converted to
  scanner RAS via the vox→RAS matrix and printed / added to a point set
  ([`utils/ventfix.cpp:235-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L235-L261)).

> [!math] Fixed parameters used by the `ventfix` binary
> `main()` calls `fixasegps(aseg, brainmask, segids, 0.5, -1, 10000, 1)`
> ([`ventfix/ventfix_main.cpp:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L42)), i.e. $\theta = 0.5$,
> `niters = -1` (no iteration cap — grow until no change or `nmax`),
> `nmax = 10000` voxels, `topo = 1` (6-connected face neighbours only). These
> are compiled in and cannot be changed without editing and rebuilding.

> [!internal] All heavy lifting is in the `utils` library
> Binarization (`MRIbinarize`), masking (`MRImask`), connected-component
> labelling (`clustGetClusters`, `clustClusterList2Vol` from
> `[[internal-volcluster]]`), and the vox→RAS transform (`MRIxfmCRS2XYZ`) all
> live in the FreeSurfer `utils` library. `ventfix_main.cpp` only marshals file
> I/O and calls `VentFix::fixasegps()`.

## Configuration Options

`ventfix` has **no option flags** in v8.2.0. The only way to influence its
behaviour is through the three positional arguments and the `SUBJECTS_DIR` /
`FREESURFER_SEED` environment variables.

| Positional / env | Type | Default | Description |
|------------------|------|---------|-------------|
| `argv[1]` (subject) | string | *(required)* | Subject name; with `$SUBJECTS_DIR` gives the `mri/` directory. |
| `argv[2]` (aseg) | string | *(required)* | Segmentation basename in `mri/`, normally `aseg.presurf.mgz`. |
| `argv[3]` (segids) | CSV ints | *(required)* | Comma-separated segment ids to repair, e.g. `4,43`. |
| `SUBJECTS_DIR` | env | *(required)* | Root of the subjects tree; there is no `--sd`. |
| `FREESURFER_SEED` | env | unset | Seed used by FreeSurfer's RNG; set for reproducibility of any randomised library calls (per the in-source usage note, [`ventfix/ventfix_main.cpp:11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L11)). |

The compiled-in algorithm parameters ($\theta=0.5$, `niters=-1`, `nmax=10000`,
`topo=1`) are documented under [Mathematical Foundations](#mathematical-foundations);
they are not user-configurable here.

### Configuration Interactions

- **`<segids>` order matters for the running result.** `fixasegps` processes the
  segment ids in list order, feeding the output of one expansion as the input to
  the next ([`utils/ventfix.cpp:85-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp#L85-L103)). Because a CSF island can only be
  claimed once (the `newseg == 0` test), if two requested segments could both
  reach the same island, the earlier `segid` in the list wins.
- **Largest island is never filled.** Cluster 1 (the biggest connected component
  of interior unlabelled CSF — usually a large background lake) is excluded by
  the cluster $\ge 2$ rule, so `ventfix` will not flood the whole interior even
  with `nmax = 10000` and `niters = -1`.

## Typical Use Cases

### 1. Fill both lateral ventricles in a big-ventricle subject

```bash
export SUBJECTS_DIR=/data/bigvent.subjects
export FREESURFER_SEED=2
cd /scratch/ventfix_out
ventfix subj01 aseg.presurf.mgz 4,43
# -> writes /scratch/ventfix_out/newseg.subj01.mgz
```

### 2. Inspect the result against the original

```bash
freeview \
  -v "$SUBJECTS_DIR/subj01/mri/brainmask.mgz" \
  -v "$SUBJECTS_DIR/subj01/mri/aseg.presurf.mgz:colormap=lut" \
  -v newseg.subj01.mgz:colormap=lut
```

Compare the lateral-ventricle labels (4/43) before and after; the corrected
volume should now include the previously unlabelled CSF that was contiguous with
each ventricle.

## Pipeline Context

`ventfix` is an optional **segmentation-repair** step that runs after a
segmentation already exists.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (which produces
[[aseg.presurf.mgz]] and [[brainmask.mgz]]) — or any tool that wrote a
compatible aseg, such as [[wiki/tools/samseg|samseg]] → **ventfix** → **Successor:** manual review
in [[wiki/tools/freeview|freeview]], and optional re-injection of the corrected
labels into a re-run of downstream surface/volume steps.

Note that the output lands in the current directory as `newseg.<subject>.mgz`;
integrating it back into a subject requires the user to copy/rename it into the
`mri/` tree explicitly.

## Gotchas and Caveats

> [!gotcha] Output goes to the current directory, named `newseg.<subject>.mgz`
> Unlike most FreeSurfer tools, `ventfix` does not write into the subject's
> `mri/` directory and does not let you choose the output name. It writes
> `newseg.<subject>.mgz` wherever you launched it
> ([`ventfix/ventfix_main.cpp:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L44-L47)). Run it from a scratch directory and
> rename/copy the result yourself.

> [!gotcha] Brain mask is fixed to `brainmask.mgz`
> The mask path is hard-coded; you cannot substitute a different mask. If
> `brainmask.mgz` is missing or mis-registered to the aseg, the masking step
> will misbehave ([`ventfix/ventfix_main.cpp:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L24)).

> [!gotcha] No iteration cap, only a 10000-voxel cap
> Because `niters = -1`, growth continues until no neighbour can be added or
> 10000 voxels have been added per segment. For unusually large ventricles the
> `nmax = 10000` limit could truncate the fill; there is no flag to raise it in
> this binary.

> [!gotcha] Face-connectivity only
> With the compiled-in `topo = 1`, only 6-connected (face) neighbours are
> filled. Thin diagonal connections between the existing label and a CSF island
> will not be crossed, which can leave a nearby island unfilled.

## Error Compensation and Guard Rails

- **Read failures abort early.** A failed `MRIread` of either the segmentation
  or `brainmask.mgz` prints an error and returns non-zero
  ([`ventfix/ventfix_main.cpp:27-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L27-L40)).
- **Background exclusion.** The cluster $\ge 2$ rule prevents the flood fill from
  consuming the entire interior CSF background, which is the main guard against
  catastrophic over-filling.
- **One-island-per-voxel.** The `newseg == 0` test stops a voxel from being
  claimed by two segments and prevents re-filling already-fixed voxels.
- **No input validation otherwise.** Argument count, segment-id validity, and
  grid compatibility between the aseg and the mask are **not** checked; mismatch
  surfaces as a downstream `MRImask`/read error.

## Related Tools

- [[aseg.presurf.mgz]] — the input segmentation `ventfix` repairs (and the usual choice for `argv[2]`).
- [[brainmask.mgz]] — the fixed brain mask used to restrict the fill to interior CSF.
- [[wiki/tools/samseg|samseg]] — an alternative segmentation engine whose aseg-style output could likewise be passed to `ventfix`.
- [[wiki/tools/freeview|freeview]] — to review the corrected `newseg.<subject>.mgz` against the original labels.
- [[color-lut]] — the segment-id ↔ label colour table (e.g. 4/43 = lateral ventricles) used to choose `<segids>`.

## Confidence and Gaps

**High confidence:** the three-argument calling convention, the hard-coded
`SUBJECTS_DIR/<subject>/mri/{<aseg>,brainmask.mgz}` inputs, the
`newseg.<subject>.mgz` output in the current directory, the absence of any
flags, and the full `fixasegps`/`ExpandSegIndices` algorithm (binarize at 0.5 →
brain-mask → connected components → topology-constrained region growth excluding
cluster 1, with the compiled `niters=-1, nmax=10000, topo=1`) — all read
directly from [`ventfix/ventfix_main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp) and
[`utils/ventfix.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp).

> [!gap] Disabled / unreachable functionality
> `utils/ventfix.cpp` also implements `relabelSegANeighboringSegB()` (relabel a
> segment where it neighbours specified segments but avoids excluded ones) and a
> `.dat`/`.json` output path, and `main()` contains a more elaborate `#if 0`
> block that would call `expandSegIndices` per segment with separate
> iteration/topology controls. None of this is reachable from the v8.2.0
> `ventfix` binary; it would require code changes to use.

> [!gap] Pipeline integration
> No script under `scripts/` invokes `ventfix`, so whether it is meant to be
> driven by a wrapper (e.g. a big-ventricle recon variant) or only run by hand is
> not established from the source tree.

## References

- FreeSurfer source: [`ventfix/ventfix_main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp),
  [`utils/ventfix.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/ventfix.cpp),
  [`include/ventfix.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/ventfix.h) (v8.2.0).
- In-source usage example: [`ventfix/ventfix_main.cpp:6-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/ventfix/ventfix_main.cpp#L6-L13).
