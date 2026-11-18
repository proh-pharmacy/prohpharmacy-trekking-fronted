import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fleetApi, treksApi, type CreateTrekPayload, type StaffItem, type Vehicle, type VehicleStockOverview } from '../../../api-client';
import { FlatButton, FlatStepper, type FlatStepperStep } from '../../../components/flat-form';
import { FlatDataTable, resetTableData, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { CreateTrekForm, type CreateTrekDraft, type CreateTrekFormHandle } from './components/CreateTrekForm';
import { vehicleStockExtendedFilter, parseVehicleStockFilters } from '../fleet/vehicleStockFilters';
import { AssignStaffModal } from '../fleet/components/AssignStaffModal';
import { FlatConfirmDialog } from '../../../components/overlay';
import { usePermissions } from '../../../hooks/usePermissions';
import toast from 'react-hot-toast';
import { VehicleInventory } from '../fleet/VehicleStockPage';

const WIZARD_PARAM_KEYS = [
  'trekStep',
  'trekVehicleId',
  'trekStaffId',
  'trekRegionId',
  'trekScheduledDate',
  'trekBranchId',
  'trekSalesStaffId',
  'trekSalesStaffName',
  'trekNotes',
] as const;

const readInitialDraftFromUrl = (params: URLSearchParams): {
  vehicleId: string | null;
  staffId: string | null;
  isStockStep: boolean;
  draft: CreateTrekDraft | null;
} => {
  const vehicleId = params.get('trekVehicleId')?.trim() || null;
  const staffId = params.get('trekStaffId')?.trim() || null;
  const isStockStep = params.get('trekStep') === 'stock';
  if (!vehicleId) {
    return { vehicleId: null, staffId: null, isStockStep: false, draft: null };
  }
  const regionId = params.get('trekRegionId') || '';
  const scheduledDate = params.get('trekScheduledDate') || '';
  const branchId = params.get('trekBranchId') || null;
  const salesStaffId = params.get('trekSalesStaffId') || null;
  const salesStaffName = params.get('trekSalesStaffName') || '';
  const notes = params.get('trekNotes') || undefined;

  const hasAnyDraftField = Boolean(regionId || scheduledDate || branchId || salesStaffId || notes);
  if (!hasAnyDraftField) {
    return { vehicleId, staffId, isStockStep: false, draft: null };
  }

  const salesStaff: StaffItem | undefined = salesStaffId && salesStaffName
    ? ({ id: salesStaffId, fullName: salesStaffName } as StaffItem)
    : undefined;

  return {
    vehicleId,
    staffId,
    isStockStep: Boolean(isStockStep && regionId && scheduledDate),
    draft: {
      vehicleId,
      regionId,
      scheduledDate,
      branchId,
      salesStaffId,
      notes,
      salesStaff,
    },
  };
};

export default function CreateTrekPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUrlState = useMemo(() => readInitialDraftFromUrl(searchParams), []);

  const [selected, setSelected] = useState<string | null>(initialUrlState.vehicleId);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loadingSelectedVehicle, setLoadingSelectedVehicle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<{
    payload: CreateTrekPayload;
    vehicleId: string;
    currentStaffId: string | null;
  } | null>(() => (
    initialUrlState.isStockStep && initialUrlState.vehicleId && initialUrlState.draft
      ? {
          payload: {
            regionId: initialUrlState.draft.regionId,
            branchId: initialUrlState.draft.branchId ?? null,
            scheduledDate: initialUrlState.draft.scheduledDate,
            vehicleId: initialUrlState.vehicleId,
            salesStaffId: initialUrlState.draft.salesStaffId ?? null,
            notes: initialUrlState.draft.notes,
          },
          vehicleId: initialUrlState.vehicleId,
          currentStaffId: initialUrlState.staffId,
        }
      : null
  ));
  const [reviewReady, setReviewReady] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const trekFormRef = useRef<CreateTrekFormHandle | null>(null);
  const [reviewedDrafts, setReviewedDrafts] = useState<Record<string, CreateTrekDraft>>(() => (
    initialUrlState.vehicleId && initialUrlState.draft
      ? { [initialUrlState.vehicleId]: initialUrlState.draft }
      : {}
  ));
  const submittingRef = useRef(false);

  const syncWizardUrl = useCallback((nextState: {
    step: 'details' | 'stock' | null;
    vehicleId: string | null;
    staffId?: string | null;
    draft?: CreateTrekDraft | null;
  }) => {
    const params = new URLSearchParams(window.location.search);
    if (!nextState.vehicleId || !nextState.step) {
      WIZARD_PARAM_KEYS.forEach((key) => params.delete(key));
    } else {
      if (nextState.step === 'stock') {
        params.set('trekStep', 'stock');
      } else {
        params.delete('trekStep');
      }
      params.set('trekVehicleId', nextState.vehicleId);
      if (nextState.staffId) {
        params.set('trekStaffId', nextState.staffId);
      } else {
        params.delete('trekStaffId');
      }
      const draft = nextState.draft;
      if (draft) {
        if (draft.regionId) params.set('trekRegionId', draft.regionId);
        else params.delete('trekRegionId');
        if (draft.scheduledDate) params.set('trekScheduledDate', draft.scheduledDate);
        else params.delete('trekScheduledDate');
        if (draft.branchId) params.set('trekBranchId', draft.branchId);
        else params.delete('trekBranchId');
        if (draft.salesStaffId) params.set('trekSalesStaffId', draft.salesStaffId);
        else params.delete('trekSalesStaffId');
        if (draft.salesStaffId && draft.salesStaff?.fullName) {
          params.set('trekSalesStaffName', draft.salesStaff.fullName);
        } else if (!draft.salesStaffId) {
          params.delete('trekSalesStaffName');
        }
        if (draft.notes) params.set('trekNotes', draft.notes);
        else params.delete('trekNotes');
      }
    }
    if (params.toString() !== window.location.search.replace(/^\?/, '')) {
      setSearchParams(params, { replace: true });
    }
  }, [setSearchParams]);

  const handleCreateTrek = async () => {
    if (!review || !reviewReady || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const currentVehicle = await fleetApi.getVehicle(review.vehicleId);
      if (
        currentVehicle.operationalStatus !== 'Active'
        || !currentVehicle.currentStaffId
        || (review.currentStaffId && currentVehicle.currentStaffId !== review.currentStaffId)
      ) {
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
      if (selected === unassignVehicle.id) {
        setSelected(null);
        syncWizardUrl({ step: null, vehicleId: null });
      }
      setUnassignVehicle(null);
      toast.success('Driver unassigned.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to unassign driver.');
    } finally {
      setUnassigning(false);
    }
  };

  useEffect(() => {
    if (!selected || (selectedVehicle && selectedVehicle.id === selected)) return;
    let active = true;
    setLoadingSelectedVehicle(true);
    fleetApi.getVehicle(selected)
      .then((vehicle) => {
        if (active) setSelectedVehicle(vehicle);
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load the selected vehicle.');
          setSelected(null);
          syncWizardUrl({ step: null, vehicleId: null });
        }
      })
      .finally(() => {
        if (active) setLoadingSelectedVehicle(false);
      });
    return () => { active = false; };
  }, [selected, selectedVehicle, syncWizardUrl]);

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
        {canAssignDriver && (
          <button type="button"
            disabled={saving || unassigning || (!vehicle.currentStaffId && vehicle.operationalStatus !== 'Active')}
            className={`inline-flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed ${vehicle.currentStaffId ? 'text-red-accent hover:text-red-accent-hover' : 'text-portal-accent hover:text-portal-accent-hover'}`}
            aria-label={`${vehicle.currentStaffId ? 'Unassign' : 'Assign'} driver for ${vehicle.displayName}`}
            onClick={() => vehicle.currentStaffId ? setUnassignVehicle(vehicle) : setAssignVehicle(vehicle)}>
            <i className={`pi ${vehicle.currentStaffId ? 'pi-user-minus' : 'pi-user-plus'} text-[11px]`} aria-hidden="true" />
            <span>{vehicle.currentStaffId ? 'Unassign' : 'Assign'}</span>
          </button>
        )}
      </div>,
    },
    {
      field: 'stock', header: 'Stock status',
      body: (vehicle) => <div>
        <div className="text-xs">
          <span className={vehicle.stock?.hasStockLoaded ? 'font-semibold text-portal-accent' : 'text-portal-muted'}>{vehicle.stock ? (vehicle.stock.hasStockLoaded ? 'Loaded' : 'Empty') : 'Stock unavailable'}</span>
        </div>
        {vehicle.stock && <div className="text-[11px] text-portal-muted">{vehicle.stock.inStockProductCount} in stock · {vehicle.stock.outOfStockProductCount} out · {vehicle.stock.lowStockProductCount} low</div>}
      </div>,
    },
    {
      field: 'actions', header: 'Actions',
      body: (vehicle) => <div className="flex items-center gap-2">
        <FlatButton size="sm" variant="primary"
          disabled={vehicle.operationalStatus !== 'Active' || !vehicle.currentStaffId || saving}
          onClick={() => {
            setSelected(vehicle.id);
            setSelectedVehicle(vehicle);
            syncWizardUrl({
              step: 'details',
              vehicleId: vehicle.id,
              staffId: vehicle.currentStaffId,
              draft: reviewedDrafts[vehicle.id] ?? {
                vehicleId: vehicle.id,
                regionId: vehicle.regionId ?? '',
                scheduledDate: '',
                branchId: null,
                salesStaffId: null,
              },
            });
          }}>
          Select
        </FlatButton>
      </div>,
    },
  ], [saving, canAssignDriver, unassigning, reviewedDrafts, syncWizardUrl]);

  const isStockStep = Boolean(review);
  const currentStep: 1 | 2 | 3 = isStockStep ? 3 : selected ? 2 : 1;

  const handleBackToVehicleSelection = useCallback(() => {
    if (saving) return;
    setSelected(null);
    setSelectedVehicle(null);
    setReview(null);
    setReviewReady(false);
    syncWizardUrl({ step: null, vehicleId: null });
  }, [saving, syncWizardUrl]);

  const handleBackToDetails = useCallback(() => {
    if (!review || saving) return;
    const vehicleId = review.vehicleId;
    const staffId = review.currentStaffId;
    setSelected(vehicleId);
    setReview(null);
    setReviewReady(false);
    syncWizardUrl({
      step: 'details',
      vehicleId,
      staffId,
      draft: reviewedDrafts[vehicleId] ?? {
        ...review.payload,
      },
    });
  }, [review, saving, reviewedDrafts, syncWizardUrl]);

  const stepperSteps: FlatStepperStep[] = [
    {
      title: 'Choose Vehicle',
      status: currentStep > 1 ? 'completed' : 'current',
      onClick: currentStep > 1 ? handleBackToVehicleSelection : undefined,
      disabled: saving,
    },
    {
      title: 'Trek Details',
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming',
      onClick: currentStep === 3 ? handleBackToDetails : undefined,
      disabled: saving,
    },
    {
      title: 'Confirm Stock',
      status: currentStep === 3 ? 'current' : 'upcoming',
      disabled: saving,
    },
  ];

  const stepperFooter = currentStep === 1 ? (
    <FlatButton
      size="sm"
      variant="danger"
      disabled={saving}
      onClick={() => navigate('/portal/trekking', { replace: true })}
    >
      Cancel Trek
    </FlatButton>
  ) : currentStep === 2 ? (
    <>
      <FlatButton
        size="sm"
        variant="danger"
        leftIcon="pi pi-arrow-left"
        disabled={saving}
        onClick={handleBackToVehicleSelection}
      >
        Back to Vehicles
      </FlatButton>
      <FlatButton
        size="sm"
        disabled={saving || loadingSelectedVehicle || !selectedVehicle || !formReady}
        onClick={() => trekFormRef.current?.submit()}
      >
        Continue
      </FlatButton>
    </>
  ) : (
    <>
      <FlatButton
        size="sm"
        variant="danger"
        leftIcon="pi pi-arrow-left"
        disabled={saving}
        onClick={handleBackToDetails}
      >
        Back to Details
      </FlatButton>
      <FlatButton
        size="sm"
        loading={saving}
        disabled={saving || !reviewReady}
        onClick={handleCreateTrek}
      >
        Confirm &amp; Create Trek
      </FlatButton>
    </>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-portal-muted">
          <i className="pi pi-plus text-sm" aria-hidden="true" />
          <span>Create New Trek</span>
        </h1>
      </div>

      <FlatStepper
        steps={stepperSteps}
        ariaLabel="Create trek steps"
        footer={stepperFooter}
      >
        {/* Step 1 Content: Choose Trekking Vehicle */}
        <div hidden={currentStep !== 1}>
          <FlatDataTable<VehicleStockOverview>
            dataSourceUrl="/fleet/vehicles/stock-overview"
            dataMapper={dataMapper}
            columns={columns}
            dataKey="id"
            controlsDisabled={saving}
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

        {/* Step 2 Content: Provide Details for This Trek */}
        {currentStep === 2 && selected && (
          <section aria-label="Provide Details for This Trek" className="space-y-6">
            {loadingSelectedVehicle || !selectedVehicle ? (
              <div className="py-8 text-center text-xs text-portal-muted">
                <i className="pi pi-spin pi-spinner mr-2" />
                Loading selected vehicle details...
              </div>
            ) : (
              <>
                <div className="border-b border-portal-border/60 pb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">Vehicle</p>
                  <p className="mt-1 text-xs font-semibold text-portal-heading">{selectedVehicle.displayName}</p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-[11px]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-portal-muted">Registration</p>
                      <p className="mt-0.5 font-mono text-portal-text">{selectedVehicle.registrationNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-portal-muted">Driver</p>
                      <p className="mt-0.5 text-portal-text">{selectedVehicle.currentStaffName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-portal-muted">Default Region</p>
                      <p className="mt-0.5 text-portal-text">{selectedVehicle.regionName || '—'}</p>
                    </div>
                  </div>
                </div>

                <CreateTrekForm
                  ref={trekFormRef}
                  key={selectedVehicle.id}
                  vehicle={selectedVehicle}
                  initialValues={reviewedDrafts[selectedVehicle.id]}
                  hideActions
                  onReadyChange={setFormReady}
                  onDraftChange={(draft) => {
                    setReviewedDrafts((drafts) => ({ ...drafts, [selectedVehicle.id]: draft }));
                    syncWizardUrl({
                      step: 'details',
                      vehicleId: selectedVehicle.id,
                      staffId: selectedVehicle.currentStaffId,
                      draft,
                    });
                  }}
                  onReview={(payload, draft) => {
                    setReviewedDrafts((drafts) => ({ ...drafts, [selectedVehicle.id]: draft }));
                    setReviewReady(false);
                    setReview({
                      payload,
                      vehicleId: selectedVehicle.id,
                      currentStaffId: selectedVehicle.currentStaffId ?? null,
                    });
                    syncWizardUrl({
                      step: 'stock',
                      vehicleId: selectedVehicle.id,
                      staffId: selectedVehicle.currentStaffId,
                      draft,
                    });
                  }}
                />
              </>
            )}
          </section>
        )}

        {/* Step 3 Content: Confirm Vehicle Stock */}
        {currentStep === 3 && review && (
          <section className="space-y-4" aria-label="Confirm vehicle stock">
            <div inert={saving}>
              <VehicleInventory
                vehicleId={review.vehicleId}
                embedded
                headerSubtitle={(
                  <span className="inline-flex items-center gap-1.5">
                    <i className="pi pi-exclamation-circle text-red-accent shrink-0" aria-hidden="true" />
                    <span>Confirm the products and quantities currently on this vehicle before creating the trek.</span>
                  </span>
                )}
                onReviewReadyChange={setReviewReady}
              />
            </div>
          </section>
        )}
      </FlatStepper>
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
  </div>
  );
}
