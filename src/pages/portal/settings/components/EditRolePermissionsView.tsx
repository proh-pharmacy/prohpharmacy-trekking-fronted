import React, { useState, useEffect, useMemo } from 'react';
import { usersApi, type Role, type SystemModulePermissions } from '../../../../api-client';
import { FlatButton } from '../../../../components/flat-form';
import toast from 'react-hot-toast';

interface EditRolePermissionsViewProps {
  role: Role;
  onBack: () => void;
  onRoleUpdated?: (updatedRole: Role) => void;
}

// Canonical fallback modules in case master API is temporarily unavailable
const FALLBACK_MODULES: SystemModulePermissions[] = [
  { module: 'Customers', permissions: ['Customers.Register', 'Customers.Edit', 'Customers.Approve'] },
  { module: 'CustomerKyc', permissions: ['CustomerKyc.View', 'CustomerKyc.Manage'] },
  { module: 'CustomerCredit', permissions: ['CustomerCredit.View', 'CustomerCredit.Manage'] },
  { module: 'Staff', permissions: ['Staff.View', 'Staff.Manage'] },
  { module: 'Treks', permissions: ['Treks.ViewAll', 'Treks.Create', 'Treks.Assign', 'Treks.Start', 'Treks.Complete'] },
  { module: 'Vehicles', permissions: ['Vehicles.Manage'] },
  { module: 'Tracking', permissions: ['Tracking.ViewAll'] },
  { module: 'TrackingDevices', permissions: ['TrackingDevices.Manage'] },
  { module: 'Visits', permissions: ['Visits.Record', 'Visits.Verify'] },
  { module: 'Roles', permissions: ['Roles.Manage'] },
  { module: 'Branches', permissions: ['Branches.Manage'] },
  { module: 'Reports', permissions: ['Reports.Export'] },
  { module: 'Audit', permissions: ['Audit.View'] },
];

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  Audit: 'Audit',
  CustomerKyc: 'Customer KYC',
  CustomerCredit: 'Customer Credit',
  Customers: 'Customers',
  Staff: 'Staff',
  Treks: 'Treks',
  Visits: 'Visits',
  Vehicles: 'Vehicles',
  Tracking: 'Tracking',
  TrackingDevices: 'Tracking Devices',
  Roles: 'Roles',
  Branches: 'Branches',
  Reports: 'Reports',
};

