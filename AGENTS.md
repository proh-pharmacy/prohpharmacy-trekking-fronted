# ProH Pharmacy Trekking - Agent Guidelines & Documentation Memory

## Frontend Documentation Source
The official documentation and specification guides for this frontend application are located at:
**`/Users/admin/Desktop/prohpharmacy_trekking_app/docs/frontend/`**

Always check this directory for frontend requirements, flows, models, API contracts, and implementation guides before starting any feature:
- `01-login-implementation.md`: Authentication, tokens, login flows
- `02-initial-setup.md`: Architecture and initial setup details
- `03-roles-and-permissions.md`: RBAC, permissions, role matrix
- `04-staff-onboarding.md`: Staff workflow and onboarding
- `05-user-onboarding.md`: User onboarding workflows
- `README.md`: Overview of the frontend docs and roadmap

## Design System & Brand Colors
- **Brand Palette** (from `/Users/admin/Desktop/prohpharmacy/landing-page`):
  - Primary Green: `#087A2D` (`var(--color-primary-green)` / `primary-green`)
  - Deep Green: `#045E1F` (`var(--color-deep-green)` / `deep-green`)
  - Bright Green: `#01A42F` (`var(--color-bright-green)` / `bright-green`)
  - Light Green: `#F1FBF4` (`var(--color-light-green)` / `light-green`)
  - Red Accent: `#DE2512` (`var(--color-red-accent)` / `red-accent`)
  - Red Hover: `#C51F0E` (`var(--color-red-accent-hover)` / `red-accent-hover`)
  - Main Text: `#102218` (`var(--color-main-text)` / `main-text`)
  - Muted Text: `#5F6F64` (`var(--color-muted-text)` / `muted-text`)
  - Light Border: `#DDE9E0` (`var(--color-light-border)` / `light-border`)
- **Subtle Rounded Flat UI**: Default `4px` border-radius (`rounded` / `border-radius: 4px !important` in `src/index.css`) across all inputs, cards, buttons, badges, dialogs, and panels, providing a crisp modern aesthetic with soft corners.
- PrimeReact UI components with custom flat styling overrides.
- PostCSS + Tailwind CSS for utility styling.
- Base Axios client at `src/api-client/api.ts` configured with `VITE_API_BASE_URL` (includes `/api/v1`). Component API calls should use relative endpoints directly (e.g. `/auth/login`, `/staff`) without repeating `/api/v1`.
- Self-contained Flat Data Table at `src/components/data-table/DataTable.tsx` supporting target paginated shape (`totalCount`, `totalPages`, `currentPage`, `pageSize`, `data`).
- **Strict Global Colors & No Invented Colors**: Always use the defined global CSS variables (`src/index.css`) and Tailwind theme tokens (`tailwind.config.cjs`). Agents must **never invent or use arbitrary ad-hoc hex values** (e.g. `bg-[#...]`, `text-[#...]`, `border-[#...]`) in components. If a new color is needed that will repeat or represent a semantic concept, it **MUST** be formally added to the global color definitions in both `@theme` in `src/index.css` and `theme.extend.colors` in `tailwind.config.cjs` before being used in the application.
- **Portal Dark Theme Palette Tokens**:
  - `portal-canvas` (`#22272e`): Main page background, dark input fields, and recessed areas.
  - `portal-surface` (`#2d333b`): Elevated cards, sidebar, table containers, and modal bodies.
  - `portal-card` (`#333e38`): Floating menus and prominent dark cards.
  - `portal-border` (`#444c56`): 1px structural dividing lines and input borders.
  - `portal-muted` (`#768390`): Uppercase input labels (`text-[11px] font-medium`), icons, and muted metadata.
  - `portal-text` (`#adbac7`): High-readability body copy, data table values, and text content.
  - `portal-accent` (`#41cc84` / hover `#38b273`): Primary action buttons, active tabs, and telemetry indicators.
- **Form Inputs & Controls Sizing ('sm')**: Always use the compact `'sm'` (`size="sm"`) input size across all forms, inputs, dropdowns, multi-selects, datepickers, and buttons (`FlatInputText`, `FlatDropdown`, `FlatMultiSelect`, `FlatButton`, etc.) throughout the app. All single-line form controls must maintain a uniform compact height of `38px` with crisp, aligned triggers, compact chips (`.p-multiselect-token`), and subtle uppercase labels (`text-[11px] font-medium text-portal-muted`). **Exception**: The Login page credentials inputs (`login-email` and `login-password`) use the standard default `'md'` (`44px`) sizing.
