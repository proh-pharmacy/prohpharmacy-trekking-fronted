import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fleetApi, treksApi, type CreateTrekPayload, type VehicleStockOverview } from '../../../api-client';
import { FlatButton } from '../../../components/flat-form';
import { FlatDataTable, resetTableData, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { CreateTrekForm, type CreateTrekDraft } from './components/CreateTrekForm';
import { vehicleStockExtendedFilter, parseVehicleStockFilters } from '../fleet/vehicleStockFilters';
import { AssignStaffModal } from '../fleet/components/AssignStaffModal';
import { FlatConfirmDialog } from '../../../components/overlay';
import { usePermissions } from '../../../hooks/usePermissions';
import toast from 'react-hot-toast';
import { VehicleInventory } from '../fleet/VehicleStockPage';

export default function CreateTrekPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<{ payload: CreateTrekPayload; vehicle: VehicleStockOverview } | null>(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewedDrafts, setReviewedDrafts] = useState<Record<string, CreateTrekDraft>>({});
  const submittingRef = useRef(false);

  const handleCreateTrek = async () => {
    if (!review || !reviewReady || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const currentVehicle = await fleetApi.getVehicle(review.vehicle.id);
      if (currentVehicle.operationalStatus !== 'Active' || !currentVehicle.currentStaffId || currentVehicle.currentStaffId !== review.vehicle.currentStaffId) {
        toast.error('The vehicle status or driver has changed. Go back and review the vehicle details.');
        resetTableData();
        return;
      }
      const created = await treksApi.createTrek(review.payload);
      resetTableData();
      toast.success(created.trekNumber ? `Trek ${created.trekNumber} created.` : 'Trek created.');
      navigate(`/portal/trekking/${created.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to create trek.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };
  const { hasAnyPermission } = usePermissions();
  const canAssignDriver = hasAnyPermission('Vehicles.AssignStaff', 'Vehicles.Manage');
  const [assignVehicle, setAssignVehicle] = useState<VehicleStockOverview | null>(null);
  const [unassignVehicle, setUnassignVehicle] = useState<VehicleStockOverview | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const handleUnassign = async () => {
    if (!unassignVehicle || unassigning || saving || !canAssignDriver) return;
    setUnassigning(true);
    try {
      await fleetApi.unassignVehicleStaff(unassignVehicle.id);
      resetTableData();
      setSelected((current) => current === unassignVehicle.id ? null : current);
      setUnassignVehicle(null);
      toast.success('Driver unassigned.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to unassign driver.');
    } finally {
      setUnassigning(false);
    }
  };

  const dataMapper = useCallback((response: any): PaginatedDataResponse<VehicleStockOverview> => ({
    data: response?.data ?? [],
    totalCount: Number(response?.totalItems ?? response?.totalCount ?? 0),
    totalPages: Math.max(1, Number(response?.totalPages ?? 1)),
    currentPage: Number(response?.pageNumber ?? response?.currentPage ?? 1),
    pageSize: Number(response?.pageSize ?? 20),
  }), []);

  const columns = useMemo<ColumnDef<VehicleStockOverview>[]>(() => [
    {
      field: 'displayName', header: 'Vehicle',
      body: (vehicle) => <div><div className="text-xs font-semibold">{vehicle.displayName}</div><div className="text-[11px] text-portal-muted">{vehicle.registrationNumber} · {vehicle.operationalStatus}</div></div>,
    },
    { field: 'regionName', header: 'Trekking region', body: (vehicle) => vehicle.regionName || 'Not assigned' },
    {
      field: 'currentStaffName', header: 'Driver',
      body: (vehicle) => <div className="flex flex-col items-start gap-1 text-xs">
        <span>{vehicle.currentStaffName || 'No driver assigned'}</span>
        {canAssignDriver && <>
          <button type="button"
            disabled={saving || unassigning || (!vehicle.currentStaffId && vehicle.operationalStatus !== 'Active')}
            className={`cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed ${vehicle.currentStaffId ? 'text-red-accent hover:text-red-accent-hover' : 'text-portal-accent hover:text-portal-accent-hover'}`}
            aria-label={`${vehicle.currentStaffId ? 'Unassign' : 'Assign'} driver for ${vehicle.displayName}`}
            onClick={() => vehicle.currentStaffId ? setUnassignVehicle(vehicle) : setAssignVehicle(vehicle)}>
            {vehicle.currentStaffId ? 'Unassign' : 'Assign'}
          </button>
        </>}
      </div>,
    },
    {
      field: 'stock', header: 'Stock status',
      body: (vehicle) => <div>
        <div className="flex items-center gap-2 text-xs">
          <span className={vehicle.stock?.hasStockLoaded ? 'font-semibold text-portal-accent' : 'text-portal-muted'}>{vehicle.stock ? (vehicle.stock.hasStockLoaded ? 'Loaded' : 'Empty') : 'Stock unavailable'}</span>
          <span aria-hidden="true" className="text-portal-muted">|</span>
          <button type="button" disabled={saving}
            className="cursor-pointer font-medium text-red-accent hover:text-red-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Manage stock for ${vehicle.displayName}`}
            onClick={() => navigate(`/portal/fleet/vehicles/${vehicle.id}/stock`)}>Manage</button>
        </div>
        {vehicle.stock && <div className="text-[11px] text-portal-muted">{vehicle.stock.inStockProductCount} in stock · {vehicle.stock.outOfStockProductCount} out · {vehicle.stock.lowStockProductCount} low</div>}
      </div>,
    },
    {
      field: 'actions', header: 'Actions',
      body: (vehicle) => <div className="flex items-center gap-2">
        <FlatButton size="sm" variant={selected === vehicle.id ? 'outline' : 'primary'}
          disabled={vehicle.operationalStatus !== 'Active' || !vehicle.currentStaffId || saving}
          aria-expanded={selected === vehicle.id} aria-controls={selected === vehicle.id ? `vehicle-${vehicle.id}` : undefined}
          onClick={() => setSelected(selected === vehicle.id ? null : vehicle.id)}>
          {selected === vehicle.id ? 'Deselect' : 'Select'}
        </FlatButton>
      </div>,
    },
  ], [selected, saving, navigate, canAssignDriver, unassigning]);

  return <div className="space-y-5">
    {!review && (
      <div className="flex px-2 border-b pb-2 rounded-none border-portal-border/60 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Choose Trekking Vehicle</h1>
        <FlatButton size="sm" variant="danger" disabled={saving} onClick={() => navigate('/portal/trekking')}>Cancel Trek</FlatButton>
      </div>
    )}
    <div hidden={!!review}>
      <FlatDataTable<VehicleStockOverview>
        dataSourceUrl="/fleet/vehicles/stock-overview"
        dataMapper={dataMapper}
        columns={columns}
        dataKey="id"
        expandedRowKeys={selected ? { [selected]: true } : {}}
        rowExpansionTemplate={(vehicle) => <div id={`vehicle-${vehicle.id}`} className="bg-portal-canvas p-5">
          <CreateTrekForm key={vehicle.id} vehicle={vehicle} initialValues={reviewedDrafts[vehicle.id]}
            onReview={(payload, draft) => {
              setReviewedDrafts((drafts) => ({ ...drafts, [vehicle.id]: draft }));
              setReviewReady(false);
              setReview({ payload, vehicle });
            }} />
        </div>}
        controlsDisabled={!!selected || saving}
        filterable="search"
        filterablePlaceholder="Search registration, vehicle name, make or model..."
        extendedFilter={vehicleStockExtendedFilter}
        parsePayload={parseVehicleStockFilters}
        persistFiltersInUrl
        enableTableFilter
        enablePaginator
        initialPageSize={20}
        postData={{ sort: 'createdAt_desc' }}
        emptyDataText="No vehicles found."
      />
    </div>
    {review && <section className="space-y-4" aria-label="Confirm vehicle stock">
      <div inert={saving}>
        <VehicleInventory
          vehicleId={review.vehicle.id}
          embedded
          headerTitle="Confirm Vehicle Stock"
          headerSubtitle="Confirm the products and quantities currently on this vehicle before creating the trek."
          onReviewReadyChange={setReviewReady}
        />
      </div>
      <div className="bg-portal-surface border border-portal-border rounded px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <FlatButton size="sm" variant="outline" leftIcon="pi pi-arrow-left" disabled={saving} onClick={() => { setReview(null); setReviewReady(false); }}>Back to Details</FlatButton>
        <FlatButton size="sm" loading={saving} disabled={saving || !reviewReady} onClick={handleCreateTrek}>Confirm &amp; Create Trek</FlatButton>
      </div>
    </section>}
    <AssignStaffModal
      visible={!!assignVehicle}
      onHide={() => setAssignVehicle(null)}
      mode="vehicle"
      target={assignVehicle}
    />
    <FlatConfirmDialog
      visible={!!unassignVehicle}
      onHide={() => { if (!unassigning) setUnassignVehicle(null); }}
      title="Unassign Driver"
      message={`Unassign ${unassignVehicle?.currentStaffName || 'the current driver'} as the driver of "${unassignVehicle?.displayName}"?${selected === unassignVehicle?.id ? ' This will close the trek details form for this vehicle.' : ''}`}
      confirmLabel={unassigning ? 'Unassigning...' : 'Unassign'}
      variant="warning"
      onConfirm={handleUnassign}
      loading={unassigning}
    />
  </div>;
}
