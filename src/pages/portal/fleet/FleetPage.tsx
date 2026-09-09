import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FlatDataTable,
  type ColumnDef,
  type PaginatedDataResponse,
  resetTableData,
} from '../../../components/data-table';
import { FlatConfirmDialog } from '../../../components/overlay';
import { fleetApi, organisationApi, type Vehicle, type OperationalStatus } from '../../../api-client';
import { VehicleModal } from './components/VehicleModal';
import { VehicleStatusModal } from './components/VehicleStatusModal';
import { AssignStaffModal } from './components/AssignStaffModal';
import toast from 'react-hot-toast';

const VEHICLE_STATUS_STYLES: Record<string, string> = {
  Active: 'text-portal-accent',
  UnderMaintenance: 'text-yellow-400',
  Decommissioned: 'text-portal-muted',
};
const VEHICLE_STATUS_LABELS: Record<string, string> = {
  Active: 'Active',
  UnderMaintenance: 'Maintenance',
  Decommissioned: 'Decommissioned',
};

const VEHICLE_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Under Maintenance', value: 'UnderMaintenance' },
  { label: 'Decommissioned', value: 'Decommissioned' },
];

export const FleetPage: React.FC = () => {
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  useEffect(() => {
    organisationApi.getBranches().then((branches) => {
      setBranchOptions([
        { label: 'All Branches', value: '' },
        ...branches.map((b) => ({ label: b.name, value: b.id })),
      ]);
    }).catch(() => {});
  }, []);

  // ── Floating menu state ────────────────────────────────────────────
  const [vehicleMenu, setVehicleMenu] = useState<{
    vehicle: Vehicle;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!vehicleMenu) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-actions-menu]') || target?.closest('[data-actions-trigger]')) return;
      setVehicleMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVehicleMenu(null);
    };
    const handleResize = () => setVehicleMenu(null);

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKey);
      window.addEventListener('resize', handleResize);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [vehicleMenu]);

  // ── Modal state ────────────────────────────────────────────────────
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [statusModalVehicle, setStatusModalVehicle] = useState<Vehicle | null>(null);
  const [assignVehicle, setAssignVehicle] = useState<Vehicle | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<{ id: string; label: string } | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    setUnassigning(true);
    try {
      await fleetApi.unassignVehicleStaff(unassignTarget.id);
      toast.success('Staff unassigned.');
      resetTableData();
      setUnassignTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unassign staff.');
    } finally {
      setUnassigning(false);
    }
  };

  // ── Data mapper ────────────────────────────────────────────────────
  const vehicleDataMapper = useCallback((response: any): PaginatedDataResponse<Vehicle> => {
    const payload = response || {};
    const rawList: any[] = Array.isArray(payload) ? payload
      : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.items) ? payload.items : [];

    const data: Vehicle[] = rawList.map((v: any) => ({
      id: String(v.id || ''),
      registrationNumber: v.registrationNumber || '',
      displayName: v.displayName || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year || 0,
      colour: v.colour || '',
      branchId: v.branchId || '',
      branchName: v.branchName || '',
      operationalStatus: (v.operationalStatus as OperationalStatus) || 'Active',
      currentStaffId: v.currentStaffId || null,
      currentStaffName: v.currentStaffName || null,
      createdAt: v.createdAt || '',
      updatedAt: v.updatedAt || null,
    }));

    return {
      data,
      totalCount: payload?.totalCount ?? data.length,
      totalPages: payload?.totalPages ?? 1,
      currentPage: payload?.currentPage ?? 1,
      pageSize: payload?.pageSize ?? data.length,
    };
  }, []);

  const parsePagination = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || payload.page || 1,
    pageSize: payload.pageSize || 10,
    search: payload.search || undefined,
    sort: payload.sort || 'createdAt_desc',
    ...(payload.status   ? { status:   payload.status }   : {}),
    ...(payload.branchId ? { branchId: payload.branchId } : {}),
  }), []);

  // ── Vehicle columns ────────────────────────────────────────────────
  const vehicleColumns: ColumnDef<Vehicle>[] = useMemo(() => [
    {
      field: 'registrationNumber',
      header: 'Registration',
      style: { width: '130px' },
      body: (row) => (
        <span className="font-mono text-xs text-portal-accent">{row.registrationNumber}</span>
      ),
    },
    {
      field: 'displayName',
      header: 'Vehicle',
      body: (row) => (
        <div>
          <div className="font-bold text-xs text-white">{row.displayName}</div>
          <div className="text-[11px] text-portal-muted mt-0.5">
            {row.make} {row.model} · {row.year} · {row.colour}
          </div>
        </div>
      ),
    },
    {
      field: 'branchName',
      header: 'Branch',
      style: { width: '150px' },
      body: (row) => <span className="text-xs text-portal-text">{row.branchName || '—'}</span>,
    },
    {
      field: 'operationalStatus',
      header: 'Status',
      style: { width: '110px' },
      body: (row) => (
        <span className={`text-xs font-medium ${VEHICLE_STATUS_STYLES[row.operationalStatus] || 'text-portal-muted'}`}>
          {VEHICLE_STATUS_LABELS[row.operationalStatus] || row.operationalStatus}
        </span>
      ),
    },
    {
      field: 'currentStaffName',
      header: 'Assigned To',
      style: { width: '160px' },
      body: (row) => (
        <span className="text-xs text-portal-text">
          {row.currentStaffName || <span className="text-portal-muted">Unassigned</span>}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '60px', textAlign: 'right' },
      body: (row) => {
        const isActive = vehicleMenu?.vehicle.id === row.id;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              data-actions-trigger="true"
              title="Actions"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) { setVehicleMenu(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                const menuWidth = 192;
                setVehicleMenu({ vehicle: row, top: rect.bottom + 4, left: Math.max(8, rect.right - menuWidth) });
              }}
              className={`w-7 h-7 inline-flex items-center justify-center rounded transition cursor-pointer ${
                isActive ? 'bg-white/15 text-white' : 'text-portal-muted hover:text-white hover:bg-white/10'
              }`}
            >
              <i className="pi pi-ellipsis-v text-xs" />
            </button>
          </div>
        );
      },
    },
  ], [vehicleMenu]);

  return (
    <div className="space-y-6">
      <FlatDataTable<Vehicle>
        dataSourceUrl="/fleet/vehicles"
        columns={vehicleColumns}
        heading="Vehicle Fleet"
        headerNotes="Manage vehicles, operational status, and staff assignments."
        hasAction
        actionName="Register Vehicle"
        onAction={() => { setEditingVehicle(null); setVehicleModalVisible(true); }}
        filterable="search"
        filterablePlaceholder="Search by registration, name, make, or model..."
        enableTableFilter
        enablePaginator
        initialPageSize={10}
        emptyDataText="No vehicles found."
        dataMapper={vehicleDataMapper}
        parsePayload={parsePagination}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'SelectFilter',
              accessor: 'status',
              label: 'Status',
              args: { options: VEHICLE_STATUS_FILTER_OPTIONS },
            },
            {
              type: 'SelectFilter',
              accessor: 'branchId',
              label: 'Branch',
              args: { options: branchOptions },
            },
          ],
        }}
      />

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <VehicleModal
        visible={vehicleModalVisible}
        onHide={() => { setVehicleModalVisible(false); setEditingVehicle(null); }}
        vehicle={editingVehicle}
      />
      <VehicleStatusModal
        visible={Boolean(statusModalVehicle)}
        onHide={() => setStatusModalVehicle(null)}
        vehicle={statusModalVehicle}
      />
      <AssignStaffModal
        visible={Boolean(assignVehicle)}
        onHide={() => setAssignVehicle(null)}
        mode="vehicle"
        target={assignVehicle}
      />
      <FlatConfirmDialog
        visible={Boolean(unassignTarget)}
        onHide={() => setUnassignTarget(null)}
        title="Unassign Staff"
        message={`Remove the current staff assignment from "${unassignTarget?.label}"?`}
        confirmLabel={unassigning ? 'Unassigning...' : 'Unassign'}
        variant="warning"
        onConfirm={handleUnassign}
        loading={unassigning}
      />

      {/* ── Floating menu — Vehicle row ──────────────────────────────── */}
      {vehicleMenu &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{ top: `${vehicleMenu.top}px`, left: `${vehicleMenu.left}px` }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setEditingVehicle(vehicleMenu.vehicle); setVehicleModalVisible(true); setVehicleMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-pencil text-portal-accent text-xs w-4" />
                <span>Edit Vehicle</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusModalVehicle(vehicleMenu.vehicle); setVehicleMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-sync text-portal-accent text-xs w-4" />
                <span>Change Status</span>
              </button>
            </div>
            <div className="py-0.5">
              {vehicleMenu.vehicle.currentStaffName ? (
                <button
                  type="button"
                  onClick={() => {
                    const v = vehicleMenu.vehicle;
                    setVehicleMenu(null);
                    setUnassignTarget({ id: v.id, label: v.displayName });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-user-minus text-amber-400 text-xs w-4" />
                  <span>Unassign Staff</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAssignVehicle(vehicleMenu.vehicle); setVehicleMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-user-plus text-portal-accent text-xs w-4" />
                  <span>Assign Staff</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FleetPage;
