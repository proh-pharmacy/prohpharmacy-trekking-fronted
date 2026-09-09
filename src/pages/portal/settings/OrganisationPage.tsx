import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  organisationApi,
  type Region,
  type District,
  type Branch,
} from '../../../api-client';
import {
  FlatDataTable,
  type ColumnDef,
  type PaginatedDataResponse,
  resetTableData,
} from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { BranchModal } from './components/BranchModal';
import { DistrictModal } from './components/DistrictModal';
import toast from 'react-hot-toast';

export const OrganisationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Infer active tab from query parameter: 'branches' | 'districts' | 'regions'
  const rawTab = searchParams.get('tab');
  const activeTab: 'branches' | 'districts' | 'regions' =
    rawTab === 'districts' || rawTab === 'regions' ? rawTab : 'branches';

  const handleTabChange = (tab: 'branches' | 'districts' | 'regions') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'branches') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  // Cached lookup collections for modals (regions & districts)
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Modals
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);

  // Load lookup options in background for modals
  const loadLookups = useCallback(async () => {
    try {
      const [fetchedRegions, fetchedDistricts] = await Promise.allSettled([
        organisationApi.getRegions(),
        organisationApi.getDistricts(),
      ]);

      if (fetchedRegions.status === 'fulfilled' && Array.isArray(fetchedRegions.value)) {
        setRegions(fetchedRegions.value);
      }
      if (fetchedDistricts.status === 'fulfilled' && Array.isArray(fetchedDistricts.value)) {
        setDistricts(fetchedDistricts.value);
      }
    } catch {
      // Background lookups stay empty if unavailable
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Handle branch status toggle
  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      await organisationApi.toggleBranchStatus(branch.id);
      toast.success(`Branch "${branch.name}" is now ${!branch.isActive ? 'Active' : 'Inactive'}.`);
      queryClient.invalidateQueries({ queryKey: ['/organisation/branches'] });
      resetTableData();
    } catch {
      toast.error(`Failed to update status for branch "${branch.name}".`);
    }
  };

  // --- Data Mappers ---
  const branchDataMapper = useCallback(
    (response: any): PaginatedDataResponse<Branch> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: Branch[] = rawList.map((b: any) => ({
        id: String(b.id || ''),
        code: b.code || '',
        name: b.name || 'Unnamed Branch',
        branchType: b.branchType || 'Retail',
        regionId: String(b.regionId || ''),
        regionName: b.regionName || 'Ghana',
        districtId: String(b.districtId || ''),
        districtName: b.districtName || 'Unassigned',
        address: b.address || '',
        contactNumber: b.contactNumber || b.phoneNumber || '',
        phoneNumber: b.contactNumber || b.phoneNumber || '',
        latitude: b.latitude,
        longitude: b.longitude,
        isActive: b.isActive ?? true,
        createdAt: b.createdAt || '',
        updatedAt: b.updatedAt || null,
      }));

      return {
        data: normalized,
        totalCount: payload?.totalCount ?? normalized.length,
        totalPages: payload?.totalPages ?? 1,
        currentPage: payload?.currentPage ?? 1,
        pageSize: payload?.pageSize ?? normalized.length,
      };
    },
    []
  );

  const districtDataMapper = useCallback(
    (response: any): PaginatedDataResponse<District> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: District[] = rawList.map((d: any) => ({
        id: String(d.id || ''),
        name: d.name || 'Unnamed District',
        regionId: String(d.regionId || ''),
        regionName: d.regionName || 'Ghana',
        branchCount: d.branchCount,
      }));

      return {
        data: normalized,
        totalCount: payload?.totalCount ?? normalized.length,
        totalPages: payload?.totalPages ?? 1,
        currentPage: payload?.currentPage ?? 1,
        pageSize: payload?.pageSize ?? normalized.length,
      };
    },
    []
  );

  const regionDataMapper = useCallback(
    (response: any): PaginatedDataResponse<Region> => {
      const payload = response || {};
      const rawList: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const normalized: Region[] = rawList.map((r: any) => ({
        id: String(r.id || ''),
        name: r.name || 'Unnamed Region',
        code: r.code || '',
        districtCount: r.districtCount,
      }));

      return {
        data: normalized,
        totalCount: payload?.totalCount ?? normalized.length,
        totalPages: payload?.totalPages ?? 1,
        currentPage: payload?.currentPage ?? 1,
        pageSize: payload?.pageSize ?? normalized.length,
      };
    },
    []
  );

  const parsePaginationPayload = useCallback((payload: any) => {
    return {
      pageNumber: payload.pageNumber || payload.page || 1,
      pageSize: payload.pageSize || 10,
      search: payload.search || undefined,
      sort: payload.sort || 'createdAt_desc',
    };
  }, []);

  // --- Column Definitions ---
  const branchColumns: ColumnDef<Branch>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'Branch / Hub',
        body: (branch) => (
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBranch(branch);
                  setBranchModalVisible(true);
                }}
                className="font-bold text-xs text-white hover:text-portal-accent text-left transition cursor-pointer"
              >
                {branch.name}
              </button>
              {branch.branchType && (
                <span className="text-[11px] text-portal-muted font-normal">
                  ({branch.branchType})
                </span>
              )}
            </div>
            {branch.address && (
              <div className="text-[11px] text-portal-muted truncate max-w-xs mt-0.5">
                {branch.address}
              </div>
            )}
          </div>
        ),
      },
      {
        field: 'districtName',
        header: 'District & Region',
        body: (branch) => (
          <div>
            <div className="text-white font-medium text-xs">
              {branch.districtName || 'Unassigned'}
            </div>
            <div className="text-[11px] text-portal-muted">
              {branch.regionName || 'Ghana'}
            </div>
          </div>
        ),
      },
      {
        field: 'phoneNumber',
        header: 'Contact Phone',
        body: (branch) => (
          <span className="font-mono text-xs text-portal-text">
            {branch.phoneNumber || '—'}
          </span>
        ),
      },
      {
        field: 'isActive',
        header: 'Status',
        body: (branch) => (
          <span
            className={`text-xs font-medium ${
              branch.isActive ? 'text-portal-accent' : 'text-portal-muted'
            }`}
          >
            {branch.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '130px', textAlign: 'right' },
        body: (branch) => (
          <div className="flex items-center justify-end gap-2">
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-pencil"
              onClick={() => {
                setEditingBranch(branch);
                setBranchModalVisible(true);
              }}
            >
              Edit
            </FlatButton>
            <button
              type="button"
              onClick={() => handleToggleBranchStatus(branch)}
              title={branch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
              className={`w-[38px] h-[38px] rounded border text-xs flex items-center justify-center transition cursor-pointer ${
                branch.isActive
                  ? 'border-portal-border text-portal-muted hover:text-red-accent hover:border-red-accent/40 bg-portal-canvas'
                  : 'border-portal-accent/40 text-portal-accent hover:bg-portal-accent/10 bg-portal-canvas'
              }`}
            >
              <i className={`pi ${branch.isActive ? 'pi-power-off' : 'pi-check'}`} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const districtColumns: ColumnDef<District>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'District Name',
        body: (dist) => (
          <span className="font-bold text-xs text-white">
            {dist.name}
          </span>
        ),
      },
      {
        field: 'regionName',
        header: 'Parent Region',
        body: (dist) => (
          <span className="text-white font-medium text-xs">
            {dist.regionName || 'Ghana'}
          </span>
        ),
      },
      {
        field: 'branchCount',
        header: 'Branches',
        body: (dist) => (
          <span className="text-xs font-mono text-portal-text">
            {typeof dist.branchCount === 'number'
              ? `${dist.branchCount} ${dist.branchCount === 1 ? 'branch' : 'branches'}`
              : '—'}
          </span>
        ),
      },
    ],
    []
  );

  const regionColumns: ColumnDef<Region>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'Region Name',
        body: (reg) => (
          <span className="font-bold text-xs text-white">
            {reg.name}
          </span>
        ),
      },
      {
        field: 'code',
        header: 'Region Code',
        body: (reg) => (
          <span className="font-mono text-xs text-portal-accent">
            {reg.code || '—'}
          </span>
        ),
      },
      {
        field: 'districtCount',
        header: 'Districts',
        body: (reg) => (
          <span className="text-xs font-mono text-portal-text">
            {typeof reg.districtCount === 'number'
              ? `${reg.districtCount} ${reg.districtCount === 1 ? 'districts' : 'districts'}`
              : 'Pre-seeded'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs (inferred from ?tab= query parameter) */}
      <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => handleTabChange('branches')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'branches'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-building text-xs" />
          <span>Branches</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('districts')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'districts'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-map-marker text-xs" />
          <span>Districts</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('regions')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'regions'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-map text-xs" />
          <span>Regions</span>
        </button>
      </div>

      {/* Tab 1: Branches */}
      {activeTab === 'branches' ? (
        <FlatDataTable<Branch>
          dataSourceUrl="/organisation/branches"
          columns={branchColumns}
          heading="Branches & Dispatch Hubs"
          headerNotes="Physical dispatch hubs, fulfillment points, and branch facilities."
          hasAction
          actionName="Add Branch"
          onAction={() => {
            setEditingBranch(null);
            setBranchModalVisible(true);
          }}
          filterable="search"
          filterablePlaceholder="Search branches by name, address, or district..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No branches found."
          dataMapper={branchDataMapper}
          parsePayload={parsePaginationPayload}
        />
      ) : activeTab === 'districts' ? (
        /* Tab 2: Districts */
        <FlatDataTable<District>
          dataSourceUrl="/organisation/districts"
          columns={districtColumns}
          heading="Operational Districts"
          headerNotes="District jurisdictions mapped to administrative regions across Ghana."
          hasAction
          actionName="Add District"
          onAction={() => setDistrictModalVisible(true)}
          filterable="search"
          filterablePlaceholder="Search districts by name or region..."
          enableTableFilter
          enablePaginator
          initialPageSize={10}
          emptyDataText="No districts found."
          dataMapper={districtDataMapper}
          parsePayload={parsePaginationPayload}
        />
      ) : (
        /* Tab 3: Regions */
        <FlatDataTable<Region>
          dataSourceUrl="/organisation/regions"
          columns={regionColumns}
          heading="Administrative Regions"
          headerNotes="Ghana's 16 pre-seeded administrative regions."
          hasAction={false}
          filterable="search"
          filterablePlaceholder="Search regions by name or code..."
          enableTableFilter
          enablePaginator
          initialPageSize={16}
          emptyDataText="No regions found."
          dataMapper={regionDataMapper}
          parsePayload={parsePaginationPayload}
        />
      )}

      {/* Modals */}
      <BranchModal
        visible={branchModalVisible}
        onHide={() => {
          setBranchModalVisible(false);
          setEditingBranch(null);
        }}
        branch={editingBranch}
        districts={districts}
        regions={regions}
        onSuccess={() => {
          loadLookups();
          queryClient.invalidateQueries({ queryKey: ['/organisation/branches'] });
          resetTableData();
        }}
      />

      <DistrictModal
        visible={districtModalVisible}
        onHide={() => setDistrictModalVisible(false)}
        regions={regions}
        onSuccess={() => {
          loadLookups();
          queryClient.invalidateQueries({ queryKey: ['/organisation/districts'] });
          resetTableData();
        }}
      />
    </div>
  );
};

export default OrganisationPage;
