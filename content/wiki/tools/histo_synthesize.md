---
title: "histo_synthesize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "histo_synthesize/histo_synthesize.cpp"
families: []
recon_all_stage: null
related:
  - "[[histo_register_block]]"
  - "[[oct_register_mosaic]]"
  - "[[dissection_photo]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Requires a co-registered MRI/histology training pair (identical geometry, or a known vox2vox); the registration that produces this pairing is external to the tool."
  - "Several magic intensity constants (240 threshold, 4080 sentinel, 255 background) are hard-coded and assume a particular histology intensity convention that is not documented in-code."
  - "--help is not handled (prints 'unknown option --help'); the usage string is essentially empty, so all option knowledge comes from the source parser."
tags:
  - histology
  - synthesis
  - texture
  - patch-matching
  - non-parametric
---

# histo_synthesize

## Summary

`histo_synthesize` predicts what a **histological section would look like** at a
location in an MRI by non-parametric, patch-based example matching. Given a
co-registered MRI volume and a histology volume that together act as training
data, it walks one target slice and, for each output pixel, searches the
training MRI for the local intensity neighbourhood (feature window) most similar
to the target MRI neighbourhood, then copies the *paired* histology value from
that best-matching location. The result is a synthetic histology image driven
entirely by texture correspondence — a "MRI → histology appearance transfer"
tool from the FreeSurfer *ex vivo* histology line of work. It is not part of
[[wiki/pipelines/recon-all|recon-all]].

## Source Information

- **Language:** C++ (OpenMP-parallelised)
- **Source file:** [`histo_synthesize/histo_synthesize.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp)
- **Original author:** Bruce Fischl
- **Binary/script location:** `$FREESURFER_HOME/bin/histo_synthesize`
- **Links against:** the FreeSurfer `utils` library (MRI I/O, `MRIreduce`,
  histogram normalisation, ROMP/OpenMP support).

## Purpose and Context

In *ex vivo* imaging a tissue block can be scanned by MRI and, separately,
sectioned and stained for histology. Where both modalities exist and have been
brought into the same coordinate frame, one can *learn* the mapping from MRI
appearance to histology appearance. `histo_synthesize` implements the classic
**non-parametric texture-synthesis / image-analogies** idea: it treats the
training MRI as a dictionary of local patches, each annotated with the histology
value observed at its centre, and synthesises a new histology image for a query
slice by, pixel-by-pixel, finding the nearest training patch in MRI feature
space and transcribing its histology label.

This is a research / method-development tool. No `recon-all` stage or in-tree
script invokes it (verified by `grep` over `scripts/`). It is the conceptual
inverse of [[histo_register_block]] (which *registers* a real histology section
to a block face rather than *synthesising* one), and a sibling of the
optical-imaging tools [[oct_register_mosaic]] and [[dissection_photo]].

## Inputs

### Required Inputs

Positional arguments, read in [`histo_synthesize.cpp:122-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L122-L168):

1. **`argv[1]` — MRI volume** (the query/source modality). Read with `MRIread`.
2. **`argv[2]` — HISTO volume** (the histology to imitate / draw values from).
3. **`argv[3]` — output synthetic-histology volume** (written at the end, and
   its base name seeds the periodic snapshot files).

