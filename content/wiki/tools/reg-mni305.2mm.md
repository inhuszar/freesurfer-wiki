---
title: "reg-mni305.2mm"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # csh
source_files:
  - "scripts/reg-mni305.2mm"
families: []                       # standalone registration-construction script
recon_all_stage: null
related:
  - "[[tkregister2]]"
  - "[[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]]"
  - "[[talairach_avi]]"
  - "[[talairach.xfm]]"
  - "[[lta_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - mni305
  - talairach
  - fsfast
  - coordinate-systems
---

# reg-mni305.2mm

## Summary

`reg-mni305.2mm` computes the registration between FreeSurfer's **MNI305 2 mm**
space and a subject's **native FreeSurfer anatomical** space, writing a
tkregister2-style registration file. The MNI305 2 mm space is the low-resolution
fixed field-of-view space defined by
`$FREESURFER_HOME/average/mni305.cor.subfov2.mgz`, in which FS-FAST functional
group results are commonly produced. The registration this script builds lets
those 2 mm MNI305 results be viewed in (or resampled to) a subject's native
anatomical. The computation is essentially a re-expression of the subject's
`talairach.xfm`, so it runs in seconds.

## Source Information

- **Language:** csh shell script
- **Source file:** [`scripts/reg-mni305.2mm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm)
- **Binary/script location:** `$FREESURFER_HOME/bin/reg-mni305.2mm`
- **Original author:** Doug Greve
- **FreeSurfer tools invoked:** [`tkregister2_cmdl --fstal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L58-L59) (build the MNI305→anat registration from `talairach.xfm`), [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L65-L66) (compose the 2 mm→anat registration), and `fs_temp_file`.

## Purpose and Context

FS-FAST analyses can be carried out in the FreeSurfer **MNI305 2 mm** subfield-of-
view space. To overlay or resample those results onto an individual subject's
anatomy, one needs a registration from that 2 mm space to the subject's native
space. `reg-mni305.2mm` constructs it by chaining two pieces:

1. a fixed registration between the **MNI305 2 mm** space and full-resolution
   MNI305 (`fsaverage`) space, shipped with FreeSurfer as
   `average/mni305.cor.subfov2.reg`; and
2. the registration between full MNI305 (`fsaverage`) and the **subject's
   anatomical**, derived on the fly from the subject's `talairach.xfm` via
   `tkregister2_cmdl --fstal`.

Because step 2 is just another way of expressing `talairach.xfm`, the help notes
the result "should be no better or worse than the FreeSurfer Talairach
registration." It is run **by hand** (typically as part of an FS-FAST workflow)
and is not part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **`--s <subject>`** (alias `--subject`) — a FreeSurfer subject in
  `$SUBJECTS_DIR`. The subject directory must exist; its
  `mri/transforms/talairach.xfm` is what `--fstal` reads.
- **`--reg <regfile>`** — output registration path (should have a `.dat` or
  `.reg` extension).

### Input Assumptions

