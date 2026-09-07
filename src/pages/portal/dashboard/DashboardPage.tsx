import React, { useState } from 'react';
import { useAuth } from '../../../context';
import { FlatButton } from '../../../components/flat-form/FlatButton';
import toast from 'react-hot-toast';

interface TrekMission {
  id: string;
  destination: string;
  zone: string;
  driver: string;
  vehicle: string;
  type: 'Cold-Chain' | 'Emergency' | 'Routine';
  itemsCount: number;
  progress: number;
  eta: string;
  status: 'In Transit' | 'Departing' | 'Verifying' | 'Completed';
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');

  const missions: TrekMission[] = [
    {
      id: 'TRK-2026-0412',
      destination: 'Kpone Polyclinic',
      zone: 'Zone A (Coastal)',
      driver: 'Kwame Mensah',
      vehicle: 'Motorbike MB-04',
      type: 'Cold-Chain',
      itemsCount: 140,
      progress: 78,
      eta: '12 mins',
      status: 'In Transit',
    },
    {
      id: 'TRK-2026-0413',
      destination: 'Dawhenya Health Center',
      zone: 'Zone B (Inland)',
      driver: 'Abena Osei',
      vehicle: 'Trek Van VN-02',
      type: 'Emergency',
      itemsCount: 85,
      progress: 45,
      eta: '28 mins',
      status: 'In Transit',
    },
    {
      id: 'TRK-2026-0414',
      destination: 'Prampram District Hospital',
      zone: 'Zone A (Coastal)',
      driver: 'Kofi Boateng',
      vehicle: 'Motorbike MB-09',
      type: 'Routine',
      itemsCount: 210,
      progress: 92,
      eta: '4 mins',
      status: 'Verifying',
    },
    {
      id: 'TRK-2026-0415',
      destination: 'Ada Foah Regional Post',
      zone: 'Zone C (Estuary)',
      driver: 'Samuel Tetteh',
      vehicle: 'Cold Van VN-05',
      type: 'Cold-Chain',
      itemsCount: 320,
      progress: 20,
      eta: '54 mins',
      status: 'Departing',
    },
  ];

  const filteredMissions = missions.filter((m) => {
    if (filterType === 'all') return true;
    return m.type.toLowerCase() === filterType.toLowerCase();
  });

