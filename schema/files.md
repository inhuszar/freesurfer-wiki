# File Pages (Glossary)

This schema governs the **file glossary** — one wiki page per
canonical output file produced by any FreeSurfer tool, pipeline, or
script. The glossary lets inexperienced users trace what is generated
from what, and lets experienced users check (or circumvent) the
dependency graph when testing, patching, or adapting FreeSurfer
tools.

Template: `templates/file-page.md`
Page location: `wiki/files/<FILENAME>.md`
Page type: `file` (see `schema/page-types.md` and `schema/conventions.md`)

A file page is **a glossary entry, not a format specification**. The
on-disk byte layout is already documented on format pages
(`wiki/formats/`). The semantics of the directory layout are
already documented on `[[subject-directory]]`. File pages sit
between those two: they name each canonical file, describe what it
contains, state the exact producer and dependency set, and list all
consumers.

---

## What Counts as a File-Page Ingestion

The agent should follow this schema when the user says, paraphrased:

- "Document the `<filename>` file."
- "Create a file page for `orig.mgz` / `lh.white` / `aparc.annot`
  / `talairach.xfm`."
- "Add `<filename>` to the glossary."
- "What produces `<filename>`? write it up."

It also applies when, while ingesting a tool, the agent notices a
user-facing output file that does not yet have a glossary entry —
in that case the file page is created as a side effect of the tool
ingestion and both pages cross-link.

It does **not** apply to:

- **Format specifications** (byte layout, magic numbers, header
  fields) — those are `wiki/formats/` and follow
  `templates/format-page.md`. A file page *links to* its format page
  rather than duplicating it.
- **Directory-layout overviews** — the `[[subject-directory]]`
  format page is the single-page map and stays as-is; file pages
  are the per-entry deep dives linked from it.
- **Transient / debug outputs** without a stable canonical name
  (temporary working files, `*.log`, unless the log is a
  user-inspectable artefact like `scripts/recon-all.log`).
- **Touch-file sentinels** (`touch/*.touch`) as a group — a single
  file page for "`touch/` stage sentinels" is fine if users ask for
  one; individual `.touch` files do not each get a page.

---

## Filename and Page-Name Convention

The page filename is the canonical on-disk filename with the full
extension preserved, and the `title` / `filename` frontmatter
**must** match it. This makes the wiki wikilink `[[orig.mgz]]` read
out loud exactly like the file users type on the command line.

Three cases, in order of priority:

### 1. Non-hemispheric files — literal filename

```
wiki/files/orig.mgz.md              ← [[orig.mgz]]
wiki/files/aseg.mgz.md              ← [[aseg.mgz]]
wiki/files/rawavg.mgz.md            ← [[rawavg.mgz]]
wiki/files/talairach.xfm.md         ← [[talairach.xfm]]
wiki/files/aseg.stats.md            ← [[aseg.stats]]
```

### 2. Hemispheric files — `hemi.` prefix, two aliases

When a file exists as a `lh.` / `rh.` pair holding the same kind
of data for the two cortical hemispheres, there is **one** page,
named `hemi.<basename>.md`, with both expansions listed as
frontmatter aliases.

```
wiki/files/hemi.white.md            ← [[hemi.white]]
  aliases: ["lh.white", "rh.white"]
wiki/files/hemi.aparc.annot.md      ← [[hemi.aparc.annot]]
  aliases: ["lh.aparc.annot", "rh.aparc.annot"]
wiki/files/hemi.thickness.md        ← [[hemi.thickness]]
  aliases: ["lh.thickness", "rh.thickness"]
```

The `hemi.` prefix is chosen over `?h.` because `?` is invalid on
Windows filesystems and unsafe in shell globs and Obsidian wikilink
parsing. The schema defines `hemi.` as the canonical stand-in for
`?h.` everywhere in `wiki/files/`; the per-hemisphere expansions
appear in the frontmatter `aliases` list and in the **Aliases**
subsection of the page body.

### 3. Stage-qualified variants — keep the qualifier

