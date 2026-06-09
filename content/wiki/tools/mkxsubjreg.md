---
title: "mkxsubjreg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mkxsubjreg/mkxsubjreg.cpp"
families: []
recon_all_stage: null
related:
  - "[[registration-overview]]"
  - "[[tkregister2]]"
  - "[[bbregister]]"
  - "[[coordinate-systems]]"
  - "[[fsaverage]]"
  - "[[mri_vol2vol]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The tool composes Talairach .xfm transforms of source and target subjects; whether the two subjects' talairach.xfm were computed against compatible templates is the user's responsibility and is not checked. Accuracy of the composed registration depends on linear-Talairach agreement, which was reasoned from the math, not benchmarked."
tags:
  - registration
  - cross-subject
  - talairach
  - functional
  - fsfast
  - coordinates
---

# mkxsubjreg

## Summary

`mkxsubjreg` ("make cross-subject registration") creates a new
`register.dat`-style registration matrix that maps a **functional volume of
one subject** onto the **anatomical (`orig`) space of a different subject**,
by routing through both subjects' Talairach transforms. Given a source
registration (functional → source anatomy) and a target subject, it composes
$R_{\text{targ}} = R \cdot X_{\text{src}}^{-1} \cdot X_{\text{targ}}$ and
writes the result as a target registration file. The default "target subject"
is the abstract `talairach` space itself, so the same tool also lets you take
a functional volume into Talairach/MNI-305-style space. It is a small FSFAST
utility for cross-subject functional/PET analysis.

## Source Information

- **Language:** C++
- **Source file:** [`mkxsubjreg/mkxsubjreg.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp)
- **Original author:** Douglas N. Greve (8/24/03)
- **Binary/script location:** `$FREESURFER_HOME/bin/mkxsubjreg`
- **Key library calls:** [`regio_read_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L86) / [`regio_write_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L124), [`MRIfixTkReg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L102), [`DevolveXFM`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L109), and `MatrixInverse`/`MatrixMultiply`.

## Purpose and Context

In FSFAST, an fMRI/PET run is tied to its subject's anatomy by a
`register.dat` file (produced by [[tkregister2]] or [[bbregister]]) that maps
the functional volume's tkreg-RAS to the anatomy's tkreg-RAS — see
[[registration-overview]] for the format and direction conventions. To do a
**group** analysis on the surface or in a common volume space, each
subject's functional data must be brought into a *shared* space. FreeSurfer's
canonical shared anatomical space is defined by each subject's **Talairach
transform** (`mri/transforms/talairach.xfm`), which linearly maps that
subject's native anatomy into a common (Talairach/MNI-305) frame.

`mkxsubjreg` builds the registration that accomplishes this in one step: it
takes the existing functional→source-anatomy registration and *re-targets*
it to a different subject's anatomy (or to Talairach space directly) by
composing with the two Talairach transforms. The output is a new
`register.dat` you can hand to any tool that consumes a registration
(resampling, surface sampling, etc.), as if the functional run had been
registered to the target subject in the first place.

It is a stand-alone command-line tool, not part of
[[wiki/pipelines/recon-all|recon-all]], and not called by any distributed
script in this version (verified by a tree-wide search of
`$FREESURFER_SOURCE/scripts`); historically it underpinned cross-subject
FSFAST functional analysis.

## Inputs

Arguments are parsed by long `--flag value` options
([`parse_commandline()`, `mkxsubjreg/mkxsubjreg.cpp:153-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L153-L214)); there
are no positional arguments.

### Required Inputs

| Flag | What it is |
|------|------------|
| `--srcreg <srcreg.dat>` | The **source** registration: a `register.dat` mapping the functional volume to the *source* subject's anatomy. The source subject ID is read **from inside this file** ([`mkxsubjreg/mkxsubjreg.cpp:86-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L86-L88)). |
| `--targreg <targreg.dat>` | Path of the **output** registration to write (functional → target anatomy). |

### Conditionally Required Input

| Flag | When required |
|------|---------------|
| `--fvol <funcvol>` | Required **only if** the source registration's float-to-int field is `tkregister` (the legacy truncation method) and the default tkreg-fix is on. An example functional volume is then needed to correct the matrix (see Math). Without it the tool errors and exits ([`mkxsubjreg/mkxsubjreg.cpp:93-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L93-L100)). |

### Input Assumptions

> [!assumption] Both subjects must have a Talairach transform
> The source subject (named in `--srcreg`) and the target subject (from
> `--targsubj`) must each have a readable `mri/transforms/<xfm>` (default
> `talairach.xfm`); these are loaded with `DevolveXFM` and the tool exits if
> either is missing ([`mkxsubjreg/mkxsubjreg.cpp:108-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L108-L115)). The
> registration quality depends entirely on the **linear** Talairach
> registration of each subject; this is a crude affine alignment, not the
> nonlinear surface registration used elsewhere in FreeSurfer.

- **`$SUBJECTS_DIR` must be set** (or supplied with `--sd`); both subjects
  live under it ([`mkxsubjreg/mkxsubjreg.cpp:244-250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L244-L250)).
