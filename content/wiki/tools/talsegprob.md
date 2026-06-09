---
title: "talsegprob"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/talsegprob"
families: []                     # standalone group/atlas-building tcsh script
recon_all_stage: null
related:
  - "[[mri_vol2vol]]"
  - "[[mri_binarize]]"
  - "[[mri_concat]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_aparc2aseg]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Whether the duplicate `case --seg` (the second one, intended to append seg numbers) is ever reachable, or is dead code shadowed by the earlier `--seg`/`--segmentation` case — strongly appears to be dead from the tcsh switch semantics, but not runtime-confirmed."
tags:
  - segmentation
  - probability-map
  - talairach
  - group-analysis
  - atlas
---

# talsegprob

## Summary

`talsegprob` builds a **Talairach-space (MNI305/fsaverage) segmentation
probability map** across a group of subjects. For each subject it takes the
volumetric segmentation (`aseg.mgz` by default), reslices it into MNI305 space
with the subject's `talairach.xfm` (nearest-neighbour), binarizes it to the
structure(s) of interest, and stacks the binary volumes across subjects. The mean
of that stack is, voxel by voxel, the **fraction of subjects whose chosen
structure occupied that voxel** — i.e. a probability map for the structure in
standard space. An alternative `--vote` mode skips the binarization and instead
produces, at each voxel, the most common label across subjects, yielding an
aseg-like "majority-vote" segmentation. There is a built-in `--hippo` shortcut for
the hippocampi.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/talsegprob`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob)
- **Binary/script location:** `$FREESURFER_HOME/bin/talsegprob`
- **Original author:** Doug Greve ([`scripts/talsegprob:9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L9))
- **Key helpers invoked:**
  [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L125) (reslice each aseg to MNI305 via the talairach.xfm),
  [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L139) (select the structure voxels), and
  [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L160) (stack subjects, then `--mean` or `--vote`).

## Purpose and Context

A common need in neuroimaging is a **spatial prior**: a map in a standard template
that says how likely each voxel is to belong to a given structure, estimated from
a training group. `talsegprob` produces exactly such a map directly from
FreeSurfer segmentations. Because each subject's `aseg.mgz` is already an accurate,
individually-tailored segmentation, warping many of them into a common space and
averaging gives an empirical probability atlas without any additional manual
labelling.

Typical uses: building a probabilistic ROI (e.g. a hippocampus prior) for seeding
or masking; QC of registration across a cohort (a tight probability map means
consistent alignment); or a quick majority-vote consensus segmentation in template
space. It is a **standalone group-level tool**, run by hand on a set of completed
recon-all subjects; it is not part of recon-all.

## Inputs

### Required Inputs

- **A list of subjects** — supplied one of three ways
  ([`scripts/talsegprob:494-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L494-L499)): `--subjects s1 s2 …`, an FSGD file via
  `--fsgd` (subjects read from its `Input` lines,
  [`scripts/talsegprob:228-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L228-L229)), or the `SUBJECTS` environment
  variable.
- For each subject, in `$SUBJECTS_DIR/<subject>/mri/`:
  - the segmentation **`aseg.mgz`** (or `<segfile>.mgz` set by `--segmentation`),
    checked at [`scripts/talsegprob:101-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L101-L105);
  - the **Talairach transform** `transforms/talairach.xfm` (or the name given by
    `--xform`), checked at [`scripts/talsegprob:94-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L94-L98).
- **At least one structure** — one or more segmentation label numbers
  (`--seg N`/`--hippo`/…), **unless** `--vote` is used (vote needs no label).

### Input Assumptions

