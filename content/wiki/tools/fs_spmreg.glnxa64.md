---
title: "fs_spmreg.glnxa64"
type: tool
fs_version: "8.2.0"
source_language: "MATLAB (compiled)"
source_files: []                 # ships as a stripped MCR binary; not built from the tree
families: []
recon_all_stage: null
related:
  - "[[spmregister]]"
  - "[[tkregister2]]"
  - "[[mri_coreg]]"
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The shipped binary is stripped and cannot be run without an MCR; behaviour is inferred from the calling script and the pre-compilation source matlab/fs_spmreg.m."
tags:
  - registration
  - spm
  - matlab
  - mcr
  - compiled
---

# fs_spmreg.glnxa64

## Summary

`fs_spmreg.glnxa64` is the **MATLAB Compiler Runtime (MCR) build** of the SPM
coregistration backend used by [[spmregister]]. It is a standalone, stripped
ELF executable shipped in `$FREESURFER_HOME/bin` (no readable source object in
the build tree) that wraps SPM's `spm_coreg` so the SPM-based registration can
run **without a licensed, interactive MATLAB** — only an MCR is required. It
estimates a rigid/affine alignment between a target and a source volume and
applies the result either to the source's SPM `.mat` geometry or by writing a
resampled output volume. It is invoked only by [[spmregister]] when that script
is run in "binary" mode (`--bin`, `--mcr`, or `FS_SPMREG_USE_BIN=1`).

## Source Information

- **Language:** MATLAB, compiled to a standalone MCR application (`*.glnxa64` = Linux/glnxa64 target).
- **Source file(s):** *none in the FreeSurfer build* — the binary is committed pre-compiled and installed via a symlink rule, [`scripts/CMakeLists.txt:319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L319) (`install_symlinks(fs_spmreg.glnxa64 …)`). The *pre-compilation* MATLAB source — what was compiled to produce this binary — is the M-file [`matlab/fs_spmreg.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m), which [[spmregister]] also runs directly in non-binary mode.
- **Binary location:** `$FREESURFER_HOME/bin/fs_spmreg.glnxa64` (in the installed tree; a stripped, dynamically-linked x86-64 ELF, ~13 MB).
- **Runtime requirement:** a MATLAB Compiler Runtime. [[spmregister]] points `LD_LIBRARY_PATH` at `<mcrroot>/runtime/glnxa64`, `<mcrroot>/bin/glnxa64`, and `<mcrroot>/sys/os/glnxa64` before exec'ing it ([`scripts/spmregister:211-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L211-L217)); the default MCR root is `/usr/pubsw/common/matlab/8.3` (override with `--mcr` or `$FS_MCRROOT`). The compiled application also embeds and calls **SPM** (`spm_coreg`, `spm_get_space`, …).

> [!gap] Source is not compiled from the tree (but the pre-compile M-file is present)
> The `.glnxa64` is a committed, **stripped** binary; it is not built from any
> `.cpp`/`.c`/buildable target, so its exact internals cannot be read from the
> object. Its behaviour here is reconstructed from (a) the calling script
> [`scripts/spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister)
> and (b) the MATLAB source it was compiled from,
> [`matlab/fs_spmreg.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m).
> No internal details are fabricated; anything not visible in those two sources
> is left unstated.

## Purpose and Context

