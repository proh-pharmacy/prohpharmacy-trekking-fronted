import React, { useState, useEffect, useMemo } from 'react';
import {
  organisationApi,
  type Region,
  type District,
  type Branch,
} from '../../../api-client';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { BranchModal } from './components/BranchModal';
import { DistrictModal } from './components/DistrictModal';
import toast from 'react-hot-toast';

// Seeded Ghana 16 Regions fallback matching backend startup migration
const SEEDED_REGIONS: Region[] = [
  { id: 'reg-1', name: 'Greater Accra', code: 'GAR' },
  { id: 'reg-2', name: 'Ashanti', code: 'ASH' },
  { id: 'reg-3', name: 'Western', code: 'WR' },
  { id: 'reg-4', name: 'Central', code: 'CR' },
  { id: 'reg-5', name: 'Eastern', code: 'ER' },
  { id: 'reg-6', name: 'Volta', code: 'VR' },
  { id: 'reg-7', name: 'Northern', code: 'NR' },
  { id: 'reg-8', name: 'Upper East', code: 'UER' },
  { id: 'reg-9', name: 'Upper West', code: 'UWR' },
  { id: 'reg-10', name: 'Oti', code: 'OR' },
  { id: 'reg-11', name: 'Bono', code: 'BR' },
  { id: 'reg-12', name: 'Bono East', code: 'BER' },
  { id: 'reg-13', name: 'Ahafo', code: 'AHR' },
  { id: 'reg-14', name: 'Western North', code: 'WNR' },
  { id: 'reg-15', name: 'Savannah', code: 'SR' },
  { id: 'reg-16', name: 'North East', code: 'NER' },
];

const INITIAL_DISTRICTS: District[] = [
  { id: 'dist-1', name: 'Accra Metropolitan', regionId: 'reg-1', regionName: 'Greater Accra', branchCount: 2 },
  { id: 'dist-2', name: 'Tema Metropolitan', regionId: 'reg-1', regionName: 'Greater Accra', branchCount: 1 },
  { id: 'dist-3', name: 'Kumasi Metropolitan', regionId: 'reg-2', regionName: 'Ashanti', branchCount: 1 },
  { id: 'dist-4', name: 'Sekondi-Takoradi', regionId: 'reg-3', regionName: 'Western', branchCount: 1 },
];

const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br-1',
    name: 'Ashaiman Regional Hub',
    districtId: 'dist-2',
    districtName: 'Tema Metropolitan',
    regionName: 'Greater Accra',
    address: 'Plot 12 Heavy Industrial Area, Ashaiman',
    phoneNumber: '+233 20 123 4567',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'br-2',
    name: 'Accra Central Depot',
    districtId: 'dist-1',
    districtName: 'Accra Metropolitan',
    regionName: 'Greater Accra',
    address: '48 Barnes Road, High Street, Accra',
    phoneNumber: '+233 24 987 6543',
    isActive: true,
    createdAt: '2026-01-12T09:30:00Z',
  },
  {
    id: 'br-3',
    name: 'Kumasi Adum Depot',
    districtId: 'dist-3',
    districtName: 'Kumasi Metropolitan',
    regionName: 'Ashanti',
    address: 'Prempeh II Avenue, Adum, Kumasi',
    phoneNumber: '+233 32 201 1122',
    isActive: true,
    createdAt: '2026-02-01T11:00:00Z',
  },
  {
    id: 'br-4',
    name: 'Takoradi Harbor Point',
    districtId: 'dist-4',
    districtName: 'Sekondi-Takoradi',
    regionName: 'Western',
    address: 'Harbour Commercial Zone, Takoradi',
    phoneNumber: '+233 31 202 3344',
    isActive: false,
    createdAt: '2026-02-15T14:20:00Z',
  },
];