If no separate training pair is supplied (see `-train`), the **MRI and HISTO
arguments themselves are used as the training pair** (`mri_train_src = mri`,
`mri_train_dst = histo`, [`histo_synthesize.cpp:321-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L321-L324)).

### Input Assumptions

> [!assumption] MRI and histology must share a coordinate frame (or a known vox2vox)
> The mapping between the two modalities is taken from their headers:
> `MRIgetVoxelToVoxelXform(train_src, train_dst)` and its inverse
> ([`histo_synthesize.cpp:326-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L326-L333)). If the geometries are identical the
> transforms are detected as the identity and skipped ("image geometries are
> identical - disabling transforms"). Otherwise the header vox2ras matrices must
> already encode the correct MRI↔histology registration — the tool performs **no**
> registration of its own. Supplying unregistered volumes yields meaningless
> correspondences.

> [!assumption] Histology intensity convention with magic sentinels
> The code assumes a histology intensity range in which **0 and 255 are
> background**, values **> 240** are background/unstained and copied through
> verbatim, and **4080** is a special "no data" sentinel
> ([`histo_synthesize.cpp:525-529`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L525-L529), [`feature_distance`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L675-L711) skips 0/255).
> Histology that does not follow this convention will be mis-masked.

### Optional training pair

`-train <src> <dst>` supplies an **independent** registered MRI/histology pair
to use as the dictionary, decoupling the example source from the query volume
([`histo_synthesize.cpp:203-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L203-L211)). This is the cross-subject /
leave-one-out synthesis mode.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `argv[3]` (the output name) | [[mgz]] (or any `MRIwrite` format) | the synthetic histology volume (one synthesised slice; other slices set to the 255/4080 initialisation) |
| `<base>.NNN.mgz` | [[mgz]] | periodic snapshots written every 50 columns during synthesis, where `<base>` is `argv[3]` minus extension and `NNN` is the column index ([`histo_synthesize.cpp:513-522`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L513-L522)) |
| `test.dat`, `train.dat` | text | only when a debug voxel (`-debug_voxel`) is hit: the feature windows of the test and matched-train locations ([`histo_synthesize.cpp:548-552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L548-L552), [`dump_window`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L749-L777)) |

### Output Specifications

The synthetic volume is cloned from either the histology grid (default) or the
MRI grid (with `-MRI`), and only the selected slice is filled; the rest retains
the initialisation value (255 by default, 4080 in `-MRI` mode,
[`histo_synthesize.cpp:312-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L312-L319) and [`:401`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L401)). Voxel values are
copied (via nearest/`MRIsampleVolume`) from the training histology, so the
output inherits the histology intensity scale.

## Mathematical Foundations

For each output pixel the tool builds a **feature vector** $f$ from the
$w\times w\times w$ MRI intensity neighbourhood centred on the corresponding MRI
voxel (window size $w$ = `-w`, default 3), optionally mean-subtracted
([`extract_feature_vector`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L583-L610)):

$$
f = \bigl(\,I_{\mathrm{MRI}}(x+\delta) - c\,\bigr)_{\delta\in[-h,h]^3},
\qquad h=\tfrac{w-1}{2},
$$

with $c$ the centre value if `-C` (subtract-centre) is set, else $0$.

The best training location is the one minimising the feature distance over a
**randomly permuted** set of candidate voxels in the training slice
([`find_most_similar_location`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L613-L672)). Two distances are available:

$$
d_{L2}(f,g)=\sqrt{\tfrac{1}{n}\textstyle\sum_i (f_i-g_i)^2},
\qquad
d_{L1}(f,g)=\tfrac{1}{n}\textstyle\sum_i \lvert f_i-g_i\rvert,
$$

where the sum runs only over neighbourhood entries that are valid in **both**
windows (background values 0 and 255 are skipped,
[`feature_distance`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L675-L711)). `-L1` selects $d_{L1}$; the default is $d_{L2}$.

The histology value at the winning training voxel (mapped through the vox2vox if
geometries differ) is written to the output pixel.

The search is **early-terminated** for speed: candidates are drawn at random,
and once `-num` consecutive draws fail to improve the best distance the search
stops ([`histo_synthesize.cpp:655-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L655-L668)). A `-tol` parameter is plumbed in as
an additional termination tolerance. In single-slice (2-D) mode a minimum
spatial separation `min_training_dist` (default 100 voxels) forbids matching a
pixel to a training location too close to itself, preventing trivial
self-matches ([`histo_synthesize.cpp:650-652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L650-L652)).

Before matching, the candidate index list is **pruned** to in-mask training
voxels whose histology value is below 240 ([`prune_indices`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L712-L748)), and when a
separate training source is used it is **histogram-normalised** to the query MRI
so the two MRIs share an intensity scale (`MRIhistogramNormalize`,
[`histo_synthesize.cpp:396-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L396-L397)).

> [!internal] MRI utilities do the heavy lifting
> Feature extraction relies on `MRI`'s wraparound index tables (`mri->xi/yi/zi`),
> Gaussian downsampling on `MRIreduce`, intensity matching on
> `MRIhistogramNormalize`, and coordinate mapping on
> `MRIgetVoxelToVoxelXform` — all from the shared `utils` MRI library.

> [!math] This is non-parametric: there is no trained model
> Unlike a regression or a learned network, `histo_synthesize` keeps the entire
> training slice as its "model" and answers each query by nearest-neighbour
> search in patch space. Output quality is therefore bounded by how well the
> single training slice spans the appearance of the query slice.

## Configuration Options

### Complete Flag Reference

All options are parsed in [`get_option`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L183-L272). Long options are
case-insensitive; the single-letter options are matched via `toupper`.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-w <n>` | int | `3` | Feature-window edge length (a `w×w×w` neighbourhood). Larger windows capture more context but match more strictly. |
| `-C` | bool | off | Subtract the centre voxel value from every feature entry, making the match invariant to local MRI brightness offset. |
| `-L1` | bool | off (L2) | Use the L1 (mean-absolute) feature distance instead of the default L2 (RMS). |
| `-MRI` | bool | off | Synthesise in **MRI** coordinates (output cloned from the MRI grid) rather than the default histology coordinates. Changes the initialisation sentinel to 4080 and the iteration order. |
| `-D <n>` | int | `0` | Gaussian-downsample the MRI `n` times with `MRIreduce` before synthesis; `train_slice` (and, in `-MRI` mode, `test_slice`) are halved per level. |
| `-test_slice <z>` | int | `20` | Index of the slice to synthesise (interpreted in histo coords, or MRI coords with `-MRI`). Clamped to the volume depth. |
| `-train_slice <z>` | int | `30` | Index of the training slice (in MRI/dst coords) used as the example dictionary. Clamped to the training depth. |
| `-train <src> <dst>` | 2 strings | — | Use an independent registered MRI (`src`) / histology (`dst`) pair as training data instead of the query volumes; also sets `min_training_dist=0`. |
| `-crop_width <n>` | int | `0` (full) | In histology-coordinate mode, synthesise only the first `n` columns (a crop for quick previews). |
| `-num <n>` | int | `1000` | Early-stop after `n` consecutive non-improving random candidate draws. Larger ⇒ more exhaustive, slower search. |
| `-tol <f>` | float | `0` | Search-termination tolerance plumbed into the matcher. |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Set the diagnostic voxel; when reached, dump `test.dat`/`train.dat` feature windows. |
| `-U`, `-?` | bool | — | Print the (near-empty) usage string and exit. |

> [!gotcha] `--help` is not recognised
> There is no `--help` handler; `histo_synthesize --help` prints
> `unknown option --help` and exits with status 1. Use `-U` for the (minimal)
> usage line, or read the source for options.

> [!gotcha] `min_training_dist` only applies to 2-D training data
> The 100-voxel self-match exclusion is gated on `mri->depth == 1`
> ([`histo_synthesize.cpp:650-652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L650-L652)). With a 3-D training volume (and no
> `-train`, which zeroes the distance) the constraint is inactive.