> [!assumption] Entirely dependent on talairach.xfm
> The script assumes the subject has a valid `talairach.xfm`; `tkregister2_cmdl
> --fstal` derives the MNI305↔anat registration from it
> ([`scripts/reg-mni305.2mm:58-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L58-L59)). If the Talairach registration is poor,
> this output is equally poor — it adds no new fitting. The 2 mm↔MNI305 piece is
> a fixed shipped file and is assumed present.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<regfile>` (`--reg`) | tkregister2 `.dat`/`.reg` | Registration from MNI305 2 mm space to the subject's native anatomical, tagged with the subject id by `mri_matrix_multiply -s`. |

A temporary `mni305toAnat.dat` (and an `.xfm`) are created via `fs_temp_file` and
the `.dat` is removed at the end ([`scripts/reg-mni305.2mm:57-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L57-L71)).

### Output Specifications

A tkregister2-style registration matrix whose **moving** volume is
`average/mni305.cor.subfov2.mgz` (the MNI305 2 mm template) and whose target is
the subject's anatomical. See [[coordinate-systems]] for MNI305 and tkreg RAS
conventions.

## Mathematical Foundations

> [!math] Composition of two registrations
> Let $R_{2\to305}$ be the fixed MNI305-2mm → MNI305 registration
> (`mni305.cor.subfov2.reg`) and $R_{305\to\text{anat}}$ the MNI305 → subject
> registration from `--fstal` (i.e. from `talairach.xfm`). The output is
> $$R_{2\to\text{anat}} = R_{305\to\text{anat}} \cdot R_{2\to305},$$
> computed with [`mri_matrix_multiply -s $subject -im $mni2mmreg -im $mni305reg
> -om $regfile`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L65-L66) (both operands multiplied in order; `-s` stamps
> the subject name into the output `.dat`).

> [!internal] The Talairach algebra lives in tkregister2
> The `--fstal` derivation of the MNI305↔anat matrix from `talairach.xfm` is
> implemented in `tkregister2_cmdl`; `mri_matrix_multiply` performs the
> composition. This script only wires them together.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/reg-mni305.2mm:87-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L87-L120)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subject`<br>`--s` | string | *(required)* | FreeSurfer subject id in `$SUBJECTS_DIR`; its `talairach.xfm` drives the registration. |
| `--reg` | string | *(required)* | Output registration file (`.dat`/`.reg`). |
| `--debug`<br>`-debug` | bool | off | `set echo`/verbose tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

None — the script has only the two required arguments plus debug/help/version.
There are no mutually exclusive or dependent flag combinations.

## Typical Use Cases

### 1. Build the MNI305-2mm → subject registration

```bash
reg-mni305.2mm --s bert --reg bert.mni305.2mm.reg.dat
```

Creates a registration usable to view FS-FAST MNI305 2 mm results on bert's
anatomy.

### 2. Check the registration

```bash
# As printed by the script on completion:
tkregisterfv --reg bert.mni305.2mm.reg.dat \
  --mov $FREESURFER_HOME/average/mni305.cor.subfov2.mgz
```

## Pipeline Context

`reg-mni305.2mm` is a stand-alone **registration-construction** utility for
FS-FAST, not part of [[wiki/pipelines/recon-all|recon-all]]. It presupposes that
recon-all (or [[talairach_avi]]) has produced the subject's `talairach.xfm`, and
its output feeds resampling/visualisation of MNI305 2 mm functional results in
native space.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] /
[[talairach_avi]] (→ `talairach.xfm`) → **reg-mni305.2mm** → **Successor:**
viewing/resampling of FS-FAST MNI305 2 mm results in the subject's anatomical.

Internally it chains `tkregister2_cmdl --fstal` and
[[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]].

## Gotchas and Caveats

> [!gotcha] No better than the Talairach registration
> Because the output is derived entirely from `talairach.xfm`, it carries
> whatever error the Talairach registration has. The help says it "should be no
> better or worse than the FreeSurfer Talairach registration as seen by
> `tkregister2 --s subject --fstal`." It is not a new, refined registration.

> [!gotcha] Help shows tkregister2; the script prints tkregisterfv
> The `BEGINHELP` text suggests checking with `tkregister2 --reg … --mov …`,
> while the script's completion message prints a `tkregisterfv` command
> ([`scripts/reg-mni305.2mm:75-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L75-L77)). Both view the same registration;
> `tkregisterfv` is the freeview-based front end.

## Error Compensation and Guard Rails

- **Required-subject check** and **subject-directory existence check** in
  `check_params` ([`scripts/reg-mni305.2mm:125-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L125-L136)).
- **Step-wise abort:** non-zero return from `tkregister2_cmdl` or
  `mri_matrix_multiply` exits 1
  ([`scripts/reg-mni305.2mm:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L62), [`:69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L69)).
- The temporary MNI305→anat `.dat` is cleaned up after composition.

## Related Tools

- [[tkregister2]] — the `tkregister2_cmdl --fstal` engine that derives the MNI305↔anat registration from `talairach.xfm`.
- [[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]] — composes the fixed 2 mm↔MNI305 and MNI305↔anat registrations and stamps the subject id.
- [[talairach_avi]] — one route that produces the `talairach.xfm` this script depends on.
- [[talairach.xfm]] — the transform the registration is built from (glossary entry).
- [[lta_convert]] — converts the resulting `.dat`/`.reg` registration to other transform formats.
- [[coordinate-systems]] — MNI305, MNI305 2 mm subfov, and tkreg RAS conventions.

## Confidence and Gaps

**High confidence:** the two required flags, the two-step composition of a fixed
2 mm↔MNI305 registration with a `--fstal`-derived MNI305↔anat registration, the
`mri_matrix_multiply` ordering, and the dependence on `talairach.xfm` — all read
directly from [`scripts/reg-mni305.2mm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm) and its `BEGINHELP`. No open
questions.

## References

- FreeSurfer source: [`scripts/reg-mni305.2mm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm) (v8.2.0).
- Built-in help: `reg-mni305.2mm --help` (the `BEGINHELP` block, [`scripts/reg-mni305.2mm:160-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-mni305.2mm#L160-L184)).
- MNI305 2 mm template: `$FREESURFER_HOME/average/mni305.cor.subfov2.mgz`.
