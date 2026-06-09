---
title: "spmmat2register"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh (drives an embedded MATLAB job)
source_files:
  - "scripts/spmmat2register"
families: []
recon_all_stage: null
related:
  - "[[tkregister2]]"
  - "[[spmregister]]"
  - "[[lta_convert]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - spm
  - obsolete
  - conversion
  - register.dat
---

# spmmat2register

## Summary

`spmmat2register` is an **obsolete** FreeSurfer utility that historically
converted a pair of SPM Analyze volumes (a functional and a structural, each
with SPM geometry obtained from `spm_get_space`) into a FreeSurfer
tkregister-style `register.dat`. In the v8.2.0 release it is **disabled**: the
script prints an error and exits immediately, directing users to
[[tkregister2]] (specifically its "USING WITH FSL and SPM" documentation). The
original conversion math still exists in the (now-unreachable) body of the
script and is documented below for reference and for the SPM-bridge theme.

> [!gotcha] The tool is disabled — it always exits with an error
> The very first executable lines print
> `ERROR: spmmat2register is obsolete. Use tkregister2.` and
> `exit 1` ([`scripts/spmmat2register:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L21-L26)), **before** any argument
> parsing. Nothing below that point runs. To build an SPM↔FreeSurfer
> registration today, use [[spmregister]] (to *compute* one) or [[tkregister2]]
> (to convert/inspect one).

## Source Information

- **Language:** tcsh shell script that, when it still ran, drove an embedded MATLAB job (here-document) using SPM's `spm_hread`/`spm_get_space`.
- **Source file:** [`scripts/spmmat2register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register)
- **Binary/script location:** `$FREESURFER_HOME/bin/spmmat2register`
- **Status:** obsolete; superseded by [[tkregister2]] (`--help`, "USING WITH FSL and SPM").

## Purpose and Context

Before FreeSurfer offered native SPM interoperability through [[tkregister2]] and
[[spmregister]], `spmmat2register` provided a way to take an existing **SPM
coregistration** — encoded in the SPM `.mat`/header geometry of a functional and
a structural Analyze volume — and express it as a FreeSurfer `register.dat` so
the data could be used with FreeSurfer surface/volume tools. It computed the
transform purely from the two volumes' geometry matrices; it did **not** itself
estimate any registration (that was assumed already done in SPM).

It is **not** part of [[wiki/pipelines/recon-all|recon-all]] and is no longer a
functioning tool. Its role in the SPM-bridge family is now filled by
[[spmregister]] (compute an SPM registration → `register.dat`/`.lta`) and
[[tkregister2]] (interconvert FreeSurfer registrations and SPM/FSL geometry).

## Inputs

> [!assumption] These applied to the historical tool only — it no longer runs
> The descriptions below reflect the disabled code path. Because the script exits
> at [`scripts/spmmat2register:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L26), none of these inputs are read in
> v8.2.0.

When it ran, it required three arguments and read two SPM Analyze volumes:

- **`-svol <structvol>`** — structural Analyze stem; the file `<structvol>.img`
  must exist ([`scripts/spmmat2register:48-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L48-L52)).
- **`-fvol <funcvol>`** — functional Analyze stem; `<funcvol>.img` must exist
  ([`scripts/spmmat2register:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L54-L58)).
- **`-subject <name>`** — subject name written as line 1 of the output reg
  ([`scripts/spmmat2register:217-220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L217-L220)).

It also required **MATLAB with SPM** on the path (it called `spm_hread` and
`spm_get_space` in an embedded job).

## Outputs

### Files Created (historical)

| File | Default | Contents |
|------|---------|----------|
| `<regfile>` (`-o`) | `register.dat` | a FreeSurfer tkregister-style registration: subject name, functional in-plane voxel sizes, an intensity value, and the 4×4 registration matrix `Mreg` ([`scripts/spmmat2register:108-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L108-L119)). |

### Output Specifications

The historical output is a `register.dat` in the FreeSurfer tkregister
convention (see [[coordinate-systems]] / [[lta-format]] and [[tkregister2]]). It
encodes the functional→structural mapping derived from the two volumes' SPM
geometry; no image data is written.

## Mathematical Foundations

Even though the tool is disabled, the conversion it performed is informative for
understanding the SPM↔MGH coordinate relationship. From the embedded MATLAB
job ([`scripts/spmmat2register:82-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L82-L119)):

