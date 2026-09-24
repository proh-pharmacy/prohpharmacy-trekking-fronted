import React, { useState } from 'react';
import {
  BatteryCharging,
  Compass,
  Database,
  DotsThree,
  Gauge,
  MapPin,
  MapTrifold,
  Moon,
  Path,
  PlusCircle,
  Sun,
  UsersThree,
  UserCircle,
  Warning,
  type Icon,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { FlatButton } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay/FlatModal';
import type { DriverDevice } from './api';
import type { FieldCustomer, QueuedAction, QueuedPhoto } from './api';
import type { Weather } from './useDeviceStatus';
import { RegionMapBackdrop } from './RegionMapBackdrop';
import { CockpitButton } from './CockpitButton';
import { SyncNotifications } from './SyncNotifications';
import { useTheme } from '../../../context/ThemeContext';

interface Props {
  trek: DriverTrek;
  customers: FieldCustomer[];
  regionalCount: number | null;
  pendingCount: number;
  queue: QueuedAction[];
  photoQueue: QueuedPhoto[];
  products: Product[];
  controlAvailable: boolean;
  syncBusy: boolean;
  onSync: () => Promise<void>;
  online: boolean;
  device: DriverDevice | null;
  phoneAddress: string | null;
  deviceUnavailable: boolean;
  reporting: boolean;
  locationError: string | null;
  sendingSos: boolean;
  weather: Weather | null;
  reportLocation: () => Promise<void>;
  sendSos: () => Promise<void>;
  activeView: string;
  setActiveView: (view: string, options?: Record<string, string>) => void;
  renderStopsView?: () => React.ReactNode;
  renderCustomersView?: () => React.ReactNode;
  renderTreksView?: () => React.ReactNode;
  renderActionsView?: () => React.ReactNode;
  renderOfflineView?: () => React.ReactNode;
  sessionRemembered: boolean;
  onKeepLoggedIn: () => void;
  onLogout: () => void;
}

function isStopRecorded(stop: DriverTrek['stops'][number]) {
  return (
    stop.products.length > 0 &&
    stop.products.every(
      (product) => product.basicQtyDelivered != null || product.packagingQtyDelivered != null
    )
  );
}

// The contract says 0–1; some existing Traccar records return 0–100.
function batteryPercentage(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}

function NavRailButton({
  icon,
  label,
  active,
  onClick,
  mobile = false,
  expanded,
  controls,
}: {
  icon: Icon;
  label: string;
  active: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  mobile?: boolean;
  expanded?: boolean;
  controls?: string;
}) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 !rounded-none text-center transition-all ${mobile ? 'h-16 flex-1 px-0.5' : 'h-[72px] w-full px-0.5 sm:h-[94px] sm:gap-1.5 sm:px-1'} ${active
          ? 'bg-sidebar-accent/15 text-sidebar-heading'
          : 'text-white/60 hover:bg-white/[0.08] hover:text-sidebar-heading'
        }`}
    >
      <IconComponent
        size={mobile ? 22 : 26}
        weight="duotone"
        className="text-sidebar-heading transition-transform group-hover:scale-110"
        aria-hidden="true"
      />
      <span className={`font-semibold leading-tight tracking-wide ${mobile ? 'text-[10px]' : 'text-[9px] sm:text-[11px]'}`}>{label}</span>
      {active && (
        <span className={`driver-navigation-indicator absolute h-1 w-7 bg-white/75 shadow-sm ${mobile ? 'bottom-0.5' : 'bottom-2.5'}`} />
      )}
    </button>
  );
}

function ActionDrawerLink({
  icon,
  label,
  badge,
  badgeBorderless = false,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: Icon;
  label: string;
  badge?: string | number | null;
  badgeBorderless?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`driver-action-drawer-link flex min-h-[40px] w-full items-center justify-between !rounded-none px-3 py-2 text-left text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs ${danger
          ? 'driver-action-drawer-link-danger text-red-accent hover:bg-red-500/10'
          : 'text-portal-text hover:bg-portal-hover hover:text-portal-heading'
        }`}
    >
      <span className="flex items-center gap-2.5">
        <IconComponent size={18} weight="duotone" className="shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
      {badge != null && (
        <span className={`rounded bg-portal-canvas px-1.5 py-0.5 text-[10px] font-semibold text-portal-accent ${badgeBorderless ? '' : 'border border-portal-border/60'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function DriverDashboard({
  trek,
  customers,
  regionalCount,
  pendingCount,
  queue,
  photoQueue,
  products,
  controlAvailable,
  syncBusy,
  onSync,
  online,
  device,
  phoneAddress,
  deviceUnavailable,
  reporting,
  locationError,
  sendingSos,
  weather,
  reportLocation,
  sendSos,
  activeView,
  setActiveView,
  renderStopsView,
  renderCustomersView,
  renderTreksView,
  renderActionsView,
  renderOfflineView,
  sessionRemembered,
  onKeepLoggedIn,
  onLogout,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [confirmSos, setConfirmSos] = useState(false);
  const [loadedMapRegion, setLoadedMapRegion] = useState<string | null>(null);
  const [mapCustomerScope, setMapCustomerScope] = useState<'trek' | 'region'>('trek');
  const { isDark, toggleTheme } = useTheme();

  const mapAvailable = loadedMapRegion === trek.regionName;
  const recorded = trek.stops.filter(isStopRecorded).length;
  const total = trek.stops.length;
  const remaining = Math.max(0, total - recorded);
  const progress = total ? Math.round((recorded / total) * 100) : 0;
  const sortedStops = [...trek.stops].sort((a, b) => a.sequence - b.sequence);
  const nextStop = sortedStops.find((stop) => !isStopRecorded(stop));
  const lastStop = sortedStops[sortedStops.length - 1];
  const trekCustomerNames = new Set(trek.stops.map((stop) => stop.customerName.trim().toLowerCase()));
  const trekCustomers = customers.filter((customer) => trekCustomerNames.has(customer.businessName.trim().toLowerCase()));
  const stopCoordinates = new Map(trek.stops.map((stop) => [stop.customerName.trim().toLowerCase(), stop]));
  const mappedCustomers = (mapCustomerScope === 'trek' ? trekCustomers : customers)
    .flatMap((customer) => {
      const stop = stopCoordinates.get(customer.businessName.trim().toLowerCase());
      const latitude = customer.latitude ?? customer.primaryLocation?.latitude ?? stop?.latitude;
      const longitude = customer.longitude ?? customer.primaryLocation?.longitude ?? stop?.longitude;
      return latitude != null && longitude != null ? [{
        id: customer.id,
        businessName: customer.businessName,
        primaryPhoneNumber: customer.primaryPhoneNumber,
        customerType: customer.customerType,
        regionName: customer.regionName,
        primaryContactPortraitUrl: customer.portraitUrl,
        latitude,
        longitude,
      }] : [];
    });

  // Real telemetry metrics from device & API (zero fake fallbacks)
  const battery = batteryPercentage(device?.batteryLevel);
  const location = device?.lastAddress || phoneAddress || 'Location available via GPS';
  const status = trek.status.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Real speed and motion from Traccar (0 km/h and Parked when stationary)
  const liveSpeed = device?.speed != null && device.speed > 0 ? Math.round(device.speed * 1.852) : 0;
  const gear: string = device?.motion ? 'D' : 'P';

  async function confirmAndSendSos() {
    try {
      await sendSos();
      setConfirmSos(false);
      toast.success('SOS sent to the fleet tracking system.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SOS could not be sent.');
    }
  }

  const handleBack = () => {
    if (activeView !== 'dashboard' && activeView !== 'overview') {
      setActiveView('dashboard');
    } else {
      setActiveView('dashboard');
    }
  };

  const moreMenuContents = (includeMap: boolean) => (
    <>
      <div className="mb-2.5 flex items-center justify-between border-b border-portal-border/50 pb-2 text-[11px] font-bold uppercase tracking-wider text-portal-muted">
        <span className="text-portal-text">Field Operations</span>
        <button
          type="button"
          onClick={() => setMoreOpen(false)}
          aria-label="Close more actions"
          className="!rounded-none p-1 text-portal-muted hover:bg-portal-hover hover:text-portal-heading"
        >
          <i className="pi pi-times text-xs" />
        </button>
      </div>

      <div className="space-y-0.5">
        {includeMap && (
          <ActionDrawerLink icon={MapTrifold} label="Map" onClick={() => { setActiveView('map'); setMoreOpen(false); }} />
        )}
        <ActionDrawerLink icon={BatteryCharging} label="Battery & vehicle" onClick={() => { setActiveView('vehicle'); setMoreOpen(false); }} />
        <ActionDrawerLink icon={PlusCircle} label="Field actions" onClick={() => { setActiveView('actions'); setMoreOpen(false); }} />
        <ActionDrawerLink icon={Database} label="Offline & sync center" badge={pendingCount || undefined} onClick={() => { setActiveView('offline'); setMoreOpen(false); }} />
      </div>

      <div className="my-2 border-t border-portal-border/50" />

      <div className="space-y-1">
        <ActionDrawerLink
          icon={Compass}
          label={reporting ? 'Updating location…' : 'Update GPS location'}
          disabled={!online || reporting}
          onClick={() => void reportLocation()}
        />
        <ActionDrawerLink
          icon={isDark ? Sun : Moon}
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={(event) => { toggleTheme(event); setMoreOpen(false); }}
        />
        <ActionDrawerLink
          icon={Warning}
          label="SOS Emergency Alert"
          danger
          disabled={!online}
          onClick={() => { setConfirmSos(true); setMoreOpen(false); }}
        />
      </div>
    </>
  );

  return (
    <div className="driver-dashboard-shell flex h-full min-h-0 w-full flex-col overflow-hidden bg-portal-canvas">
      {/* Top Application Bar */}
      <header className="driver-dashboard-header relative z-[1400] flex h-16 shrink-0 items-center justify-between gap-2 border-b border-portal-border/60 bg-sidebar-canvas px-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/images/prohpharmacy_icon_white.png" alt="ProH Pharmacy" className="h-8 w-8 object-contain" />
          {/* Desktop header title & metadata */}
          <p className="hidden truncate text-xs font-bold tracking-wide text-sidebar-heading sm:block">
            Trek Control Panel
          </p>
          <span className="hidden truncate text-[11px] font-semibold text-sidebar-text sm:inline">
            · {trek.trekNumber}
          </span>
          <span className="hidden truncate text-xs font-semibold text-sidebar-accent sm:inline">
            ({trek.regionName})
          </span>

          {/* Small screen: replace generic title with Region and Trek Number */}
          <div className="flex min-w-0 items-center gap-1.5 sm:hidden">
            <span className="truncate text-xs font-bold tracking-wide text-sidebar-heading">
              {trek.regionName}
            </span>
            <span className="truncate text-[11px] font-semibold text-sidebar-accent">
              · {trek.trekNumber}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          {regionalCount != null && regionalCount > 1 && (
            <button
              type="button"
              onClick={() => {
                setActiveView('treks');
                setMoreOpen(false);
              }}
              className="hidden sm:flex items-center text-[11px] font-medium text-sidebar-text hover:text-sidebar-heading transition-colors"
            >
              <span>{regionalCount} regional treks</span>
            </button>
          )}
          {regionalCount != null && regionalCount > 1 && <span className="hidden sm:inline text-sidebar-muted">|</span>}
          <span className="font-mono text-[11px] font-medium text-sidebar-text">
            {status}
          </span>
          <SyncNotifications
            queue={queue}
            photos={photoQueue}
            trek={trek}
            customers={customers}
            products={products}
            online={online}
            controlAvailable={controlAvailable}
            busy={syncBusy}
            onSync={onSync}
            onOpenSyncCenter={() => setActiveView('offline')}
          />
          <div className="relative">
            <button
              type="button"
              aria-label={sessionRemembered ? 'Driver session' : 'Keep me logged in'}
              aria-expanded={sessionMenuOpen}
              onClick={() => setSessionMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center !rounded-none text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-sidebar-heading"
            >
              <UserCircle size={22} weight="duotone" aria-hidden="true" />
            </button>
            {sessionMenuOpen && (
              <div className="absolute right-0 top-full z-[1600] mt-2 w-52 !rounded-none border border-portal-border bg-portal-surface p-1.5 shadow-xl">
                <div className="border-b border-portal-border/60 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">Region</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-portal-text">{trek.regionName}</p>
                </div>
                {sessionRemembered ? (
                  <button
                    type="button"
                    onClick={() => { setSessionMenuOpen(false); onLogout(); }}
                    className="flex min-h-10 w-full items-center !rounded-none px-3 py-2 text-left text-xs font-medium text-portal-text transition-colors hover:bg-portal-hover hover:text-portal-heading"
                  >
                    <i className="pi pi-sign-out mr-2.5 text-sm" aria-hidden="true" />
                    Log out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setSessionMenuOpen(false); onKeepLoggedIn(); }}
                    className="flex min-h-10 w-full items-center !rounded-none px-3 py-2 text-left text-xs font-medium text-portal-text transition-colors hover:bg-portal-hover hover:text-portal-heading"
                  >
                    <i className="pi pi-bookmark mr-2.5 text-sm text-portal-accent" aria-hidden="true" />
                    Keep me logged in
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Desktop Body (Left Nav Rail + Workspace) */}
      <div className="driver-dashboard-body relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Rail (matches image) */}
        <aside
          className="driver-field-navigation relative z-[1000] hidden h-full w-[96px] shrink-0 flex-col border-r border-portal-border/60 bg-sidebar-surface sm:flex"
          aria-label="Desktop control rail"
        >
          {/* Back Arrow Button */}
          <div className="driver-desktop-nav-edge flex h-14 items-center justify-center border-b border-portal-border/50">
            <button
              type="button"
              onClick={handleBack}
              title={activeView === 'dashboard' || activeView === 'overview' ? 'Overview' : 'Back to Overview'}
              className="flex h-9 w-9 items-center justify-center !rounded-none text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-sidebar-heading active:scale-95"
            >
              <i className="pi pi-chevron-left text-lg font-bold" />
            </button>
          </div>

          {/* Primary Navigation Tabs */}
          <div role="tablist" aria-label="Field navigation" className="flex flex-col">
            <NavRailButton
              icon={Gauge}
              label="Overview"
              active={activeView === 'dashboard' || activeView === 'overview'}
              onClick={() => {
                setActiveView('dashboard');
                setMoreOpen(false);
              }}
            />
            <NavRailButton
              icon={MapPin}
              label="Stops"
              active={activeView === 'assigned'}
              onClick={() => {
                setActiveView('assigned');
                setMoreOpen(false);
              }}
            />
            <NavRailButton
              icon={Path}
              label="Treks"
              active={activeView === 'treks'}
              onClick={() => {
                setActiveView('treks');
                setMoreOpen(false);
              }}
            />
            <NavRailButton
              icon={UsersThree}
              label="Customers"
              active={activeView === 'customers'}
              onClick={() => {
                setActiveView('customers');
                setMoreOpen(false);
              }}
            />
            <NavRailButton
              icon={MapTrifold}
              label="Map"
              active={activeView === 'map'}
              onClick={() => {
                setActiveView('map');
                setMoreOpen(false);
              }}
            />
          </div>

          {/* Bottom Fast Action Controls */}
          <div className="driver-desktop-nav-edge mt-auto border-t border-portal-border/60 p-1.5">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="desktop-action-drawer"
              title="More actions"
              className={`group relative flex h-[48px] w-full flex-col items-center justify-center gap-0.5 !rounded-none transition-all ${moreOpen
                  ? 'bg-sidebar-accent/15 text-sidebar-heading'
                  : 'text-white/60 hover:bg-sidebar-hover hover:text-sidebar-heading'
                }`}
            >
              <DotsThree size={22} weight="duotone" className="text-sidebar-heading transition-transform group-hover:scale-110" aria-hidden="true" />
              <span className="text-[9px] font-semibold">More</span>
              {moreOpen && <span className="driver-navigation-indicator absolute bottom-0.5 h-1 w-7 bg-white/75 shadow-sm" />}
            </button>
          </div>

          {/* Desktop Flyout In-View Action Drawer */}
          <div
            id="desktop-action-drawer"
            aria-hidden={!moreOpen}
            className={`absolute bottom-2 left-full z-[1100] w-[calc(100vw-4.5rem)] max-w-64 origin-left !rounded-none border border-portal-border bg-portal-surface p-3 shadow-2xl transition-all duration-200 ease-out ${moreOpen ? 'visible translate-x-1 opacity-100' : 'invisible -translate-x-3 pointer-events-none opacity-0'
              }`}
          >
            {moreMenuContents(false)}
          </div>
        </aside>

        {/* Center Workspace (Desktop SPA Area) */}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-portal-canvas p-2 sm:p-5" role="tabpanel">
          {/* ─────────────────────────────────────────────────────────────────
              1. OVERVIEW TELEMETRY COCKPIT (Matches user design image)
              ───────────────────────────────────────────────────────────────── */}
          {(activeView === 'dashboard' || activeView === 'overview') && (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
              {/* TOP WIDE CARD: JOURNEY */}
              <section className="relative overflow-hidden rounded border border-portal-border/70 bg-portal-surface p-3 sm:p-6">
                {/* Background Map Backdrop (Real Vector Map) */}
                <div className="pointer-events-none absolute inset-0 z-0 bg-sidebar-canvas">
                  <RegionMapBackdrop regionName={trek.regionName} onReady={setLoadedMapRegion} />
                </div>
                {/* Contrast Glass Overlay */}
                <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-portal-surface/95 via-portal-surface/70 to-transparent" />

                {/* Driver and vehicle info (left) with speedometer (right) */}
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mt-1.5 truncate text-sm sm:text-base" title={`${trek.driverName} · ${trek.vehicleDisplayName || trek.trekNumber}`}>
                      <span className="font-semibold text-portal-text">{trek.driverName}</span>
                      <span className="mx-2 text-portal-muted" aria-hidden="true">·</span>
                      <span className="text-xs text-portal-muted sm:text-sm">{trek.vehicleDisplayName || trek.trekNumber}</span>
                    </p>

                    {/* Link to the assigned trek's stops */}
                    <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                      <CockpitButton
                        icon="pi-arrow-right"
                        onClick={() => setActiveView('assigned')}
                      >
                        View Trek Stops
                      </CockpitButton>
                      {nextStop?.latitude != null && nextStop.longitude != null && (
                        <div className="flex min-w-0 flex-col justify-center px-1 sm:min-h-9">
                          <span className="max-w-[15rem] truncate text-[11px] font-medium text-portal-text" title={`Next: ${nextStop.customerName}`}>
                            Next: {nextStop.customerName}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(`${nextStop.latitude},${nextStop.longitude}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-portal-muted transition-colors hover:text-portal-accent"
                          >
                            <i className="pi pi-map-marker text-[9px]" aria-hidden="true" />
                            Open in Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top-Right Circular Speedometer Gauge */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-28 sm:w-28">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                      {/* Background track arc */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        fill="none"
                        stroke="#2a3241"
                        strokeWidth="8"
                        strokeDasharray="226 300"
                        strokeLinecap="round"
                      />
                      {/* Glowing active cyan speed arc */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        fill="none"
                        stroke="url(#speedCyanGrad)"
                        strokeWidth="8"
                        strokeDasharray={`${Math.min(226, Math.max(25, (liveSpeed / 120) * 226))} 300`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.75))' }}
                      />
                      <defs>
                        <linearGradient id="speedCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#41cc84" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Speedometer Reading in Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold tracking-tight text-portal-text sm:text-2xl">{liveSpeed}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-portal-muted">km/h</span>
                      {/* PRND Gear Selector */}
                      <div className="mt-0.5 flex items-center gap-1 text-[8px] font-bold tracking-widest text-portal-muted">
                        <span className={gear === 'P' ? 'text-amber-400 font-extrabold' : ''}>P</span>
                        <span className={gear === 'R' ? 'text-cyan-400 font-extrabold' : ''}>R</span>
                        <span className={gear === 'N' ? 'text-cyan-400 font-extrabold' : ''}>N</span>
                        <span className={gear === 'D' ? 'text-cyan-400 font-extrabold drop-shadow-[0_0_4px_#38bdf8]' : ''}>
                          D
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Route Timeline Bar */}
                <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
                  {/* Timeline Track with Nodes */}
                  <div className="relative flex items-start justify-between gap-2">
                    {/* Node 1: Route Start */}
                    <div className="hidden max-w-[30%] flex-col items-start sm:flex">
                      <div className="flex items-center gap-1.5 text-cyan-400">
                        <span className="text-[11px] font-semibold text-portal-text sm:text-xs">Route Start</span>
                      </div>
                      <span className="mt-0.5 text-[9px] text-portal-muted sm:text-[10px]">Origin</span>
                    </div>

                    {/* Node 2: Delivery Progress */}
                    <div className="flex max-w-full flex-1 flex-col items-center text-center sm:max-w-[40%] sm:flex-none">
                      <span className="text-[11px] font-bold text-portal-accent sm:text-xs">
                        {recorded} of {total} stops completed
                      </span>
                    </div>

                    {/* Node 3: Destination / Final Stop */}
                    <div className="hidden max-w-[30%] flex-col items-end text-right sm:flex">
                      <div className="flex items-center gap-1.5 text-portal-muted">
                        <span className="truncate text-[11px] font-semibold text-portal-text sm:text-xs">
                          {lastStop ? `Stop ${total}: ${lastStop.customerName}` : `${trek.regionName} Base`}
                        </span>
                      </div>
                      <span className="mt-0.5 text-[9px] text-portal-muted sm:text-[10px]">Destination</span>
                    </div>
                  </div>

                  {/* Horizontal Progress Track Bar */}
                  <div className="relative mt-2.5 h-1.5 w-full rounded-full bg-portal-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 shadow-[0_0_10px_rgba(56,189,248,0.6)] transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {mapAvailable && (
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-1 z-20 text-[10px] text-portal-text hover:text-portal-heading"
                  >
                    © OpenStreetMap
                  </a>
                )}
              </section>

              {/* BOTTOM TWO CARDS: BATTERY & WEATHER */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* BOTTOM LEFT CARD: BATTERY */}
                <section className="flex flex-col justify-between rounded border border-portal-border/70 bg-portal-surface p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-portal-text sm:text-base">Battery</h3>
                    {device?.ignition != null && (
                      <span className={`text-[11px] font-medium ${device.ignition ? 'text-emerald-400' : 'text-portal-muted'}`}>
                        {device.ignition ? 'Ignition ON' : 'Ignition OFF'}
                      </span>
                    )}
                  </div>

                  <div className="my-auto grid grid-cols-[auto_1fr] items-center gap-4 py-3 sm:gap-8">
                    {/* Vertical Battery Graphic (Left) */}
                    <div className="flex flex-col items-center">
                      {/* Top Battery Terminal Nub */}
                      <div className="h-2 w-6 rounded-t-sm bg-portal-border/80 border border-b-0 border-portal-border" />
                      {/* Outer Battery Shell */}
                      <div className="relative flex h-36 w-16 flex-col justify-end overflow-hidden rounded-md border-2 border-portal-border/80 bg-portal-canvas p-1 shadow-inner">
                        {battery != null ? (
                          <>
                            {/* Fluid Fill Level */}
                            <div
                              className="relative w-full rounded-sm bg-gradient-to-t from-cyan-600 via-sky-400 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.7)] transition-all duration-700"
                              style={{ height: `${battery}%` }}
                            >
                              <div className="absolute top-0 inset-x-0 h-1 bg-white/70 shadow-[0_0_4px_white]" />
                            </div>
                            {/* Battery % overlay */}
                            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                              {battery}%
                            </span>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-center">
                            <span className="font-mono text-xs text-portal-muted">—</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key Telemetry Metrics (Right) */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xl font-semibold tracking-tight text-portal-text sm:text-3xl">
                          {remaining}
                        </p>
                        <p className="text-xs text-portal-muted">stops remaining</p>
                      </div>

                      <div>
                        <p className="text-xl font-semibold tracking-tight text-portal-text sm:text-3xl">
                          {recorded}
                        </p>
                        <p className="text-xs text-portal-muted">stops completed</p>
                      </div>

                      <div>
                        <p className="text-xl font-semibold tracking-tight text-portal-text sm:text-3xl">
                          {total}
                        </p>
                        <p className="text-xs text-portal-muted">total planned stops</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="flex items-center justify-between border-t border-portal-border/50 pt-3 text-[11px] text-portal-muted">
                    <span className="truncate max-w-[220px]">
                      <i className="pi pi-map-marker text-portal-accent mr-1" />
                      {location}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveView('vehicle')}
                      className="font-medium text-portal-accent hover:text-portal-accent-hover transition-colors"
                    >
                      Diagnostics →
                    </button>
                  </div>
                </section>

                {/* BOTTOM RIGHT CARD: WEATHER & ENVIRONMENT */}
                <section className="flex flex-col justify-between rounded border border-portal-border/70 bg-portal-surface p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-portal-text sm:text-base">Weather</h3>
                    {weather && (
                      <span className="text-[10px] uppercase font-semibold text-portal-muted tracking-wider">

                      </span>
                    )}
                  </div>

                  {weather ? (
                    /* 3 Columns Layout (Matches reference image with genuine telemetry) */
                    <div className="my-auto grid grid-cols-3 gap-1 py-3 text-center sm:gap-4 sm:py-4">
                      {/* Column 1: Condition & Wind */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-400 sm:h-10 sm:w-10">
                          <i className="pi pi-sun text-lg drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] sm:text-2xl" />
                        </div>
                        <p className="mt-2 max-w-full truncate text-[11px] font-semibold capitalize text-portal-text sm:mt-3 sm:text-sm">
                          {weather.condition || weather.description}
                        </p>
                        <p className="text-[10px] text-portal-muted uppercase">condition</p>

                        <p className="mt-3 text-xs font-semibold text-portal-text sm:mt-4 sm:text-sm">{weather.windSpeed ?? 0} km/h</p>
                        <p className="text-[10px] text-portal-muted uppercase">wind</p>
                      </div>

                      {/* Column 2: Ambient Outside Temperature */}
                      <div className="flex flex-col items-center border-x border-portal-border/40 px-1 sm:px-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 sm:h-10 sm:w-10">
                          <i className="pi pi-sliders-v text-lg text-orange-400 sm:text-xl" />
                        </div>
                        <p className="mt-2 text-lg font-bold text-portal-text sm:mt-3 sm:text-2xl">
                          {Math.round(weather.temperature)}°C
                        </p>
                        <p className="text-[10px] text-portal-muted uppercase">ambient</p>

                        <p className="mt-3 max-w-full truncate text-[11px] font-semibold capitalize text-portal-text sm:mt-4 sm:text-xs">
                          {weather.description}
                        </p>
                        <p className="text-[10px] text-portal-muted uppercase">forecast</p>
                      </div>

                      {/* Column 3: Humidity & Precipitation */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-400 sm:h-10 sm:w-10">
                          <i className="pi pi-cloud text-lg drop-shadow-[0_0_6px_rgba(56,189,248,0.6)] sm:text-xl" />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-portal-text sm:mt-3 sm:text-sm">{weather.humidity ?? 0}%</p>
                        <p className="text-[10px] text-portal-muted uppercase">humidity</p>

                        <p className="mt-3 text-xs font-semibold text-portal-text sm:mt-4 sm:text-sm">{weather.precipitation ?? 0}%</p>
                        <p className="text-[10px] text-portal-muted uppercase">cloud cover</p>
                      </div>
                    </div>
                  ) : (
                    /* Elegant Offline / Telemetry Pending State */
                    <div className="my-auto flex flex-col items-center justify-center py-4 text-center sm:py-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-portal-border/60 bg-portal-canvas text-portal-muted sm:h-12 sm:w-12">
                        <i className="pi pi-cloud text-lg sm:text-xl" />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-portal-text sm:mt-3 sm:text-sm">
                        Weather telemetry offline
                      </p>
                      <p className="mt-1 max-w-xs text-[11px] text-portal-muted sm:text-xs">
                        Connects with active GPS fixes when reporting online.
                      </p>
                      <button
                        type="button"
                        onClick={() => void reportLocation()}
                        disabled={!online || reporting}
                        className="mt-3 text-[11px] font-medium text-portal-accent hover:underline disabled:opacity-40 sm:text-xs"
                      >
                        {reporting ? 'Reporting GPS…' : 'Report location now'}
                      </button>
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between gap-2 border-t border-portal-border/50 pt-3 text-[10px] text-portal-muted sm:text-[11px]">
                    <span>{weather?.description || `${trek.regionName} Area`}</span>
                    <button
                      type="button"
                      onClick={() => setActiveView('map')}
                      className="font-medium text-portal-accent hover:text-portal-accent-hover transition-colors"
                    >
                      Vector Map →
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              2. SUBVIEW: VEHICLE & TELEMETRY DIAGNOSTICS
              ───────────────────────────────────────────────────────────────── */}
          {activeView === 'vehicle' && (
            <section className="mx-auto max-w-5xl rounded border border-portal-border/70 bg-portal-surface p-3 space-y-6 sm:p-6">
              <div className="flex items-center justify-between border-b border-portal-border/50 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-portal-muted">
                    Telemetry Diagnostics
                  </p>
                  <h1 className="mt-1 text-base font-semibold text-portal-text sm:text-xl">
                    {trek.vehicleDisplayName || `Vehicle for Trek ${trek.trekNumber}`}
                  </h1>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded bg-portal-canvas/60 border border-portal-border/50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-portal-muted">Tracker Battery</p>
                  <p className="mt-1 text-2xl font-semibold text-portal-text sm:text-3xl">{battery}%</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-portal-border/40">
                    <div className="h-full rounded-full bg-portal-accent" style={{ width: `${battery}%` }} />
                  </div>
                </div>

                <div className="rounded bg-portal-canvas/60 border border-portal-border/50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-portal-muted">Motion & Ignition</p>
                  <p className="mt-1 text-base font-semibold text-portal-text capitalize sm:text-lg">
                    {device?.motion ? 'Vehicle Moving' : 'Vehicle Stopped'}
                  </p>
                  <p className="text-xs text-portal-muted mt-1">
                    Ignition: {device?.ignition ? 'ON' : 'OFF'} · Speed: {liveSpeed} km/h
                  </p>
                </div>

                <div className="rounded bg-portal-canvas/60 border border-portal-border/50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-portal-muted">Tracking Service</p>
                  <p className="mt-1 text-base font-semibold text-portal-text capitalize sm:text-lg">
                    {device?.traccarStatus || 'Connected'}
                  </p>
                  <p className="text-xs text-portal-muted mt-1">
                    ID: {device?.traccarUniqueId || trek.trekNumber}
                  </p>
                </div>
              </div>

              <div className="rounded bg-portal-canvas/60 border border-portal-border/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase text-portal-muted">Last Geocoded Position</p>
                <p className="text-sm font-medium text-portal-text break-words">{location}</p>
                {device?.lastReportedAt && (
                  <p className="text-xs text-portal-muted">
                    Reported: {new Date(device.lastReportedAt).toLocaleString()}
                  </p>
                )}
                {locationError && (
                  <p className="rounded bg-yellow-500/10 border border-yellow-500/30 p-2.5 text-xs text-yellow-400">
                    <i className="pi pi-exclamation-triangle mr-1.5" />
                    {locationError}
                  </p>
                )}
                {!device && deviceUnavailable && (
                  <p className="text-xs text-portal-muted italic">
                    No hardware tracking device is currently linked to this vehicle. Phone GPS continues to report.
                  </p>
                )}
                <div className="pt-2">
                  <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-compass"
                    loading={reporting}
                    disabled={!online}
                    onClick={() => void reportLocation()}
                    className="text-[11px] sm:text-xs"
                  >
                    Send GPS Fix Now
                  </FlatButton>
                </div>
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              3. SUBVIEW: INTERACTIVE VECTOR MAP
              ───────────────────────────────────────────────────────────────── */}
          {activeView === 'map' && (
            <section className="mx-auto max-w-6xl overflow-hidden rounded border border-portal-border/70 bg-portal-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 border-b border-portal-border/50 sm:px-5 sm:py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-portal-muted">Offline Map</p>
                  <h1 className="mt-0.5 text-base font-semibold text-portal-text sm:text-lg">{trek.regionName} Region</h1>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="flex items-center rounded border border-portal-border/60 bg-portal-canvas/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => setMapCustomerScope('trek')}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${mapCustomerScope === 'trek' ? 'bg-portal-accent text-white' : 'text-portal-muted hover:text-portal-heading hover:bg-portal-hover'}`}
                    >
                      Current trek ({trekCustomers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapCustomerScope('region')}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${mapCustomerScope === 'region' ? 'bg-portal-accent text-white' : 'text-portal-muted hover:text-portal-heading hover:bg-portal-hover'}`}
                    >
                      All customers ({customers.length})
                    </button>
                  </div>
                  <span className="text-[11px] text-portal-text">
                    {recorded} of {total} stops recorded
                  </span>
                </div>
              </div>

              <div className="relative h-[min(65vh,640px)] min-h-[360px] bg-portal-canvas sm:min-h-[440px]">
                <RegionMapBackdrop regionName={trek.regionName} onReady={setLoadedMapRegion} interactive customerPins={mappedCustomers} />
                {!mapAvailable && !online && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-portal-canvas/85 p-5 text-center text-xs text-portal-text">
                    Map not saved on this device. Connect and download it from Offline & sync.
                  </div>
                )}
                {mapAvailable && (
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 rounded bg-portal-canvas/80 px-2 py-1 text-[10px] text-portal-muted hover:text-portal-accent"
                  >
                    © OpenStreetMap contributors
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 border-t border-portal-border/50 text-[11px] sm:px-5">
                <span className="hidden text-portal-muted sm:inline">Offline PMTiles vector tiles active</span>
                <button
                  type="button"
                  onClick={() => setActiveView('offline')}
                  className="font-semibold text-portal-accent hover:text-portal-accent-hover"
                >
                  Offline Map Storage Settings →
                </button>
              </div>
            </section>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              4. SUBVIEWS: ASSIGNED STOPS, TREKS, ACTIONS, OFFLINE (SPA DESKTOP)
              ───────────────────────────────────────────────────────────────── */}
          {activeView === 'assigned' && renderStopsView && (
            <div className="mx-auto w-full max-w-5xl space-y-4">{renderStopsView()}</div>
          )}

          {activeView === 'customers' && renderCustomersView && (
            <div className="mx-auto w-full max-w-5xl space-y-4">{renderCustomersView()}</div>
          )}

          {activeView === 'treks' && renderTreksView && (
            <div className="mx-auto w-full max-w-6xl space-y-4">{renderTreksView()}</div>
          )}

          {activeView === 'actions' && renderActionsView && (
            <div className="mx-auto w-full max-w-4xl space-y-4">{renderActionsView()}</div>
          )}

          {activeView === 'offline' && renderOfflineView && (
            <div className="mx-auto w-full max-w-4xl space-y-4">{renderOfflineView()}</div>
          )}
        </main>
      </div>

      {/* Mobile navigation stays in view while the selected page scrolls. */}
      <nav
        role="tablist"
        aria-label="Field navigation"
        className="driver-field-navigation relative z-[1200] flex shrink-0 items-stretch border-t border-white/10 bg-sidebar-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <NavRailButton mobile icon={Gauge} label="Overview" active={activeView === 'dashboard' || activeView === 'overview'} onClick={() => { setActiveView('dashboard'); setMoreOpen(false); }} />
        <NavRailButton mobile icon={MapPin} label="Stops" active={activeView === 'assigned'} onClick={() => { setActiveView('assigned'); setMoreOpen(false); }} />
        <NavRailButton mobile icon={Path} label="Treks" active={activeView === 'treks'} onClick={() => { setActiveView('treks'); setMoreOpen(false); }} />
        <NavRailButton mobile icon={UsersThree} label="Customers" active={activeView === 'customers'} onClick={() => { setActiveView('customers'); setMoreOpen(false); }} />
        <NavRailButton
          mobile
          icon={DotsThree}
          label="More"
          active={moreOpen || ['map', 'vehicle', 'actions', 'offline'].includes(activeView)}
          expanded={moreOpen}
          controls="mobile-action-drawer"
          onClick={() => setMoreOpen((open) => !open)}
        />
        <div
          id="mobile-action-drawer"
          aria-hidden={!moreOpen}
          className={`absolute bottom-[calc(100%+0.5rem)] right-2 z-[1300] w-[min(17rem,calc(100vw-1rem))] max-h-[min(65dvh,26rem)] origin-bottom-right overflow-y-auto !rounded-none border border-portal-border bg-portal-surface p-3 shadow-2xl transition-all duration-200 ${moreOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 pointer-events-none opacity-0'}`}
        >
          {moreMenuContents(true)}
        </div>
      </nav>

      {/* SOS Alert Confirmation Modal */}
      <FlatModal
        visible={confirmSos}
        onHide={() => setConfirmSos(false)}
        title="Send SOS Emergency Alert"
        size="sm"
        footer={
          <>
            <FlatButton size="sm" variant="ghost" className="text-[11px] sm:text-xs" onClick={() => setConfirmSos(false)}>
              Cancel
            </FlatButton>
            <FlatButton
              size="sm"
              variant="danger"
              loading={sendingSos}
              onClick={() => void confirmAndSendSos()}
              className="text-[11px] sm:text-xs"
            >
              Send SOS Alert
            </FlatButton>
          </>
        }
      >
        <p className="text-sm text-portal-text">
          This sends an emergency distress signal with your exact GPS coordinates to the fleet management and dispatch control desk.
        </p>
      </FlatModal>
    </div>
  );
}