If an intermediate build of a file carries a stage-qualified name
on disk (e.g. `lh.white.preaparc`, `wm.seg.mgz`,
`aseg.presurf.mgz`), that qualified name is its own page. It
cross-links to the base name as a **Variant**, not as an alias.

```
wiki/files/hemi.white.preaparc.md   ← [[hemi.white.preaparc]]   (distinct file from hemi.white)
wiki/files/aseg.presurf.mgz.md      ← [[aseg.presurf.mgz]]       (distinct file from aseg.mgz)
```

---

## Guiding Principles

1. **One logical file, one page.** Hemispheric pairs share a page;
   stage-qualified intermediates do not.
2. **Faithful to disk.** The page name and `filename` / `title`
   frontmatter must equal the literal on-disk filename (modulo the
   `hemi.` convention for pairs). A user who `ls`s the directory
   must be able to find the matching wiki page by name.
3. **Provenance is mandatory.** Every file page must cite its
   producer by `[[wikilink]]` AND by a source-code line range with
   a GitHub permalink (CLAUDE.md rule 10). Re-exported / passthrough
   files must cite the final write call site, not the intermediary.
4. **No duplication of format or tool content.** The file page
   answers "what is this file?" and "where does it come from?". It
   does **not** re-specify the on-disk layout (that's the format
   page) or the tool's options (that's the tool page). Link instead
   of copying.
5. **Cross-link exhaustively.** A file page must link to: its
   format page, its producer tool page, every consumer tool page,
   its siblings in the same invocation, its direct downstream
   files, and the pipeline stage it fits into. Dead-end entries
   defeat the glossary's purpose.
6. **Preserve editability information.** If a file is intended to
   be manually edited between pipeline stages (e.g. `wm.mgz`,
   `brain.finalsurfs.mgz`, `brainmask.mgz`, `control.dat`), set
   `editable: true` in the frontmatter and document the editor and
   the stage at which edits take effect.
7. **Flag version drift.** If a file's existence, name, or format
   depends on the FreeSurfer version (e.g. files added in 8.x,
   legacy files deprecated in 7.x), note the version range
   explicitly. Use `[!contradiction]` when a file's observed
   behaviour disagrees with the upstream wiki.

---

## Workflow: Ingesting a File Page

### 1. Identify the Canonical Filename

- Confirm the exact filename as written to disk. For hemispheric
  files, confirm that `lh.` and `rh.` both exist and share
  semantics; otherwise it is not a pair and does not use the
  `hemi.` convention.
- Decide which of the three page-name cases (non-hemispheric /
  hemispheric / stage-qualified variant) applies, per the
  Filename Convention above.

### 2. Pre-Ingestion Check

- `ls wiki/files/` and grep for the filename (and any known
  aliases). If the page exists, switch to the update workflow.
- Grep `wiki/tools/`, `wiki/pipelines/`, and
  `wiki/formats/subject-directory.md` for prior references to
  the filename — they are a useful seed for consumer / stage
  information.
- Check `raw/mailing-list/` and `raw/dialogue/` for community
  discussion of the file (common for editable files with workflow
  consequences).

### 3. Read the Producing Tool's Wiki Page (If Any)

Open `wiki/tools/<producer>.md` and read its **Outputs**,
**Mathematical Foundations**, and **Typical Use Cases** sections.
These usually state what the file represents without requiring a
fresh source read. If the tool page is missing or the file is not
documented there, fall back to the tool's source.

### 4. Read the Producing Tool's Source

This is mandatory for files that any downstream tool *depends on*,
and strongly recommended otherwise. Locate the exact write call:

- For `MRI *` volume writes: `MRIwrite()`, `MRIwriteFrame()`.
- For surfaces: `MRISwrite()`, `MRISwriteCurvature()`,
  `MRISwriteAnnotation()`.
- For transforms: `LTAwriteEx()`, `LTAwrite()`, explicit `fprintf`
  chains in the MNI `.xfm` case.