SPM-based coregistration in FreeSurfer historically required a full MATLAB
installation with SPM on the path. To let sites run [[spmregister]] on machines
without a licensed MATLAB, FreeSurfer ships this **deployed** (MCR-compiled)
version of `fs_spmreg.m`. The M-file is written explicitly to be "deployable":
all of its arguments are **strings**, because MCR-compiled functions receive
command-line arguments as strings ([`matlab/fs_spmreg.m:1-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m#L1-L14)).

It is a pure **backend**: it has no user-facing CLI of its own and is never run
by hand in normal use. [[spmregister]] decides between this binary and a live
MATLAB and constructs the argument list identically for both paths.

## Inputs

### Required Inputs

[[spmregister]] calls the binary with **nine positional string arguments**, in
the exact order it would pass to the MATLAB function
([`scripts/spmregister:217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L217); signature in
[`matlab/fs_spmreg.m:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m#L1)):

```text
fs_spmreg.glnxa64  targvol srcvol outvol DOF costfun errfile UseSPMGetSpace fmt monly
```

| # | Arg | Meaning |
|---|-----|---------|
| 1 | `targvol` | target/reference volume (the FreeSurfer anatomical, already converted to the temporary SPM format) |
| 2 | `srcvol` | movable/source volume (the input, converted to the temporary SPM format) |
| 3 | `outvol` | output volume name (written only when `UseSPMGetSpace=0`) |
| 4 | `DOF` | degrees of freedom: `6`, `9`, or `12` |
| 5 | `costfun` | SPM cost function: `nmi` (default from the script), `mi`, `ecc`, or `ncc` |
| 6 | `errfile` | path of an **error sentinel** file — created iff an error occurs (the only failure signal) |
| 7 | `UseSPMGetSpace` | `1` = apply the result by updating the source `.mat` via `spm_get_space`; `0` = apply via `MRIread`/`MRIwrite` to `outvol` |
| 8 | `fmt` | temporary volume format (`nii`, `nii.gz`, or `img`) — used only for SPM8/Analyze error checking |
| 9 | `monly` | `0` = create `errfile` on error; (non-zero suppresses sentinel creation in some paths) |

In practice [[spmregister]] passes the same path for arguments 2 and 3
(`movvolimg` for both `srcvol` and `outvol`).

### Input Assumptions

> [!assumption] Pre-converted, RAS, valid-geometry volumes
> The caller has already converted both volumes to an SPM-readable format
> (NIfTI by default) and, by default, re-centred them to the origin. The backend
> assumes a **RAS** convention (`defaults.analyze.flip = 0`) and that SPM
> (`spm_coreg`) is reachable in the compiled application. It performs an SPM8
> sanity check: SPM8 + Analyze `img` is rejected because SPM8 left-right reverses
> Analyze input.

## Outputs

### Files Created / Modified

| Output | When | Contents |
|--------|------|----------|
| updated source `.mat` (in place, for `srcvol`) | `UseSPMGetSpace=1` | the source volume's SPM world matrix is replaced by `M·MM` (the coregistered geometry) via `spm_get_space` |
| `outvol` (a new volume) | `UseSPMGetSpace=0` | the source written by `MRIwrite` after setting `vox2ras1 ← M·vox2ras1` |
| `errfile` | on error only | a text error message; its **existence** is how [[spmregister]] detects failure |
| stdout log | always | progress lines (`Staring fs_spmreg`, parameters, `fs_spmreg done`) |

### Output Specifications

The estimated transform is the homogeneous matrix
$M = \mathrm{spm\_matrix}(x)^{-1}$, where `x` is the parameter vector from
`spm_coreg`. For `DOF=6` it is rigid; `9` adds anisotropic scales; `12` is full
affine. The result is **geometry only** — applied to the source's world matrix
or written into the output volume's `vox2ras`. [[spmregister]] then converts
this into a FreeSurfer `register.dat`/`.lta` with `tkregister2_cmdl`. See
[[coordinate-systems]] and [[lta-format]].

## Mathematical Foundations

Identical to the M-file backend documented on [[spmregister]] (this binary *is*
that M-file, compiled).

> [!math] What it computes (from `matlab/fs_spmreg.m`)
> Runs `x = spm_coreg(targvol, srcvol, defaults)` with
> `cost_fun = costfun`, separation `[4 2]` mm, FWHM `[7 7]` mm; the DOF→params
> mapping is 6 → `[0 0 0 0 0 0]`, 9 → append `[1 1 1]`, 12 → append
> `[1 1 1 0 0 0]`. It then forms $M = \mathrm{spm\_matrix}(x)^{-1}$ and applies
> it either via `spm_get_space` (update `.mat`) or via
> `vox2ras1 ← M\cdot vox2ras1` + `MRIwrite` (write `outvol`).

> [!internal] Estimator is SPM
> The optimisation itself is SPM's `spm_coreg`, embedded in the compiled
> application. See [[spmregister]] for the full description.

## Configuration Options

This binary has **no command-line flags** — it takes nine fixed positional
arguments (above). All user-facing configuration (cost function, DOF, format,
re-centring, engine selection) is exposed through [[spmregister]]'s flags, which
build the argument vector. There is no `--help`; running the binary directly
without an MCR fails at the dynamic loader (`libmwlaunchermain.so` missing).

## Configuration Interactions

Driven entirely by the caller. The only internal interactions are:

> [!gotcha] `UseSPMGetSpace` selects *how* the result is materialised
> With `1` the source volume's `.mat` is updated in place; with `0` a new
> `outvol` is written. [[spmregister]] forces `0` for `--9`/`--12` (because
> `spm_get_space` can only store a rigid pose). Argument 3 (`outvol`) is only
> consulted when this is `0`.

> [!gotcha] `fmt=img` under SPM8 is a hard error
> The SPM8-detection branch rejects Analyze input and tells the user to re-run
> with NIfTI (`--nii`), because SPM8 left-right reverses Analyze data.

## Typical Use Cases

This binary is not used directly; it is invoked by [[spmregister]]:

```bash
# Selecting the compiled MCR backend (the only normal way fs_spmreg.glnxa64 runs):
setenv FS_MCRROOT /usr/pubsw/common/matlab/8.3
spmregister --s sub01 --mov epi.nii.gz --reg epi2anat.dat --bin
# spmregister then sets LD_LIBRARY_PATH for the MCR and execs:
#   fs_spmreg.glnxa64 <refimg> <movimg> <movimg> 6 nmi <errfile> 1 nii 0
```

## Pipeline Context

`fs_spmreg.glnxa64` is an internal backend, not part of any pipeline directly.

**Predecessor:** [[spmregister]] (converts volumes, sets `LD_LIBRARY_PATH`,
builds the 9-argument call) → **fs_spmreg.glnxa64** (SPM `spm_coreg` estimation
+ geometry update) → **Successor:** `tkregister2_cmdl` (via [[spmregister]])
turns the SPM geometry into a FreeSurfer `register.dat`/`.lta`.

It is **not** called by [[wiki/pipelines/recon-all|recon-all]]. The only caller
anywhere in the tree is [[spmregister]]
([`scripts/spmregister:217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L217)).

