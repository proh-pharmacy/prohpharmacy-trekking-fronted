import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlatModal,
  FlatSideModal,
  FlatBottomSheet,
  FlatConfirmDialog,
} from '../../components/overlay';
import { FlatButton } from '../../components/flat-form/FlatButton';
import { FlatInputText } from '../../components/flat-form/FlatInputText';
import { FlatDropdown } from '../../components/flat-form/FlatDropdown';
import { FlatDatePicker } from '../../components/flat-form/FlatDatePicker';
import { FlatCheckbox } from '../../components/flat-form/FlatCheckbox';
import { FlatTextarea } from '../../components/flat-form/FlatTextarea';
import toast from 'react-hot-toast';

export const OverlayShowcase: React.FC = () => {
  // Modal states
  const [activeModal, setActiveModal] = useState<'form' | 'small' | 'large' | 'full' | null>(null);

  // Side Modal (Drawer) states
  const [activeDrawer, setActiveDrawer] = useState<'staff' | 'telemetry' | 'leftFilter' | null>(null);

  // Bottom Sheet states
  const [activeSheet, setActiveSheet] = useState<'actions' | 'filters' | null>(null);

  // Confirmation Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    variant: 'primary' | 'danger' | 'warning';
    title: string;
    message: string;
    confirmLabel: string;
    action: () => Promise<void> | void;
  }>({
    visible: false,
    variant: 'primary',
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    action: () => {},
  });

  // Sample form state for modals
  const [missionName, setMissionName] = useState('TX-904 Vaccine Express');
  const [selectedStation, setSelectedStation] = useState('Lukla Outpost');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [coldChainRequired, setColdChainRequired] = useState(true);
  const [notes, setNotes] = useState('Insulin and Oxford-AstraZeneca doses packaged in monitored cooler unit #C-12.');

  const stationOptions = [
    { label: 'Lukla Base Station', value: 'Lukla Outpost' },
    { label: 'Namche Health Hub', value: 'Namche Health Hub' },
    { label: 'Pangboche High Outpost', value: 'Pangboche Outpost' },
    { label: 'Dingboche Field Clinic', value: 'Dingboche Clinic' },
  ];

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Mission ${missionName} successfully registered!`);
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-[#101214] text-white font-sans antialiased selection:bg-[#41cc84] selection:text-black flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-[#101214] border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/portal/dashboard"
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-8 h-8 rounded bg-[#1e2126] border border-white/10 flex items-center justify-center text-[#41cc84] group-hover:border-[#41cc84]/40 transition">
              <img
                src="/images/prohpharmacy_icon_white.png"
                alt="Logo"
                className="w-4 h-4 object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Overlay & Modal Suite</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#41cc84]/15 text-[#41cc84] border border-[#41cc84]/30 rounded">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-[#e2eee6]/60 font-mono">
                ProH Pharmacy Trekking Design System
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Navigation */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/portal/dashboard"
            className="px-3 py-1.5 bg-[#41cc84] hover:bg-[#36ba76] text-white font-bold rounded transition flex items-center gap-1.5 shadow-sm"
          >
            <i className="pi pi-th-large text-xs" />
            <span>Go to Portal</span>
          </Link>
          <Link
            to="/toasts"
            className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 rounded transition flex items-center gap-1.5"
          >
            <i className="pi pi-bell text-xs text-[#41cc84]" />
            <span>Toasts</span>
          </Link>
          <Link
            to="/table"
            className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 rounded transition flex items-center gap-1.5"
          >
            <i className="pi pi-table text-xs text-[#41cc84]" />
            <span>Data Table</span>
          </Link>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        {/* Intro Banner */}
        <div className="p-6 bg-[#1e2126] border border-white/[0.08] rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Interactive Overlay & Dialog Showcase</span>
            </h1>
            <p className="text-xs text-[#e2eee6]/75 leading-relaxed">
              Explore the four core overlay patterns built for ProH Pharmacy Trekking: Center Modals,
              Slide-Over Drawers, Bottom Action Sheets, and Confirmation Dialogs. All components adhere strictly
              to the dark obsidian palette (<code className="text-[#41cc84]">#101214</code>), flat card surfaces (<code className="text-[#41cc84]">#1e2126</code>),
              subtle 4px borders, and <code className="text-[#41cc84]">#41cc84</code> action triggers.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#e2eee6]/60 bg-[#101214] px-3.5 py-2 rounded border border-white/10 shrink-0">
            <i className="pi pi-info-circle text-[#41cc84]" />
            <span>Press ESC or click backdrop to close</span>
          </div>
        </div>

        {/* Section 1: Center Modals */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <div className="w-2 h-2 rounded-full bg-[#41cc84]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              1. Center Modals (<code className="text-[#41cc84] font-mono text-xs">FlatModal</code>)
            </h2>
            <span className="text-xs text-white/40 ml-2">Centered popups with backdrop blur and responsive sizes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Form Modal */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-[#41cc84] mb-3">
                  <i className="pi pi-send text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Form Modal (md)</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Full mission registration form with inputs, dropdowns, and date picker.
                </p>
              </div>
              <FlatButton
                size="sm"
                onClick={() => setActiveModal('form')}
                className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
              >
                Open Mission Form
              </FlatButton>
            </div>

            {/* Small Alert Modal */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-blue-400 mb-3">
                  <i className="pi pi-info-circle text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Compact Modal (sm)</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Small prompt viewport for announcements or simple details (max-w-md).
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('small')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Open Compact Modal
              </FlatButton>
            </div>

            {/* Large Audit Modal */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-purple-400 mb-3">
                  <i className="pi pi-table text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Large Viewport (lg)</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Spacious dialog for multi-column data, telemetry logs, or inventory lists.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('large')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Open Large Modal
              </FlatButton>
            </div>

            {/* Full Screen Viewport */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-amber-400 mb-3">
                  <i className="pi pi-window-maximize text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Full Screen (full)</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Expansive viewport (96vw x 94vh) for interactive map trackers and charts.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('full')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Open Full Screen
              </FlatButton>
            </div>
          </div>
        </section>

        {/* Section 2: Side Modals / Drawers */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              2. Side Modals / Drawers (<code className="text-[#41cc84] font-mono text-xs">FlatSideModal</code>)
            </h2>
            <span className="text-xs text-white/40 ml-2">Slide-over panels anchored to the right or left</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Right Drawer - Staff Form */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-[#41cc84]">
                    <i className="pi pi-user-plus text-sm" />
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded">
                    Right Side • md
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">Add Staff Member Drawer</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Slide-out panel for staff onboarding, roles, stations, and biometric records.
                </p>
              </div>
              <FlatButton
                size="sm"
                onClick={() => setActiveDrawer('staff')}
                className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
              >
                Open Staff Drawer
              </FlatButton>
            </div>

            {/* Right Drawer - Mission Telemetry */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-cyan-400">
                    <i className="pi pi-compass text-sm" />
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">
                    Right Side • lg
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">Route Telemetry Inspector</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Inspect live GPS coordinates, altitude profile, and cold-chain sensor status.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveDrawer('telemetry')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Inspect Mission Telemetry
              </FlatButton>
            </div>

            {/* Left Drawer - Navigation & Quick Filters */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-amber-400">
                    <i className="pi pi-filter text-sm" />
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                    Left Side • sm
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">Left Filter Drawer</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Slide in from the left to quickly filter regional hubs, clinics, or personnel.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveDrawer('leftFilter')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Open Left Filter Drawer
              </FlatButton>
            </div>
          </div>
        </section>

        {/* Section 3: Bottom Sheets */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              3. Bottom Sheets (<code className="text-[#41cc84] font-mono text-xs">FlatBottomSheet</code>)
            </h2>
            <span className="text-xs text-white/40 ml-2">Slide-up sheets with drag handle for mobile & quick actions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quick Actions Sheet */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-purple-400 mb-3">
                  <i className="pi pi-bolt text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Operational Action Sheet</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Slide up quick batch operations: Print Manifest, Emergency Dispatch, or Sync Hubs.
                </p>
              </div>
              <FlatButton
                size="sm"
                onClick={() => setActiveSheet('actions')}
                className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
              >
                Trigger Action Sheet
              </FlatButton>
            </div>

            {/* Filter & Sort Sheet */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-teal-400 mb-3">
                  <i className="pi pi-sliders-h text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Mobile Filter Sheet</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Touch-friendly slide-up filter sheet with segmented controls and reset buttons.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() => setActiveSheet('filters')}
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Trigger Filter Sheet
              </FlatButton>
            </div>
          </div>
        </section>

        {/* Section 4: Confirmation Dialogs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <div className="w-2 h-2 rounded-full bg-[#DE2512]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              4. Confirmation Dialogs (<code className="text-[#41cc84] font-mono text-xs">FlatConfirmDialog</code>)
            </h2>
            <span className="text-xs text-white/40 ml-2">Clean verification popups with primary, danger, and warning modes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Destructive Action */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#DE2512]/15 border border-[#DE2512]/30 flex items-center justify-center text-[#DE2512] mb-3">
                  <i className="pi pi-trash text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Destructive Action</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Confirm record deletion or contract termination with red <code className="text-[#DE2512]">#DE2512</code> button.
                </p>
              </div>
              <FlatButton
                variant="danger"
                size="sm"
                onClick={() =>
                  setConfirmDialog({
                    visible: true,
                    variant: 'danger',
                    title: 'Delete Staff Record?',
                    message:
                      'Are you sure you want to delete Field Pharmacist Tenzing Norgay (STF-1001)? This action cannot be undone and will revoke all telemetry access.',
                    confirmLabel: 'Delete Record',
                    action: async () => {
                      await new Promise((res) => setTimeout(res, 600));
                      toast.success('Staff record deleted.');
                      setConfirmDialog((prev) => ({ ...prev, visible: false }));
                    },
                  })
                }
                className="w-full text-xs font-bold"
              >
                Delete Record Dialog
              </FlatButton>
            </div>

            {/* Primary Action */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-[#41cc84]/15 border border-[#41cc84]/30 flex items-center justify-center text-[#41cc84] mb-3">
                  <i className="pi pi-check-circle text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Authorization Action</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Authorize high-value vaccine dispatches or medicine requisitions.
                </p>
              </div>
              <FlatButton
                size="sm"
                onClick={() =>
                  setConfirmDialog({
                    visible: true,
                    variant: 'primary',
                    title: 'Authorize Trekking Dispatch?',
                    message:
                      'You are about to release Batch #TX-904 (14 cold-chain vials) to Dingboche Clinic. Confirm dispatch to alert courier Kwame.',
                    confirmLabel: 'Authorize & Dispatch',
                    action: async () => {
                      await new Promise((res) => setTimeout(res, 500));
                      toast.success('Dispatch authorized! Telemetry stream live.');
                      setConfirmDialog((prev) => ({ ...prev, visible: false }));
                    },
                  })
                }
                className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
              >
                Authorize Dispatch Dialog
              </FlatButton>
            </div>

            {/* Warning Action */}
            <div className="p-5 bg-[#1e2126] border border-white/[0.08] rounded flex flex-col justify-between space-y-4">
              <div>
                <div className="w-8 h-8 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <i className="pi pi-exclamation-triangle text-sm" />
                </div>
                <h3 className="text-sm font-bold text-white">Precautionary Warning</h3>
                <p className="text-xs text-[#e2eee6]/60 mt-1">
                  Alert operators of inclement weather route disruptions before rerouting.
                </p>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmDialog({
                    visible: true,
                    variant: 'warning',
                    title: 'Reroute Trekking Mission?',
                    message:
                      'Severe weather advisory detected near Pangboche Pass. Rerouting will add 3 hours of transit time to delivery schedule.',
                    confirmLabel: 'Proceed with Reroute',
                    action: async () => {
                      await new Promise((res) => setTimeout(res, 500));
                      toast.success('Route updated with secondary pass.');
                      setConfirmDialog((prev) => ({ ...prev, visible: false }));
                    },
                  })
                }
                className="w-full !border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
              >
                Warning Dialog
              </FlatButton>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          ACTUAL MOUNTED OVERLAYS
          ========================================================================= */}

      {/* 1. Center Modal: Form Modal (md) */}
      <FlatModal
        visible={activeModal === 'form'}
        onHide={() => setActiveModal(null)}
        title="Dispatch Trekking Mission"
        subtitle="Schedule a field team with certified cold-chain container"
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono bg-[#41cc84]/15 text-[#41cc84] border border-[#41cc84]/30 rounded">
            Mission Setup
          </span>
        }
        icon="pi pi-send"
        size="md"
        footer={
          <>
            <FlatButton
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="!border-white/10 !text-white/75 hover:!bg-white/[0.08] text-xs font-semibold"
            >
              Cancel
            </FlatButton>
            <FlatButton
              size="sm"
              onClick={handleDispatchSubmit}
              className="!bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
            >
              Confirm Dispatch
            </FlatButton>
          </>
        }
      >
        <form onSubmit={handleDispatchSubmit} className="space-y-4">
          <FlatInputText
            id="mission-name"
            label="Mission Designation"
            value={missionName}
            onChange={(e) => setMissionName(e.target.value)}
            placeholder="e.g. TX-904 Vaccine Express"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FlatDropdown
              id="clinic-station"
              label="Destination Clinic"
              value={selectedStation}
              options={stationOptions}
              onChange={(e) => setSelectedStation(e.value)}
            />

            <FlatDatePicker
              id="dispatch-date"
              label="Scheduled Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value as Date)}
              showIcon
            />
          </div>

          <FlatCheckbox
            id="cold-chain-checkbox"
            label="Enforce Active Cold-Chain Telemetry (2°C - 8°C)"
            checked={coldChainRequired}
            onChange={(e) => setColdChainRequired(e.checked || false)}
          />

          <FlatTextarea
            id="mission-notes"
            label="Manifest Notes & Fragile Cautions"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </form>
      </FlatModal>

      {/* 1b. Center Modal: Compact (sm) */}
      <FlatModal
        visible={activeModal === 'small'}
        onHide={() => setActiveModal(null)}
        title="Ashaiman Regional Hub Status"
        subtitle="Telemetry update"
        size="sm"
        icon="pi pi-info-circle"
        footer={
          <FlatButton
            size="sm"
            onClick={() => setActiveModal(null)}
            className="!bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
          >
            Acknowledge
          </FlatButton>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[#e2eee6]/80 leading-relaxed">
            All 14 field units are transmitting healthy cardiac and GPS telemetry. Cloud sync latency is
            operating at <span className="text-[#41cc84] font-semibold">42ms</span>.
          </p>
          <div className="p-3 bg-[#101214] border border-white/10 rounded flex justify-between items-center text-xs">
            <span className="text-white/60">Cold-Chain Temperature</span>
            <span className="font-mono text-[#41cc84] font-bold">4.2°C (Optimal)</span>
          </div>
        </div>
      </FlatModal>

      {/* 1c. Center Modal: Large (lg) */}
      <FlatModal
        visible={activeModal === 'large'}
        onHide={() => setActiveModal(null)}
        title="Regional Medical Inventory Allocation"
        subtitle="Batch audit across 4 primary logistics hubs"
        size="lg"
        icon="pi pi-box"
        footer={
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => setActiveModal(null)}
            className="!border-white/10 !text-white/80 hover:!bg-white/5 text-xs font-semibold"
          >
            Close Audit
          </FlatButton>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-[#101214] border border-white/10 rounded">
              <div className="text-xs text-white/50">Total Ampoules</div>
              <div className="text-lg font-bold text-white mt-0.5">2,840</div>
            </div>
            <div className="p-3 bg-[#101214] border border-white/10 rounded">
              <div className="text-xs text-white/50">In-Transit</div>
              <div className="text-lg font-bold text-[#41cc84] mt-0.5">620</div>
            </div>
            <div className="p-3 bg-[#101214] border border-white/10 rounded">
              <div className="text-xs text-white/50">Quarantine Reserve</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">48</div>
            </div>
          </div>

          <div className="border border-white/10 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101214] text-white/50 border-b border-white/10">
                <tr>
                  <th className="p-3 font-semibold">SKU Code</th>
                  <th className="p-3 font-semibold">Product Name</th>
                  <th className="p-3 font-semibold">Current Stock</th>
                  <th className="p-3 font-semibold">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#e2eee6]/80 font-mono">
                <tr>
                  <td className="p-3">MED-OXF-001</td>
                  <td className="p-3 text-white font-sans font-medium">Oxford AstraZeneca 0.5ml</td>
                  <td className="p-3 text-[#41cc84] font-bold">1,200</td>
                  <td className="p-3">2°C - 8°C Cold Chain</td>
                </tr>
                <tr>
                  <td className="p-3">MED-INS-042</td>
                  <td className="p-3 text-white font-sans font-medium">Humalog Regular Insulin 100IU</td>
                  <td className="p-3 text-[#41cc84] font-bold">840</td>
                  <td className="p-3">4°C Verified</td>
                </tr>
                <tr>
                  <td className="p-3">MED-EPN-110</td>
                  <td className="p-3 text-white font-sans font-medium">EpiPen Auto-Injector 0.3mg</td>
                  <td className="p-3 text-[#41cc84] font-bold">450</td>
                  <td className="p-3">Ambient Controlled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </FlatModal>

      {/* 1d. Center Modal: Full Screen (full) */}
      <FlatModal
        visible={activeModal === 'full'}
        onHide={() => setActiveModal(null)}
        title="Live Trekking Operations Radar"
        subtitle="Global satellite telemetry overview"
        size="full"
        icon="pi pi-map"
        footer={
          <FlatButton
            size="sm"
            onClick={() => setActiveModal(null)}
            className="!bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
          >
            Exit Full Screen Viewport
          </FlatButton>
        }
      >
        <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">
          <div className="w-16 h-16 rounded-full bg-[#41cc84]/15 border border-[#41cc84]/30 flex items-center justify-center text-[#41cc84] text-2xl animate-pulse">
            <i className="pi pi-map-marker" />
          </div>
          <h4 className="text-lg font-bold text-white">Full Screen High-Altitude GIS Viewport</h4>
          <p className="text-xs text-[#e2eee6]/60 max-w-md">
            This viewport maximizes to 96vw by 94vh, designed for comprehensive map overlays,
            flight dispatch tracks, and live real-time courier geo-fences.
          </p>
        </div>
      </FlatModal>

      {/* 2a. Side Modal: Staff Onboarding Drawer (right • md) */}
      <FlatSideModal
        visible={activeDrawer === 'staff'}
        onHide={() => setActiveDrawer(null)}
        position="right"
        size="md"
        title="Add Staff Member"
        subtitle="Register trekking personnel into directory"
        icon="pi pi-user-plus"
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono bg-[#41cc84]/15 text-[#41cc84] border border-[#41cc84]/30 rounded">
            HR Intake
          </span>
        }
        footer={
          <>
            <FlatButton
              variant="outline"
              size="sm"
              onClick={() => setActiveDrawer(null)}
              className="!border-white/10 !text-white/75 hover:!bg-white/[0.08] text-xs font-semibold"
            >
              Cancel
            </FlatButton>
            <FlatButton
              size="sm"
              onClick={() => {
                toast.success('Staff member registered!');
                setActiveDrawer(null);
              }}
              className="!bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
            >
              Save Staff Member
            </FlatButton>
          </>
        }
      >
        <div className="space-y-4">
          <FlatInputText
            id="staff-name-input"
            label="Full Legal Name"
            placeholder="e.g. Pasang Lhamu"
            defaultValue="Pasang Lhamu"
            required
          />

          <FlatInputText
            id="staff-email-input"
            label="Work Email Address"
            placeholder="e.g. pasang@prohpharmacy.org"
            defaultValue="pasang@prohpharmacy.org"
            required
          />

          <FlatDropdown
            id="staff-role-select"
            label="Primary Deployment Role"
            value="Lead Guide"
            options={[
              { label: 'Field Pharmacist', value: 'Field Pharmacist' },
              { label: 'Lead Guide', value: 'Lead Guide' },
              { label: 'Medical Courier', value: 'Medical Courier' },
              { label: 'Logistics Officer', value: 'Logistics Officer' },
            ]}
          />

          <FlatDropdown
            id="staff-hub-select"
            label="Assigned Regional Station"
            value="Lukla Base"
            options={[
              { label: 'Lukla Base Station', value: 'Lukla Base' },
              { label: 'Namche Outpost', value: 'Namche Outpost' },
              { label: 'Dingboche Clinic', value: 'Dingboche Clinic' },
            ]}
          />

          <FlatInputText
            id="staff-permit-input"
            label="Trekking Authorization Permit #"
            placeholder="TRK-2026-0049"
            defaultValue="TRK-2026-0049"
          />

          <div className="p-3.5 bg-[#101214] border border-white/10 rounded space-y-1.5 text-xs">
            <div className="font-semibold text-white">Emergency Dispatch Beacon</div>
            <div className="text-white/50 text-[11px]">
              Assigned Satellite Transponder: <span className="font-mono text-[#41cc84]">GARMIN-INREACH-8848</span>
            </div>
          </div>
        </div>
      </FlatSideModal>

      {/* 2b. Side Modal: Route Telemetry Inspector (right • lg) */}
      <FlatSideModal
        visible={activeDrawer === 'telemetry'}
        onHide={() => setActiveDrawer(null)}
        position="right"
        size="lg"
        title="Mission Telemetry Inspector"
        subtitle="Live signal from Courier Kwame • Batch #TX-902"
        icon="pi pi-compass"
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">
            Live Stream
          </span>
        }
        footer={
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => setActiveDrawer(null)}
            className="!border-white/10 !text-white/75 hover:!bg-white/[0.08] text-xs font-semibold"
          >
            Close Inspector
          </FlatButton>
        }
      >
        <div className="space-y-5">
          {/* Live Sensor Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#101214] border border-white/10 rounded text-center">
              <div className="text-[10px] text-white/50 uppercase font-bold">Altitude</div>
              <div className="text-base font-bold text-white mt-0.5">3,440 m</div>
            </div>
            <div className="p-3 bg-[#101214] border border-white/10 rounded text-center">
              <div className="text-[10px] text-white/50 uppercase font-bold">Cooler Temp</div>
              <div className="text-base font-bold text-[#41cc84] mt-0.5">3.8°C</div>
            </div>
            <div className="p-3 bg-[#101214] border border-white/10 rounded text-center">
              <div className="text-[10px] text-white/50 uppercase font-bold">Heart Rate</div>
              <div className="text-base font-bold text-white mt-0.5">88 bpm</div>
            </div>
            <div className="p-3 bg-[#101214] border border-white/10 rounded text-center">
              <div className="text-[10px] text-white/50 uppercase font-bold">ETA Destination</div>
              <div className="text-base font-bold text-cyan-300 mt-0.5">48 mins</div>
            </div>
          </div>

          {/* Waypoints Timeline */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Route Checkpoint Timeline
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 bg-[#101214] border-l-2 border-l-[#41cc84] rounded-r border-y border-r border-white/5 flex justify-between items-center">
                <span>Checkpoint A (Namche Gate)</span>
                <span className="text-[#41cc84]">Passed • 09:14 AM</span>
              </div>
              <div className="p-2.5 bg-[#101214] border-l-2 border-l-[#41cc84] rounded-r border-y border-r border-white/5 flex justify-between items-center">
                <span>Checkpoint B (Tengboche Bridge)</span>
                <span className="text-[#41cc84]">Passed • 11:20 AM</span>
              </div>
              <div className="p-2.5 bg-[#101214] border-l-2 border-l-cyan-400 rounded-r border-y border-r border-white/5 flex justify-between items-center">
                <span>Checkpoint C (Pangboche Health Post)</span>
                <span className="text-cyan-300">En Route • Current</span>
              </div>
            </div>
          </div>
        </div>
      </FlatSideModal>

      {/* 2c. Side Modal: Left Drawer (left • sm) */}
      <FlatSideModal
        visible={activeDrawer === 'leftFilter'}
        onHide={() => setActiveDrawer(null)}
        position="left"
        size="sm"
        title="Logistics Filters"
        subtitle="Filter records by regional station"
        icon="pi pi-filter"
        footer={
          <FlatButton
            size="sm"
            onClick={() => {
              toast.success('Filters applied to viewport');
              setActiveDrawer(null);
            }}
            className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
          >
            Apply Filters
          </FlatButton>
        }
      >
        <div className="space-y-4">
          <FlatDropdown
            id="filter-station"
            label="Filter by Hub"
            value="All Stations"
            options={[
              { label: 'All Regional Hubs', value: 'All Stations' },
              { label: 'Ashaiman Regional Hub', value: 'Ashaiman' },
              { label: 'Lukla Medical Station', value: 'Lukla' },
              { label: 'Namche Health Post', value: 'Namche' },
            ]}
          />

          <FlatDropdown
            id="filter-status"
            label="Deployment Status"
            value="Active"
            options={[
              { label: 'Active Missions Only', value: 'Active' },
              { label: 'On Trek Personnel', value: 'On Trek' },
              { label: 'Standby Reserve', value: 'Standby' },
            ]}
          />

          <div className="space-y-2 pt-2">
            <FlatCheckbox id="cb1" label="Cold-Chain Monitored Only" checked={true} onChange={() => {}} />
            <FlatCheckbox id="cb2" label="Urgent Emergency Flights" checked={false} onChange={() => {}} />
          </div>
        </div>
      </FlatSideModal>

      {/* 3a. Bottom Sheet: Operational Action Sheet */}
      <FlatBottomSheet
        visible={activeSheet === 'actions'}
        onHide={() => setActiveSheet(null)}
        title="Regional Operations Action Sheet"
        subtitle="Quick actions for active field manifests"
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded">
            Batch Controls
          </span>
        }
        footer={
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => setActiveSheet(null)}
            className="!border-white/10 !text-white/75 hover:!bg-white/[0.08] text-xs font-semibold"
          >
            Dismiss Sheet
          </FlatButton>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
          <button
            type="button"
            onClick={() => {
              toast.success('Dispatched batch print request');
              setActiveSheet(null);
            }}
            className="p-3.5 bg-[#101214] hover:bg-white/[0.05] border border-white/10 rounded flex items-center gap-3 text-left transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded bg-[#41cc84]/15 text-[#41cc84] flex items-center justify-center shrink-0">
              <i className="pi pi-print text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Print Mission Waybill</div>
              <div className="text-[11px] text-[#e2eee6]/50">Export PDF manifest with QR codes</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.success('Telemetry streams synced with satellite');
              setActiveSheet(null);
            }}
            className="p-3.5 bg-[#101214] hover:bg-white/[0.05] border border-white/10 rounded flex items-center gap-3 text-left transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
              <i className="pi pi-sync text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Force GPS Sensor Ping</div>
              <div className="text-[11px] text-[#e2eee6]/50">Request immediate satellite telemetry</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.success('Emergency alert sent to all 14 units');
              setActiveSheet(null);
            }}
            className="p-3.5 bg-[#101214] hover:bg-white/[0.05] border border-white/10 rounded flex items-center gap-3 text-left transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded bg-[#DE2512]/15 text-[#DE2512] flex items-center justify-center shrink-0">
              <i className="pi pi-exclamation-triangle text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Broadcast Emergency Hold</div>
              <div className="text-[11px] text-[#e2eee6]/50">Pause high pass crossing immediately</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.success('CSV data exported');
              setActiveSheet(null);
            }}
            className="p-3.5 bg-[#101214] hover:bg-white/[0.05] border border-white/10 rounded flex items-center gap-3 text-left transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded bg-purple-500/15 text-purple-300 flex items-center justify-center shrink-0">
              <i className="pi pi-download text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Export Roster to Excel</div>
              <div className="text-[11px] text-[#e2eee6]/50">Download staff duty schedules</div>
            </div>
          </button>
        </div>
      </FlatBottomSheet>

      {/* 3b. Bottom Sheet: Mobile Filter Sheet */}
      <FlatBottomSheet
        visible={activeSheet === 'filters'}
        onHide={() => setActiveSheet(null)}
        title="Filter Roster & Missions"
        subtitle="Swipe down or click close to dismiss"
        footer={
          <FlatButton
            size="sm"
            onClick={() => {
              toast.success('Filters applied');
              setActiveSheet(null);
            }}
            className="w-full !bg-[#41cc84] hover:!bg-[#36ba76] !text-white text-xs font-bold"
          >
            Apply Filters
          </FlatButton>
        }
      >
        <div className="space-y-3.5 py-1">
          <FlatDropdown
            id="sheet-station"
            label="Station Filter"
            value="Lukla Outpost"
            options={stationOptions}
          />
          <FlatDatePicker
            id="sheet-date"
            label="Mission Date Range"
            value={new Date()}
            showIcon
          />
          <FlatCheckbox
            id="sheet-active-only"
            label="Show Active High-Altitude Missions Only"
            checked={true}
            onChange={() => {}}
          />
        </div>
      </FlatBottomSheet>

      {/* 4. Confirmation Dialog */}
      <FlatConfirmDialog
        visible={confirmDialog.visible}
        onHide={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default OverlayShowcase;