### Configuration Interactions

- `-MRI` changes both the output grid *and* the loop structure (it iterates over
  an MRI-space bounding box and writes the histology value sampled there), so the
  meaning of `-test_slice`/`-crop_width` shifts with it.
- `-D <n>` interacts with the slice indices: each downsample halves
  `train_slice` (and `test_slice` under `-MRI`), so very large `-D` can collapse
  a slice index to 0.
- `-train` sets `min_training_dist = 0`, deliberately allowing near-coincident
  matches because the training data is a *different* subject/section where
  self-matching is not a concern.
- `-num` and `-tol` jointly control the speed/quality trade-off of the random
  nearest-neighbour search; lowering `-num` speeds the run at the cost of match
  quality.

> [!gotcha] `base_name` is computed before the argument-count check
> `FileNameRemoveExtension(argv[3], base_name)` runs *before* `if (argc < 3)`
> ([`histo_synthesize.cpp:122-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L122-L125)). Invoking with too few positional
> arguments dereferences `argv[3]` before the usage message; always pass all
> three positionals.

## Typical Use Cases

### Use Case 1: Self-synthesis (sanity / hole-filling on one block)

```bash
# Use the volume's own MRI/histology as the dictionary; synthesise slice 20.
histo_synthesize -test_slice 20 -train_slice 20 \
  mri.mgz histo.mgz synth_histo.mgz
```

### Use Case 2: Cross-subject synthesis with a separate training pair

```bash
# Learn appearance from subject A's registered pair, apply to subject B's MRI.
histo_synthesize \
  -train subjA_mri.mgz subjA_histo.mgz \
  -train_slice 30 -test_slice 25 \
  subjB_mri.mgz subjB_histo.mgz subjB_synth.mgz
```

### Use Case 3: Larger context window, brightness-invariant, L1 distance

```bash
histo_synthesize -w 5 -C -L1 -num 5000 \
  mri.mgz histo.mgz synth_histo.mgz
```

### Use Case 4: Quick downsampled preview of a cropped strip

```bash
histo_synthesize -D 2 -crop_width 64 \
  mri.mgz histo.mgz preview.mgz
# → preview.mgz plus preview.000.mgz, preview.050.mgz snapshots
```

## Pipeline Context

`histo_synthesize` is a **standalone research tool**; no `recon-all` stage or
in-tree script calls it. In a histology-to-MRI study it presupposes that an MRI
and a histology volume have already been co-registered (e.g. by the broader
histology pipeline that also feeds [[histo_register_block]]); its output
synthetic-histology slice can then be compared against real histology or used to
drive appearance-based registration / QC.

**Predecessor:** registered MRI + histology training pair (external) →
**histo_synthesize** → **Successor:** visual/quantitative comparison or
appearance-based downstream analysis (external).

## Gotchas and Caveats

> [!gotcha] Only one slice is synthesised per run
> Despite operating on volumes, the tool fills a single `test_slice`; all other
> slices in the output keep the 255/4080 initialisation. To build a volume you
> must loop over slices yourself.

> [!gotcha] Hard-coded histology magic numbers
> The thresholds 240 (background/unstained), 4080 (no-data sentinel), and the
> 0/255 background pair are baked into the masking, pruning, and pass-through
> logic ([`histo_synthesize.cpp:364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L364), [`:525-529`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L525-L529), [`:689-700`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L689-L700)). They
> encode a specific histology intensity convention; data outside it will be
> mis-handled.