export const EditRolePermissionsView: React.FC<EditRolePermissionsViewProps> = ({
  role,
  onBack,
  onRoleUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<SystemModulePermissions[]>(FALLBACK_MODULES);

  // Set of enabled permission keys for this role
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    new Set(Array.isArray(role.permissions) ? role.permissions : [])
  );
  const [originalKeys, setOriginalKeys] = useState<Set<string>>(
    new Set(Array.isArray(role.permissions) ? role.permissions : [])
  );

  const [searchFilter, setSearchFilter] = useState('');

  // Fetch full permissions for this role and system catalog
  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [permRes, masterRes] = await Promise.all([
          role.id ? usersApi.getRolePermissions(role.id).catch(() => null) : null,
          usersApi.getAllPermissions().catch(() => null),
        ]);

        if (!isCurrent) return;

        if (masterRes && Array.isArray(masterRes) && masterRes.length > 0) {
          setModules(masterRes);
        } else if (permRes?.groups && permRes.groups.length > 0) {
          setModules(
            permRes.groups.map((g) => ({
              module: g.module,
              permissions: g.permissions.map((p) => p.key),
            }))
          );
        }

        if (permRes?.groups) {
          const active = new Set<string>();
          permRes.groups.forEach((g) => {
            g.permissions.forEach((p) => {
              if (p.enabled) active.add(p.key);
            });
          });
          setEnabledKeys(new Set(active));
          setOriginalKeys(new Set(active));
        }
      } catch (err) {
        console.error('Failed to load role permissions:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [role.id]);

  const isDirty = useMemo(() => {
    if (enabledKeys.size !== originalKeys.size) return true;
    for (const key of enabledKeys) {
      if (!originalKeys.has(key)) return true;
    }
    return false;
  }, [enabledKeys, originalKeys]);

  const togglePermission = (key: string) => {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleModuleAll = (modulePerms: string[]) => {
    const allEnabled = modulePerms.every((p) => enabledKeys.has(p));
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (allEnabled) {
        modulePerms.forEach((p) => next.delete(p));
      } else {
        modulePerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!role.id) {
      toast.error('Cannot save: Missing role ID.');
      return;
    }

    setSaving(true);
    try {
      const payload = Array.from(enabledKeys);
      await usersApi.syncRolePermissions(role.id, payload);
      setOriginalKeys(new Set(enabledKeys));

      const updated = { ...role, permissions: payload };
      onRoleUpdated?.(updated);
      toast.success(`Permissions for ${role.name} updated successfully.`);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to sync permissions.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEnabledKeys(new Set(originalKeys));
    toast.success('Changes discarded.');
  };

  // Filter modules based on search filter
  const filteredModules = useMemo(() => {
    if (!searchFilter.trim()) return modules;
    const q = searchFilter.toLowerCase();
    return modules
      .map((m) => {
        const matching = m.permissions.filter(
          (p) => p.toLowerCase().includes(q) || m.module.toLowerCase().includes(q)
        );
        return { ...m, permissions: matching };
      })
      .filter((m) => m.permissions.length > 0);
  }, [modules, searchFilter]);

  const totalPermsCount = useMemo(() => {
    return modules.reduce((acc, m) => acc + m.permissions.length, 0);
  }, [modules]);

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Breadcrumb Navigation (Exact same structure and styling as UserDetailsPage, OUTSIDE the card) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded border border-portal-border bg-portal-surface hover:bg-portal-hover text-portal-muted hover:text-portal-heading flex items-center justify-center transition cursor-pointer"
            title="Back to People and Roles"
          >
            <i className="pi pi-arrow-left text-xs" />
          </button>
          <div className="flex items-center gap-2 text-xs text-portal-muted">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-portal-heading transition cursor-pointer"
            >
              People and Roles
            </button>
            <span>/</span>
            <span className="text-portal-heading font-medium">{role.name} Permissions</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <FlatButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={saving}
              className="!text-portal-muted hover:!text-portal-heading text-xs"
            >
              Discard Changes
            </FlatButton>
          )}

          <FlatButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={saving || !isDirty}
            className="text-xs"
            icon="pi pi-check"
            label={saving ? 'Saving...' : 'Save Changes'}
          />
        </div>
      </div>

      {/* 2. Cohesive Permissions Listing Card */}
      <div className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
        {/* Card Header: Role overview, stats, search filter and quick toggles */}
        <div className="px-6 py-4 border-b border-portal-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-portal-surface">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-portal-heading tracking-wide">
                {role.name}
              </h3>
              <span className="text-[11px] font-mono text-portal-accent">
                {role.isSystem ? 'System Role' : 'Custom Role'}
              </span>
            </div>
            <div className="text-xs text-portal-muted mt-0.5">
              <span className="font-mono text-portal-accent font-semibold">{enabledKeys.size}</span>
              <span className="font-mono"> / {totalPermsCount} permissions</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const all = modules.flatMap((m) => m.permissions);
                  setEnabledKeys(new Set(all));
                }}
                className="text-[11px] text-portal-accent hover:underline font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-portal-muted text-xs">|</span>
              <button
                type="button"
                onClick={() => setEnabledKeys(new Set())}
                className="text-[11px] text-portal-muted hover:text-portal-heading font-medium cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="relative w-56">
              <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-portal-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter permissions..."
                className="w-full h-[32px] pl-8 pr-3 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent"
              />
            </div>
          </div>
        </div>

        {/* 3. Table Column Headers */}
        <div className="hidden sm:grid sm:grid-cols-[160px_1fr] md:grid-cols-[190px_1fr] gap-4 px-4 sm:px-6 py-2.5 bg-portal-canvas/80 border-b border-portal-border/60 text-[11px] font-bold uppercase tracking-wider text-portal-muted">
          <div>Feature / Module</div>
          <div>Activity</div>
        </div>

        {/* 4. Table Body Rows */}
        {loading ? (
          <div className="p-12 text-center text-xs text-portal-muted flex flex-col items-center justify-center gap-2">
            <i className="pi pi-spin pi-spinner text-portal-accent text-lg" />
            <span>Loading role permission schema...</span>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="p-8 text-center text-xs text-portal-muted">
            No permissions match "{searchFilter}".
          </div>
        ) : (
          <div className="divide-y divide-portal-border/40">
            {filteredModules.map((mod) => {
              const moduleName = mod.module;
              const displayName =
                MODULE_DISPLAY_NAMES[moduleName] ||
                moduleName.replace(/([a-z])([A-Z])/g, '$1 $2');
              const isAllSelected = mod.permissions.every((p) => enabledKeys.has(p));

              return (
                <div
                  key={moduleName}
                  className="grid grid-cols-1 sm:grid-cols-[160px_1fr] md:grid-cols-[190px_1fr] gap-2 sm:gap-4 px-4 sm:px-6 py-3 items-start sm:items-center hover:bg-portal-canvas/30 transition-colors"
                >
                  {/* Left Column: Feature / Module name & row toggle (NO ICONS) */}
                  <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
                    <span className="text-xs font-semibold text-white tracking-wide">
                      {displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleModuleAll(mod.permissions)}
                      className="text-[10px] text-portal-muted hover:text-portal-accent cursor-pointer transition select-none"
                    >
                      {isAllSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {/* Right Column: Activity checkboxes */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {mod.permissions.map((permKey) => {
                      const rawAction = permKey.includes('.') ? permKey.split('.')[1] : permKey;
                      const actionLabel = rawAction.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
                      const isChecked = enabledKeys.has(permKey);

                      return (
                        <label
                          key={permKey}
                          onClick={() => togglePermission(permKey)}
                          className="inline-flex items-center gap-2 cursor-pointer select-none group py-0.5"
                          title={permKey}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-portal-accent border-portal-accent text-portal-canvas'
                                : 'border-portal-border bg-portal-surface group-hover:border-portal-accent/70'
                            }`}
                          >
                            {isChecked && <i className="pi pi-check text-[9px] font-bold" />}
                          </div>
                          <span
                            className={`text-xs transition-colors ${
                              isChecked
                                ? 'text-white font-medium'
                                : 'text-portal-muted group-hover:text-portal-text'
                            }`}
                          >
                            {actionLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
