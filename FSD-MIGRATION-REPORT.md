# FSD Migration Analysis

> **Read-only report.** No files in this project were moved, renamed, or modified.
> This is a *suggestion* based on static import-graph heuristics — review every row.

- **Project:** `/Users/akram/Desktop/kirigami`
- **Files analyzed:** 36
- **"Widely imported" threshold:** ≥ 3 importers
- **Confidence:** 11 high · 9 medium · 16 low

## Suggested layer distribution

| Layer | Files |
|---|---|
| pages | 10 |
| features | 1 |
| entities | 6 |
| shared | 3 |
| uncertain ⚠ | 16 |

## Per-file suggestions

### → `src/pages`

| current file | suggested | confidence | why |
|---|---|---|---|
| `src/screens/About.tsx` | pages/about | high | lives in a routing folder (screens/) |
| `src/screens/AnalyzeMigration.tsx` | pages/analyzeMigration | high | lives in a routing folder (screens/) |
| `src/screens/CheckCompliance.tsx` | pages/checkCompliance | high | lives in a routing folder (screens/) |
| `src/screens/CreateProject/ChoiceStep.tsx` | pages/choiceStep | high | lives in a routing folder (CreateProject/) |
| `src/screens/CreateProject/CustomPathStep.tsx` | pages/customPathStep | high | lives in a routing folder (CreateProject/) |
| `src/screens/CreateProject/index.tsx` | pages/index | high | lives in a routing folder (CreateProject/) |
| `src/screens/CreateProject/ProjectNameStep.tsx` | pages/projectNameStep | high | lives in a routing folder (CreateProject/) |
| `src/screens/CreateProject/Success.tsx` | pages/success | high | lives in a routing folder (CreateProject/) |
| `src/screens/CreateProject/Summary.tsx` | pages/summary | high | lives in a routing folder (CreateProject/) |
| `src/screens/MainMenu.tsx` | pages/mainMenu | high | lives in a routing folder (screens/) |

### → `src/features`

| current file | suggested | confidence | why |
|---|---|---|---|
| `src/lib/generator/login.ts` | features/login | medium | name reads as a user action ("login") — one delivered capability |

### → `src/entities`

| current file | suggested | confidence | why |
|---|---|---|---|
| `src/lib/analyzer.ts` | entities/analyzer | medium | a non-UI business model built around a type/interface ("analyzer") |
| `src/lib/fsutil.ts` | entities/fsutil | medium | a non-UI business model built around a type/interface ("fsutil") |
| `src/lib/generator/index.ts` | entities/index | medium | a non-UI business model built around a type/interface ("index") |
| `src/lib/generator/types.ts` | entities/types | medium | a non-UI business model built around a type/interface ("types") |
| `src/lib/steiger.ts` | entities/steiger | medium | a non-UI business model built around a type/interface ("steiger") |
| `src/types.ts` | entities/types | medium | a non-UI business model built around a type/interface ("types") |

### → `src/shared`

| current file | suggested | confidence | why |
|---|---|---|---|
| `src/components/Layout.tsx` | shared/ui | medium | generic UI primitive ("Layout") — belongs in the shared UI kit |
| `src/constants.ts` | shared/constants | high | generic infrastructure/client ("constants") |
| `src/lib/generator/api.ts` | shared/api | medium | generic infrastructure/client ("api") — note its internal imports (flagged below) |

### → `src/uncertain` (needs a human decision)

| current file | suggested | confidence | why |
|---|---|---|---|
| `src/app.tsx` | — | low | does not clearly fit a layer — renders UI and imports other modules, but no clear compose/capability signal (nearest guess: widgets) |
| `src/cli.tsx` | — | low | does not clearly fit a layer — renders UI and imports other modules, but no clear compose/capability signal (nearest guess: widgets) |
| `src/components/Banner.tsx` | — | low | does not clearly fit a layer — renders UI and imports other modules, but no clear compose/capability signal (nearest guess: widgets) |
| `src/components/Credit.tsx` | — | low | does not clearly fit a layer — renders UI and imports other modules, but no clear compose/capability signal (nearest guess: widgets) |
| `src/components/intro.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/components/SelectList.tsx` | — | low | does not clearly fit a layer — renders UI and imports other modules, but no clear compose/capability signal (nearest guess: widgets) |
| `src/lib/generator/animations.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/configs.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/framework.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/header.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/i18n.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/layers.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/providers.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/state.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/styling.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |
| `src/lib/generator/testing.ts` | — | low | does not clearly fit a layer — weak signals (nearest guess: shared) |

## ⚠ Architectural problems — refactoring, not just moving

**Upward imports** (a lower layer importing a higher one — forbidden in FSD). Relocating these files will *not* fix them; the dependency itself has to be inverted or the code split:

- `src/lib/generator/api.ts` (→ shared) imports `src/lib/generator/types.ts` (→ entities) — a **shared → entities** import goes the wrong way.
- `src/lib/generator/api.ts` (→ shared) imports `src/types.ts` (→ entities) — a **shared → entities** import goes the wrong way.
- `src/lib/generator/index.ts` (→ entities) imports `src/lib/generator/login.ts` (→ features) — a **entities → features** import goes the wrong way.

> These are pre-existing issues, surfaced honestly: a clean *mechanical* file-move migration is **not** possible here until they're addressed.

---
_Generated by Kirigami's FSD Migration Analyzer (read-only). Heuristic, not authoritative._