> [!math] SPM-to-MGH registration matrix
> Let the functional voxel sizes be $f = (f_1,f_2,f_3)$ and dimensions
> $d = (d_1,d_2,d_3)$. Define the **MGH-style** quantization (voxel→tkras)
> matrices for the functional and the (256³, 1 mm) structural,
> $$Q_f^{\text{mgh}} = \begin{bmatrix} -f_1 & 0 & 0 & f_1\frac{d_1-1}{2}\\ 0 & 0 & f_3 & -f_3\frac{d_3-1}{2}\\ 0 & -f_2 & 0 & f_2\frac{d_2-1}{2}\\ 0&0&0&1\end{bmatrix},\quad
> Q_c^{\text{mgh}} = \begin{bmatrix} -1&0&0&127.5\\ 0&0&1&-127.5\\ 0&-1&0&127.5\\ 0&0&0&1\end{bmatrix},$$
> and the **SPM-style** matrices from `spm_get_space`,
> $Q_f^{\text{spm}}$ and $Q_c^{\text{spm}}$. With the 1-vs-0 index-origin
> correction $H$ ($H=\mathbf{I}$ but with its 4th column set to all-ones), the
> registration matrix is
> $$M_{\text{reg}} = Q_f^{\text{mgh}}\,H^{-1}\,(Q_f^{\text{spm}})^{-1}\,Q_c^{\text{spm}}\,H\,(Q_c^{\text{mgh}})^{-1}.$$
> The factor $H$ accounts for **SPM counting voxel indices from 1** while **MGH
> counts from 0** ([`scripts/spmmat2register:100-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L100-L105)). $M_{\text{reg}}$ is
> written (transposed) into the `register.dat`.

This is the same family of geometry algebra that [[tkregister2]] now implements
internally for SPM/FSL interoperability.

## Configuration Options

> [!gotcha] Flags are unreachable in v8.2.0
> The parser still exists but is never reached because the script exits first
> ([`scripts/spmmat2register:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L21-L26)). The table documents the historical
> interface ([`scripts/spmmat2register:137-201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L137-L201)).

| Flag | Type | Default | Description (historical) |
|------|------|---------|--------------------------|
| `-svol` | string | *(required)* | Structural Analyze stem (`<svol>.img`). |
| `-fvol` | string | *(required)* | Functional Analyze stem (`<fvol>.img`). |
| `-subject`<br>`-s` | string | *(required)* | Subject name written into the reg file. |
| `-o` | string | `register.dat` | Output registration file path. |
| `-intensity` | float | `0.3` | Intensity value written on line 4 of the reg file (tkregister brightness). |
| `-monly` | string (mfile) | off | Write the MATLAB job to this file instead of running it. |
| `-verbose` | bool | off | Send the MATLAB output to stdout. |
| `-debug` | bool | off | Verbose + send output to stdout. |
| `-umask` | octal | — | Set the process umask. |

## Configuration Interactions

Not applicable in v8.2.0 (the tool exits before parsing). Historically, all three
of `-svol`, `-fvol`, and `-subject` were mandatory
([`scripts/spmmat2register:205-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L205-L221)); `-monly` short-circuited the
actual MATLAB run.

## Typical Use Cases

There is **no current use case** — the tool is obsolete. The modern equivalents:

```bash
# Compute an SPM-based functional->anatomical registration (replacement for the
# "I already have an SPM coreg" workflow):
spmregister --s sub01 --mov mean_func.nii.gz --reg func2anat.dat

# Or convert/inspect an existing registration with tkregister2 (see its --help,
# "USING WITH FSL and SPM"):
tkregister2 --mov mean_func.nii.gz --targ T1.mgz --reg func2anat.dat --noedit
```

## Pipeline Context

`spmmat2register` is a stand-alone (now disabled) conversion utility; it was
never part of [[wiki/pipelines/recon-all|recon-all]].

**Predecessor (historical):** an SPM coregistration of functional + structural
Analyze volumes → **spmmat2register** → **Successor:** any FreeSurfer tool taking
a `register.dat` (e.g. `mri_vol2surf`, [[wiki/tools/mri_vol2vol|mri_vol2vol]]).
In v8.2.0 this role is served by [[spmregister]] and [[tkregister2]].

## Gotchas and Caveats

> [!gotcha] Running it does nothing but print an error
> Do not script around `spmmat2register` — it cannot produce output in v8.2.0.
> Any pipeline still calling it will get a non-zero exit and no `register.dat`.

> [!gotcha] Historical assumptions baked in
> The disabled code hard-codes a 256³, 1 mm (centre 127.5) structural quantization
> ([`scripts/spmmat2register:89-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L89-L92)) and an MGH voxel-ordering swap; it
> only ever worked for conformed FreeSurfer-style structurals and SPM Analyze
> functionals.

## Error Compensation and Guard Rails

In v8.2.0 the only "guard rail" is the unconditional obsolescence exit
([`scripts/spmmat2register:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L21-L26)). Historically it checked that both
`.img` files existed and that the output reg was created after the MATLAB job
([`scripts/spmmat2register:48-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L48-L58),
[`:125-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L125-L131)).

## Related Tools

- [[tkregister2]] — the designated replacement; see its `--help` section "USING WITH FSL and SPM" for the supported SPM↔FreeSurfer conversion.
- [[spmregister]] — computes an SPM (`spm_coreg`) registration directly into a `register.dat`/`.lta`; the modern way to get an SPM-based registration.
- [[lta_convert]] — converts FreeSurfer registrations between formats.
- [[coordinate-systems]], [[lta-format]] — the conventions involved in the conversion math.

## Confidence and Gaps

**High confidence:** that the tool is disabled and exits immediately
([`scripts/spmmat2register:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L21-L26)), and the full historical interface and
conversion algebra, all read directly from
[`scripts/spmmat2register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register).
No open questions.

## References

- FreeSurfer source: [`scripts/spmmat2register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register) (v8.2.0).
- Obsolescence message and replacement: [`scripts/spmmat2register:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmmat2register#L21-L26); `tkregister2 --help` ("USING WITH FSL and SPM").
