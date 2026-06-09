---
title: "bbmask"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/bbmask"
families: []                     # standalone tcsh utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[bblabel]]"
  - "[[mri_mask]]"
  - "[[mri_matrix_multiply]]"
  - "[[tkregister2]]"
  - "[[mgz]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact field-of-view / geometry change produced by mri_mask -bb (crop + recentred vox2ras) is documented in the mri_mask page; bbmask delegates all geometry to it and only stitches registrations together."
  - "The internal helper tkregister2_cmdl (the non-interactive entry point of tkregister2) does not yet have its own wiki page; it is the command-line build of tkregister2."
tags:
  - mask
  - volume
  - bounding-box
  - registration
  - field-of-view
---

# bbmask

## Summary

`bbmask` creates a **smaller-field-of-view copy of a volume** by cropping it to a
tight bounding box around a mask. It calls [[mri_mask]] with the `-bb` option to
compute the smallest box that contains all non-zero (above-threshold) mask
voxels — optionally padded by `npad` voxels — and writes the cropped mask, plus
any number of same-geometry "source" volumes cropped to that same box. Crucially,
it also produces a **registration matrix** linking the new, cropped field of view
back to the original volume, so analyses run in the reduced FOV can be mapped
back to full space. It is the **volume** counterpart of [[bblabel]] (which crops
a *label*).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/bbmask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask)
- **Binary/script location:** `$FREESURFER_HOME/bin/bbmask`
- **FreeSurfer tools invoked:**
  [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L77) (computes the bounding box and crops — [[mri_mask]]),
  [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L95) (builds the header-based registration between
  cropped and original volumes — the non-interactive build of [[tkregister2]]),
  and [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L108) (composes registrations — [[mri_matrix_multiply]]).
  It also uses the FreeSurfer helper `fs_temp_dir` and sources
  `$FREESURFER_HOME/sources.csh` ([`scripts/bbmask:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L33)).

## Purpose and Context

Many FreeSurfer/FSFAST volumes carry a large field of view in which the object of
interest (a brain, a small structure) occupies only a fraction of the voxels.
Processing or storing the full FOV wastes time and disk. `bbmask` addresses this
by shrinking the FOV to a bounding box around a supplied mask:

1. Compute the smallest axis-aligned voxel box containing the mask, expanded by
   `npad` voxels, and crop the mask to it.
2. Crop any number of other volumes of the **same geometry** (e.g. functional
   runs, anatomicals) to the identical box.
3. Emit a registration matrix so that results computed in the cropped space can
   be carried back to the original volume's space (and vice-versa).

The purpose is summarised in the help: *"create a volume with a smaller field of
view by creating a bounding box small enough to encompass a mask … Other volumes
that are the same size as the input mask can be reduced to the bounding box. If a
registration file for the input mask is passed, then a new registration file is
created that can be applied to the new field of view."*
([`scripts/bbmask:285-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L285-L291)).

It is a hand-run pre-processing/utility script. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] or [[wiki/pipelines/trac-all|trac-all]],
and no other FreeSurfer script calls it.

## Inputs

### Required Inputs

| Flag | Arguments | What it is |
|------|-----------|------------|
| `--mask` | `inputmask outputmask` | **Required.** The mask volume to bound (input) and the path for the cropped mask (output). The input must exist ([`scripts/bbmask:151-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L151-L159)). Format is anything [[mri_convert|MRI I/O]] reads ([[mgz]], `nii`/`nii.gz`, …). |

### Optional Inputs

| Flag | Arguments | What it is |
|------|-----------|------------|
| `--src` | `inputvol outputvol` | A further volume (same geometry as the mask) to crop to the same box; repeatable to crop several volumes in one run ([`scripts/bbmask:161-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L161-L171)). |
| `--reg` | `srcreg.dat subreg.dat` | An **existing** registration for the source volume (input `srcreg.dat`); `bbmask` composes it with the crop transform and writes the cropped-space registration to `subreg.dat` ([`scripts/bbmask:178-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L178-L186)). |

### Input Assumptions

> [!assumption] Source volumes must share the mask's geometry
> Each `--src` input volume is cropped with the *same* mask and the *same* box
> as the mask ([`scripts/bbmask:83-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L83-L91)). For the crop to make sense the
> source volume must have the **same voxel grid (dimensions and vox2ras)** as the
> input mask — they must be in register voxel-for-voxel. `bbmask` does not verify
> this; mismatched geometry produces a meaningless crop.

