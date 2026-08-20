# Project Dashboard

A personal, local-first web application for tracking project ideas across software, hardware, and digital design from raw concept through active development and completion.

## Features

- **Frictionless Idea Capture**: Quick-capture interface requiring only a title and one-line note to record raw ideas without setup overhead.
- **Status Lifecycle Progression**: Field visibility expands additively as projects advance through stages (`Idea → Planned → Active → Completed / Archived`).
- **Interactive Roadmap & Nested To-Dos**: Step-by-step implementation planning with drag-to-reorder tasks, automatic completion tracking, and auto-stamped completion dates.
- **Components & Cost Tracking**: Structured component tables with numeric price summation and running totals.
- **Technical Diagram Embedding**: Upload and render interactive, self-contained HTML diagrams (e.g., draw.io exports) isolated in secure iframes.
- **Project Locking**: Completed projects lock field editing to preserve finished records while leaving post-project insights editable.
- **Markdown Export**: Export structured `.md` documents tailored to the current lifecycle stage for sharing or documentation.
- **Organic Trait Filtering**: Multi-select filtering using dynamic traits derived automatically across projects.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Running Locally

1. Clone the repository:

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

*Note: Five sample projects are included in `data/projects/` on initial setup to demonstrate the interface. You can delete the JSON files inside `data/projects/` at any time to start clean.*

## Tech Stack

- **Framework**: Next.js 14 / React 18
- **Styling**: Vanilla CSS (Drafting & Blueprint Aesthetic)
- **Storage**: Local JSON files (`data/projects/*.json`) & interactive HTML files (`data/diagrams/*.html`) abstracted behind a repository pattern

## Documentation

For technical details, architecture rules, and feature design background, refer to the documentation in `docs/`:

- [**`docs/FEATURES.md`**](docs/FEATURES.md) — Comprehensive map of all features, built capabilities, and deferred items.
- [**`docs/Codebase.md`**](docs/Codebase.md) — 4-layer architecture, file tree, and end-to-end data flow map.
- [**`docs/Project_Dashboard_Design.md`**](docs/Project_Dashboard_Design.md) — Product rationale, data schemas, and design reference.
- [**`docs/CONVENTIONS.md`**](docs/CONVENTIONS.md) — Coding standards, naming conventions, and styling rules.
- [**`docs/context.md`**](docs/context.md) — Condensed decision log and key choices.