> [!assumption] Completed recon-all subjects sharing the LUT label scheme
> Each subject must have `aseg.mgz` and a valid `talairach.xfm`. Structure
> numbers are interpreted against `$FREESURFER_HOME/FreeSurferColorLUT.txt`
> ([`scripts/talsegprob:504-508`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L504-L508)) (e.g. left putamen = 12, left
> hippocampus = 17, right hippocampus = 53). All subjects are assumed to be in the
> same label convention so that "fraction with label X" is meaningful across the
> group. The reslicing target is `$FREESURFER_HOME/average/mni305.cor.mgz`
> ([`scripts/talsegprob:126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L126)), so output is in MNI305/fsaverage space.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<probfname>` (`--p`) | user path | Probability map: per-voxel fraction of subjects whose structure occupied that voxel (mean of the binary stack) |
| `<votefname>` (`--vote`) | user path | Majority-vote label volume across subjects (usable like an aseg) |
| `<concatfname>` (`--c`, optional) | user path | All subjects' resliced (binarized) segmentations concatenated into one 4-D volume (viewable as a "movie") |
| `<outstem>.log` | next to the output | Command log (previous run rotated to `.bak`, [`scripts/talsegprob:70-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L70-L71)) |
| `tmpdir/aseg-<subject>.mgz` | temp (deleted unless `--nocleanup`) | Per-subject resliced (and binarized) segmentation |

### Output Specifications

> [!gotcha] Output FOV is a reduced 151 × 151 × 186, 1 mm³ box
> Both `--p` and `--c` outputs are 1 mm³ but the field of view is cropped to
> 151 × 151 × 186 "to save space and time" ([`scripts/talsegprob:523-524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L523-L524))
> — they are **not** full 256³ MNI305 volumes. This is inherited from the
> `mri_vol2vol` target/options. Bear this in mind when overlaying on a full-size
> template.

For `--p`, voxel values are in [0, 1] (subject fraction = probability). For
`--vote`, voxel values are label numbers (the winning label per voxel). The
concatenation `--c` is a frames-as-subjects 4-D volume of the binary (or, in vote
mode, raw resliced) segmentations.

## Mathematical Foundations

> [!math] Per-voxel structure probability
> For subject $i$ let $S_i$ be the segmentation resliced to MNI305 and
> $b_i(v) = \mathbb{1}[\,S_i(v) \in \{\text{chosen labels}\}\,]$ the binary
> structure mask (built by [[mri_binarize]] `--match`,
> [`scripts/talsegprob:139-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L139-L141)). The probability map is the across-subject
> mean ([[mri_concat]] `--mean`, [`scripts/talsegprob:160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L160)):
> $$P(v) = \frac{1}{N}\sum_{i=1}^{N} b_i(v) \in [0,1].$$
> Reslicing uses **nearest-neighbour** interpolation
> ([`scripts/talsegprob:127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L127)) so that label identities are preserved (no
> intermediate fractional labels), via the 12-DOF affine `talairach.xfm`.

> [!math] Vote mode
> With `--vote`, binarization is skipped and [[mri_concat]] `--vote`
> ([`scripts/talsegprob:162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L162)) returns, per voxel, the most frequent label
> across the $N$ resliced segmentations — a consensus aseg in template space.

> [!internal] No arithmetic in the script itself
> All numerical work (affine resampling, label matching, averaging/voting) is done
> by [[mri_vol2vol]], [[mri_binarize]], and [[mri_concat]]. `talsegprob` only
> sequences them and builds the file list.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/talsegprob:193-384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L193-L384)). The parser uses a `getting_subjects`
state so that bare tokens after `--subjects` are accumulated as subject IDs until
the next flag.

#### Subject specification

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subjects` | string … (variadic) | — | One or more subject IDs; consumes all following bare tokens until the next flag. |
| `--fsgd` | string (path) | — | FSGD file; subjects are the `Input` rows. Must exist. |
| *(env)* `SUBJECTS` | env var | — | Subject list taken from the environment if neither of the above is given. |

#### Structure selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--seg` | int (label) | — | **Documented as** "the segmentation number to include; repeatable for multiple structures". **See the contradiction below — the duplicate case means `--seg` actually behaves like `--segmentation`.** |
| `--segmentation`<br>`--seg` | string (segfile stem) | `aseg` | Use `<subj>/mri/<segfile>.mgz` as the input segmentation instead of `aseg`. |
| `--hippo` | bool | off | Shortcut: select labels 17 **and** 53 (both hippocampi). Implies `--nocleanup`. |
| `--left-hippo` | bool | off | Shortcut: select label 17. Implies `--nocleanup`. |
| `--right-hippo` | bool | off | Shortcut: select label 53. Implies `--nocleanup`. |

#### Outputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--p` | string (path) | *(one of --p/--vote required)* | Probability-map output (sets `DoVote=0`). |
| `--vote` | string (path) | — | Majority-vote output (sets `DoVote=1`); cannot be combined with a structure number. |
| `--c` | string (path) | — | Also write the concatenated 4-D stack of per-subject segmentations. |
| `--no-vote` | bool | (vote off) | Force `DoVote=0`. |