- **The source `register.dat` carries the inplane/betplane resolutions and
  intensity** that are propagated verbatim into the output
  ([`mkxsubjreg/mkxsubjreg.cpp:124-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L124-L125)).

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<targreg.dat>` (`--targreg`) | `register.dat` (REGISTER_DAT ASCII) | A 7-line registration file naming the **target** subject, carrying the source run's inplane/betplane resolution and intensity, the composed 4×4 matrix $R_{\text{targ}}$, and a float-to-int field of **`round`** (`FLT2INT_ROUND`). See [[registration-overview]] for the format. |

### Output Specifications

The output matrix maps the **functional volume's tkreg-RAS** to the
**target subject's anatomy tkreg-RAS** (or to Talairach space when
`--targsubj` is left at its default). The float-to-int field is forced to
`round` ([`mkxsubjreg/mkxsubjreg.cpp:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L106)), i.e. the output is in
the modern nearest-neighbour convention regardless of the input's
convention. See [[coordinate-systems]] for the tkreg-RAS frame.

## Mathematical Foundations

The tool composes three transforms. Writing $R$ for the input registration
(functional → source anatomy tkreg-RAS), $X_{\text{src}}$ and
$X_{\text{targ}}$ for the source and target Talairach transforms (each mapping
that subject's anatomy into the common Talairach frame), the output is:

$$ R_{\text{targ}} \;=\; R \,\cdot\, X_{\text{src}}^{-1} \,\cdot\, X_{\text{targ}} $$

([`mkxsubjreg/mkxsubjreg.cpp:117-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L117-L119)). Reading right to left in the
sense the registration is *used*: a point in target anatomy is taken to the
common Talairach frame by $X_{\text{targ}}$ — wait, more precisely, the
composition is built so that the resulting `register.dat` plays the same
role for the target subject that $R$ played for the source, with the two
Talairach transforms bridging the anatomical difference. When
`--targsubj talairach` (the default), $X_{\text{targ}}$ is the identity-like
map into Talairach space and the result registers the functional run to
Talairach directly.

> [!math] Talairach-mediated cross-subject composition
> $X_{\text{src}}^{-1}$ undoes the source subject's Talairach normalisation
> (Talairach → source anatomy), and $X_{\text{targ}}$ then applies the target
> subject's normalisation (target anatomy → Talairach). Their product
> $X_{\text{src}}^{-1}X_{\text{targ}}$ is the affine that carries target
> anatomy into source anatomy through the shared Talairach frame; pre-composing
> with $R$ yields a functional→target-anatomy registration. The accuracy is
> therefore bounded by how well the **linear** Talairach transforms of the two
> subjects agree.

> [!math] Legacy tkreg fix (optional pre-step)
> If the input registration's float-to-int field is `FLT2INT_TKREG` and
> `fixtkreg` is on (the built-in default), the matrix was produced by the old
> `tkregister` program, which selected functional voxels with a
> non-invertible *floor/ceil/floor* rule instead of rounding. `MRIfixTkReg`
> ([`utils/mri.cpp:1044-1093`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1044-L1093))
> randomly samples the volume and solves a least-mean-squares problem
> $$ R_{\text{fix}} = T_{\text{mov}}\,(P_{\text{crsTkReg}}P_{xyz}^{\top})\,(P_{xyz}P_{xyz}^{\top})^{-1} $$
> for a corrected matrix that reproduces the old CRS choices under pure
> rounding. This is why `--fvol` (an example functional volume, used as
> $T_{\text{mov}}$) is required in that case.

> [!internal] Transform loading and the register.dat round-trip
> `DevolveXFM` ([`utils/transform.cpp:2027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027))
> loads each subject's `.xfm` and adjusts it to operate in tkreg-RAS
> (`c_ras = 0`) coordinates, so the composition is valid in the same RAS frame
> the registration uses. The 7-line `register.dat` read/write is handled by
> `regio_read_register`/`regio_write_register` in
> [`utils/registerio.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp).

## Configuration Options

### Complete Flag Reference

All options are long-form `--flag` ([`mkxsubjreg/mkxsubjreg.cpp:176-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L176-L209)).
Flag-name matching for the value-taking options is **case-sensitive**
(`strcmp`); `--help`/`--version`/`--debug` use case-insensitive matching.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--srcreg <file>` | string | *(required)* | Source `register.dat` (functional → source anatomy); also supplies the source subject ID ([`mkxsubjreg/mkxsubjreg.cpp:180-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L180-L183)). |
| `--targreg <file>` | string | *(required)* | Output `register.dat` (functional → target anatomy) ([`mkxsubjreg/mkxsubjreg.cpp:184-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L184-L187)). |
| `--targsubj <subjid>` | string | `talairach` | Target subject ID. Default registers to **Talairach** space ([`mkxsubjreg/mkxsubjreg.cpp:188-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L188-L191), [`mkxsubjreg/mkxsubjreg.cpp:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L240-L243)). |
| `--xfm <xfmrname>` | string | `talairach.xfm` | Name of the transform file (relative to each subject's `mri/transforms/`) used as $X_{\text{src}}$ and $X_{\text{targ}}$ ([`mkxsubjreg/mkxsubjreg.cpp:192-195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L192-L195)). |
| `--sd <subjects_dir>` | string | `$SUBJECTS_DIR` | Subjects directory override ([`mkxsubjreg/mkxsubjreg.cpp:200-203`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L200-L203)). |
| `--fvol <funcvol>` | string | *(none)* | Example functional volume; **required** only when the input registration uses the legacy `tkregister` float-to-int method (for `MRIfixTkReg`) ([`mkxsubjreg/mkxsubjreg.cpp:196-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L196-L199)). |
| `--debug` | bool | off | Print each parsed option as it is read ([`mkxsubjreg/mkxsubjreg.cpp:178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L178)). |
| `--help` | bool | — | Print usage + description and exit ([`mkxsubjreg/mkxsubjreg.cpp:176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L176)). |
| `--version` | bool | — | Print version and exit ([`mkxsubjreg/mkxsubjreg.cpp:177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L177)). |

> [!gotcha] Value flags are matched with `strcmp`, so case must be exact
> `--srcreg`, `--targreg`, `--targsubj`, `--xfm`, `--fvol`, and `--sd` are
> compared with `strcmp` ([`mkxsubjreg/mkxsubjreg.cpp:180-203`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L180-L203)); an
> unrecognised option aborts with an "Option … unknown" error and, if it is a
> single-dash flag, a hint to use the double-dash form
> ([`mkxsubjreg/mkxsubjreg.cpp:204-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L204-L209)).

### Configuration Interactions

- **`--fvol` is conditional on the input file's truncation field.** It is
  consulted *only* when `float2int == FLT2INT_TKREG` and the built-in
  `fixtkreg` flag is set (always on in this version — there is no flag to turn
  it off). For modern registrations (which carry `round`), `--fvol` is
  ignored. Supply it when you get the "input registration file requires that
  you supply an example functional volume" error.
- **`--targsubj` and `--xfm` jointly define the target frame.** With the
  default `--targsubj talairach`, $X_{\text{targ}}$ resolves to Talairach
  space; naming a real subject registers to that subject's anatomy instead.
  `--xfm` swaps in a different per-subject transform (e.g. a custom `.xfm`)
  for *both* the source and target legs of the composition — they always use
  the same transform name.
- **The output float-to-int field is unconditionally `round`.** Regardless of
  the input convention (and after any `MRIfixTkReg` correction), the written
  registration is in the rounding convention
  ([`mkxsubjreg/mkxsubjreg.cpp:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L106)).

## Typical Use Cases

### Use Case 1: Register a functional run to another subject's anatomy

```bash
export SUBJECTS_DIR=/data/subjects
# Re-target subj01's functional registration onto subj_template's anatomy.
mkxsubjreg \
  --srcreg  /data/subj01/bold/register.dat \
  --targreg /data/subj01/bold/register.subj_template.dat \
  --targsubj subj_template
```

The new `register.subj_template.dat` maps subj01's functional volume to
`subj_template`'s `orig`, via both subjects' Talairach transforms.

### Use Case 2: Take a functional run into Talairach space

```bash
# Default target is the abstract 'talairach' space.
mkxsubjreg \
  --srcreg  /data/subj01/bold/register.dat \
  --targreg /data/subj01/bold/register.talairach.dat
```

### Use Case 3: Legacy registration needing the tkreg fix

```bash
# Input register.dat was made by the old tkregister (float2int = tkregister):
mkxsubjreg \
  --srcreg  old_register.dat \
  --targreg register.tal.dat \
  --fvol    /data/subj01/bold/f.nii.gz
```

`--fvol` provides the example functional geometry `MRIfixTkReg` needs to
correct the old floor/ceil/floor matrix to the rounding convention.

## Pipeline Context

`mkxsubjreg` is a FSFAST cross-subject registration helper. It is not a
recon-all stage and is not invoked by any distributed pipeline script in
v8.2.0.

**Predecessor:** [[tkregister2]] or [[bbregister]] (produce the source
`register.dat`); [[wiki/pipelines/recon-all|recon-all]] (produces each
subject's `talairach.xfm`) → **This tool** → **Successor:** any tool that
consumes a `register.dat`, e.g. resampling/projection
([[mri_vol2vol]]-style) into the target subject's space or onto its surface
for group analysis. See [[registration-overview]] for the full registration
ecosystem and [[fsaverage]] for the common-space concept.

## Gotchas and Caveats

> [!gotcha] Cross-subject accuracy is only as good as the linear Talairach fit
> The composition relies on each subject's **affine** `talairach.xfm`, which
> is a coarse linear normalisation. This is far less accurate than FreeSurfer's
> nonlinear surface registration. For surface-based group analysis, projecting
> to [[fsaverage]] via the registered sphere is generally preferable;
> `mkxsubjreg` is a volume-space, Talairach-mediated shortcut.

> [!gotcha] The source subject is taken from the file, not a flag
> There is no `--srcsubj` option: the source subject ID is whatever is written
> inside `--srcreg` ([`mkxsubjreg/mkxsubjreg.cpp:86-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L86-L88)). If that file
> names a subject that is not under `$SUBJECTS_DIR` (or whose `talairach.xfm`
> is missing), the tool aborts when loading $X_{\text{src}}$.

> [!gotcha] Both legs use the same `--xfm` name
> `--xfm` sets the transform filename for the source *and* the target; you
> cannot use a different `.xfm` for each subject. They must both have a
> transform of that name in `mri/transforms/`.

> [!gotcha] `--fvol` error is the usual reason for a confusing failure
> If you feed a legacy registration and omit `--fvol`, the tool prints
> "the input registration file requires that you supply an example functional
> volume with --fvol" and exits 1
> ([`mkxsubjreg/mkxsubjreg.cpp:94-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L94-L97)). Supply the functional volume.

## Error Compensation and Guard Rails

- **Legacy-matrix auto-correction.** When the input registration was made by
  the old `tkregister` (float-to-int = `tkregister`), `MRIfixTkReg`
  automatically corrects it to the rounding convention before composition —
  so old and new registrations can be mixed, provided `--fvol` is given
  ([`mkxsubjreg/mkxsubjreg.cpp:93-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L93-L106)).
- **tkreg-RAS normalisation of the transforms.** `DevolveXFM` adjusts each
  `.xfm` to `c_ras = 0` coordinates so the matrix composition is performed in
  a consistent RAS frame.
- **Required-argument checks.** Missing `--srcreg` or `--targreg` aborts with
  a clear message; a missing `--targsubj` defaults to `talairach`; a missing
  `$SUBJECTS_DIR` (and no `--sd`) aborts ([`check_options()`, `mkxsubjreg/mkxsubjreg.cpp:231-253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L231-L253)).
- **The tool prints all three matrices** (input, fixed input, output) to
  stdout for inspection ([`mkxsubjreg/mkxsubjreg.cpp:90-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp#L90-L122)).

## Related Tools

- [[registration-overview]] — the `register.dat` format, direction
  conventions, and the FLT2INT (`tkregister`/`round`) truncation field that
  drive this tool's behaviour.
- [[tkregister2]] / [[bbregister]] — produce the source `register.dat` that
  `mkxsubjreg` re-targets.
- [[mri_vol2vol]] — a typical downstream consumer that uses a `register.dat`
  to resample volumes between spaces.
- [[fsaverage]] — the surface-based common space that is usually preferable
  to Talairach for group analysis.
- [[coordinate-systems]] — the tkreg-RAS / Talairach frames the composition
  operates in.

## Confidence and Gaps

**High confidence:** the full option set, the source-subject-from-file
behaviour, the conditional `--fvol` requirement, the
$R\cdot X_{\text{src}}^{-1}\cdot X_{\text{targ}}$ composition, the legacy
`MRIfixTkReg` correction, and the unconditional `round` output field are all
read directly from
[`mkxsubjreg/mkxsubjreg.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp)
(and the supporting [`utils/mri.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp)
/ [`utils/transform.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp)),
and corroborated by the installed binary's `--help` output.

> [!gap] Template compatibility of the two Talairach transforms
> The composition silently assumes the source and target `talairach.xfm` were
> computed against compatible templates. The tool does not check this, and the
> resulting registration accuracy under template mismatch was reasoned from
> the math rather than benchmarked.

## References

- FreeSurfer source: [`mkxsubjreg/mkxsubjreg.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mkxsubjreg/mkxsubjreg.cpp) (v8.2.0).
- tkreg fix derivation: `MRIfixTkReg` comment block, [`utils/mri.cpp:1044-1093`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1044-L1093).
- Transform devolution: `DevolveXFM`, [`utils/transform.cpp:2016-2032`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2016-L2032).
- register.dat format and conventions: [[registration-overview]].