- For stats: explicit `fprintf`/`fwrite` in `mri_segstats`,
  `mris_anatomical_stats`.
- For Python-generated files: the relevant `np.save` / `nib.save`
  / `torch.save` / `write_*` call.

Record the file/function/line range and commit SHA. Quote a short
excerpt if the write site encodes something non-obvious (a tagged
section, a default value, a conditional emission). Link the lines
via GitHub permalink (CLAUDE.md rule 10).

### 5. Enumerate the Dependency Set (Inputs)

From the producing tool's CLI parser and from the recon-all stage
(or other caller), list every **file** the producer reads to make
the current file. Environment requirements (e.g.
`$FREESURFER_HOME/models/…`, `$SUBJECTS_DIR/fsaverage/…`) go under
an **Environment** subheading in the Inputs section; they are not
`[[wikilinks]]` unless they are themselves documented file pages.

### 6. Enumerate the Siblings

A single tool invocation often writes several files at once (e.g.
`mri_convert --conform` writes only one; `mris_sphere` writes the
sphere plus a distance field; `mri_ca_label` writes an aseg plus
an intensity-normalized volume). List every co-produced file as a
sibling and cross-link it with `[[wikilink]]`, creating stub
entries in `wiki/files/` if the sibling page does not yet exist
(or, more commonly, noting it as a gap under **Confidence and
Gaps** for later ingestion).

### 7. Enumerate the Consumers

Grep the source tree for reads of the current filename (or for
the logical object it holds, via the produced-by-tool's typical
output variable name). Pipeline stages that read the file are also
consumers — scan `scripts/recon-all` for string matches and note
the stage. Each consumer gets a `[[wikilink]]` under **Direct
downstream consumers** with a one-sentence summary of what it does
with the file.

### 8. Enumerate Downstream Files

Immediate-next-layer files that are produced (directly) from the
current file — i.e. one step in the dependency graph. Deeper
descendants are discoverable via each successor's own file page.
Do not re-derive the full transitive closure on every page.

### 9. Identify Aliases, Duplicates, Variants

Three distinct categories, each documented in its own subsection
on the file page:

- **Aliases**: different filenames for the **same** logical file.
  Examples: `lh.<basename>` / `rh.<basename>` expansions of a
  `hemi.<basename>` page; legacy names emitted by older FreeSurfer
  versions (e.g. `T1.mgz` ↔ `orig.mgz` in some historical
  workflows).
- **Duplicates**: different paths holding the **same content**
  (e.g. a stats file written to both `$SUBJECTS_DIR/<subj>/stats/`
  and `$SUBJECTS_DIR/<subj>/trash/`). State which is authoritative.
- **Variants**: files sharing a naming **pattern** but holding
  different content (e.g. `aparc.annot`, `aparc.a2009s.annot`,
  `aparc.DKTatlas.annot`). These are separate pages; the Variants
  subsection points to each.

### 10. Write the Page

Copy `templates/file-page.md` into `wiki/files/<FILENAME>.md` (or
`wiki/files/hemi.<basename>.md` for pairs). Fill every frontmatter
field; unknown fields get their schema default and a `[!gap]` body
callout.

The **`[!file]` Synopsis** block (immediately under the H1) is what
downstream LLM agents will quote when asked "what is `<FILENAME>`?".
Write it so it stands alone.

### 11. Cross-Reference

- **From the producing tool's page** — if its **Outputs** section
  lists filenames in a prose form, convert the current file's
  mention to a `[[wikilink]]`. Repeat for each sibling that has a
  page.
- **From each consumer tool's page** — its **Inputs** (or
  equivalent) section should wikilink this file.
- **From the format page** — the format page's "Files using this
  format" section (create it if it does not exist, placed
  immediately before **Related**) should list this file.
- **From `[[subject-directory]]`** — the relevant sub-section
  (`mri/`, `surf/`, `label/`, `stats/`, `transforms/`, etc.)
  should wikilink this file in the filename column.
- **From `[[recon-all]]`** — the stage that writes or consumes
  this file should wikilink it under the stage's Outputs / Inputs
  list.

