# Project Contributors & Contribution Guidelines

Thank you for contributing to the **ProH Pharmacy Trekking Portal**! This document recognizes project contributors and establishes development standards to ensure cohesive UI aesthetics, high code quality, and maintainable architecture.

---

## Core Contributors & Maintainers

| Contributor | Role | Contact | GitHub / Org |
|---|---|---|---|
| **Sakoe Courage** | Lead Developer & Architecture | [csakoe@ecfatum.com](mailto:csakoe@ecfatum.com) | [@csakoe](https://github.com/csakoe) |
| **ProH Pharmacy** | Product Ownership & Domain Operations | — | [proh-pharmacy](https://github.com/proh-pharmacy) |

---

## How to Contribute

We welcome contributions across features, bug fixes, telemetry improvements, and documentation. Please follow the standard workflow below.

### 1. Branching Strategy
- Create a dedicated branch from `main` using standard prefixes:
  - `feat/feature-name` — New features (e.g. `feat/trek-route-export`)
  - `fix/bug-description` — Bug fixes (e.g. `fix/device-battery-indicator`)
  - `docs/topic-name` — Documentation improvements (e.g. `docs/api-contracts`)
  - `refactor/scope` — Non-functional code improvements

### 2. Design System & Theme Rules (`AGENTS.md`)
All contributors **must** strictly adhere to the project's design system:

1. **Strict Global Color Tokens**:
   - Never invent arbitrary hex colors (`bg-[#...]`, `text-[#...]`, `border-[#...]`) inside components.
   - Use established tokens from `src/index.css` and `tailwind.config.cjs`:
     - `portal-canvas` (`#22272e`): Page background and recessed inputs.
     - `portal-surface` (`#2d333b`): Elevated cards, sidebar, table containers, and modals.
     - `portal-card` (`#333e38`): Prominent dark cards and floating overlays.
     - `portal-border` (`#444c56`): 1px structural dividing lines.
     - `portal-muted` (`#768390`): Uppercase labels, icons, and muted text.
     - `portal-text` (`#adbac7`): Body text, data table values, and primary text.
     - `portal-accent` (`#41cc84` / hover `#38b273`): Primary action buttons and telemetry indicators.
     - `portal-orange` (`#f0883e`): Idling states and intermediate alerts.
     - `red-accent` (`#de2512`): Destructive actions and offline indicators.

2. **Form Control Sizing (`size="sm"`)**:
   - Single-line inputs, dropdowns, datepickers, multi-selects, and buttons must use compact `'sm'` sizing (`38px` uniform height).
   - Labels must use uppercase `text-[11px] font-medium text-portal-muted`.

3. **Subtle Rectilinear Flat UI**:
   - Maintain a uniform `4px` border-radius (`rounded`) across all buttons, inputs, panels, dialogs, and table containers.

4. **No Borders on Standalone Text**:
   - Never enclose standalone text elements (such as vehicle registrations, staff IDs, reference codes, or status labels) in artificial boxed borders. Distinguish them using typography, color tokens, and `font-mono`.

5. **Immediate Table Refresh on Mutations**:
   - Whenever an entity is created, edited, deleted, or invited, the handler must immediately call `resetTableData()` (from `components/data-table`) as soon as the mutating API call succeeds.

---

### 3. Verification & Quality Gates

Before committing changes, ensure all verification checks pass:

```bash
# 1. Type-check & Production Build
npm run build

# 2. Fast Static Analysis & Linting
npm run lint
```

Both commands must finish with **0 errors**.

---

### 4. Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(module): description` — New feature or capability
- `fix(module): description` — Bug fix
- `refactor(module): description` — Refactoring without behavioral change
- `style(module): description` — Formatting or design token refinement
- `docs(module): description` — Documentation additions or updates

*Example:*
```bash
git commit -m "feat(tracking): add real-time vehicle route polyline replay"
```

---

### 5. Submitting Pull Requests

1. Push your branch to the remote repository:
   ```bash
   git push -u origin feat/your-feature-name
   ```
2. Open a Pull Request against `main`.
3. Provide a clear description of the changes, related guides in `docs/frontend/`, and attach visual screenshots or screen recordings for UI adjustments.
4. Request review from the maintainers.

---

## Code of Conduct

All contributors are expected to maintain a professional, collaborative, and constructive environment. Treat fellow contributors with respect and prioritize clear technical communication.
