---
title: "FreeSurfer Group Descriptor File (FSGD)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".fsgd"
  - ".txt"
produced_by:
  - "[[mris_preproc]]"
consumed_by:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mri_gdfglm]]"
  - "[[mri_mvglmfit]]"
  - "[[mris_glm]]"
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mri_glmfit-sim]]"
  - "[[mris_preproc]]"
  - "[[stats-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - format
  - glm
  - group-analysis
  - statistics
---

# FreeSurfer Group Descriptor File (FSGD)

## Overview

The FSGD (FreeSurfer Group Descriptor) file is a plain-text format for
specifying multi-subject experimental designs used in group-level General
Linear Model (GLM) analysis. It encodes the design matrix implicitly: by
declaring subject groups (classes) and continuous covariates (variables),
the format lets [[wiki/tools/mri_glmfit|mri_glmfit]] construct the full design matrix at run time
using either the DOSS or DODS parameterisation (see
[Design Matrix Methods](#design-matrix-methods)).

An FSGD file describes:
- **Experimental structure** — which groups exist, what they are called, and
  how many subjects belong to each
- **Covariates** — continuous per-subject variables (age, IQ, lesion volume,
  etc.)
- **Subject list** — one `Input` line per subject, linking a subject ID to a
  class and its covariate values
- **Optional contrasts** — t-contrasts and F-contrasts for hypothesis testing

Source files:
- `utils/fsgdf.cpp` — `gdfRead()`, `gdfWrite()`, `gdfPrintHeader()`; full
  parser implementation (author: Doug Greve)
- `include/fsgdf.h` — `FSGD` / `GROUPDESCRIPTOR` struct definition,
  `FSGDF_NCLASSES_MAX`, `FSGDF_NVARS_MAX`, `FSGDF_NINPUTS_MAX` limits

## File Extension(s)

The format has no mandatory extension. By convention, files are named with
`.fsgd` or `.txt`. `mri_glmfit` accepts either; the parser treats any
readable plain-text file as valid if the first tag is
`GroupDescriptorFile`.

## Structure

### Syntax rules

These rules are stated at the top of `utils/fsgdf.cpp`:

1. Tags are **NOT case-sensitive** (`Input`, `INPUT`, and `input` are
   identical).
2. Labels (class names, variable names, subject IDs) **ARE case-sensitive**.
3. Multiple items on a line may be separated by any whitespace (spaces or
   tabs).
4. Lines whose first non-whitespace character is `#` are comments and are
   ignored entirely.
5. The `Variables` line must appear **before** the first `Input` line.
6. All `Class` lines must appear **before** the first `Input` line.
7. Duplicate variable labels are not allowed.
8. Duplicate class labels are not allowed.
9. Duplicate subject IDs are not allowed (overrideable with the environment
   variable `FSGDF_ALLOW_SUBJ_REP`, tested via `fsgdf_AllowSubjRep` in
   [[`fsgdf.h:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/fsgdf.h#L31)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/fsgdf.h#L31)).
10. A class label that is declared but never used on any `Input` line
    generates a warning.
11. `DefaultVariable` must name a variable that appears in the `Variables`
    list.
12. Unknown tags are silently ignored (an info message is printed).
13. Empty lines are allowed.
14. Class labels may optionally be followed by a marker token and then a
    colour token.

### Complete keyword reference

Tags are grouped by function. All tags except `GroupDescriptorFile` and
at least one `Input` are optional unless otherwise noted.

#### Required

| Tag | Syntax | Notes |
|-----|--------|-------|
| `GroupDescriptorFile` | `GroupDescriptorFile 1` | **Must be the first line.** Only version 1 is supported. |
| `Class` | `Class <label> [<marker>] [<color>]` | At least one required; all must precede the first `Input`. |
| `Input` | `Input <subjectid> <classname> [<var1> <var2> ...]` | At least one required. Variable count must match the `Variables` declaration (or zero if no `Variables` line). |

#### Metadata (optional)

| Tag | Syntax | Notes |
|-----|--------|-------|
| `Title` | `Title <text...>` | Free-form descriptive title; may contain spaces. Stored in `gd->title[200]`. |
| `MeasurementName` | `MeasurementName <name>` | Name of the measurement (e.g., `thickness`, `area`). Stored in `gd->measname[200]`. |
| `Tessellation` | `Tessellation surface\|volume` | Declares whether data are surface-based or volume-based. Defaults to `surface`. Stored in `gd->tessellation[20]`. |
| `RegistrationSubject` | `RegistrationSubject <subject>` | Reference subject for group registration (typically `fsaverage` or `average7`). Stored in `gd->regsubj[200]`. |
| `PlotFile` | `PlotFile <path>` | Path to the data file used by visualization tools. Stored in `gd->datafile[1000]`. |

#### Design matrix control (optional)

| Tag | Syntax | Notes |
|-----|--------|-------|
| `Variables` | `Variables <var1> [<var2> ...]` | Also accepted as `Variable` (singular). Declares continuous covariate labels; order defines column order. |
| `DefaultVariable` | `DefaultVariable <varname>` | Selects the default covariate for visualization. Must exist in `Variables`. |
| `DOSS` | `DOSS` | Use the **D**ifferent **O**ffset **S**ame **S**lope parameterisation (one shared slope per covariate). Default when `--doss` is passed to `mri_glmfit`. |
| `DODS` | `DODS` | Use the **D**ifferent **O**ffset **D**ifferent **S**lope parameterisation (independent slope per class per covariate). Default when `--dods` is passed to `mri_glmfit`. |
| `DesignMatFile` | `DesignMatFile <path> <method>` | Path to a pre-computed MATLAB-format design matrix and the method string (`DOSS`, `DODS`, or `none`). Stored in `gd->DesignMatFile` and `gd->DesignMatMethod`. |
| `DeMeanFlag` | `DeMeanFlag 0\|1` | If 1, subtract the class-specific mean from each continuous variable before building the design matrix. Stored in `gd->DeMean`. |
| `ReScaleFlag` | `ReScaleFlag 0\|1` | If 1, divide each continuous variable by its standard deviation after demeaning. Stored in `gd->ReScale`. |
| `ResidualFWHM` | `ResidualFWHM <value>` | Residual smoothness in mm (FWHM). Stored in `gd->ResFWHM`. |
| `LogY` | `LogY 0\|1` | If 1, apply natural log to the input data before fitting. Stored in `gd->LogY`. |

#### Contrasts (optional)

| Tag | Syntax | Notes |
|-----|--------|-------|
| `Contrast` | `Contrast <name> <w1> [<w2> ...]` | t-contrast: name followed by space-separated numeric weights. One weight per design-matrix column. |
| `FContrast` | `FContrast <name> <contrast1> [<contrast2> ...]` | F-contrast: references previously declared `Contrast` names. |

#### Variable loading from external files (optional)

| Tag | Syntax | Notes |
|-----|--------|-------|
| `VariableFromFile` | `VariableFromFile <tablefile> <fieldname> <fieldcol> <datacol>` | Loads a covariate column from an asegstats/aparcstats table file. `fieldcol` is the column index of the field name; `datacol` is the column index of the value. |
| `VariableFromASeg` | `VariableFromASeg <fieldname>` | Shorthand: equivalent to `VariableFromFile stats/aseg.stats <fieldname> 5 4`. Looks up the field in each subject's `aseg.stats`. |

### Annotated minimal example

```
# Group comparison: two groups, no covariates
GroupDescriptorFile 1
Title PatientVsControl
MeasurementName thickness
RegistrationSubject fsaverage

Class Patients  triangle red
Class Controls  circle   blue

Input sub-001 Patients
Input sub-002 Patients
Input sub-003 Controls
Input sub-004 Controls
```

### Annotated full example

```
GroupDescriptorFile 1
Title MyStudy
MeasurementName thickness
RegistrationSubject average7
Tessellation surface
PlotFile /data/lh.thickness.10.mgh

# Two groups, two continuous covariates
Class Young plus  blue
Class Old   circle green
Variables  Age  IQ

# Each Input line: subjectid  class  age  iq
Input sub-01 Young  25  115
Input sub-02 Young  28  108
Input sub-03 Old    62   99
Input sub-04 Old    65  112

DefaultVariable Age
DeMeanFlag 1
ReScaleFlag 0

# t-contrast: group difference at mean covariate values
Contrast young-gt-old  1 -1 0 0

# t-contrast: positive age effect pooled across groups
Contrast age-effect  0 0 1 0
```

### Hard limits (from [[`include/fsgdf.h:37–39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/fsgdf.h#L37-L39)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/fsgdf.h#L37-L39))

| Constant | Value | Meaning |
|----------|-------|---------|
| `FSGDF_NCLASSES_MAX` | 128 | Maximum number of classes |
| `FSGDF_NVARS_MAX` | 128 | Maximum number of continuous variables |
| `FSGDF_NINPUTS_MAX` | 40 000 | Maximum number of subjects |

## Design Matrix Methods

The FSGD parser itself does not build the design matrix — it only stores
the class/variable/subject data. The design matrix is constructed by
`gdfContMatrix()` (called from within `mri_glmfit`) using the method
string passed on the command line (`--doss` or `--dods`) or embedded in the
FSGD file via the `DOSS`/`DODS` tag.

### DOSS — Different Offset, Same Slope

The design matrix has **nclasses + nvariables** columns:

$$
X_{\text{DOSS}} = \bigl[\underbrace{C_1 \;\cdots\; C_K}_{\text{class offsets}} \;\Big|\; \underbrace{V_1 \;\cdots\; V_P}_{\text{shared covariate columns}}\bigr]
$$

where $C_k$ is an indicator column (1 for subjects in class $k$, 0
otherwise) and $V_p$ is the (optionally demeaned) covariate vector pooled
across all classes. DOSS forces all groups to share the same slope for
each covariate while allowing different intercepts.

### DODS — Different Offset, Different Slope

The design matrix has **nclasses × (1 + nvariables)** columns:

$$
X_{\text{DODS}} = \bigl[\underbrace{C_1 \;\cdots\; C_K}_{\text{class offsets}} \;\Big|\; \underbrace{C_1 V_1 \;\cdots\; C_K V_1}_{\text{var 1 per class}} \;\Big|\; \cdots \;\Big|\; \underbrace{C_1 V_P \;\cdots\; C_K V_P}_{\text{var P per class}}\bigr]
$$

Each class gets its own slope for every covariate. DODS is the more
general parameterisation; DOSS is the special case where slopes are
constrained to be equal across classes.

> [!gotcha] DOSS vs DODS must match your contrasts
> The weight vector in a `Contrast` line must have length equal to the
> number of design-matrix columns. A DOSS matrix has `K + P` columns;
> a DODS matrix has `K + K*P` columns. Mismatched contrast weights
> will cause `mri_glmfit` to abort with a dimension error.

### DeMean and ReScale

When `DeMeanFlag 1` is set, each continuous variable has its per-class
mean subtracted before the design matrix is formed:

$$
\tilde{V}_{ip} = V_{ip} - \bar{V}_p^{(k(i))}
$$

where $k(i)$ is the class of subject $i$ and $\bar{V}_p^{(k)}$ is the
mean of variable $p$ within class $k$. This ensures that the class-offset
columns ($C_k$) estimate the class means at the covariate mean rather than
at zero, which is usually more interpretable.

When `ReScaleFlag 1` is additionally set, each variable is also divided by
its global standard deviation (computed across all subjects).

## Validation

The parser enforces the following at read time (`utils/fsgdf.cpp`):

- All `Class` declarations precede the first `Input`.
- The `Variables` declaration precedes the first `Input`.
- No duplicate class labels (`gdfCheckClassLabels()`).
- No duplicate variable labels.
- No duplicate subject IDs (`gdfCheckSubjRep()`), unless
  `fsgdf_AllowSubjRep` is non-zero.
- Every declared class is used by at least one `Input` (warning only).
- All `Input` lines supply exactly `nvariables` numeric values after the
  class label.
- `DefaultVariable` names a variable in the `Variables` list.
- Carriage returns (`\r`) in the file trigger a warning (Windows-format
  files).

## Tools That Read/Write This Format

| Tool | Mode | Notes |
|------|------|-------|
| [[wiki/tools/mri_glmfit|mri_glmfit]] | read | Primary consumer; constructs the design matrix from the FSGD and runs vertex/voxel-wise GLM |
| [[mri_gdfglm]] | read | Simplified GLM front-end using FSGD + a data volume |
| [[mri_mvglmfit]] | read | Multivariate GLM variant |
| [[mris_glm]] | read | Legacy surface GLM (in `attic/`); same FSGD format |
| `gdfWrite()` | write | Internal C API function in `utils/fsgdf.cpp`; no dedicated CLI writes FSGD files |

> [!gap] No standard FreeSurfer tool generates FSGD files
> FSGD files are written by hand or by user scripts. There is no
> documented FreeSurfer utility that auto-generates an FSGD file from a
> subject list. The `gdfWrite()` function exists in the C API but is not
> exposed through a standalone command.

## Typical Workflow

```bash
# 1. Prepare per-subject surface overlays concatenated into a group file
mris_preproc --fsgd mydesign.fsgd \
             --cache-in thickness.fwhm10.fsaverage \
             --target fsaverage \
             --hemi lh \
             --out lh.thickness.10.mgh

# 2. Run the GLM
mri_glmfit --y lh.thickness.10.mgh \
           --fsgd mydesign.fsgd doss \
           --glmdir lh.thickness.glmdir \
           --surf fsaverage lh

# 3. Correct for multiple comparisons
mri_glmfit-sim --glmdir lh.thickness.glmdir \
               --cache 4 abs \
               --cwpvalthresh 0.05
```

The `doss` or `dods` token after `--fsgd` overrides the `DOSS`/`DODS`
tag inside the file.

## Gotchas

> [!gotcha] Tags are case-insensitive but labels are not
> `Class Patients` and `CLASS Patients` define the same class. But
> `Input sub-01 Patients` and `Input sub-01 patients` refer to
> **different** classes. A mismatch between the class label in `Class`
> and in `Input` will cause the parser to report an unknown class and
> abort.

> [!gotcha] Windows line endings cause spurious parse failures
> A file saved on Windows with `\r\n` line endings will trigger a
> warning from the parser and may cause variable values to be read
> incorrectly (the trailing `\r` becomes part of the last token on each
> line). Convert to Unix line endings with `dos2unix mydesign.fsgd`
> before use.

> [!gotcha] `VariableFromASeg` assumes a fixed `stats/aseg.stats` path
> `VariableFromASeg <fieldname>` is a shorthand for
> `VariableFromFile stats/aseg.stats <fieldname> 5 4`. It looks for
> `$SUBJECTS_DIR/<subjectid>/stats/aseg.stats`. If any subject's
> `aseg.stats` is missing or the field name is misspelled, the parser
> will silently assign 0 for that subject. Verify with
> `grep <fieldname> $SUBJECTS_DIR/<subjectid>/stats/aseg.stats` before
> running the GLM.

> [!gotcha] The `Contrast` weight vector length depends on the matrix method
> Contrast weight vectors written for DOSS will be the wrong length for
> DODS and vice versa. If you change the matrix method after writing
> contrasts in the FSGD file, update all `Contrast` lines.

## References

- `utils/fsgdf.cpp` — full parser implementation; original author: Doug Greve
- `include/fsgdf.h` — `FSGD` struct definition and compile-time limits
- External specification: `http://surfer.nmr.mgh.harvard.edu/docs/fsgdf.txt`
  (referenced in [[`fsgdf.cpp:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/fsgdf.cpp#L4)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/fsgdf.cpp#L4))
- [[wiki/tools/mri_glmfit|mri_glmfit]] — primary consumer; see its page for GLM analysis workflow
- [[stats-format]] — the `.stats` file format read by `VariableFromFile`/`VariableFromASeg`
