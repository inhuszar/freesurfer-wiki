---
title: "mris_defects_pointset"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_defects_pointset/mris_defects_pointset.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_fix_topology]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact structure of the JSON pointset output format needs verification against freeview's expected schema."
tags:
  - surface
  - topology
  - defects
  - diagnostic
  - pointset
---

# mris_defects_pointset

## Summary

`mris_defects_pointset` converts a surface topology defect label (produced by `mris_fix_topology`) into a pointset file, where each point marks the centroid of one topological defect region. The output pointset can be loaded in `freeview` as a control-point overlay to visualise the locations of topology defects on the cortical surface or in the volume.

## Source Information

- **Language:** C++
- **Primary source:** `mris_defects_pointset/mris_defects_pointset.cpp`
- **Associated XML:** `mris_defects_pointset/mris_defects_pointset.help.xml`

## Purpose and Context

After `mris_fix_topology` runs, it produces a defect label file (e.g., `defect_labels`) that marks which surface vertices belong to topological defects (handles or holes in the surface). These labels are indexed by defect number. The raw label file is not directly human-readable in a spatial context.

`mris_defects_pointset` reads the surface and defect label, computes the centroid of each connected defect region, and writes the centroids as a JSON pointset. The resulting pointset can be loaded in `freeview` alongside the surface, the defect label, and the corrected surface for quality control inspection.

This tool is primarily a **diagnostic utility**. It does not modify any surfaces and is not required for the pipeline to complete.

## Inputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-s`<br>`--surf` | FILE | — | Input FreeSurfer surface file (required). Must match defect label vertex count. |
| `-d`<br>`--defects` | FILE | — | Input defect label file (required). Must be in the same vertex space as the surface. |
| `-l`<br>`--label` | FILE | — | Optional label file to restrict output to a subset of the surface. Must be in input surface space. |

## Outputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-o`<br>`--out` | FILE | — | Output pointset file (required). JSON format by default; old v6 control-point format when `-c` is set. |

With `-c` / `--control`, the output is in old FreeSurfer v6-compatible control point format instead of JSON.

## Mathematical Foundations

For each topologically distinct defect region $D_k$ (a connected component of the defect label), the centroid is computed as:

$$
\mathbf{c}_k = \frac{1}{|D_k|} \sum_{v \in D_k} \mathbf{p}_v
$$

where $\mathbf{p}_v$ is the 3D position of surface vertex $v$. The resulting point $\mathbf{c}_k$ is written to the output pointset.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-s`<br>`--surf` | FILE | — | Input surface file (required) |
| `-d`<br>`--defects` | FILE | — | Input defect label file (required) |
| `-o`<br>`--out` | FILE | — | Output pointset file (required) |
| `-l`<br>`--label` | FILE | — | Restrict output to vertices within this label |
| `-c`<br>`--control` | — | off | Use old v6 control point format instead of JSON |

## Configuration Interactions

- `-l` filters the defect regions so only defects overlapping with the specified label are included in the output pointset. This is useful for focusing on specific cortical regions.
- `-c` changes the output format only; the spatial computation is the same.

## Typical Use Cases

### Generate defect pointset for freeview QC

```bash
mris_defects_pointset \
  -s $SUBJECTS_DIR/subject01/surf/lh.orig.nofix \
  -d $SUBJECTS_DIR/subject01/surf/lh.defect_labels \
  -o $SUBJECTS_DIR/subject01/tmp/lh.defects.json
```

Then load in freeview:

```bash
freeview \
  -f $SUBJECTS_DIR/subject01/surf/lh.orig.nofix \
  -f $SUBJECTS_DIR/subject01/surf/lh.orig \
  -c $SUBJECTS_DIR/subject01/tmp/lh.defects.json
```

## Pipeline Context

`mris_defects_pointset` is not called by `recon-all`. It is a post-hoc quality control tool intended for manual inspection of topology correction results. The typical workflow is:

1. `recon-all` runs `mris_fix_topology` → produces `lh.orig`, `lh.defect_labels`, `lh.defect_chull`, `lh.defect_borders`
2. User runs `mris_defects_pointset` to generate the JSON pointset
3. User loads in `freeview` to visually inspect defect locations
4. If defects are numerous or concentrated in problematic regions, user investigates the skull-strip or fill quality

**Depends on:** [[mris_fix_topology]] (produces the defect label)  
**Used with:** `freeview` for visualisation

## Gotchas and Caveats

> [!gotcha] Surface and defect label must match exactly
> The defect label file must have the same number of vertices as the input surface. A mismatch produces an error. This means the surface passed to `-s` must be the same surface on which topology correction was run (e.g., `lh.orig.nofix`, not the corrected `lh.orig`).

> [!gotcha] JSON format is freeview-specific
> The output JSON format is the FreeSurfer pointset format expected by `freeview`. It is not a generic GeoJSON or other standard format.

> [!gotcha] Tool is purely diagnostic
> Running or not running this tool has no effect on the pipeline outputs. It is only useful for understanding the quality of the topology correction step.

## Related Tools

- [[mris_fix_topology]] — produces the defect label files consumed by this tool
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

Confidence is **high**. The help XML was read in full and the tool's behaviour is clearly described. The algorithm (centroid per defect region) is straightforward and consistent with the source description.

> [!gap] JSON output schema
> The exact JSON schema of the FreeSurfer pointset format (required fields, coordinate system, units) has not been verified against the freeview source. The output is described as "json" in the help XML but the schema details are not documented.