#### Other

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--xform` | string (filename) | `talairach.xfm` | Use `mri/transforms/<name>` as the Talairach transform. |
| `--sd`<br>`--sdir` | string (path) | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--tmpdir` | string (path) | `<outdir>/tmp/talsegprob` | Temp directory (implies `--nocleanup`). |
| `--nocleanup` | bool | off | Do not delete the temp directory. |
| `--debug`<br>`--echo` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

> [!contradiction] Two `case "--seg"` labels — the second is unreachable
> The switch defines `--seg` **twice**: first merged with `--segmentation` to set
> the *segmentation file name* ([`scripts/talsegprob:264-273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L264-L273)), and again
> later, intended to *append a label number* to `SegNos`
> ([`scripts/talsegprob:285-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L285-L293)). In a tcsh `switch`, the **first** matching
> `case` wins, so `--seg <N>` is parsed by the earlier branch and sets
> `segmentation = <N>` — it does **not** add `<N>` to the structure list. The help
> ([`scripts/talsegprob:447-448`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L447-L448), [`scripts/talsegprob:504-507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L504-L507))
> documents `--seg <N>` as the way to pick a structure, which disagrees with this
> code path. **Code is authoritative.** In practice this means the reliable ways to
> select a structure are the `--hippo`/`--left-hippo`/`--right-hippo` shortcuts
> (which set `SegNos` directly) or `--vote`; selecting an *arbitrary* label by
> number via `--seg` appears broken in this version. Flagged as a [!gap] below.

### Configuration Interactions

> [!gotcha] `--p` and `--vote` are mutually exclusive; one is required
> `check_params` errors if a structure number is given together with `--vote`
> ("cannot spec a segmentation AND --vote",
> [`scripts/talsegprob:416-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L416-L419)), and errors if neither a structure nor
> `--vote` is given ([`scripts/talsegprob:412-415`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L412-L415)). Both `--p` and `--vote`
> also *set the output file*, so the last of the two on the command line both
> chooses the mode and names the output. You need exactly one of probability mode
> (with at least one structure) or vote mode (no structure).

> [!gotcha] The hippo shortcuts silently force `--nocleanup`
> `--hippo`, `--left-hippo`, and `--right-hippo` each set `cleanup = 0`
> ([`scripts/talsegprob:307-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L307-L332)), so the temp directory of per-subject
> resliced volumes is left behind after a hippocampus run.

- `--c` changes the pipeline: with it, all subjects are first concatenated into
  `<concatfname>`, and the mean/vote is then computed *from that file*
  ([`scripts/talsegprob:167-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L167-L181)); without it, the mean/vote is computed
  directly from the per-subject list.
- `--segmentation <stem>` lets you build a probability map from a non-aseg
  segmentation (e.g. a custom or sub-structure seg), provided every subject has
  `<stem>.mgz`.

## Typical Use Cases

### 1. Bilateral hippocampus probability map for a cohort

```bash
talsegprob --subjects tl-wm sh-wm s003 s004 \
  --hippo --p hip.prob.mgz --c hip.cat.mgz
# hip.prob.mgz: fraction of subjects with hippocampus per MNI305 voxel
```

View the probability map:

```bash
tkmedit fsaverage orig.mgz -overlay hip.prob.mgz -fthresh .01 -fmax 1
```

### 2. Majority-vote consensus aseg in template space

```bash
talsegprob --fsgd study.fsgd --vote groupaseg.vote.mgz
```

Each voxel gets the most common aseg label across the group — an "average
anatomy" segmentation usable like an aseg.

### 3. Probability map from a non-default segmentation

```bash
# Use mri/wmparc.mgz instead of aseg.mgz as the source segmentation,
# building a consensus with --vote (no per-label selection needed).
talsegprob --subjects s1 s2 s3 --segmentation wmparc --vote wmparc.vote.mgz
```

> [!gotcha] Selecting one arbitrary label by number is unreliable here
> Because of the duplicate `--seg` case (above), `--seg 12` does **not** select
> putamen in this version — prefer the hippo shortcuts, `--vote`, or post-hoc
> thresholding/relabelling of a vote/probability output.

