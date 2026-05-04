---
title: "FreeView — DTI and Tractography"
type: gui-panel
parent_application: "[[wiki/tools/freeview|freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/LayerDTI.cpp"
  - "freeview/LayerPropertyDTI.cpp"
  - "freeview/DialogLoadDTI.cpp"
  - "freeview/LayerTrack.cpp"
  - "freeview/LayerPropertyTrack.cpp"
  - "freeview/TrackData.cpp"
  - "freeview/FSTrack.cpp"
  - "freeview/DialogLoadODF.cpp"
related_panels:
  - "[[wiki/tools/freeview|freeview]]"
  - "[[freeview-volumes]]"
status: review
confidence: medium
last_agent_update: 2026-04-20
gaps:
  - "Panel widget labels for DTI controls not confirmed from .ui file"
  - "Tract cluster loading via -tc flag needs further investigation"
  - "ODF rendering internals (glyph geometry) not fully investigated"
tags:
  - gui
  - freeview
  - dti
  - tractography
  - diffusion
---

# FreeView — DTI and Tractography

## Overview

FreeView supports three related diffusion imaging data types:

1. **DTI volumes** — FA map + eigenvector volume, displayed as colour-by-direction maps
2. **Tractography tracts** — streamline bundles in `.trk` (TrackVis) format
3. **ODF volumes** — Orientation Distribution Function data for diffusion q-ball imaging

---

## DTI Volumes

### Loading Data

#### Via GUI

**File → Load DTI…** opens `DialogLoadDTI`. Required inputs:

| Field | Description |
|-------|-------------|
| **FA volume** | Fractional anisotropy volume (any volumetric format: `.mgz`, `.mgh`, `.nii`, `.nii.gz`, `.img`, `.mnc`) |
| **Vector (eigenvector) volume** | Principal eigenvector volume; must have ≥ 3 frames |
| **Eigenvalue volume** (optional) | If provided, scale factor is auto-computed as `VectorScale / MaxEigenvalue × 2` |
| **Registration file** (optional) | Any supported registration format |
| **Resample to RAS** | Checkbox to resample oblique data to standard RAS axes |

#### Via Command Line

```bash
freeview -dti vector_file.mgz fa_file.mgz
```

The `-dti` flag takes the eigenvector file first, FA file second.

### Colour Map (Direction Coding)

The default colour map for DTI is `DirectionCoded`. The lookup table is a 64×64×64 = 262,144-entry table encoding RGB from direction cosines (`LayerDTI.cpp::InitializeDTIColorMap()`):

For each voxel: colour = `|v| × FA × 64` per channel, where `v` is the rotation-corrected, normalised principal eigenvector. The result encodes left-right → R, anterior-posterior → G, superior-inferior → B (in the default RGB mapping).

**Direction code variants** (6 permutations, set in `LayerPropertyDTI`):

| Code | R | G | B |
|------|---|---|---|
| RGB (default) | L-R | A-P | S-I |
| RBG | L-R | S-I | A-P |
| GRB | A-P | L-R | S-I |
| GBR | A-P | S-I | L-R |
| BRG | S-I | L-R | A-P |
| BGR | S-I | A-P | L-R |

The colour map is stored as a compound scalar per voxel (FA value + encoded colour integer). Non-standard RAS orientations are handled by a reorder step.

### Panel Controls

DTI volumes use the same volume panel as standard MRI volumes, extended with:

| Control | Default | Description |
|---------|---------|-------------|
| **Colour Map** | DirectionCoded | Set to DirectionCoded for FA-weighted direction colour; other maps (Grayscale, Heat, etc.) display FA magnitude |
| **Min/Max Threshold** (Generic) | (auto) | Modulates the FA scaling of the colour intensity |
| **Direction Code** | RGB | Which axis maps to which colour channel (6 permutations) |

---

## Tractography (Tracts)

### Loading

#### Via Command Line

```bash
freeview -t tract_file.trk
freeview -tc tract_cluster_directory   # tract cluster loading
```

