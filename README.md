# ProH Pharmacy — Trekking & Fleet Operations Portal

A modern, high-performance web portal for pharmaceutical distribution, live fleet telemetry, trek delivery scheduling, and multi-branch inventory operations across Ghana.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **PrimeReact Flat Design System**, **Leaflet**, and **SignalR WebSockets**.

---

## Overview

The ProH Pharmacy Trekking Portal empowers dispatchers, branch managers, and operational teams with end-to-end visibility over pharmaceutical distribution pipelines. From route planning and delivery verification to real-time GPS telemetry from hardware trackers and smartphone clients, the platform provides actionable insights and strict data integrity.

---

## Core Capabilities

### 1. Live Fleet Telemetry (`/portal/tracking`)
- **Real-Time GPS Tracking**: Persistent SignalR WebSocket connection (`/hubs/tracking`) receiving live `PositionUpdated` telemetry events from Traccar.
- **Interactive Leaflet Map**: Ghana-centered vector and raster mapping with automatic bounds fitting (`fitBounds`) and smooth `flyTo` camera transitions.
- **Dynamic Vehicle Markers**: Custom status indicators showing vehicle state:
  - **Moving**: Pulse animation, active speed (`km/h`), and heading bearing arrow.
  - **Idling**: Engine ON while stationary.
  - **Stopped / Off**: Engine OFF with timestamp.
- **Live Telemetry Inspection**: Detailed metrics drawer showing real-time speed, ignition state, battery percentage, cardinal heading, reverse geocoded address, and 3D fix verification.
- **On-Demand Traccar Ping**: Instant hardware ping querying the live Traccar server.
- **Historical Route Trails**: Replay GPS breadcrumb trails over configurable time windows (`1h`, `6h`, `Today`, `24h`) with polyline rendering and origin/destination markers.
- **Multi-Branch Filtering**: Dynamic branch switching with automatic WebSocket group subscription (`JoinBranch` / `LeaveBranch`).

### 2. Trekking & Delivery Operations (`/portal/trekking`)
- **Trek Scheduling**: Create, assign, and manage distribution treks across branches and routes.
- **Stop Sequencing & Checkpoints**: Order-level transit checkpoints, verification stamps, and proof-of-delivery logging.
- **Driver Attribution**: Associate treks to verified fleet drivers and tracking devices.

### 3. Fleet & Device Administration (`/portal/fleet`)
- **Vehicle Fleet**: Operational lifecycle tracking (`Active`, `UnderMaintenance`, `Decommissioned`) with staff driver assignment.
- **GPS Tracking Devices**: Smartphone and hardware tracker registration, IMEI/UniqueId pairing, and automated Traccar device synchronization.
- **Traccar Integration**: Two-way synchronization for drivers, devices, and Traccar dashboard users.

### 4. Customer Directory (`/portal/customers`)
- **Client Profiles**: Comprehensive registry of retail pharmacies, wholesale outlets, hospitals, clinics, and OTC medicine sellers.
- **Geo-Location Pinning**: Interactive mini-map coordinate picker for pinpoint customer delivery locations across regions and districts.
- **Credit & Contacts**: Key relationship managers, credit officers, and verified contact phone numbers.

### 5. Product & Packaging Catalog (`/portal/products`)
- **Product Inventory**: Pharmaceutical items with generic names, SKUs, barcode mappings, and unit packaging configurations.
- **Status Lifecycle**: Toggle active/inactive catalog items with instant pagination and filtering.

### 6. Organisation Structure (`/portal/settings/organisation`)
- **Hierarchy Mapping**: Administrative hierarchy mapping across Ghana's Regions, Districts, and Pharmacy Branches.
- **Branch Management**: Retail, wholesale, and laboratory branch classification with coordinates and contact details.

### 7. Access Control & Security (`/portal/settings/users`)
- **Granular RBAC**: Role-based permissions matrix controlling access to routes, modules, and API mutations.
- **Secure Token Storage**: In-memory access token storage paired with secure rotating refresh tokens and transparent silent refresh interceptors.
- **Staff Invitation Lifecycle**: Multi-step staff invitation, onboarding, and role delegation workflows.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + PostCSS |
| **Component UI** | [PrimeReact](https://primereact.org/) with Custom Flat Dark UI Overrides |
| **Maps & GIS** | [Leaflet](https://leafletjs.com/) + [React-Leaflet](https://react-leaflet.js.org/) |
| **Real-Time Telemetry** | [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr) |
| **Data Fetching** | [@tanstack/react-query](https://tanstack.com/query/latest) + [Axios](https://axios-http.com/) |
| **Icons** | [PrimeIcons](https://primereact.org/icons/) + [Lucide React](https://lucide.dev/) |
| **Linter & Tooling** | [Oxlint](https://oxc.rs/) |

---

## Design System & Theme Principles

The portal uses a customized, cohesive dark theme engineered for high operational clarity and zero eye fatigue during extended dispatch monitoring:

- **Canvas & Surfaces**: Deep slate canvas (`#22272e`), elevated cards/panels (`#2d333b`), and floating modals (`#333e38`).
- **Accent Palette**: ProH brand emerald accent (`#41cc84` / hover `#38b273`) for active telemetry, primary actions, and moving units.
- **Status Tints**: Warm amber (`#f0883e`) for idling states and red accent (`#de2512`) for disconnected / alert states.
- **Flat UI Precision**: Uniform `4px` rectilinear border-radius across inputs, buttons, tables, and dialogs.
- **Compact Controls**: Uniform `38px` (`size="sm"`) control heights across all forms, search inputs, dropdowns, and buttons.
- **Clean Standalone Typography**: Zero borders on standalone identifiers, driver codes, or telemetry metadata values.

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (v10+)
- **Backend API**: Running instance of `prohpharmacy-trekking-app` (ASP.NET Core / Kestrel)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/proh-pharmacy/prohpharmacy-trekking-fronted.git
   cd prohpharmacy-trekking-fronted
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory (or update existing):
   ```env
   # Backend API Base URL (must include /api/v1)
   VITE_API_BASE_URL=http://localhost:5000/api/v1

   # Optional: SignalR Hub URL override (defaults to root origin /hubs/tracking)
   # VITE_HUB_URL=http://localhost:5000/hubs/tracking

   # Optional: CARTO Dark Matter API Key (if omitted, falls back to clean dark OpenStreetMap)
   # VITE_CARTO_API_KEY=your_carto_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The portal will be accessible at `http://localhost:5173`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles TypeScript (`tsc -b`) and bundles production assets into `dist/`. |
| `npm run preview` | Serves the production build locally for verification. |
| `npm run lint` | Runs `oxlint` across the codebase for fast static analysis. |

---

## Documentation

Comprehensive architecture guides and API contracts are available in [`docs/frontend/`](./docs/frontend/README.md):
- `00-api-conventions.md`: HTTP status codes, error payload schemas, and pagination standards.
- `01-login-implementation.md`: Silent token refresh and JWT storage patterns.
- `07-organisation.md`: Regional, district, and branch structure definitions.
- `10-fleet.md`: Vehicle and tracking device management.
- `11-trekking.md`: Trek dispatching workflows and driver assignments.
- `12-tracking.md`: Real-time Leaflet tracking, SignalR WebSocket integration, and Traccar webhooks.

---

## Contributors

Please refer to [CONTRIBUTORS.md](./CONTRIBUTORS.md) for information about project contributors, maintainers, and contribution guidelines.

---

## License

Proprietary — All rights reserved by **ProH Pharmacy**.
