# PRD: IITM Study Command Center (Local Search Tool)

## 📌 Project Overview
A local-first web application designed to index, search, and display Markdown files exported by the IITM Assignment Scraper.

## 🎯 Primary Goals
1. **Search**: Instant, fuzzy search across all assignments (questions and solutions).
2. **Readability**: Premium rendering of Python code and LaTeX mathematics.
3. **Practice**: "Flashcard" style viewing where solutions are hidden by default.

## 🛠️ Technical Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **Search Engine**: FlexSearch (Local, high-speed indexing)
- **Markdown Rendering**: Unified/Remark/Rehype with Prism.js (High-contrast code)

---

## 💡 AI Prompt for Implementation
If you want to integrate this into your existing project, use this prompt:

> "Build a Next.js local markdown search engine. 
> 1. Use `fs` to scan a local `/content` directory for `.md` files.
> 2. Parse the frontmatter (title, week, type) and the body.
> 3. Implement a 'Command-K' style search bar using `FlexSearch` that searches both code snippets and question text.
> 4. Use `react-markdown` with `rehype-prism-plus` for high-quality syntax highlighting.
> 5. Add a 'Blur Solution' toggle that uses CSS filters to hide code blocks until hovered."
