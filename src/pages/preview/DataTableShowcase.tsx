import React from 'react';
import { Link } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type FilterParam } from '../../components/data-table';

interface StaffRecord {
  id: string;
  staffName: string;
  permitNumber: string;
  role: 'Field Pharmacist' | 'Lead Guide' | 'Medical Courier' | 'Logistics Officer';
  station: string;
  status: 'Active' | 'On Trek' | 'Standby' | 'Resting';
  assignedRegions: string[];
  lastDispatched: string;
  performanceScore: number;
}

// 48 sample records to simulate the 48 totalCount paginated response
const MOCK_STAFF_DATA: StaffRecord[] = Array.from({ length: 48 }, (_, i) => {
  const index = i + 1;
  const roles: StaffRecord['role'][] = [
    'Field Pharmacist',
    'Lead Guide',
    'Medical Courier',
    'Logistics Officer',
  ];
  const stations = ['Lukla Base', 'Namche Outpost', 'Pangboche Health Post', 'Dingboche Clinic', 'Gorakshep Shelter'];
  const statuses: StaffRecord['status'][] = ['Active', 'On Trek', 'Standby', 'Resting'];
  const regionsPool = ['Khumbu', 'Annapurna', 'Langtang', 'Manaslu', 'Mustang'];

  return {
    id: `STF-${1000 + index}`,
    staffName: [
      'Tenzing Norgay',
      'Pasang Lhamu',
      'Mingma Sherpa',
      'Ang Dorje',
      'Kami Rita',
      'Lhakpa Sherpa',
      'Dawa Yangzum',
      'Pemba Doma',
      'Phurba Tashi',
      'Chhiring Dorje',
      'Nima Rinji',
      'Sanam Tamang',
    ][i % 12] + (i >= 12 ? ` (${Math.floor(i / 12) + 1})` : ''),
    permitNumber: `TRK-2026-${String(index).padStart(4, '0')}`,
    role: roles[i % roles.length],
    station: stations[i % stations.length],
    status: statuses[i % statuses.length],
    assignedRegions: [regionsPool[i % regionsPool.length], regionsPool[(i + 1) % regionsPool.length]],
    lastDispatched: `2026-0${(i % 9) + 1}-${String((i % 25) + 1).padStart(2, '0')}`,
    performanceScore: 85 + (i % 15),
  };
});

