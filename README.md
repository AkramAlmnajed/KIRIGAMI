<div align="center">

# Kirigami

`切り紙 (kirigami)`

A terminal tool that scaffolds new **React / Next.js** projects with a correct
**[Feature-Sliced Design (FSD)](https://feature-sliced.design/)** architecture —
layers, public-API barrels, path aliases, and a wired-up
[Steiger](https://github.com/feature-sliced/steiger) config, all generated for
you.

[![npm version](https://img.shields.io/npm/v/create-kirigami?color=C9A227&label=npm)](https://www.npmjs.com/package/create-kirigami)
[![License: MIT](https://img.shields.io/badge/license-MIT-C9A227)](LICENSE)
[![Architecture: Feature-Sliced Design](https://img.shields.io/badge/architecture-Feature--Sliced%20Design-262224)](https://feature-sliced.design/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Building from Source](#building-from-source)
- [Project Structure](#project-structure)
- [How It's Built](#how-its-built)
- [License](#license)
- [About the Author](#about-the-author)
- [Contact](#contact)

## Overview

Kirigami is an interactive terminal tool, built with
[Ink](https://github.com/vadimdemedes/ink) (React for the terminal) and
TypeScript, for teams and solo developers who want Feature-Sliced Design done
correctly from day one — without hand-assembling layers, barrels, aliases, and
lint config on every new project.

Running `kirigami` opens a main menu with four actions:

| Action                      | What it does                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **Create New Project**      | A 10-step wizard that generates a complete FSD-structured React or Next.js project               |
| **Check FSD Compliance**    | Runs Steiger against any folder and prints a readable pass/fail report                           |
| **Analyze for FSD Migration** | Read-only analysis of an existing TypeScript React project; writes `FSD-MIGRATION-REPORT.md`   |
| **About**                   | Tool info, version, and links                                                                    |

Each action is described in detail under [Features](#features).

## Features

### Create New Project

A 10-step interactive wizard:

1. **Project name**
2. **Project location** — current directory / Desktop / custom path (with `~`
   expansion; missing folders are created)
3. **Framework** — Next.js (App Router) / React Vite
4. **Styling** — Tailwind CSS / Material UI / CSS Modules
5. **State management** — Zustand / Redux Toolkit / none
6. **Package manager** — npm / pnpm / yarn
7. **Icon library** — Font Awesome / none
8. **Testing** — Vitest + Testing Library / none
9. **Internationalization** — react-i18next / none
10. **Animations** — Framer Motion / none

### Batteries Included

Every generated project ships with **axios**, **TanStack Query**, and
**react-hook-form + zod**, plus a working `features/login` slice as a concrete
example. React Vite projects get `react-router-dom`; Next projects use the App
Router.

| Concern           | Included                                                             |
| ----------------- | -------------------------------------------------------------------- |
| Framework         | Next.js (App Router) or React Vite                                    |
| Language          | TypeScript                                                            |
| Styling           | Tailwind CSS, Material UI, or CSS Modules                             |
| Data fetching     | TanStack Query + Axios                                                |
| Forms             | React Hook Form + Zod                                                 |
| State management  | Zustand, Redux Toolkit, or none                                       |
| Architecture lint | Steiger, wired up via `steiger.config.ts`                             |
| Optional extras   | Font Awesome, Vitest + Testing Library, react-i18next, Framer Motion  |

### Correct FSD Scaffold

Generates the `app`, pages (`views` on Next, `pages` on Vite), `widgets`,
`features`, `entities`, and `shared` layers with public-API barrels, per-layer
path aliases, and a wired-up `steiger.config.ts`. Fresh scaffolds pass
Steiger's recommended ruleset with zero errors.

> **Note:** on Next, the `views` rename means Steiger can't see the pages
> layer, so `insignificant-slice` is turned off with a loud, documented note —
> every other rule stays on.

### Check FSD Compliance

Point it at any folder and it runs Steiger, printing a readable pass/fail
report.

### Analyze for FSD Migration

Point it at any TypeScript React project and it builds a real import graph
(via [ts-morph](https://ts-morph.com), not regex), suggests an FSD layer/slice
for every file with a confidence and a reason, and flags pre-existing
layer-direction violations and circular dependencies.

**Read-only:** it never moves or changes a file — it writes a
`FSD-MIGRATION-REPORT.md` to the analyzed project's root.

### About

Tool info, version, and links.

## Installation

### Prerequisites

- Node.js >= 18 (20 LTS recommended)
- npm

### Install

Kirigami is distributed git-clone-and-install style, like a classic toolkit —
not primarily as an `npx` one-liner:

```bash
git clone https://github.com/AkramAlmnajed/kirigami.git
cd kirigami
./install.sh
kirigami
```

After `./install.sh` finishes, typing `kirigami` from anywhere on your machine
opens the banner and main menu.

### What `install.sh` does

1. Checks that Node.js is installed and is **v18 or newer** (v20 LTS recommended).
2. Checks that npm is available.
3. Installs dependencies (`npm install`).
4. Compiles the TypeScript (`npm run build`).
5. Registers the global `kirigami` command (`npm link`).

If `npm link` fails (usually a global-prefix permissions issue), the installer
prints guidance — prefer a Node version manager (nvm/fnm) or a user-owned npm
prefix over `sudo`.

## Usage

```bash
kirigami            # open the interactive menu
kirigami --help     # usage
kirigami --version  # version
```

### Create a new project

1. Run `kirigami` and choose **Create New Project**.
2. Answer the ten prompts — name, location, framework, styling, state
   management, package manager, and the optional extras.
3. Kirigami generates the project at the chosen location: FSD layers with
   public-API barrels, the example `features/login` slice, and a Steiger
   config the fresh scaffold already passes with zero errors.

### Check an existing codebase for FSD compliance

1. Run `kirigami` and choose **Check FSD Compliance**.
2. Point it at any folder — it runs Steiger and prints a readable pass/fail
   report.

### Plan a migration to FSD

1. Run `kirigami` and choose **Analyze for FSD Migration**.
2. Point it at any TypeScript React project.
3. Read the `FSD-MIGRATION-REPORT.md` written to the project's root: a
   suggested FSD layer/slice for every file with a confidence and a reason,
   plus any pre-existing layer-direction violations and circular
   dependencies. The analysis is read-only — nothing in your project is
   moved or changed.

## Building from Source

The equivalent of `install.sh`, step by step:

```bash
git clone https://github.com/AkramAlmnajed/kirigami.git
cd kirigami
npm install         # install dependencies
npm run build       # compile TypeScript to dist/ and mark the CLI executable
npm link            # register the global `kirigami` command
```

Available scripts:

| Script          | What it does                                             |
| --------------- | -------------------------------------------------------- |
| `npm run build` | Compile `src/` to `dist/` and mark the CLI executable    |
| `npm run dev`   | Compile in watch mode                                    |
| `npm start`     | Run the compiled CLI (`node dist/cli.js`)                |

## Project Structure

```
src/
├── cli.tsx        # executable entry — CLI flags, then renders the Ink app
├── app.tsx        # top-level Ink app and screen routing
├── screens/       # main menu and per-action screens
├── components/    # shared terminal UI (banner, layout, select list)
├── lib/           # core logic — generator, import-graph analyzer, Steiger integration
├── constants.ts
└── types.ts
```

`npm run build` compiles `src/` to `dist/`; the global `kirigami` command
points at `dist/cli.js`.

## How It's Built

- **[TypeScript](https://www.typescriptlang.org/)** — the whole tool, end to end
- **React via [Ink](https://github.com/vadimdemedes/ink)** — the interactive
  terminal UI is React, rendered to the terminal
- **Node.js** — the runtime
- **[ts-morph](https://ts-morph.com)** — AST-based import-graph analysis
  powering the migration analyzer
- **[Steiger](https://github.com/feature-sliced/steiger)** — the FSD linting
  engine behind the compliance checks and every generated `steiger.config.ts`

## License

Released under the [MIT License](LICENSE) — © 2026 Akram Almnajed.

## About the Author & Contact

Kirigami is designed, built, and maintained by **Akram Almnajed** — a FullStack
developer based in Damascus, Syria, specializing in React.js, Next.js,
TypeScript, and Tailwind CSS, with a focus on Feature-Sliced Design and
scalable frontend architecture. He builds developer tooling to make
professional frontend practices faster and more accessible.

- GitHub: [github.com/AkramAlmnajed](https://github.com/AkramAlmnajed)
- Portfolio: [akramalmnajed.github.io/Akram-Portfolio](https://akramalmnajed.github.io/Akram-Portfolio)
- LinkedIn: [linkedin.com/in/akram-almnajed](https://www.linkedin.com/in/akram-almnajed)

---

<div align="center">

◈◇◈◇◈╪▬▬ι═══════════➤

Killed by [Akram Almnajed](https://github.com/AkramAlmnajed)

</div>
