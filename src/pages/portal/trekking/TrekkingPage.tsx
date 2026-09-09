import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  FlatDataTable,
  type ColumnDef,
  type PaginatedDataResponse,
  resetTableData,
} from '../../../components/data-table';
import { FlatConfirmDialog, FlatModal } from '../../../components/overlay';
import { FlatButton } from '../../../components/flat-form';
import { fleetApi, type TraccarUser, type FleetDriver, type TrackingDevice } from '../../../api-client';
import { TraccarUserModal } from './components/TraccarUserModal';
import { RegisterDriverModal } from './components/RegisterDriverModal';
import { DeviceModal } from '../fleet/components/DeviceModal';
import { DeviceRegisteredModal } from '../fleet/components/DeviceRegisteredModal';
import toast from 'react-hot-toast';

const DEVICE_STATUS_STYLES: Record<string, string> = {
  Active: 'text-portal-accent',
  Inactive: 'text-portal-muted',
};

type ActiveTab = 'traccar-users' | 'drivers' | 'devices';

export const TrekkingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: ActiveTab =
    rawTab === 'drivers' ? 'drivers' :
    rawTab === 'traccar-users' ? 'traccar-users' :
    'devices';

  const handleTabChange = (tab: ActiveTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      tab === 'devices' ? next.delete('tab') : next.set('tab', tab);
      return next;
    });
  };

  // ── Floating menu state ────────────────────────────────────────────
  const [traccarUserMenu, setTraccarUserMenu] = useState<{
    user: TraccarUser;
    top: number;
    left: number;
  } | null>(null);

  const [driverMenu, setDriverMenu] = useState<{
    driver: FleetDriver;
    top: number;
    left: number;
  } | null>(null);

  const [deviceMenu, setDeviceMenu] = useState<{
    device: TrackingDevice;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!traccarUserMenu && !driverMenu && !deviceMenu) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-actions-menu]') || target?.closest('[data-actions-trigger]')) return;
      setTraccarUserMenu(null);
      setDriverMenu(null);
      setDeviceMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTraccarUserMenu(null);
        setDriverMenu(null);
        setDeviceMenu(null);
      }
    };
    const handleResize = () => {
      setTraccarUserMenu(null);
      setDriverMenu(null);
      setDeviceMenu(null);
    };

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
  }, [traccarUserMenu, driverMenu, deviceMenu]);

  // ── Traccar Users state ────────────────────────────────────────────
  const [traccarUserModalVisible, setTraccarUserModalVisible] = useState(false);
  const [editingTraccarUser, setEditingTraccarUser] = useState<TraccarUser | null>(null);
  const [deleteTraccarUser, setDeleteTraccarUser] = useState<TraccarUser | null>(null);
  const [deletingTraccarUser, setDeletingTraccarUser] = useState(false);

  // ── Drivers state ──────────────────────────────────────────────────
  const [registerDriverVisible, setRegisterDriverVisible] = useState(false);
  const [removeDriverTarget, setRemoveDriverTarget] = useState<FleetDriver | null>(null);
  const [removingDriver, setRemovingDriver] = useState(false);

  // ── Devices state ──────────────────────────────────────────────────
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<TrackingDevice | null>(null);
  const [registeredDevice, setRegisteredDevice] = useState<TrackingDevice | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<TrackingDevice | null>(null);
  const [deletingDevice, setDeletingDevice] = useState(false);

  // ── Sync devices modal ─────────────────────────────────────────────
  const [syncDevicesVisible, setSyncDevicesVisible] = useState(false);
  const [syncDevicesForce, setSyncDevicesForce] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState(false);
  const [syncDevicesResult, setSyncDevicesResult] = useState<{
    synced: number; alreadySynced: number; failed: number; deleted: number; errors: string[];
  } | null>(null);

  // ── Sync drivers modal ─────────────────────────────────────────────
  const [syncDriversVisible, setSyncDriversVisible] = useState(false);
  const [syncDriversForce, setSyncDriversForce] = useState(false);
  const [syncingDrivers, setSyncingDrivers] = useState(false);
  const [syncDriversResult, setSyncDriversResult] = useState<{
    synced: number; alreadySynced: number; failed: number; deleted: number; errors: string[];
  } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleDeleteTraccarUser = async () => {
    if (!deleteTraccarUser) return;
    setDeletingTraccarUser(true);
    try {
      await fleetApi.deleteTraccarUser(deleteTraccarUser.id);
      toast.success(`Traccar user "${deleteTraccarUser.name}" deleted.`);
      resetTableData();
      setDeleteTraccarUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete Traccar user.');
    } finally {
      setDeletingTraccarUser(false);
    }
  };

  const handleRemoveDriver = async () => {
    if (!removeDriverTarget) return;
    setRemovingDriver(true);
    try {
      await fleetApi.deleteDriver(removeDriverTarget.staffMemberId);
      toast.success(`${removeDriverTarget.staffName} removed from fleet drivers.`);
      resetTableData();
      setRemoveDriverTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove driver.');
    } finally {
      setRemovingDriver(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deleteDevice) return;
    setDeletingDevice(true);
    try {
      await fleetApi.deleteDevice(deleteDevice.id);
      toast.success(`Device "${deleteDevice.name}" deleted.`);
      resetTableData();
      setDeleteDevice(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete device.');
    } finally {
      setDeletingDevice(false);
    }
  };

  const handleSyncDevices = async () => {
    setSyncingDevices(true);
    try {
      const result = await fleetApi.syncDevices(syncDevicesForce);
      setSyncDevicesResult(result);
      resetTableData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncingDevices(false);
    }
  };

  const handleSyncDevicesClose = () => {
    setSyncDevicesVisible(false);
    setSyncDevicesForce(false);
    setSyncDevicesResult(null);
  };

  const handleSyncDrivers = async () => {
    setSyncingDrivers(true);
    try {
      const result = await fleetApi.syncDrivers(syncDriversForce);
      setSyncDriversResult(result);
      resetTableData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncingDrivers(false);
    }
  };

  const handleSyncDriversClose = () => {
    setSyncDriversVisible(false);
    setSyncDriversForce(false);
    setSyncDriversResult(null);
  };

  // ── Data mappers ───────────────────────────────────────────────────
  const traccarUserDataMapper = useCallback((response: any): PaginatedDataResponse<TraccarUser> => {
    const list: TraccarUser[] = Array.isArray(response)
      ? response.map((u: any) => ({
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          administrator: Boolean(u.administrator),
          disabled: Boolean(u.disabled),
          deviceLimit: u.deviceLimit ?? 0,
          expirationTime: u.expirationTime || null,
        }))
      : [];
    return { data: list, totalCount: list.length, totalPages: 1, currentPage: 1, pageSize: list.length || 10 };
  }, []);

  const fleetDriverDataMapper = useCallback((response: any): PaginatedDataResponse<FleetDriver> => {
    const list: FleetDriver[] = Array.isArray(response)
      ? response.map((d: any) => ({
          id: String(d.id || ''),
          staffMemberId: String(d.staffMemberId || ''),
          staffName: d.staffName || '',
          phoneNumber: d.phoneNumber || null,
          branchName: d.branchName || null,
          traccarDriverId: d.traccarDriverId ?? null,
          traccarUniqueId: d.traccarUniqueId || null,
          isSynced: Boolean(d.isSynced),
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || null,
        }))
      : [];
    return { data: list, totalCount: list.length, totalPages: 1, currentPage: 1, pageSize: list.length || 10 };
  }, []);

  const deviceDataMapper = useCallback((response: any): PaginatedDataResponse<TrackingDevice> => {
    const payload = response || {};
    const rawList: any[] = Array.isArray(payload) ? payload
      : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.items) ? payload.items : [];

    const data: TrackingDevice[] = rawList.map((d: any) => ({
      id: String(d.id || ''),
      traccarDeviceId: d.traccarDeviceId ?? null,
      traccarUniqueId: d.traccarUniqueId || '',
      name: d.name || '',
      phoneNumber: d.phoneNumber || null,
      status: d.status || 'Active',
      vehicleId: d.vehicleId || '',
      vehicleRegistration: d.vehicleRegistration || '',
      staffMemberId: d.staffMemberId || null,
      staffName: d.staffName || null,
      lastReportedAt: d.lastReportedAt || null,
      lastLatitude: d.lastLatitude ?? null,
      lastLongitude: d.lastLongitude ?? null,
      lastAddress: d.lastAddress || null,
      createdAt: d.createdAt || '',
      updatedAt: d.updatedAt || null,
    }));

    return {
      data,
      totalCount: payload?.totalCount ?? data.length,
      totalPages: payload?.totalPages ?? 1,
      currentPage: payload?.currentPage ?? 1,
      pageSize: payload?.pageSize ?? data.length,
    };
  }, []);

  const parseNoop = useCallback((_payload: any) => ({}), []);

  const parsePagination = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || payload.page || 1,
    pageSize: payload.pageSize || 10,
    search: payload.search || undefined,
    sort: payload.sort || 'createdAt_desc',
  }), []);

  // ── Columns ────────────────────────────────────────────────────────
  const traccarUserColumns: ColumnDef<TraccarUser>[] = useMemo(() => [
    {
      field: 'name',
      header: 'User',
      body: (row) => (
        <div>
          <div className="font-bold text-xs text-white">{row.name}</div>
          <div className="text-[11px] text-portal-muted mt-0.5 font-mono">{row.email}</div>
        </div>
      ),
    },
    {
      field: 'administrator',
      header: 'Role',
      style: { width: '100px' },
      body: (row) => (
        <span className={`text-xs font-medium ${row.administrator ? 'text-amber-400' : 'text-portal-muted'}`}>
          {row.administrator ? 'Admin' : 'User'}
        </span>
      ),
    },
    {
      field: 'disabled',
      header: 'Status',
      style: { width: '90px' },
      body: (row) => (
        <span className={`text-xs font-medium ${row.disabled ? 'text-red-400' : 'text-portal-accent'}`}>
          {row.disabled ? 'Disabled' : 'Active'}
        </span>
      ),
    },
    {
      field: 'deviceLimit',
      header: 'Device Limit',
      style: { width: '110px' },
      body: (row) => (
        <span className="text-xs text-portal-muted tabular-nums">
          {row.deviceLimit === 0 ? 'Unlimited' : row.deviceLimit}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '60px', textAlign: 'right' },
      body: (row) => {
        const isActive = traccarUserMenu?.user.id === row.id;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              data-actions-trigger="true"
              title="Actions"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) { setTraccarUserMenu(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                setDriverMenu(null); setDeviceMenu(null);
                setTraccarUserMenu({ user: row, top: rect.bottom + 4, left: Math.max(8, rect.right - 192) });
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
  ], [traccarUserMenu]);

  const driverColumns: ColumnDef<FleetDriver>[] = useMemo(() => [
    {
      field: 'staffName',
      header: 'Driver',
      body: (row) => (
        <div>
          <div className="font-bold text-xs text-white">{row.staffName}</div>
          {row.branchName && (
            <div className="text-[11px] text-portal-muted mt-0.5">{row.branchName}</div>
          )}
        </div>
      ),
    },
    {
      field: 'phoneNumber',
      header: 'Phone',
      style: { width: '150px' },
      body: (row) => (
        <span className="text-[11px] font-mono text-portal-text">{row.phoneNumber || '—'}</span>
      ),
    },
    {
      field: 'isSynced',
      header: 'Traccar',
      style: { width: '140px' },
      body: (row) => (
        row.isSynced ? (
          <div>
            <span className="text-xs font-medium text-portal-accent">Synced</span>
            {row.traccarUniqueId && (
              <div className="text-[11px] font-mono text-portal-muted mt-0.5 truncate max-w-[130px]">
                {row.traccarUniqueId}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-portal-muted">Not synced</span>
        )
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '60px', textAlign: 'right' },
      body: (row) => {
        const isActive = driverMenu?.driver.id === row.id;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              data-actions-trigger="true"
              title="Actions"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) { setDriverMenu(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                setTraccarUserMenu(null); setDeviceMenu(null);
                setDriverMenu({ driver: row, top: rect.bottom + 4, left: Math.max(8, rect.right - 192) });
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
  ], [driverMenu]);

  const deviceColumns: ColumnDef<TrackingDevice>[] = useMemo(() => [
    {
      field: 'name',
      header: 'Device',
      body: (row) => (
        <div>
          <div className="font-bold text-xs text-white">{row.name}</div>
          <div className="text-[11px] text-portal-muted mt-0.5 font-mono">{row.traccarUniqueId}</div>
        </div>
      ),
    },
    {
      field: 'vehicleRegistration',
      header: 'Vehicle',
      style: { width: '130px' },
      body: (row) => (
        <span className="text-xs font-mono text-portal-accent">{row.vehicleRegistration || '—'}</span>
      ),
    },
    {
      field: 'staffName',
      header: 'Driver',
      style: { width: '160px' },
      body: (row) => (
        <span className="text-xs text-portal-text">
          {row.staffName || <span className="text-portal-muted">Unassigned</span>}
        </span>
      ),
    },
    {
      field: 'phoneNumber',
      header: 'Phone',
      style: { width: '130px' },
      body: (row) => (
        <span className="text-[11px] font-mono text-portal-text">{row.phoneNumber || '—'}</span>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      style: { width: '80px' },
      body: (row) => (
        <span className={`text-xs font-medium ${DEVICE_STATUS_STYLES[row.status] || 'text-portal-muted'}`}>
          {row.status}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '60px', textAlign: 'right' },
      body: (row) => {
        const isActive = deviceMenu?.device.id === row.id;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              data-actions-trigger="true"
              title="Actions"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) { setDeviceMenu(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                setTraccarUserMenu(null); setDriverMenu(null);
                setDeviceMenu({ device: row, top: rect.bottom + 4, left: Math.max(8, rect.right - 192) });
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
  ], [deviceMenu]);

  // ── Sync modal (reusable structure) ───────────────────────────────
  const SyncResultBody: React.FC<{ result: { synced: number; alreadySynced: number; failed: number; deleted: number; errors: string[] } }> = ({ result }) => (
    <div className="space-y-4 py-1">
      <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-0 text-xs divide-y divide-portal-border/40">
        {[
          { label: 'Synced', value: result.synced, color: 'text-portal-accent' },
          { label: 'Already Synced', value: result.alreadySynced, color: 'text-portal-text' },
          { label: 'Deleted', value: result.deleted, color: 'text-amber-400' },
          { label: 'Failed', value: result.failed, color: result.failed > 0 ? 'text-red-400' : 'text-portal-text' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between py-2.5">
            <span className="text-portal-muted">{label}</span>
            <span className={`font-bold tabular-nums ${color}`}>{value}</span>
          </div>
        ))}
      </div>
      {result.errors?.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-400 space-y-1">
          <span className="font-semibold block">Errors</span>
          {result.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <i className="pi pi-times-circle text-xs mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SyncConfirmBody: React.FC<{ force: boolean; onToggle: () => void; description: string; warningText: string }> = ({ force, onToggle, description, warningText }) => (
    <div className="space-y-4 py-1">
      <p className="text-xs text-portal-text leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 rounded border transition-colors cursor-pointer text-left bg-portal-canvas border-portal-border hover:border-portal-border/80"
      >
        <div className={`mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
          force ? 'bg-red-500 border-red-500' : 'border-portal-border bg-transparent'
        }`}>
          {force && <i className="pi pi-check text-white" style={{ fontSize: '9px' }} />}
        </div>
        <div>
          <span className="text-xs font-semibold text-white block">Force full reconciliation</span>
          <span className="text-[11px] text-portal-muted leading-relaxed">
            Deletes any Traccar entries with no matching local record, then re-syncs everything.
          </span>
        </div>
      </button>
      {force && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-400 flex items-start gap-2">
          <i className="pi pi-exclamation-triangle text-xs mt-0.5 shrink-0" />
          <span>{warningText}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-portal-border/60 text-xs font-bold">
        {(
          [
            { key: 'devices', label: 'Tracking Devices', icon: 'pi pi-wifi' },
            { key: 'drivers', label: 'Drivers', icon: 'pi pi-id-card' },
            { key: 'traccar-users', label: 'Traccar Users', icon: 'pi pi-globe' },
          ] as { key: ActiveTab; label: string; icon: string }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none ${
              activeTab === key
                ? 'border-portal-accent text-white'
                : 'border-transparent text-portal-muted hover:text-white'
            }`}
          >
            <i className={`${icon} text-xs`} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tables ──────────────────────────────────────────────────── */}
      {activeTab === 'traccar-users' && (
        <FlatDataTable<TraccarUser>
          dataSourceUrl="/fleet/traccar-users"
          columns={traccarUserColumns}
          heading="Traccar Users"
          headerNotes="Users who can log directly into the Traccar web interface."
          hasAction
          actionName="Add Traccar User"
          onAction={() => { setEditingTraccarUser(null); setTraccarUserModalVisible(true); }}
          emptyDataText="No Traccar users found."
          dataMapper={traccarUserDataMapper}
          parsePayload={parseNoop}
        />
      )}

      {activeTab === 'drivers' && (
        <>
          <div className="flex justify-end">
            <FlatButton
              variant="outline"
              label="Sync Drivers to Traccar"
              leftIcon="pi pi-refresh"
              size="sm"
              onClick={() => { setSyncDriversForce(false); setSyncDriversVisible(true); }}
            />
          </div>
          <FlatDataTable<FleetDriver>
            dataSourceUrl="/fleet/drivers"
            columns={driverColumns}
            heading="Fleet Drivers"
            headerNotes="Staff registered as fleet drivers. Sync to Traccar for live tracking attribution."
            hasAction
            actionName="Register Driver"
            onAction={() => setRegisterDriverVisible(true)}
            emptyDataText="No fleet drivers registered."
            dataMapper={fleetDriverDataMapper}
            parsePayload={parseNoop}
          />
        </>
      )}

      {activeTab === 'devices' && (
        <>
          <div className="flex justify-end">
            <FlatButton
              variant="outline"
              label="Sync to Traccar"
              leftIcon="pi pi-refresh"
              size="sm"
              onClick={() => { setSyncDevicesForce(false); setSyncDevicesVisible(true); }}
            />
          </div>
          <FlatDataTable<TrackingDevice>
            dataSourceUrl="/fleet/devices"
            columns={deviceColumns}
            heading="Tracking Devices"
            headerNotes="GPS and smartphone tracking devices assigned to staff members."
            hasAction
            actionName="Register Device"
            onAction={() => { setEditingDevice(null); setDeviceModalVisible(true); }}
            filterable="search"
            filterablePlaceholder="Search by name, unique ID, or phone..."
            enableTableFilter
            enablePaginator
            initialPageSize={10}
            emptyDataText="No tracking devices found."
            dataMapper={deviceDataMapper}
            parsePayload={parsePagination}
          />
        </>
      )}

      {/* ── Sync Devices Modal ───────────────────────────────────────── */}
      <FlatModal
        visible={syncDevicesVisible}
        onHide={() => { if (!syncingDevices) handleSyncDevicesClose(); }}
        title={syncDevicesResult ? 'Sync Complete' : 'Sync Devices to Traccar'}
        size="sm"
        closable={!syncingDevices}
        dismissableMask={!syncingDevices}
        closeOnEscape={!syncingDevices}
        footer={
          syncDevicesResult ? (
            <div className="flex items-center justify-end w-full">
              <FlatButton variant="primary" label="Done" icon="pi pi-check" size="sm" onClick={handleSyncDevicesClose} />
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <FlatButton variant="outline" label="Cancel" size="sm" onClick={handleSyncDevicesClose} disabled={syncingDevices} />
              <FlatButton
                variant={syncDevicesForce ? 'danger' : 'primary'}
                label={syncingDevices ? 'Syncing...' : syncDevicesForce ? 'Force Sync' : 'Sync'}
                icon="pi pi-refresh"
                size="sm"
                onClick={handleSyncDevices}
                loading={syncingDevices}
                disabled={syncingDevices}
              />
            </div>
          )
        }
      >
        {syncDevicesResult
          ? <SyncResultBody result={syncDevicesResult} />
          : <SyncConfirmBody
              force={syncDevicesForce}
              onToggle={() => setSyncDevicesForce((v) => !v)}
              description="Syncs all tracking devices to Traccar. Devices missing a Traccar ID will be created automatically."
              warningText="Force sync will permanently delete Traccar devices not tracked in this system."
            />
        }
      </FlatModal>

      {/* ── Sync Drivers Modal ───────────────────────────────────────── */}
      <FlatModal
        visible={syncDriversVisible}
        onHide={() => { if (!syncingDrivers) handleSyncDriversClose(); }}
        title={syncDriversResult ? 'Sync Complete' : 'Sync Drivers to Traccar'}
        size="sm"
        closable={!syncingDrivers}
        dismissableMask={!syncingDrivers}
        closeOnEscape={!syncingDrivers}
        footer={
          syncDriversResult ? (
            <div className="flex items-center justify-end w-full">
              <FlatButton variant="primary" label="Done" icon="pi pi-check" size="sm" onClick={handleSyncDriversClose} />
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <FlatButton variant="outline" label="Cancel" size="sm" onClick={handleSyncDriversClose} disabled={syncingDrivers} />
              <FlatButton
                variant={syncDriversForce ? 'danger' : 'primary'}
                label={syncingDrivers ? 'Syncing...' : syncDriversForce ? 'Force Sync' : 'Sync'}
                icon="pi pi-refresh"
                size="sm"
                onClick={handleSyncDrivers}
                loading={syncingDrivers}
                disabled={syncingDrivers}
              />
            </div>
          )
        }
      >
        {syncDriversResult
          ? <SyncResultBody result={syncDriversResult} />
          : <SyncConfirmBody
              force={syncDriversForce}
              onToggle={() => setSyncDriversForce((v) => !v)}
              description="Pushes all registered fleet drivers to Traccar. Drivers without a Traccar entry will be created automatically."
              warningText="Force sync will permanently delete Traccar driver entries not tracked in this system."
            />
        }
      </FlatModal>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <TraccarUserModal
        visible={traccarUserModalVisible}
        onHide={() => { setTraccarUserModalVisible(false); setEditingTraccarUser(null); }}
        user={editingTraccarUser}
      />
      <RegisterDriverModal
        visible={registerDriverVisible}
        onHide={() => setRegisterDriverVisible(false)}
      />
      <DeviceModal
        visible={deviceModalVisible}
        onHide={() => { setDeviceModalVisible(false); setEditingDevice(null); }}
        device={editingDevice}
        onCreated={(d) => setRegisteredDevice(d)}
      />
      <DeviceRegisteredModal
        visible={Boolean(registeredDevice)}
        onHide={() => setRegisteredDevice(null)}
        device={registeredDevice}
      />
      {/* ── Confirm dialogs ──────────────────────────────────────────── */}
      <FlatConfirmDialog
        visible={Boolean(deleteTraccarUser)}
        onHide={() => setDeleteTraccarUser(null)}
        title="Delete Traccar User"
        message={`Permanently delete Traccar user "${deleteTraccarUser?.name}"? This cannot be undone.`}
        confirmLabel={deletingTraccarUser ? 'Deleting...' : 'Delete'}
        variant="danger"
        onConfirm={handleDeleteTraccarUser}
        loading={deletingTraccarUser}
      />
      <FlatConfirmDialog
        visible={Boolean(removeDriverTarget)}
        onHide={() => setRemoveDriverTarget(null)}
        title="Remove Fleet Driver"
        message={`Remove "${removeDriverTarget?.staffName}" from fleet drivers?${removeDriverTarget?.isSynced ? ' Their Traccar driver entry will also be deleted.' : ''}`}
        confirmLabel={removingDriver ? 'Removing...' : 'Remove Driver'}
        variant="danger"
        onConfirm={handleRemoveDriver}
        loading={removingDriver}
      />
      <FlatConfirmDialog
        visible={Boolean(deleteDevice)}
        onHide={() => setDeleteDevice(null)}
        title="Delete Device"
        message={`Permanently delete device "${deleteDevice?.name}"? This cannot be undone.`}
        confirmLabel={deletingDevice ? 'Deleting...' : 'Delete'}
        variant="danger"
        onConfirm={handleDeleteDevice}
        loading={deletingDevice}
      />

      {/* ── Floating menu — Traccar User row ────────────────────────── */}
      {traccarUserMenu &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{ top: `${traccarUserMenu.top}px`, left: `${traccarUserMenu.left}px` }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setEditingTraccarUser(traccarUserMenu.user); setTraccarUserModalVisible(true); setTraccarUserMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-pencil text-portal-accent text-xs w-4" />
                <span>Edit User</span>
              </button>
            </div>
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setDeleteTraccarUser(traccarUserMenu.user); setTraccarUserMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-trash text-xs w-4" />
                <span>Delete User</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ── Floating menu — Driver row ───────────────────────────────── */}
      {driverMenu &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{ top: `${driverMenu.top}px`, left: `${driverMenu.left}px` }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setRemoveDriverTarget(driverMenu.driver); setDriverMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-user-minus text-xs w-4" />
                <span>Remove Driver</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ── Floating menu — Device row ───────────────────────────────── */}
      {deviceMenu &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{ top: `${deviceMenu.top}px`, left: `${deviceMenu.left}px` }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setEditingDevice(deviceMenu.device); setDeviceModalVisible(true); setDeviceMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-pencil text-portal-accent text-xs w-4" />
                <span>Edit Device</span>
              </button>
            </div>
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => { setDeleteDevice(deviceMenu.device); setDeviceMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-trash text-xs w-4" />
                <span>Delete Device</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TrekkingPage;