### 12. Update `index.md`

- Add an entry to the **Files** section of `index.md`
  (create the section if it does not yet exist, placed immediately
  after **Formats** and before **Volumetric Tools**).
- Format (one row per file page):

  ```markdown
  ## Files (Glossary)
  | File | Produced by | Directory | Format | Status |
  |------|-------------|-----------|--------|--------|
  | [[orig.mgz]] | [[mri_convert]] (`-c`) | `mri/` | [[mgz]] | 📝 draft |
  | [[hemi.white]] | recon-all Stage 19 | `surf/` | [[surface-format]] | 📝 draft |
  ```

### 13. Log the Operation

Append to `log.md`:

```markdown
## [YYYY-MM-DD] file | <FILENAME>
- Created wiki/files/<FILENAME>.md (<status>)
- Producer: [[producing_tool]] @ <file>:<lines> @ <commit>
- Inputs: [[input_1]], [[input_2]], …
- Siblings: [[sibling_1]], [[sibling_2]], …
- Consumers: [[consumer_1]], [[consumer_2]], …
- Cross-references added: <list of pages updated>
```

For updates rather than creation, use:

```markdown
## [YYYY-MM-DD] file | updated <FILENAME>
- <what changed>
```

---

## Updating an Existing File Page

File pages evolve as the surrounding wiki grows. Update a file
page when any of the following applies:

1. A new consumer is documented — add to `consumed_by` and the
   **Direct downstream consumers** section.
2. A new downstream file page is created — add to
   `downstream_files` and the **Downstream files derived from this
   one** section.
3. The producing tool is re-ingested with a source-level update —
   refresh `produced_at_source` and the **Source reference**
   section; keep the old commit SHA in a history note if the write
   call moved.
4. A FreeSurfer version change introduces, renames, or removes the
   file — update `fs_version`, `aliases`, and add a
   `[!contradiction]` or `[!gap]` note as appropriate. Do not
   delete the old entry; a historical file page is still useful
   for users on older releases.

---

## Interaction With Other Page Types

- **Tool pages** (`wiki/tools/`) document CLI and algorithm. Their
  **Outputs** and **Inputs** sections should be kept to one-line
  filename mentions that wikilink into `wiki/files/`. Do not expand
  the file's semantics on the tool page; the glossary owns that.
- **Format pages** (`wiki/formats/`) document on-disk byte layout.
  They gain a **Files using this format** subsection that
  enumerates every file page pointing at them.
- **Pipeline pages** (`wiki/pipelines/`) document stage sequences.
  Each stage's Outputs should wikilink its files.
- **[[subject-directory]]** remains the single-page inventory; its
  tables should wikilink every filename that has a glossary entry.
  A missing wikilink on `[[subject-directory]]` is a lint flag.
- **Concept pages** (`wiki/concepts/`) provide the cross-cutting
  interpretation. A file page whose contents need a concept to be
  understood (coordinate spaces, label schemes, surface
  representations) links that concept from **Related** rather than
  re-explaining it.
- **Bug / issue pages** may reference file pages when a defect
  affects a specific artefact. Link both ways.

---

## Output Contract for LLM Consumers

Because file pages will be read by LLM agents answering dependency
and provenance questions ("what tool makes `X`?", "what does
`aseg.presurf.mgz` depend on?", "is `wm.mgz` safe to edit after
autorecon2?"), the following fields are a stable machine contract.
Do not rename or repurpose them:

- Frontmatter: `type: file`, `filename`, `aliases`, `location`,
  `format`, `produced_by`, `produced_at_source`, `inputs`,
  `siblings`, `consumed_by`, `downstream_files`, `mandatory_for`,
  `editable`.
- Body: the `[!file]` Synopsis callout immediately under the H1.
- Body: the **How It Is Created** and **How It Is Used** sections.

If a machine consumer needs only one block, it should be able to
extract the Synopsis callout verbatim and the `produced_by` /
`inputs` / `consumed_by` frontmatter arrays.
