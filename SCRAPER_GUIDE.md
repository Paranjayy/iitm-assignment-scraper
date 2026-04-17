# Learning OS Scraper Design Guide

This guide governs all scraped `.md` files produced by the **IITM Browser Extension** (`scripts/scraper.js`) and any companion AI-generated content. Files land in the Learning OS dashboard, so every rule here directly maps to a rendering or parsing behavior.

---

## 1. Output Frontmatter (REQUIRED on every file)

Every file **must** begin with a YAML frontmatter block — `finalizeExport()` in the extension generates this automatically, but manually produced files must replicate it:

```yaml
---
Title: Jan 2026 - Python - Week 3 - GrPA 2 - Balanced Brackets
Course: Programming in Python
Breadcrumb: Week 3
topic: "Week 3: Stacks & Queues"
---
```

Rules:
- `Title` — matches the sidebar label exactly (used for routing and breadcrumb display).
- `Course` — matches the course page title (used to group files in the OS dashboard).
- `Breadcrumb` — the **week string** as it appears in the sidebar (e.g. `Week 3 Graded Assignment`). The `detectedWeek` variable in `scraper.js` populates this.
- `topic` — mandatory for coding files or `OppeRunner.tsx` may crash on hydration. If the page doesn't name the topic, infer it from the problem context (e.g. `"Week 6: Collections"`).

---

## 2. File Naming Convention

```
Jan 2026 - Python - Week 3 - GrPA 2 - Nested Loops - GRADED.md
Jan 2026 - Maths 1 - Week 5 - Graded Assignment.md
Jan 2026 - English 2 - Week 2 - Practice Assignment.md
```

Rules:
- Always include `Week X` — this is how the OS partitions content in the board view.
- Use `GRADED` suffix to signal it is a scored submission file.
- Use `GrPA` or `PPA` in the title for **coding** assignments — the OS uses this to detect if it should open `<CodingEnv>` (OppeRunner) instead of the regular markdown renderer.
- Never use slashes, colons, or question marks in filenames — the extension's `cleanName()` strips these.
- Keep under ~80 chars. Longer names are truncated at 60 chars by the scraper.

---

## 3. Normal (MCQ/Text) Assignments

The extension outputs these with the following structure when it finds `.gcb-question-row`, `mat-card`, or `.question-container` elements:

```markdown
# Assignment Title

> **Course:** Programming in Python

## Introduction

[intro text if any]

---

### Question 1

[question text with KaTeX math preserved as $...$ or $$...$$]

- [ ] Option A
- [x] Option B  ← checked if the student already answered

**Your Answer:** `42`  ← for numerical inputs

**Status:** Correct
**Score:** 1/1

**Feedback:**
[explanation text]

**Accepted Answers:**
[list of valid answers if shown]

---
```

Key rules:
- **NEVER** include raw `<style>`, `<script>`, or `<noscript>` blocks. The `processNode()` function removes these, manual files must too.
- The extension preserves `<table>` as raw HTML via `turndownService.keep(['table', ...])` — do NOT convert to markdown pipe tables for MCQ data tables, they break for complex nested cells.
- Math inside KaTeX `.katex` spans is extracted via the `annotation[encoding="application/x-tex"]` node and output as `$...$` (inline) or `$$\n...\n$$` (block). Manually produced files must follow this exact format.
- **Matrix blocks**: Multi-line LaTeX (anything with `\\begin` or `\\\\`) is always output as BLOCK math (`$$`). Never inline a matrix — it will lose line breaks.

---

## 4. GrPA / Programming Assignments (OPPE IDE Compatibility)

When `app-programming-code-editor` is detected, the scraper switches into tab-walking mode. The expected output structure for a GrPA file is:

```markdown
---
Title: Jan 2026 - Python - Week 6 - GrPA 1 - Max Subset Sum
Course: Programming in Python
Breadcrumb: Week 6 Graded Programming Assignment
topic: "Week 6: Recursion"
---

# Jan 2026 - Python - Week 6 - GrPA 1 - Max Subset Sum

> **Course:** Programming in Python

[Problem statement from the Question tab]

---

### Public Tests

#### Case 1

**Input:**
```text
[input exactly as shown]
```

**Expected Output:**
```text
[output with ZERO trailing whitespace]
```

---

### Private Tests

#### Case 1

**Input:**
```text
...
```

**Expected Output:**
```text
...
```

---

### 💻 Code Template

```python
# Starting template code as given in the editor
def solve():
    pass
