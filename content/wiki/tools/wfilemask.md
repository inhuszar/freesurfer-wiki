---
title: "wfilemask"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh wrapper that generates MATLAB
source_files:
  - "scripts/wfilemask"
families: []                     # standalone surface-overlay masking script
recon_all_stage: null
related:
  - "[[label-format]]"
  - "[[mri_paint]]"
  - "[[mris_w_to_curv]]"
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Masking direction is fixed: label vertices are zeroed (not retained). There is no flag to invert this; users wanting keep-inside behaviour must mask with the complementary label."
tags:
  - surface
  - overlay
  - wfile
  - label
  - matlab
---

# wfilemask

## Summary

`wfilemask` zeroes out the regions of a **surface value file** (a `.w` "paint"
overlay) that fall inside a surface **label**. It reads a `.w` file (a sparse
list of `vertex → value` pairs), reads a `.label` file (a list of vertices), sets
the value at every labelled vertex to zero, drops the now-zero entries, and writes
the result as a new `.w` file. It is a thin tcsh wrapper that emits a short MATLAB
program and runs it, so **MATLAB is required**.

## Source Information

- **Language:** tcsh shell script that generates and runs MATLAB
- **Source file:** [`scripts/wfilemask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/wfilemask`
- **External dependency:** MATLAB, plus the FreeSurfer MATLAB toolbox functions [`read_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L65), [`read_wfile`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L71), and [`write_wfile`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L91) under `$FREESURFER_HOME/matlab`.

## Purpose and Context

A `.w` file (also called a *paint* or *value* file) stores a scalar value at a
subset of surface vertices — for example a functional activation map or a
statistic painted onto `lh.white`/`lh.inflated`. Sometimes a region must be
removed from such an overlay: e.g. to suppress a known artefact ROI, or to keep
only the values outside an anatomical [[label-format|label]]. `wfilemask`
performs that masking by setting the labelled vertices to zero.

It is a **standalone** surface-overlay utility, run by hand. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. It is a small sibling of the surface
"paint" tools such as [[mri_paint]] (which writes `.w` files) and
[[mris_w_to_curv]] (which converts `.w` to curvature format).

> [!gotcha] Requires MATLAB
> The script only assembles a MATLAB program and pipes it to `matlab -nojvm`
> ([`scripts/wfilemask#L101-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L101-L104)); without a working MATLAB on `PATH` it does
> nothing useful. The help text states this explicitly
> ([`scripts/wfilemask#L250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L250)).

## Inputs

### Required Inputs

- **Input w-file** (`-w`) — a surface value/paint `.w` file. Must exist.
- **Label file** (`-l`) — a FreeSurfer surface [[label-format|`.label`]] file; its
  first column is the list of vertex indices used as the mask. Must exist.
- **Output w-file** (`-o`) — path for the masked `.w` result (parent directory is
  created).

### Input Assumptions

> [!assumption] The label and the w-file index the same surface
> Vertex indices in the `.label` and the `.w` must refer to the **same surface
> mesh** (same number/ordering of vertices). The script does not check this; it
> simply uses the label's vertex numbers to index the overlay
> ([`scripts/wfilemask#L79-L86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L79-L86)). Indices are converted from FreeSurfer's
> 0-based convention to MATLAB's 1-based with `+1`.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<wfileout>` (`-o`) | `.w` surface value file | The input overlay with all labelled vertices set to zero and the resulting zero-valued vertices removed (sparse). |
| `/tmp/wfilemask-$$.m` | MATLAB script | The generated program; written and deleted automatically unless `-monly` is used. |

### Output Specifications

A `.w` file is **sparse**: it stores only vertices with a (non-zero) value. After
masking, the script keeps only vertices whose value is non-zero
(`indnz = find(w2 ~= 0)`, [`scripts/wfilemask#L87-L89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L87-L89)), so labelled
vertices — now zero — are dropped from the output entirely. Vertex numbering and
values otherwise match the input.

## Mathematical Foundations

> [!math] Mask = set labelled vertices to zero, then re-sparsify
> Let the input overlay assign value $w_i$ to vertices $v_i$, and let $L$ be the
> set of labelled vertices. The script builds a dense vector $w'$ of length
> $N = \max(\max v, \max L) + 1$, places the input values
> $w'[v_i+1] = w_i$, then zeroes the label: $w'[\ell+1] = 0$ for all $\ell \in L$.
> Finally it returns only the non-zero entries,
> $\{(j-1,\,w'_j) : w'_j \neq 0\}$, as the new sparse `.w`
> ([`scripts/wfilemask#L79-L91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L79-L91)). This is an elementwise overlay × (1 − label
> indicator) followed by removal of zeros.

> [!internal] I/O is in the FreeSurfer MATLAB toolbox
> `read_label`, `read_wfile`, and `write_wfile` (under `$FREESURFER_HOME/matlab`)
> implement the actual `.label`/`.w` parsing and writing; `wfilemask` only
> orchestrates them.

## Configuration Options

### Complete Flag Reference

All flags are from the argument parser
([`scripts/wfilemask#L120-L170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L120-L170)). `--help`/`-help` matches.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-w` | string (file) | *(required)* | Input surface value (`.w`/paint) file. Must exist. |
| `-l` | string (file) | *(required)* | Label file whose vertices define the mask. Must exist. |
| `-o` | string | *(required)* | Output `.w` file (labelled vertices zeroed/removed). |
| `-monly` | string (file) | run MATLAB | Write the generated MATLAB to this `.m` file and **do not** run it (matlab-only / dry-run for debugging). |
| `-umask` | string | — | Set the Unix file-creation mask. |
| `-debug` | bool | off | `set echo`/`verbose` tracing. |
| `-version` | bool | — | Print version and exit. |
| `-help` | bool | — | Print help and exit. |

### Configuration Interactions

> [!gotcha] `-monly` suppresses execution
> `-monly <file>` sets `monly = 1`, which both redirects the generated program to
> `<file>` and skips the `matlab` invocation
> ([`scripts/wfilemask#L52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L52), [`#L101-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L101-L104), [`#L149-L153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L149-L153)). Use it to inspect or
> hand-run the MATLAB; no output `.w` is produced until you run the script
> yourself.

- The three file flags (`-w`, `-l`, `-o`) are all mandatory; there are no
  mutually-exclusive options.

## Typical Use Cases

### 1. Remove a label region from a paint overlay

```bash
# Zero out the vertices of an ROI label in an activation overlay
wfilemask -w lh.sig.w -l lh.artifact.label -o lh.sig.masked.w
```

### 2. Generate the MATLAB without running it (debug)

```bash
wfilemask -w lh.sig.w -l lh.roi.label -o lh.out.w -monly /tmp/mask.m
# inspect /tmp/mask.m, then run it manually in MATLAB if desired
```

## Pipeline Context

`wfilemask` is a **standalone** surface-overlay utility; it is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a `.w` overlay (e.g. from [[mri_paint]], or a painted statistic)
and a `.label` (e.g. drawn in [[wiki/tools/freeview|freeview]]/`tksurfer` or
produced by `mri_cor2label`/`mris_anatomical_stats`) → **wfilemask** →
**Successor:** display in [[wiki/tools/freeview|freeview]]/`tksurfer`, or
conversion with [[mris_w_to_curv]].

## Gotchas and Caveats

> [!gotcha] Masking direction is fixed: labelled vertices are *removed*
> The tool always zeroes the **inside** of the label. There is no `-invert`
> option to instead keep only the inside ([`scripts/wfilemask#L85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L85) sets
> `w2(ind+1) = 0`). To retain only the label region you would need the
> complementary label, or a different tool.

> [!gotcha] Output drops zero-valued vertices
> Because the result is re-sparsified, any vertex whose value became (or already
> was) zero is absent from the output `.w`
> ([`scripts/wfilemask#L87-L89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L87-L89)). A genuine zero measurement in the input is
> indistinguishable from a masked-out vertex in the output.

> [!gotcha] Default MATLAB script path is in `/tmp` and is fixed
> Without `-monly`, the generated program goes to `/tmp/wfilemask-$$.m`
> ([`scripts/wfilemask#L52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L52)) and is removed after the run. On a system with a
> non-writable or unusual `/tmp`, use `-monly` to choose a different location.

## Error Compensation and Guard Rails

- **Existence checks** for `-w` and `-l` at parse time, and presence checks for
  all three required flags ([`scripts/wfilemask#L126-L142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L126-L142),
  [`#L178-L207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L178-L207)).
- **Output-directory creation:** `mkdir -p` on the output's parent, aborting on
  failure ([`#L197-L202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L197-L202)).
- **`FREESURFER_HOME` check** before relying on the MATLAB toolbox path
  ([`#L204-L207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L204-L207)).
- Inside MATLAB, empty `read_label`/`read_wfile` results print an error and
  return without writing ([`#L65-L75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask#L65-L75)). Note these are MATLAB-side messages;
  the wrapper's own exit status is not set from them.

## Related Tools

- [[label-format]] — the `.label` surface-vertex file used as the mask.
- [[mri_paint]] — paints a volume onto a surface, producing the kind of `.w` overlay this tool masks.
- [[mris_w_to_curv]] — converts a `.w` value file to FreeSurfer curvature format (a common next step for display).
- [[mri_binarize]] — the volume-domain analogue (mask/threshold a volume by value or label).
- [[mri_segstats]] — for measuring within ROIs in the volume domain (contrast with this surface-overlay masking).

## Confidence and Gaps

**High confidence:** complete flag set, the zero-the-label masking rule, the
re-sparsification that drops zero vertices, the 0→1-based index conversion, and
the MATLAB dependency — all read directly from
[`scripts/wfilemask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask) and consistent with `--help`.

> [!gap] No invert option
> Masking is one-directional (labelled vertices removed). Keep-inside behaviour
> is not provided; achieving it requires the complementary label or another tool.

## References

- FreeSurfer source: [`scripts/wfilemask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wfilemask) (v8.2.0).
- Built-in help: `wfilemask -help`.