## Gotchas and Caveats

> [!gotcha] Needs a matching MCR, not MATLAB
> The binary will not start without the MCR libraries on `LD_LIBRARY_PATH`. Run
> it through [[spmregister]] (`--bin`/`--mcr`/`$FS_MCRROOT`), which sets the
> three required library paths; running it bare yields
> `error while loading shared libraries: libmwlaunchermain.so`.

> [!gotcha] Failure is signalled by a file, not an exit code
> Like the M-file, the only reliable indication of an internal SPM error is the
> creation of the `errfile`; [[spmregister]] checks for it. A non-zero process
> exit is also handled by the caller.

> [!gotcha] Embeds SPM at compile time
> Because SPM is baked into the deployed application, the SPM version is fixed by
> whoever built the binary; the M-file path, by contrast, uses whatever SPM is on
> the user's MATLAB path.

## Error Compensation and Guard Rails

- Writes a descriptive message to `errfile` (the sentinel) on any handled error
  (missing `spm_coreg`, SPM8+Analyze, failed volume load, `spm_coreg` exception).
- The SPM8/Analyze guard prevents a silent left-right reversal of the data.
- All argument parsing/validation and the MCR environment setup are performed by
  the caller [[spmregister]] before this binary runs.

## Related Tools

- [[spmregister]] — the **only** caller; provides all configuration and the conversion to `register.dat`/`.lta`.
- `matlab/fs_spmreg.m` — the pre-compilation MATLAB source; run by [[spmregister]] in non-binary mode and the authoritative description of behaviour.
- [[mri_coreg]] — FreeSurfer's native coregistration; avoids the MCR/SPM dependency entirely.
- [[tkregister2]] — `tkregister2_cmdl` converts this backend's geometry output into a FreeSurfer registration.
- [[coordinate-systems]], [[lta-format]] — conventions of the downstream transform.

## Confidence and Gaps

**Medium confidence.** The argument signature, defaults, and behaviour are read
directly from the calling script and from the pre-compilation source
[`matlab/fs_spmreg.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m);
these are authoritative for what the binary was built to do.

> [!gap] Binary internals not directly verifiable
> The shipped object is stripped and unrunnable here (no MCR installed), so the
> compiled code cannot be inspected or executed to confirm it matches the M-file
> byte-for-byte; any divergence introduced at compile time is not observable.

## References

- FreeSurfer source: [`matlab/fs_spmreg.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m) (pre-compilation source), caller [`scripts/spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister), install rule [`scripts/CMakeLists.txt:319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L319) (v8.2.0).
- MATLAB Compiler / MCR documentation (MathWorks) for the `*.glnxa64` deployment model.
- SPM `spm_coreg.m`; Friston et al., Human Brain Mapping 2(3):165–189, 1995.