## Pipeline Context

`talsegprob` is a **standalone, group-level atlas-building tool**. It is not part
of recon-all; it runs *after* a set of subjects have been fully reconstructed.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] on each subject
(produces `aseg.mgz` and `talairach.xfm`) → **talsegprob** → **Successors:** the
resulting probability map can seed/mask ROIs, serve as a spatial prior, or (vote
output) act as a template-space aseg; downstream viewing in
[[wiki/tools/freeview|freeview]]/tkmedit.

## Gotchas and Caveats

> [!gotcha] Cropped FOV, not full MNI305
> See Output Specifications — outputs are 1 mm³ but cropped to 151 × 151 × 186.

> [!gotcha] Nearest-neighbour reslicing is intentional
> Labels are resampled with `--interp nearest` so that integer label identities
> survive the affine warp; do not switch to trilinear or you would create
> meaningless intermediate label values.

> [!gotcha] An (commented-out) alternative `--talxfm` reslicing path exists
> The script contains a disabled `if(0)` block that would build an identity reg
> file and use `mri_vol2vol --talxfm --tal` instead of the active
> `--xfm <talairach.xfm> --targ mni305.cor.mgz` path
> ([`scripts/talsegprob:109-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L109-L128)). Only the active path runs; the dead
> branch is noted here only to forestall confusion when reading the source.

## Error Compensation and Guard Rails

- **Per-subject existence checks.** The transform and the segmentation are each
  verified for every subject before processing, aborting on the first missing file
  ([`scripts/talsegprob:94-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L94-L105)).
- **Required-argument checks.** Aborts if no subjects, no `SUBJECTS_DIR`, no
  output file, or an invalid structure/`--vote` combination
  ([`scripts/talsegprob:390-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L390-L419)).
- **Fail-fast.** Each helper invocation checks `$status` and aborts on error.
- **Log rotation.** A previous `<outstem>.log` is moved to `.bak`
  ([`scripts/talsegprob:70-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L70-L71)).

## Known Bugs

- [[00169]] — a duplicate `case "--seg"` (aliased with `--segmentation`) shadows the label-number path, so `--seg <N>` sets the segmentation filename instead of populating `SegNos` and the run aborts.

## Related Tools

- [[mri_vol2vol]] — reslices each subject's segmentation into MNI305 space using the talairach.xfm (nearest-neighbour).
- [[mri_binarize]] — selects the structure voxels (`--match`) to form the per-subject binary mask in probability mode.
- [[mri_concat]] — stacks subjects and reduces with `--mean` (probability) or `--vote` (consensus label).
- [[mri_aparc2aseg]] — produces richer segmentations (`aparc+aseg`, `wmparc`) that can be fed in via `--segmentation` for cortical/WM probability maps.
- [[wiki/pipelines/recon-all|recon-all]] — produces the `aseg.mgz` and `talairach.xfm` inputs for every subject.

## Confidence and Gaps

**High confidence:** the overall algorithm (reslice → binarize → mean, or
reslice → vote), the MNI305 target and cropped FOV, the subject-specification
mechanisms, the `--p`/`--vote` mutual exclusion, and the hippo shortcuts forcing
`--nocleanup` — read directly from
[`scripts/talsegprob`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob).

> [!gap] Is `--seg <N>` (arbitrary label selection) actually broken?
> The duplicate `case "--seg"` strongly implies the second branch (append to
> `SegNos`) is shadowed by the earlier `--seg`/`--segmentation` branch under tcsh
> `switch` first-match semantics, so `--seg 12` would set the *segmentation file
> name* to `12` rather than selecting putamen. This was deduced from the source,
> not confirmed at runtime; a developer should verify and either remove the dead
> case or rename one of them. Until then, rely on the hippo shortcuts or `--vote`.

## References

- FreeSurfer source: [`scripts/talsegprob`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob) (v8.2.0).
- Built-in help: `talsegprob --help` (the `BEGINHELP` block,
  [`scripts/talsegprob:482-540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talsegprob#L482-L540)).
- Reslicing target: `$FREESURFER_HOME/average/mni305.cor.mgz` (MNI305/fsaverage
  space); label numbers per `$FREESURFER_HOME/FreeSurferColorLUT.txt`.