  const getBadgeStyle = (type: TrekMission['type']) => {
    switch (type) {
      case 'Cold-Chain':
        return 'bg-blue-500/15 text-blue-300 border-blue-400/30';
      case 'Emergency':
        return 'bg-red-500/15 text-red-300 border-red-400/30';
      case 'Routine':
        return 'bg-[#41cc84]/15 text-[#41cc84] border-[#41cc84]/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Operational Command
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#41cc84]/20 text-[#41cc84] border border-[#41cc84]/30 rounded">
              Live Field Ops
            </span>
          </div>
          <p className="text-xs text-[#8da394] leading-relaxed">
            Welcome back, <strong className="text-white">{user?.fullName || user?.email || 'Operations Lead'}</strong>. 
            All 3 regional cold-chain transit zones are reporting normal telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => toast.success('Telemetry refreshed.')}
            className="!border-white/15 !text-white hover:!bg-white/5 text-xs font-semibold"
            leftIcon="pi pi-refresh"
          >
            Refresh Data
          </FlatButton>
          <FlatButton
            variant="primary"
            size="sm"
            onClick={() => toast.success('New Trekking Dispatch modal ready for integration.')}
            className="!bg-[#41cc84] hover:!bg-[#36ba76] !text-black !border-transparent text-xs font-bold shadow-sm"
            leftIcon="pi pi-plus"
          >
            New Dispatch
          </FlatButton>
        </div>
      </div>

      {/* 4 KPI Metric Cards (Semi-Flat Dark Palette with ProH Accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Missions */}
        <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm hover:border-[#41cc84]/40 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8da394]">
              Active Missions
            </span>
            <div className="w-7 h-7 rounded bg-[#41cc84]/15 border border-[#41cc84]/25 flex items-center justify-center">
              <i className="pi pi-compass text-xs text-[#41cc84]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight">14 Active</div>
            <span className="text-[11px] text-[#41cc84] font-semibold flex items-center gap-0.5">
              <i className="pi pi-arrow-up text-[9px]" /> +12.5%
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#8da394]">
              <span>Completion rate</span>
              <span className="text-white font-mono">78%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#41cc84] rounded-full shadow-[0_0_8px_#41cc84]"
                style={{ width: '78%' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Medications Delivered */}
        <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm hover:border-[#41cc84]/40 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8da394]">
              Medications Delivered
            </span>
            <div className="w-7 h-7 rounded bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <i className="pi pi-box text-xs text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight">1,480 Units</div>
            <span className="text-[11px] text-[#41cc84] font-semibold flex items-center gap-0.5">
              <i className="pi pi-check text-[9px]" /> 99.8% safe
            </span>
          </div>
          {/* Mini Sparkline Visualization (Inspired by Image 2 Reference) */}
          <div className="h-6 flex items-end gap-1 pt-2">
            {[35, 45, 40, 60, 55, 75, 70, 85, 90, 100].map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-white/10 hover:bg-[#41cc84] rounded-t transition-all cursor-pointer"
                style={{ height: `${val}%` }}
                title={`Batch ${idx + 1}: ${val}%`}
              />
            ))}
          </div>
        </div>

        {/* Card 3: Staff on Shift */}
        <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm hover:border-[#41cc84]/40 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8da394]">
              Duty Staffing
            </span>
            <div className="w-7 h-7 rounded bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
              <i className="pi pi-users text-xs text-purple-300" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight">42 / 45 Staff</div>
            <span className="text-[11px] text-[#41cc84] font-semibold">93.3% cap</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#8da394]">
              <span>Roster status</span>
              <span className="text-white">Full Shift Coverage</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: '93.3%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Ledger & Settlement */}
        <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm hover:border-[#41cc84]/40 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8da394]">
              Ledger Settlement
            </span>
            <div className="w-7 h-7 rounded bg-[#41cc84]/15 border border-[#41cc84]/25 flex items-center justify-center">
              <i className="pi pi-wallet text-xs text-[#41cc84]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight">GHS 84,250</div>
            <span className="text-[11px] text-[#41cc84] font-semibold flex items-center gap-0.5">
              <i className="pi pi-arrow-up text-[9px]" /> +9.2%
            </span>
          </div>
          <div className="text-[11px] text-[#8da394]">
            Settled against 38 destination invoices today
          </div>
        </div>
      </div>

      {/* Main Operations Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Live Trekking Missions Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm space-y-4">
            {/* Header & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <i className="pi pi-send text-[#41cc84]" />
                  Active Field Dispatches
                </h3>
                <p className="text-xs text-[#8da394]">
                  Real-time trekking delivery runs across Greater Accra & Volta
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#141c17] rounded border border-white/10 text-xs">
                {(['all', 'cold-chain', 'emergency', 'routine'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded uppercase tracking-wider transition cursor-pointer ${
                      filterType === f
                        ? 'bg-[#41cc84] text-black font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Mission List Cards (Matching Image 1 & 3 reference styles) */}
            <div className="space-y-3">
              {filteredMissions.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-[#202d24] border border-white/10 hover:border-[#41cc84]/40 rounded-lg transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-white bg-black/30 px-2 py-0.5 rounded border border-white/10">
                        {m.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getBadgeStyle(
                          m.type
                        )}`}
                      >
                        {m.type}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {m.destination}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#8da394]">
                      <i className="pi pi-clock text-[11px] text-[#41cc84]" />
                      <span>ETA: <strong className="text-white">{m.eta}</strong></span>
                    </div>
                  </div>

                  {/* Route & Driver details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[#8da394] pt-1">
                    <div>
                      <span className="text-[10px] uppercase text-white/40 block">Courier</span>
                      <span className="text-white font-medium">{m.driver}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-white/40 block">Vehicle</span>
                      <span className="text-white font-medium">{m.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-white/40 block">Cargo Payload</span>
                      <span className="text-white font-medium">{m.itemsCount} Packets</span>
                    </div>
                  </div>

                  {/* Progress Bar with Bright Green Indicator (Image 1 style) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-xs text-[#8da394]">Transit Progress</span>
                      <span className="font-mono font-bold text-[#41cc84]">{m.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-[#087A2D] to-[#41cc84] rounded-full transition-all duration-500 shadow-[0_0_10px_#41cc84]"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1/3: Operational Health & Live Logs (Inspired by Image 3) */}
        <div className="space-y-4">
          {/* Operational Efficiency Card */}
          <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between">
              <span>Fleet & Health Index</span>
              <span className="text-[#41cc84] font-mono">96.4%</span>
            </h3>

            {/* Circular Gauge Representation */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#41cc84"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="15"
                    strokeLinecap="round"
                    fill="transparent"
                    className="drop-shadow-[0_0_8px_#41cc84]"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold text-white">96%</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#8da394]">
                    Optimal
                  </span>
                </div>
              </div>
            </div>

            {/* Readiness Metrics */}
            <div className="space-y-2 text-xs border-t border-white/10 pt-3">
              <div className="flex justify-between items-center text-[#8da394]">
                <span>Cold-Chain Compliance</span>
                <span className="text-[#41cc84] font-bold">100% (2°C - 8°C)</span>
              </div>
              <div className="flex justify-between items-center text-[#8da394]">
                <span>Vehicles In Service</span>
                <span className="text-white font-medium">12 / 14 Fleet</span>
              </div>
              <div className="flex justify-between items-center text-[#8da394]">
                <span>Delayed Route Alerts</span>
                <span className="text-[#41cc84] font-bold">0 Pending</span>
              </div>
            </div>
          </div>

          {/* Real-Time Operational Event Timeline (Image 3 style) */}
          <div className="p-5 bg-[#1a251e] border border-white/10 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Live Field Feed
              </h3>
              <span className="w-2 h-2 bg-[#41cc84] rounded-full animate-ping" />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-[#41cc84]/20 text-[#41cc84] flex items-center justify-center shrink-0 mt-0.5">
                  <i className="pi pi-check text-[10px]" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    Nurse Ama verified delivery at Kpone Clinic
                  </div>
                  <div className="text-[10px] text-[#8da394]">4 minutes ago • Batch #TX-902</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="pi pi-map-marker text-[10px]" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    Courier Kwame crossed checkpoint Zone A
                  </div>
                  <div className="text-[10px] text-[#8da394]">12 minutes ago • GPS Verified</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="pi pi-calendar text-[10px]" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    Shift handover complete for Night Duty
                  </div>
                  <div className="text-[10px] text-[#8da394]">35 minutes ago • 14 staff rotated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