export const DataTableShowcase: React.FC = () => {
  // Columns definition matching inventory abstraction
  const columns: ColumnDef<StaffRecord>[] = [
    {
      field: 'id',
      header: 'Staff ID',
      body: (row) => (
        <span className="font-mono font-bold text-white bg-portal-canvas px-2 py-0.5 border border-portal-border rounded">
          {row.id}
        </span>
      ),
      style: { width: '120px' },
    },
    {
      field: 'staffName',
      header: 'Staff Name & Permit',
      body: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-white text-sm hover:text-portal-accent cursor-pointer transition">
            {row.staffName}
          </span>
          <span className="text-xs font-mono text-portal-accent font-medium">{row.permitNumber}</span>
        </div>
      ),
    },
    {
      field: 'role',
      header: 'Designation',
      body: (row) => (
        <span className="text-xs text-[#e6edf3] font-medium">
          {row.role}
        </span>
      ),
    },
    {
      field: 'station',
      header: 'Base Station',
      body: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#e6edf3]">
          <i className="pi pi-map-marker text-portal-accent text-xs" />
          <span>{row.station}</span>
        </div>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      body: (row) => {
        const colors: Record<StaffRecord['status'], string> = {
          Active: 'bg-portal-accent/15 text-portal-accent border-portal-accent/40',
          'On Trek': 'bg-blue-500/15 text-blue-200 border-blue-500/40',
          Standby: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
          Resting: 'bg-portal-canvas text-portal-muted border-portal-border',
        };
        return (
          <span
            className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border rounded ${
              colors[row.status]
            }`}
          >
            {row.status}
          </span>
        );
      },
      style: { width: '130px' },
    },
    {
      field: 'assignedRegions',
      header: 'Assigned Regions',
      body: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.assignedRegions.map((region) => (
            <span
              key={region}
              className="px-2 py-0.5 text-[10px] font-mono bg-portal-canvas border border-portal-border text-light-green rounded"
            >
              {region}
            </span>
          ))}
        </div>
      ),
    },
    {
      field: 'lastDispatched',
      header: 'Last Dispatched',
      body: (row) => (
        <span className="font-mono text-xs text-[#e6edf3] font-medium">
          {row.lastDispatched}
        </span>
      ),
      style: { width: '140px' },
    },
    {
      field: 'actions',
      header: 'Actions',
      body: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert(`View trekking record: ${row.staffName} (${row.id})`)}
            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-portal-border bg-portal-canvas hover:bg-white/10 text-white rounded cursor-pointer transition"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => alert(`Dispatch assignment for ${row.staffName}`)}
            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-portal-accent hover:bg-portal-accent-hover text-portal-canvas rounded cursor-pointer transition font-bold"
          >
            Dispatch
          </button>
        </div>
      ),
      style: { width: '170px' },
    },
  ];

  // Extended filters definition matching inventory abstraction
  const extendedFilters: FilterParam[] = [
    {
      type: 'SelectFilter',
      accessor: 'role',
      label: 'Staff Role',
      args: {
        options: [
          { label: 'All Roles', value: '' },
          { label: 'Field Pharmacist', value: 'Field Pharmacist' },
          { label: 'Lead Guide', value: 'Lead Guide' },
          { label: 'Medical Courier', value: 'Medical Courier' },
          { label: 'Logistics Officer', value: 'Logistics Officer' },
        ],
      },
    },
    {
      type: 'SelectFilter',
      accessor: 'status',
      label: 'Staff Status',
      args: {
        options: [
          { label: 'All Statuses', value: '' },
          { label: 'Active', value: 'Active' },
          { label: 'On Trek', value: 'On Trek' },
          { label: 'Standby', value: 'Standby' },
          { label: 'Resting', value: 'Resting' },
        ],
      },
    },
    {
      type: 'DateFilter',
      accessor: 'dispatchedDate',
      label: 'Dispatch Date',
    },
    {
      type: 'TextFilter',
      accessor: 'station',
      label: 'Base Station',
    },
  ];

  return (
    <div className="min-h-screen bg-portal-canvas text-white flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-portal-surface border-b border-portal-border/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/prohpharmacy_icon.png"
              alt="ProH Pharmacy Logo"
              className="w-9 h-9 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  ProH Pharmacy Trekking Table
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-portal-accent/15 text-portal-accent border border-portal-accent/30 rounded">
                  Flat UI Design
                </span>
              </div>
              <p className="text-xs text-portal-muted">
                Self-contained table architecture inspired by <code className="font-mono text-white/90">inventory/DataTable.tsx</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/buttons"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-portal-border text-portal-text hover:bg-white/10 rounded transition-colors"
            >
              <i className="pi pi-check-square mr-1.5 text-[10px]" />
              Buttons
            </Link>
            <Link
              to="/inputs"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-portal-border text-portal-text hover:bg-white/10 rounded transition-colors"
            >
              <i className="pi pi-sliders-h mr-1.5 text-[10px]" />
              Inputs
            </Link>
            <Link
              to="/toasts"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-portal-border text-portal-text hover:bg-white/10 rounded transition-colors"
            >
              <i className="pi pi-bell mr-1.5 text-[10px]" />
              Toasts
            </Link>
            <Link
              to="/portal/dashboard"
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-portal-accent hover:bg-portal-accent-hover text-portal-canvas rounded transition-colors"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Specification Info Banner */}
        <div className="p-4 bg-portal-surface border border-portal-border/60 border-l-4 border-l-portal-accent rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Target Paginated Data Structure Implemented
            </h2>
            <p className="text-xs text-portal-muted mt-0.5">
              Supports <code className="font-mono text-portal-accent font-semibold">totalCount</code>,{' '}
              <code className="font-mono text-portal-accent font-semibold">totalPages</code>,{' '}
              <code className="font-mono text-portal-accent font-semibold">currentPage</code>,{' '}
              <code className="font-mono text-portal-accent font-semibold">pageSize</code>, and{' '}
              <code className="font-mono text-portal-accent font-semibold">data</code> with query URL sync and instant mutations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-portal-canvas text-portal-accent border border-portal-border rounded">
              Total Records: 48
            </span>
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-portal-canvas text-white border border-portal-border rounded">
              Pages: 5
            </span>
          </div>
        </div>

        {/* The Self-Contained Flat Data Table */}
        <div className="bg-portal-surface p-6 border border-portal-border/60 rounded shadow-none">
          <FlatDataTable<StaffRecord>
            columns={columns}
            data={MOCK_STAFF_DATA}
            heading="Staff & Courier Roster"
            headerNotes="High-altitude trekking personnel assigned to remote medical logistics stations"
            filterable="search"
            filterablePlaceholder="Search by staff name, permit, or station..."
            hasAction
            actionName="Add Staff Member"
            onAction={() => alert('Add Staff Member modal opened')}
            enableTableFilter
            isFilterVisibleOnStart={false}
            extendedFilter={{
              enable: true,
              filters: extendedFilters,
            }}
            initialPageSize={10}
            emptyDataText="No staff records matched your search filters."
          />
        </div>
      </main>
    </div>
  );
};

export default DataTableShowcase;