#### Via GUI

**File → Load Tract…** loads a single `.trk` file.
**File → Load Tract Cluster…** loads a directory of tract clusters.

### File Format

FreeView reads **TrackVis `.trk` format** via `CTrackReader` / `TrackIO` (`FSTrack.cpp`). This is the native format of TrackVis and DSI Studio.

> [!gap] Other tract formats
> Whether `.tck` (MRtrix) or other formats are supported was not confirmed.
> The code explicitly uses TrackVis TrackIO. Additional format support would
> require external converters.

### Rendering Options

#### Colour Codes

| Code | Description |
|------|-------------|
| `Directional` (default) | Colour by endpoint-to-endpoint, per-segment, or mid-segment direction vector |
| `SolidColor` | Single user-specified colour |
| `EmbeddedColor` | Use colour embedded in the `.trk` file's scalar data |
| `Scalar` | Colour by a per-vertex scalar channel in the `.trk` file |

#### Direction Schemes (for Directional colour)

| Scheme | Description |
|--------|-------------|
| `EndPoints` (default) | Direction = vector from start to end of the whole streamline |
| `MidSegment` | Direction = midpoint segment vector |
| `EverySegment` | Direction = local segment vector (changes along the tract) |

**Direction-to-colour mapping** uses the same 6 permutations as DTI (RGB, RBG, GRB, GBR, BRG, BGR).

#### Scalar Colour Maps (for Scalar colour code)

Heatscale, Jet, LUT (lookup table by scalar integer value).

#### Render Representation

| Mode | Description |
|------|-------------|
| `Line` (default) | Thin polyline per streamline |
| `Tube` | Circular tube per streamline. Parameters: Tube Radius (default 0.2 mm), Number of Sides (default 5) |

### Filtering

- **Per-scalar threshold filtering**: Show only tracts whose scalar value falls within a range.
- **Label-based filtering**: When the scalar property contains categorical labels, tracts can be filtered by label group.

---

## ODF (Orientation Distribution Function)

### Loading

#### Via GUI

**File → Load ODF…** opens `DialogLoadODF`. Three required inputs:

| Field | Description |
|-------|-------------|
| **ODF volume** | Volumetric ODF data file (any standard format) |
| **Vertex file** | `.txt` file listing vertex directions of the ODF sphere tessellation |
| **Mesh (face) file** | `.txt` file listing the triangle faces of the ODF sphere tessellation |

Additional options:
- **DTK mode** — When checked (Diffusion Toolkit mode), the vertex and mesh files are loaded from pre-configured defaults. `hemisphere=1` is appended to the volume filename automatically.
- **Permuted** — Apply axis permutation to the ODF directions.

#### Via Command Line

```bash
freeview -odf odf_volume.mgz
```

### Display

ODF glyphs are rendered as 3D geometry objects (a `LayerODF` collection registered as "ODF" in `RenderView3D::RefreshAllActors()`). Each ODF voxel produces a deformed sphere whose radius in each direction encodes the diffusion probability.

> [!gap] ODF rendering details
> The exact glyph scaling, orientation conventions, and panel controls
> for ODF display need further documentation from the LayerODF source.

---

## Related Pages

- [[wiki/tools/freeview|freeview]] — main application overview
- [[freeview-volumes]] — volume layer (DTI layers derive from MRI volume base)
- [[freeview-3d-view]] — 3D rendering modes

## References

- Source: `freeview/LayerDTI.cpp` (direction coding, colour table initialization)
- Source: `freeview/LayerPropertyDTI.cpp` (direction code enum, threshold properties)
- Source: `freeview/DialogLoadDTI.cpp` (load dialog options)
- Source: `freeview/LayerTrack.cpp` + `LayerPropertyTrack.cpp` (tract rendering options)
- Source: `freeview/FSTrack.cpp` (TrackVis format reading)
- Source: `freeview/DialogLoadODF.cpp` (ODF load dialog)