- The mask is **thresholded at 0.01** before the box is computed (`mri_mask -T
  .01`, [`scripts/bbmask:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L77)), so only voxels with value $> 0.01$ count as
  "in the mask". A soft/probabilistic mask is effectively binarised at that
  threshold for box-finding purposes.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `outputmask` (`--mask`) | volume ([[mgz]]/nii/…) | The input mask cropped to the bounding box (padded by `npad`+1 voxels). Its header carries the new, smaller FOV geometry. |
| `outputvol` (per `--src`) | volume | Each source volume cropped to the identical box. |
| `sub2srcreg` (default `<tmp>/sub2srcreg.dat`, or `--sub2src`) | registration `.dat` | Header-based registration with **mov = cropped (sub) volume, target = original mask** ([`scripts/bbmask:94-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L94-L98)). |
| `subreg.dat` (via `--reg` or `--regheader`) | registration `.dat` | The registration that applies in the cropped FOV (see Output Specifications). |
| `<outputmask>.bbmask.log` (or `--log`) | text | Run log: command line, build stamp, version, each sub-command and its output ([`scripts/bbmask:60-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L60-L71)). |

### Output Specifications

The two registration paths differ, and this is the subtle heart of the tool:

- **`--regheader subreg.dat`** — *no* prior registration exists. `bbmask` simply
  copies the cropped↔original header registration (`sub2srcreg`) to `subreg.dat`
  ([`scripts/bbmask:100-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L100-L104)). The output registers the **cropped volume to the
  original mask** purely from header geometry.
- **`--reg srcreg.dat subreg.dat`** — a prior registration `srcreg.dat` maps the
  *original* source volume to some other space (e.g. an anatomical). `bbmask`
  composes it with the crop transform via
  `mri_matrix_multiply -im sub2srcreg -im srcreg -om subreg`
  ([`scripts/bbmask:107-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L107-L112)), so `subreg.dat` is the registration that
  maps the **cropped** volume to that same other space.

The cropped volumes themselves are produced entirely by [[mri_mask]] `-bb`; the
new geometry (reduced col/row/slice counts and recentred vox2ras) is determined
there. `bbmask` adds no resampling — voxel values are copied, only the FOV
window changes.

## Mathematical Foundations

`bbmask` is a thin orchestrator; the geometry math lives in [[mri_mask]]. The two
operations it performs directly are:

1. **Bounding-box determination (delegated).** [[mri_mask]] `-bb npad` finds the
   minimum and maximum column/row/slice indices over thresholded mask voxels and
   expands each face by `npad` voxels. `bbmask` passes `npad2 = npad + 1`
   ([`scripts/bbmask:76-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L76-L77)), so even with the default `--npad 0` there is
   one voxel of padding on every side.

