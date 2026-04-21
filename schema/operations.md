# Operations

## 1. Ingest a Tool

When asked to document a tool:

1. Locate the source file(s) in `$FREESURFER_SOURCE`
2. Read the source code — identify main(), parse command-line argument
   handling, understand the processing logic
3. Check the existing FreeSurfer wiki for any page on this tool
4. Check the tool's `--help` or `-u` output if available
5. Create the tool page using `templates/tool-page.md`
6. Update `index.md` — add the tool to the inventory
7. Update related pages — add wikilinks, update pipeline pages if relevant
8. Create or update relevant concept/format/gotcha pages as needed
9. Log the operation in `log.md`

## 2. Ingest a Concept

When asked to document a concept (e.g., coordinate systems):

1. Search the source code for relevant implementations
2. Check the FreeSurfer wiki for existing documentation
3. Search the web for academic references and community explanations
4. Create the concept page using `templates/concept-page.md`
5. Cross-reference from all relevant tool pages
6. Update `index.md` and `log.md`

## 3. Query

When asked a question about FreeSurfer:

1. Read `index.md` to find relevant pages
2. Read those pages
3. Synthesise an answer with `[[wikilinks]]` to sources
4. If the answer reveals a gap, add it to the relevant page's `gaps`
   frontmatter
5. If the answer is substantial and reusable, save it to `queries/`
6. **If the question is substantive** (see `schema/faq-and-learning.md`),
   archive the Q&A to `raw/dialogue/`

## 4. Lint

Periodically check the wiki for:
- Orphan pages (no inbound wikilinks)
- Dead wikilinks (link to non-existent pages)
- Pages with `status: draft` that haven't been updated
- `[!gap]` callouts that haven't been resolved
- Tools mentioned in `index.md` but lacking a wiki page
- Tools in the source tree not yet in `index.md`
- Inconsistencies between tool pages and pipeline pages
- Missing mathematical descriptions for tools that perform transforms
- Stale FAQ entries (provenance sources that have been superseded)
- Unprocessed dialogue archives in `raw/dialogue/` not yet
  incorporated into FAQ pages