> [!gotcha] Randomised search ⇒ non-deterministic output
> Candidate voxels are sampled with `randomNumber` from a `setRandomSeed(-1L)`
> (time-seeded) generator ([`histo_synthesize.cpp:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L101), [`:641`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L641)), so two runs on
> the same inputs can differ. There is no CLI flag to fix the seed.

> [!gotcha] Loop variable reused as RNG index inside the for-loop
> In `find_most_similar_location` the candidate loop overwrites its own index
> (`ind = randomNumber(0, nind-.1)` inside `for(ind=0; ind<nind; ind++)`,
> [`histo_synthesize.cpp:639-641`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L639-L641)). The loop therefore samples random
> indices rather than iterating sequentially; the effective number of trials is
> governed by the `-num` early-stop, not by `nind`. This is by design (random
> search) but is easy to misread.

## Error Compensation and Guard Rails

- **Slice clamping.** `test_slice`/`train_slice` are clamped to the valid depth
  of their respective volumes ([`histo_synthesize.cpp:156-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L156-L165)).
- **Intensity normalisation.** A separate training MRI is histogram-matched to
  the query MRI before matching, compensating for scanner/scaling differences
  ([`histo_synthesize.cpp:396-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L396-L397)).
- **Background pass-through.** Output pixels whose histology is background
  (`>240` or the 4080 sentinel) are copied straight through rather than
  synthesised, so non-tissue regions are preserved
  ([`histo_synthesize.cpp:525-529`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp#L525-L529)).
- **Self-match exclusion** (2-D training): forbids matching a pixel to a training
  voxel within `min_training_dist` of itself.
- **Periodic checkpointing.** Snapshots every 50 columns mean a long run leaves a
  partial result on disk if interrupted.

## Related Tools

- [[histo_register_block]] — registers a *real* histology section to a block
  face; the registration counterpart to this synthesis tool, same project.
- [[oct_register_mosaic]] — optical-microscopy mosaicking; shares the FreeSurfer
  2-D imaging and Powell/utility machinery.
- [[dissection_photo]] — GUI pipeline for calibrating and segmenting dissection
  photographs (a different stage of *ex vivo* photo processing).
- [[wiki/tools/mri_convert|mri_convert]] — to import MRI and digitised histology
  into `MRIread`-compatible volumes with matching geometry.

## Confidence and Gaps

**High confidence:** the complete option set and defaults, the patch-matching
synthesis algorithm (feature window, L1/L2 distances, random early-stopped
search, vox2vox correspondence, histology value transcription), the snapshot
behaviour, and the magic-constant masking — all read directly from
[`histo_synthesize.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp).

> [!gap] Source of the MRI↔histology registration
> The tool assumes the training MRI and histology are already co-registered via
> their headers; the registration step that establishes this correspondence is
> external (part of the wider histology pipeline) and not documented here.

> [!gap] Intended histology intensity convention
> The 240 / 4080 / 0–255 magic numbers imply a specific preprocessing of the
> histology volume (e.g. a particular stain-to-intensity mapping) that is not
> described in the source. Users supplying their own histology must match this
> convention for the masking to be correct.

## References

- FreeSurfer source: [`histo_synthesize/histo_synthesize.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_synthesize/histo_synthesize.cpp) (v8.2.0).
- Method lineage: non-parametric texture synthesis / "image analogies"
  patch-matching applied to MRI→histology appearance transfer (no in-tree paper
  reference; method-development tool by B. Fischl).
- Shared MRI utilities: `MRIreduce`, `MRIhistogramNormalize`,
  `MRIgetVoxelToVoxelXform` in the FreeSurfer `utils` library.