2. **Registration composition.** A registration here is a $4\times4$ matrix
   relating two volumes' coordinate frames. To carry a prior source-space
   registration into the cropped frame, `bbmask` multiplies the matrices
   $R_{\text{sub}} = R_{\text{sub}\to\text{src}}\, R_{\text{src}}$ using
   [[mri_matrix_multiply]] ([`scripts/bbmask:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L108)), where
   $R_{\text{sub}\to\text{src}}$ is the header-derived cropped→original
   registration from [[tkregister2]] (`tkregister2_cmdl --regheader`).

> [!internal] The FOV crop and vox2ras update happen in mri_mask
> The actual computation of the bounding box and the construction of the
> cropped volume's geometry are performed by [[mri_mask]] `-bb`, not by this
> script. `bbmask` only chooses the padding, runs the crops, and assembles the
> registration files.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/bbmask:143-236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L143-L236)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mask` | 2 strings | *(required)* | `inputmask outputmask`: the mask to bound and the cropped-mask output path. Input must exist. |
| `--src` | 2 strings (repeatable) | — | `inputvol outputvol`: an additional same-geometry volume to crop to the same box. Repeat for several volumes. |
| `--npad` | int | `0` | Voxels to pad the bounding box on each face. `bbmask` adds 1 internally, so the effective padding is `npad`+1 ([`scripts/bbmask:76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L76)). |
| `--reg` | 2 strings | — | `srcreg.dat subreg.dat`: input source-space registration → output cropped-space registration (composed with the crop transform). Input must exist. |
| `--regheader` | 1 string | — | `subreg.dat`: write a header-based cropped↔original registration (no prior reg needed). Mutually exclusive with `--reg`. |
| `--sub2src` | 1 string | `<tmpdir>/sub2srcreg.dat` | Output path for the cropped→original (mov = cropped) header registration. |
| `--log` | 1 string | `<outputmask>.bbmask.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | boolean | off | Send the log to `/dev/null` (suppress logging). |
| `--tmp`<br>`--tmpdir` | 1 string | auto (`fs_temp_dir --scratch`) | Use this scratch directory and **do not** clean it up afterwards. |
| `--nocleanup` | boolean | off | Keep the scratch directory after the run. |
| `--cleanup` | boolean | **on** | Remove the scratch directory at the end (the default). |
| `--debug` | boolean | off | tcsh tracing (`set echo`, `verbose`) ([`scripts/bbmask:224-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L224-L227)). |
| `--version` | boolean | — | Print version and exit ([`scripts/bbmask:27-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L27-L31)). |
| `--help` | boolean | — | Print full help (`BEGINHELP`) and exit ([`scripts/bbmask:22-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L22-L26)). |

### Configuration Interactions

> [!gotcha] `--reg` and `--regheader` are mutually exclusive
> Specifying both is a hard error: *"cannot spec --reg and --regheader"*
> ([`scripts/bbmask:247-250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L247-L250)). Use `--regheader` when you have no prior
> registration (you just want a geometric link back to the original); use
> `--reg` when you have an existing source-space registration to carry into the
> cropped FOV.

> [!gotcha] `--npad N` actually pads by N+1 voxels
> The script computes `npad2 = npad + 1` and passes *that* to `mri_mask -bb`
> ([`scripts/bbmask:76-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L76-L77)). So `--npad 0` (the default) yields a 1-voxel
> margin, `--npad 3` yields 4. Account for the extra voxel when matching a
> required output size.

Other interactions:

- `--tmp`/`--tmpdir` implies `--nocleanup` (sets `cleanup = 0`,
  [`scripts/bbmask:209-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L209-L214)), so a user-supplied scratch dir is preserved.
- The cropped→original header registration (`--sub2src` / `sub2srcreg`) is
  **always** computed, because it is the basis for both the `--regheader` copy
  and the `--reg` composition.

## Typical Use Cases

### 1. Crop a brain to a tight box and keep a way back

```bash
# Bound brain.mgz, write a cropped volume + a header registration to the original
bbmask --mask brain.mgz brain.bb.nii.gz --regheader reg.bb.dat
# Verify the registration interactively
tkregister2 --mov brain.bb.nii.gz --reg reg.bb.dat --targ brain.mgz
```

### 2. Crop functional runs and carry an existing registration into the cropped FOV

```bash
# mask.nii.gz already registered to anatomy via register.dat; crop two runs too
bbmask --mask mask.nii.gz mask.bb.nii.gz --reg register.dat reg.bb.dat \
   --src func1.nii.gz func1.bb.nii.gz --src func2.nii.gz func2.bb.nii.gz \
   --npad 3
# reg.bb.dat now registers the cropped funcs to the same anatomy
tkregister2 --mov func1.bb.nii.gz --reg reg.bb.dat
```

(Both examples are from the tool's own `BEGINHELP`,
[`scripts/bbmask:293-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L293-L304).)

## Pipeline Context

`bbmask` is a stand-alone FOV-reduction / pre-processing utility. It is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script references
it.

**Predecessor:** a mask plus same-geometry volumes (and optionally an existing
registration `.dat`) — e.g. a skull-stripped brain or an FSFAST mask →
**bbmask** → **Successor:** any volume processing run in the reduced FOV, with
results mapped back via the emitted registration; verification with
[[tkregister2]].

## Gotchas and Caveats

> [!gotcha] The mask is hard-thresholded at 0.01
> The box is computed from voxels with value $> 0.01$ (`mri_mask -T .01`,
> [`scripts/bbmask:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L77)). A mask scaled into a small range (e.g. 0–1
> probabilities below 0.01) could yield an empty or undersized box. Binarise or
> rescale the mask first if its values are very small.

> [!gotcha] Source volumes are cropped using the *mask*, not themselves
> Each `--src` crop runs `mri_mask -bb npad2 $src $inmask $trg`
> ([`scripts/bbmask:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L87)) — the second argument is always the **input mask**.
> The box always comes from the mask, and the source volume must share the
> mask's grid for the crop to align.

> [!gotcha] Existing log is deleted at the start
> Unless `--nolog` is given, `bbmask` removes any pre-existing log file before
> writing ([`scripts/bbmask:60-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L60-L61)). The default log path is derived from the
> output mask name (`<outputmask>.bbmask.log`).

## Error Compensation and Guard Rails

- **Mandatory-input check:** errors if `--mask` is not given
  ([`scripts/bbmask:243-246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L243-L246)); each `--mask`/`--src`/`--reg` input is
  checked for existence as it is parsed ([`scripts/bbmask:155-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L155-L158),
  [`:165-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L165-L168), [`:182-185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L182-L185)).
- **Mutual-exclusion check:** `--reg` together with `--regheader` aborts
  ([`scripts/bbmask:247-250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L247-L250)).
- **Per-step error trapping:** the mask crop, each source crop, and the
  matrix-multiply check `$status` and jump to `error_exit` on failure
  ([`scripts/bbmask:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L80), [`:90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L90), [`:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L111)). (The `tkregister2_cmdl`
  step is *not* status-checked — its failure would not abort the run.)
- **Output directory is auto-created** with `mkdir -p` from the output-mask path
  ([`scripts/bbmask:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L48-L49)).

## Known Bugs

- [[00172]] — `--npad N` pads the bounding box by `N+1` voxels (off-by-one: the script computes `npad2 = npad + 1` before `mri_mask -bb`).

## Related Tools

- [[bblabel]] — the **label** counterpart: crops a surface label to a coordinate
  bounding box (works on `.label` coordinates, not voxels).
- [[mri_mask]] — does the actual masking, bounding-box computation, and FOV
  crop (`-bb`/`-bbm`/`-T`); `bbmask` is a convenience wrapper around it.
- [[mri_matrix_multiply]] — composes the crop transform with a prior
  registration (`--reg` path).
- [[tkregister2]] — its non-interactive build `tkregister2_cmdl` generates the
  header-based cropped↔original registration; the interactive build verifies it.
- [[mgz]] / [[lta-format]] — output volume and registration formats.

## Confidence and Gaps

**High confidence:** the full argument parser and processing flow were read from
[`scripts/bbmask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask) (305 lines). The tool crops a mask (and any `--src`
volumes) to a `mri_mask -bb` bounding box with effective padding `npad`+1,
thresholds the mask at 0.01, and emits cropped↔original (and optionally composed)
registrations; `--reg` and `--regheader` are mutually exclusive.

> [!gap] FOV geometry details live in mri_mask
> The precise new dimensions and recentred vox2ras of the cropped volume are
> determined by [[mri_mask]] `-bb`, not by this script. See the [[mri_mask]] page
> for the exact box arithmetic and geometry update.

> [!gap] tkregister2_cmdl has no dedicated page
> The registration generator is `tkregister2_cmdl`, the command-line build of
> [[tkregister2]]; it does not yet have its own wiki page.

## References

- FreeSurfer source: [`scripts/bbmask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask) (v8.2.0).
- Built-in help: `bbmask --help` (the `BEGINHELP` block,
  [`scripts/bbmask:283-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbmask#L283-L304)).
- Cropping and bounding-box implementation: [[mri_mask]].