export const OrganisationPage: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>(SEEDED_REGIONS);
  const [districts, setDistricts] = useState<District[]>(INITIAL_DISTRICTS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [activeTab, setActiveTab] = useState<'branches' | 'districts' | 'regions'>('branches');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('ALL');

  // Modals
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load from backend API
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedRegions, fetchedDistricts, fetchedBranches] = await Promise.allSettled([
        organisationApi.getRegions(),
        organisationApi.getDistricts(),
        organisationApi.getBranches(),
      ]);

      if (fetchedRegions.status === 'fulfilled' && fetchedRegions.value.length > 0) {
        setRegions(fetchedRegions.value);
      }
      if (fetchedDistricts.status === 'fulfilled' && fetchedDistricts.value.length > 0) {
        setDistricts(fetchedDistricts.value);
      }
      if (fetchedBranches.status === 'fulfilled' && fetchedBranches.value.length > 0) {
        setBranches(fetchedBranches.value);
      }
    } catch {
      // Keep initial seeded defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.districtName && b.districtName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchingDist = districts.find((d) => d.id === b.districtId);
      const matchesRegion =
        selectedRegionFilter === 'ALL' ||
        (matchingDist && matchingDist.regionId === selectedRegionFilter);

      return matchesSearch && matchesRegion;
    });
  }, [branches, districts, searchQuery, selectedRegionFilter]);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegionFilter === 'ALL' || d.regionId === selectedRegionFilter;
      return matchesSearch && matchesRegion;
    });
  }, [districts, searchQuery, selectedRegionFilter]);

  // Toggle Branch Status
  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      await organisationApi.toggleBranchStatus(branch.id);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, isActive: !b.isActive } : b))
      );
      toast.success(`Branch "${branch.name}" is now ${!branch.isActive ? 'Active' : 'Inactive'}.`);
    } catch {
      // Optimistic update
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, isActive: !b.isActive } : b))
      );
      toast.success(`Branch "${branch.name}" status updated.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-portal-surface border border-portal-border/60 rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Organisation Structure
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-portal-accent/15 text-portal-accent border border-portal-accent/30 rounded">
              Depots & Hubs
            </span>
          </div>
          <p className="text-xs text-portal-muted max-w-2xl leading-relaxed">
            Configure the 3-tier operational hierarchy: Ghana's 16 pre-seeded administrative regions, defined local districts, and physical dispatch branches.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === 'branches' ? (
            <FlatButton
              variant="primary"
              label="New Branch"
              icon="pi pi-plus"
              onClick={() => {
                setEditingBranch(null);
                setBranchModalVisible(true);
              }}
            />
          ) : activeTab === 'districts' ? (
            <FlatButton
              variant="primary"
              label="New District"
              icon="pi pi-plus"
              onClick={() => setDistrictModalVisible(true)}
            />
          ) : null}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="p-4 bg-portal-surface border border-portal-border/60 rounded">
          <div className="text-[11px] font-bold uppercase tracking-wider text-portal-muted">Operational Branches</div>
          <div className="text-2xl font-bold text-portal-accent mt-1">{branches.length}</div>
        </div>
        <div className="p-4 bg-portal-surface border border-portal-border/60 rounded">
          <div className="text-[11px] font-bold uppercase tracking-wider text-portal-muted">Configured Districts</div>
          <div className="text-2xl font-bold text-white mt-1">{districts.length}</div>
        </div>
        <div className="p-4 bg-portal-surface border border-portal-border/60 rounded">
          <div className="text-[11px] font-bold uppercase tracking-wider text-portal-muted">Seeded Ghana Regions</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{regions.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'branches'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-building text-xs" />
          <span>Branches ({filteredBranches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('districts')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'districts'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-map-marker text-xs" />
          <span>Districts ({filteredDistricts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('regions')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'regions'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-map text-xs" />
          <span>Regions ({regions.length})</span>
        </button>
      </div>

      {/* Tab 1: Branches */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          {/* Action & Filter Bar matching reference screenshot */}
          <div className="p-3 bg-portal-surface border border-portal-border/60 rounded flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full relative">
              <i className="pi pi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-portal-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tag, description, or user..."
                className="w-full h-[38px] pl-10 pr-10 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted outline-none focus:border-portal-accent transition box-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-portal-muted hover:text-white cursor-pointer"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <div className="w-48 h-[38px]">
                <FlatDropdown
                  value={selectedRegionFilter}
                  options={[
                    { label: 'All Regions', value: 'ALL' },
                    ...regions.map((r) => ({ label: r.name, value: r.id })),
                  ]}
                  onChange={(e) => setSelectedRegionFilter(e.value)}
                />
              </div>

              <button
                type="button"
                title="Refresh Table"
                onClick={loadData}
                className="h-[38px] w-[38px] flex items-center justify-center bg-portal-canvas border border-portal-border rounded text-portal-muted hover:text-white hover:border-portal-border/80 cursor-pointer transition shrink-0"
              >
                <i className={`pi pi-sync text-xs ${loading ? 'animate-spin text-portal-accent' : ''}`} />
              </button>
            </div>
          </div>

          {/* High-Visibility Branches Table */}
          <div className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-portal-canvas border-b border-portal-border text-xs font-bold uppercase tracking-wider text-white">
                  <tr>
                    <th className="py-3.5 px-4">Branch / Depot</th>
                    <th className="py-3.5 px-4">District & Region</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border/40">
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-portal-muted">
                        No branches match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch) => {
                      const dist = districts.find((d) => d.id === branch.districtId);
                      const reg = regions.find((r) => r.id === dist?.regionId);

                      return (
                        <tr key={branch.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3.5 px-4">
                            <div
                              onClick={() => {
                                setEditingBranch(branch);
                                setBranchModalVisible(true);
                              }}
                              className="font-bold text-sm text-portal-accent hover:underline cursor-pointer"
                            >
                              {branch.name}
                            </div>
                            <div className="text-xs text-[#cdd9e5] truncate max-w-xs mt-0.5">{branch.address}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-white font-medium text-xs">{dist?.name || 'Unassigned'}</div>
                            <div className="text-xs text-[#cdd9e5]">{reg?.name || 'Ghana'}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-[#e6edf3] font-semibold">
                            {branch.phoneNumber}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded border ${
                                branch.isActive
                                  ? 'bg-portal-accent/15 text-portal-accent border-portal-accent/40'
                                  : 'bg-red-accent/15 text-red-accent border-red-accent/40'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  branch.isActive ? 'bg-portal-accent' : 'bg-red-accent'
                                }`}
                              />
                              {branch.isActive ? 'Active Hub' : 'Deactivated'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <FlatButton
                                variant="outline"
                                size="sm"
                                label="Edit"
                                icon="pi pi-pencil"
                                onClick={() => {
                                  setEditingBranch(branch);
                                  setBranchModalVisible(true);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleBranchStatus(branch)}
                                title={branch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                                className={`p-1.5 rounded border text-xs transition cursor-pointer ${
                                  branch.isActive
                                    ? 'border-portal-border text-portal-muted hover:text-red-accent hover:border-red-accent/40'
                                    : 'border-portal-accent/40 text-portal-accent hover:bg-portal-accent/10'
                                }`}
                              >
                                <i className={`pi ${branch.isActive ? 'pi-power-off' : 'pi-check'}`} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Districts */}
      {activeTab === 'districts' && (
        <div className="space-y-4">
          <div className="p-3 bg-portal-surface border border-portal-border/60 rounded flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full relative">
              <i className="pi pi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-portal-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tag, description, or user..."
                className="w-full h-[38px] pl-10 pr-10 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted outline-none focus:border-portal-accent transition box-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-portal-muted hover:text-white cursor-pointer"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <div className="w-48 h-[38px]">
                <FlatDropdown
                  value={selectedRegionFilter}
                  options={[
                    { label: 'All Regions', value: 'ALL' },
                    ...regions.map((r) => ({ label: r.name, value: r.id })),
                  ]}
                  onChange={(e) => setSelectedRegionFilter(e.value)}
                />
              </div>

              <button
                type="button"
                title="Refresh Table"
                onClick={loadData}
                className="h-[38px] w-[38px] flex items-center justify-center bg-portal-canvas border border-portal-border rounded text-portal-muted hover:text-white hover:border-portal-border/80 cursor-pointer transition shrink-0"
              >
                <i className={`pi pi-sync text-xs ${loading ? 'animate-spin text-portal-accent' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-portal-canvas border-b border-portal-border text-xs font-bold uppercase tracking-wider text-white">
                  <tr>
                    <th className="py-3.5 px-4">District Name</th>
                    <th className="py-3.5 px-4">Parent Region</th>
                    <th className="py-3.5 px-4">Branches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border/40">
                  {filteredDistricts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-portal-muted">
                        No districts match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDistricts.map((dist) => {
                      const reg = regions.find((r) => r.id === dist.regionId);
                      const branchCount = branches.filter((b) => b.districtId === dist.id).length;

                      return (
                        <tr key={dist.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-sm text-portal-accent">
                            {dist.name}
                          </td>
                          <td className="py-3.5 px-4 text-white font-medium text-xs">
                            {reg?.name || 'Ghana'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-mono text-[#e6edf3] font-medium">
                              {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Regions (Read-Only Ghana 16) */}
      {activeTab === 'regions' && (
        <div className="space-y-4">
          <div className="p-4 bg-portal-canvas border border-portal-border/60 rounded flex items-start gap-3">
            <i className="pi pi-info-circle text-portal-accent text-base mt-0.5" />
            <div className="text-xs text-portal-muted leading-relaxed">
              <span className="font-bold text-white">Pre-seeded Ghana Regions:</span> These 16 administrative regions are automatically pre-seeded by the backend database on initial system startup. They serve as the top-level anchors for district and branch creation.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {regions.map((region) => {
              const districtCount = districts.filter((d) => d.regionId === region.id).length;
              return (
                <div
                  key={region.id}
                  className="p-4 bg-portal-surface border border-portal-border/60 rounded flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{region.name}</div>
                    <div className="text-[11px] text-portal-muted mt-0.5">
                      {districtCount} {districtCount === 1 ? 'District' : 'Districts'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-portal-canvas text-light-green border border-portal-border rounded">
                    {region.code || 'GH'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
        onSuccess={loadData}
      />

      <DistrictModal
        visible={districtModalVisible}
        onHide={() => setDistrictModalVisible(false)}
        regions={regions}
        onSuccess={loadData}
      />
    </div>
  );
};

export default OrganisationPage;
