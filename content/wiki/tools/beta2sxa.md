---
title: "beta2sxa"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/beta2sxa"
families: []                     # FS-FAST format-conversion utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_concat]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_volsynth]]"
  - "[[mri_info]]"
  - "[[tkmedit]]"
  - "[[tksurfer]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The selxavg/sxa header fields (SumXtX, hCovMtx, TPreStim, etc.) are emitted as identity/placeholder values; their exact downstream interpretation by the legacy FS-FAST selxavg plotter was inferred from the file structure, not from selxavg source."
tags:
  - fsfast
  - selxavg
  - sxa
  - format
  - glm
  - plotting
---

# beta2sxa

## Summary

`beta2sxa` packages a GLM **beta (parameter-estimate) volume** — or a stack of
them — into the legacy **FS-FAST "selxavg" (sxa)** format so the values can be
plotted as time-course-style traces in [[tkmedit]] or [[tksurfer]] (passed via
their `-t` option). It is a small convenience converter: given a beta volume
with `Nc × Nper` frames (e.g. `Nc` conditions/groups, `Nper` levels/subjects per
condition), it writes a companion `.dat` "h-file" header describing a minimal
hemodynamic-response layout and an output volume in which each condition's
`Nper` values are interleaved with zero-padding frames in the pattern
`z z b1 z b2 z b3 …`. The result is a pair `h.<name>.<ext>` + `h.<name>.dat`
that the old FS-FAST selxavg viewer understands as an average/error overlay.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/beta2sxa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa)
- **Binary/script location:** `$FREESURFER_HOME/bin/beta2sxa`
- **Helpers invoked:** [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L62) (stack input betas and assemble the interleaved output), [`mri_volsynth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L119-L120) (synthesise the all-zero padding volume), [`mri_convert --fsubsample`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L131) (slice out each condition's frame block), and [`mri_info --nframes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L69) (verify the frame count). Filename utilities `fname2stem`/`stem2fmt` derive the output stem and format.

> [!gotcha] Stray header/comment names ("thalseg", "reg-feat2anat") are leftovers
> The very first comment line reads `# thalseg`
> ([`scripts/beta2sxa:2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L2)),
> the default log file is named `thalseg.log`
> ([`scripts/beta2sxa:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L46)),
> and the title text says "Log file for beta2sxa". These are copy-paste artefacts
> from an unrelated script; the `VERSION` string is `beta2sxa @FS_VERSION@`
> ([`scripts/beta2sxa:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L4))
> and the tool is genuinely beta2sxa.

## Purpose and Context

The FS-FAST functional-analysis stream historically stored event-related
averages in a "selxavg" (selective averaging) format consisting of an `h.<name>`
data volume plus an `h.<name>.dat` ASCII header (the "h-file"). The legacy
[[tkmedit]]/[[tksurfer]] viewers can load such a pair with `-t` and draw the
per-condition response as a trace at the selected voxel/vertex.

`beta2sxa` exists to reuse that plotting machinery for **arbitrary tabular
data**: if you have a volume whose frames are organised as `Nc` conditions ×
`Nper` values, the script reformats it into a valid (if minimal) selxavg pair so
you can click around in [[tkmedit]]/[[tksurfer]] and see each condition's values
plotted. The script's own help frames the canonical example as "4 groups with 18
subjects per group" stored in `data.nii`
([`scripts/beta2sxa:298-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L298-L319)).

It is a **stand-alone utility**: it is not part of
[[wiki/pipelines/recon-all|recon-all]], `trac-all`, or any automated pipeline.

## Inputs

### Required Inputs

- **Beta volume(s)** — given with `--b`/`--beta` (repeatable). One volume with
  `Nc × Nper` frames, **or** `Nc × Nper` files that the script concatenates
  along the frame axis with [[mri_concat]]
  ([`scripts/beta2sxa:58-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L58-L63)).
  Each must exist.
- **`--nc Nc`** — number of conditions (the outer grouping). *Required.*
- **`--nper Nper`** — number of values per condition (the inner block).
  *Required.*

The total frame count of the (possibly concatenated) input **must equal
`Nc × Nper`**, or the script aborts with a dimension-mismatch error
([`scripts/beta2sxa:65-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L65-L74)).

### Input Assumptions