```

---

### 💻 IITM Official Solution

```python
# Official solution code here
# <eoi>
# (suffix evaluation harness code if present)
```

---

### 💻 My Submitted Code

```python
# Student's submitted code
```
```

#### OPPE/Sandbox Critical Rules:

1. **`# <eoi>` marker** — If the official solution or template has a hidden suffix appended (evaluation harness, assert blocks, print wrappers), you **must insert `# <eoi>`** on its own line between the student's code and the harness. The `lib/oppe.ts` AST Scrubber reads this to split the run boundary. Missing it = harness runs inside student code = infinite loops or broken assertions.

2. **Test Case I/O purity**:
   - `Input:` block content must exactly match what `stdin` or `eval()` will receive. No extra spaces, no markdown formatting inside the block.
   - `Expected Output:` must have zero trailing whitespace or newlines. One stray `\n` causes Pyodide assertion drift — students fail on exact match even when correct.
   - Duplicate test cases are a known issue (fixed in scraper via `seenContent` fingerprint Set). When producing manually, deduplicate by fingerprinting `input+expected`.

3. **Code in solution blocks must be runnable as-is**:
   - No markdown prose inside `python` code blocks.
   - No trailing conversational comments like `# This works!` that can pollute AST parsing.
   - If it's Python, it must execute on Pyodide without crashing.

4. **Locked tabs** — If the solution tab is disabled/locked at scrape time, output:
   ```markdown
   ### 💻 IITM Official Solution
   > *Solution code is currently locked and will be available after the deadline.*
   ```
   Do NOT leave the heading without content — `OppeRunner.tsx` checks for it.

---

## 5. Resource Links

The scraper auto-detects Drive/Docs/Slide/Session/Transcript links and emits them under `## 📎 Resource Links`. Manually assembled files should follow the same pattern:

```markdown
## 📎 Resource Links

- 🛝 [Week 3 Slides](https://drive.google.com/...)
- 📜 [Lecture Transcript](https://drive.google.com/...)
- 👨‍🏫 [Live Session Recording](https://drive.google.com/...)
- 🔑 [Quiz Feedback Key](https://docs.google.com/spreadsheets/...)
```

---

## 6. Lecture / Transcript Files

When scraping a video page, the extension produces:

```markdown
![Lecture Thumbnail](https://img.youtube.com/vi/VIDEO_ID/mqdefault.jpg)

> 🎥 **Video Link:** [Watch on YouTube](https://youtube.com/watch?v=VIDEO_ID)

## 📜 Lecture Transcript

**[00:00]** Introduction to the problem  
**[00:42]** Defining the recursive case  
...
```

Transcripts are also indexed into `chrome.storage` via `indexTranscript` message for the deep search feature.

---

## 7. Markdown Cleanliness Rules (applied by `finalizeExport`)

These are auto-applied but must be respected in manual files:

| Rule | Why |
|---|---|
| Images flushed to column 0 (`![]()` never indented) | MarkdownRenderer breaks on indented images |
| No trailing whitespace on any line | Pyodide assert drift for test cases |
| No triple+ blank lines | Renderer collapses them but it's noisy |
| Tables kept as raw HTML `<table>` | Pipe markdown breaks for complex cells |
| `xxxxxxxxxx` strings removed | Ace editor artifact from CodeMirror measurement divs |

---

## 8. Output Management

- Write files to `content_temp/` during bulk scraping, then move to the final content directory.
- The ZIP vault from the curriculum archivist goes to `Courses/`. Do not mix assignment `.md` files there.
- The bulk scraper uses `window.__scraperMode = 'capture'` + `iitm-markdown-captured` CustomEvent sequencing — do not trigger `finalizeExport()` manually in this mode, the sequencer handles it.