> [!assumption] Frame ordering is condition-major: Nc blocks of Nper frames
> The input frames are assumed to be laid out as condition 1's `Nper` values,
> then condition 2's `Nper` values, … The script slices block `k` as frames
> `[(k-1)·Nper, k·Nper)` with `mri_convert --fsubsample`
> ([`scripts/beta2sxa:125-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L125-L133)).
> If your data are interleaved differently, the per-condition traces will be
> scrambled. The spatial geometry can be anything (volume **or** surface-as-
> volume); the padding volume is synthesised from the input's own template
> ([`scripts/beta2sxa:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L119)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `h.<name>.<ext>` (the sxa volume; default name from the input stem) | `dirname(--o)` (default: input's directory) | The reformatted volume: for each condition, the `Nper` beta frames interleaved with zero frames, prefixed by two zero "baseline" frames — the `z z b1 z b2 z …` selxavg layout. |
| `h.<name>.dat` (the selxavg "h-file" header) | alongside the volume | ASCII header with `TR`, `TimeWindow`, `TPreStim`, `nCond`, `Nh`, `TER`, and identity `SumXtX` / `hCovMtx` matrices (see Mathematical Foundations). |
| `<tmpdir>/thalseg.log` | `tmpdir.beta2sxa/` (default) or `--tmpdir`/`--log` | Run log. Deleted with the temp dir unless `--nocleanup`/`--tmpdir`/`--log` retain it. |

By default the output stem is derived from the **first** input as
`h.<betastem>.<betafmt>` in the input's directory
([`scripts/beta2sxa:251-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L251-L258));
`--o`/`--sxa` overrides it. The `.dat` path is the output stem with `.dat`
([`scripts/beta2sxa:77-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L77-L79)).

### Output Specifications

The output volume has the **same spatial dimensions** as the input and a frame
count of `2 + Nc·(Nper + 1) − 1`… more precisely it is assembled by
[[mri_concat]] from the list
`z z (b1block z) (b2block z) … (bNcblock z)` where each `z` is one `Nper`-frame
zero volume and each `block` is one condition's `Nper` frames
([`scripts/beta2sxa:117-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L117-L134)).
The `.dat` h-file is a plain-text selxavg header; the two `Nbeta × Nbeta`
identity matrices it contains make the downstream error bars trivial (unit
variance, uncorrelated). It is meant to be **loaded, not analysed** — the values
are for visualisation in [[tkmedit]]/[[tksurfer]].

## Mathematical Foundations

`beta2sxa` does almost no arithmetic; it **re-lays-out** frames and writes a
fixed header. The only computed quantities are the expected frame count
`Nbexp = Nc · Nper` (via `bc`, [`scripts/beta2sxa:65-66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L65-L66))
and the per-condition frame ranges `[(k−1)·Nper, k·Nper)`.

The selxavg "h-file" it emits encodes a degenerate GLM/HRF summary so the legacy
plotter has well-defined (trivial) error structure:

> [!math] The selxavg .dat header is a placeholder design
> The header sets `TR 1`, `TimeWindow Nper`, `TPreStim 0`, `nCond = Nc + 1`
> (conditions plus the implicit null condition), `Nh Nper`, `TER 1`, and then two
> $N_\beta \times N_\beta$ **identity matrices** — `SumXtX` (here standing in for
> $X^{\top}X$) and `hCovMtx` (the estimate covariance) — built explicitly with
> `v = 1` on the diagonal and `0` off-diagonal
> ([`scripts/beta2sxa:81-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L81-L112)),
> where $N_\beta$ is the total number of input frames. Identity covariance means
> every plotted value gets unit variance and zero cross-correlation — i.e. the
> error bars are nominal, not derived from the real GLM. This is intentional: the
> file exists to *display* a table, not to re-estimate statistics.

> [!math] The interleaved volume layout
> The output frame sequence is
> $$z,\; z,\; \underbrace{b^{(1)}_1\dots b^{(1)}_{N_{per}}}_{\text{cond }1},\; z,\; \underbrace{b^{(2)}_1\dots b^{(2)}_{N_{per}}}_{\text{cond }2},\; z,\; \dots,\; \underbrace{b^{(N_c)}_1\dots b^{(N_c)}_{N_{per}}}_{\text{cond }N_c},\; z$$
> where each $z$ is an $N_{per}$-frame zero volume from [[mri_volsynth]]
> (`--pdf const --val-a 0`). The two leading $z$ blocks form the selxavg baseline;
> a trailing $z$ separates each condition. The help summarises this as
> `z z b1 z b2 z b3 …` ([`scripts/beta2sxa:300-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L300-L302)).

> [!internal] All voxel-level work is delegated
> Zero-volume synthesis is [[mri_volsynth]]; frame slicing is
> [`mri_convert --fsubsample n1 1 n2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L131)
> (start, step, stop); stacking is [[mri_concat]]. `beta2sxa` itself only writes
> the ASCII `.dat` and orchestrates these calls.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/beta2sxa:168-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L168-L239)).
Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--beta`<br>`--b` | string (repeatable) | *(required)* | Input beta/parameter volume. Repeat to supply the conditions as separate files; they are concatenated frame-wise. Each must exist. |
| `--nc` | integer | *(required)* | Number of conditions `Nc` (outer grouping). |
| `--nper` | integer | *(required)* | Number of values per condition `Nper` (inner block; also the selxavg `TimeWindow`/`Nh`). |
| `--sxa`<br>`--o` | string (filename) | `dir(beta1)/h.<betastem>.<betafmt>` | Output sxa volume path. The `.dat` header is written to the matching stem. |
| `--tmpdir` | string (dir) | `<outdir>/tmpdir.beta2sxa` | Working directory for intermediates; **specifying it also sets `--nocleanup`** (the dir is kept). |
| `--nocleanup` | bool | off | Keep the temp directory and its intermediates after finishing. |
| `--cleanup` | bool | on | Remove the temp directory at the end (the default). |
| `--log` | string (filename) | `<tmpdir>/thalseg.log` | Explicit log-file path (retained even with cleanup). |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` command tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--tmpdir` silently disables cleanup
> Passing `--tmpdir <dir>` sets `cleanup = 0`
> ([`scripts/beta2sxa:213-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L213-L217)),
> so the working directory (and any intermediates) is **not** removed even though
> you did not pass `--nocleanup`. Use the default temp dir, or add `--cleanup`
> after `--tmpdir`, if you want it deleted.

> [!gotcha] `Nc × Nper` must match the input frame count exactly
> The script counts the input frames with `mri_info --nframes` and aborts if it
> differs from `Nc·Nper` ([`scripts/beta2sxa:65-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L65-L74)).
> When supplying multiple `--b` files, their **combined** frame count must equal
> `Nc·Nper` (commonly: `Nc` files of `Nper` frames each).

- `--cleanup`/`--nocleanup`/`--tmpdir` are evaluated left to right; the last
  cleanup-affecting flag wins, but note `--tmpdir` flips cleanup off as a
  side effect (above).
- `--sxa` and `--o` are exact synonyms; `--beta` and `--b` are exact synonyms.
- If `--o` is omitted, the output is named from the **first** `--b` file's stem
  and format ([`scripts/beta2sxa:251-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L251-L258)).

## Typical Use Cases

### 1. One file holding all conditions

```bash
# data.nii has Nc*Nper = 4*18 = 72 frames (4 groups, 18 subjects each)
beta2sxa --b data.nii --nc 4 --nper 18
# → h.data.nii and h.data.dat (in data.nii's directory)
```

### 2. View the result as traces in tkmedit / tksurfer

```bash
tkmedit  subject orig.mgz       -reg register.dat -t h.data.nii
tksurfer subject lh inflated    -reg register.dat -t h.data.nii
```

(From the script's help, [`scripts/beta2sxa:312-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L312-L313).)

### 3. Conditions stored in separate files

```bash
beta2sxa --b data1.nii --b data2.nii --b data3.nii --b data4.nii \
  --nc 4 --nper 18 --o h.data.nii
# the four files are concatenated to 72 frames, then reformatted
```

### 4. Keep the intermediates for inspection

```bash
beta2sxa --b data.nii --nc 4 --nper 18 --tmpdir /tmp/sxa.work
# /tmp/sxa.work is retained (z.nii, beta.sub.*.nii, log)
```

## Pipeline Context

`beta2sxa` is a stand-alone **format-conversion / visualisation** utility. It is
**not** invoked by [[wiki/pipelines/recon-all|recon-all]], `trac-all`, or the
FSL/FEAT bridge scripts.

**Predecessor:** any GLM that produces a beta/parameter-estimate volume — e.g.
[[wiki/tools/mri_glmfit|mri_glmfit]] (its `beta.mgh`), FSL FEAT PEs, or a
hand-assembled table of values → **beta2sxa** → **Successors:** [[tkmedit]] /
[[tksurfer]] loaded with `-t h.<name>` to plot the per-condition values. Within
the FS-FAST world it produces the legacy "selxavg" pair the old plotters expect.

## Gotchas and Caveats

> [!gotcha] Output values are for plotting, not for re-analysis
> The emitted `.dat` carries **identity** `SumXtX`/`hCovMtx` matrices, so any
> statistics the selxavg viewer derives (error bars, significance) are nominal,
> not the real GLM's. Treat `h.<name>.*` as a display artefact.

> [!gotcha] Default output overwrites silently and lives next to the input
> Without `--o`, the output is `h.<betastem>.<fmt>` **in the input's directory**
> ([`scripts/beta2sxa:251-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L251-L258));
> the `.dat` is force-removed and rewritten ([`scripts/beta2sxa:77-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L77-L80)).
> Re-running clobbers a previous `h.<name>.*` of the same stem.

> [!gotcha] A dead "old way" block exists but is disabled
> Lines [`scripts/beta2sxa:136-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L136-L155)
> are wrapped in `if(0) then … endif` and never run; they are a slower,
> incremental-concat predecessor of the current assembly. Only the
> single-`mri_concat` path at [`scripts/beta2sxa:117-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L117-L134)
> is active.

## Error Compensation and Guard Rails

- **Frame-count verification.** The input is checked against `Nc·Nper` before any
  output is produced ([`scripts/beta2sxa:65-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L65-L74)).
- **Required-argument checks** for the input, `Nc`, and `Nper`
  ([`scripts/beta2sxa:247-266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L247-L266)).
- **Output-directory creation** with `mkdir -p`, and the output path is
  canonicalised via `pushd`/`pwd`
  ([`scripts/beta2sxa:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L37-L42)).
- **Status checks** after `mri_volsynth` abort the run on failure
  ([`scripts/beta2sxa:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L121)).
- It **does not** modify the input volume; it only reads frames out of it.

## Related Tools

- [[mri_concat]] — concatenates the input betas (if several) and assembles the
  interleaved output volume.
- [[wiki/tools/mri_convert|mri_convert]] — `--fsubsample` slices out each
  condition's frame block.
- [[mri_volsynth]] — synthesises the all-zero padding volume from the input
  template.
- [[mri_info]] — reports the input frame count for the `Nc·Nper` check.
- [[tkmedit]] / [[tksurfer]] — load the resulting `h.<name>` pair with `-t` to
  plot the per-condition values.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — a typical source of the beta volume that
  `beta2sxa` repackages.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the required `Nc`/`Nper`
inputs and the frame-count check, the `z z b1 z b2 z …` interleaving and how it
is assembled (`mri_volsynth` zeros, `mri_convert --fsubsample` blocks,
`mri_concat` stack), the identity-matrix `.dat` header contents, the default
output naming, and the `--tmpdir`-disables-cleanup side effect — all read
directly from [`scripts/beta2sxa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa).
The `thalseg`/`reg-feat2anat` strings are confirmed copy-paste leftovers.

> [!gap] Downstream selxavg interpretation of the header fields
> The precise meaning each legacy FS-FAST selxavg plotter assigns to `SumXtX`,
> `hCovMtx`, `TPreStim`, `TER`, and `nCond = Nc+1` was inferred from the file
> structure, not verified against the selxavg/`yakview` source. The values are
> placeholders sufficient for plotting; their exact role in error-bar rendering
> is unconfirmed.

## References

- FreeSurfer source: [`scripts/beta2sxa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa) (v8.2.0).
- Built-in help: `beta2sxa --help` (the `BEGINHELP` block,
  [`scripts/beta2sxa:296-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/beta2sxa#L296-L319)).
- FS-FAST "selxavg" selective-averaging format (legacy) — the `h.*`/`h.*.dat`
  h-file pair this tool emits.
