import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText } from '../../../../components/flat-form';
import { usersApi, type Role, type SystemModulePermissions } from '../../../../api-client';
import toast from 'react-hot-toast';

interface CreateRoleModalProps {
  visible: boolean;
  onHide: () => void;
  onSuccess?: (createdRole: Role) => void;
  initialModules?: SystemModulePermissions[];
}

const DEFAULT_SYSTEM_MODULES: SystemModulePermissions[] = [
  {
    module: 'Customers',
    permissions: ['Customers.Register', 'Customers.Edit', 'Customers.Approve'],
  },
  {
    module: 'CustomerKyc',
    permissions: ['CustomerKyc.View', 'CustomerKyc.Manage'],
  },
  {
    module: 'CustomerCredit',
    permissions: ['CustomerCredit.View', 'CustomerCredit.Manage'],
  },
  {
    module: 'Staff',
    permissions: ['Staff.View', 'Staff.Manage'],
  },
  {
    module: 'Treks',
    permissions: ['Treks.ViewAll', 'Treks.Create', 'Treks.Assign', 'Treks.Start', 'Treks.Complete'],
  },
  {
    module: 'Vehicles',
    permissions: ['Vehicles.Manage'],
  },
  {
    module: 'Tracking',
    permissions: ['Tracking.ViewAll'],
  },
  {
    module: 'TrackingDevices',
    permissions: ['TrackingDevices.Manage'],
  },
  {
    module: 'Visits',
    permissions: ['Visits.Record', 'Visits.Verify'],
  },
  {
    module: 'Roles',
    permissions: ['Roles.Manage'],
  },
  {
    module: 'Branches',
    permissions: ['Branches.Manage'],
  },
  {
    module: 'Reports',
    permissions: ['Reports.Export'],
  },
  {
    module: 'Audit',
    permissions: ['Audit.View'],
  },
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

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  visible,
  onHide,
  onSuccess,
  initialModules,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [availableModules, setAvailableModules] = useState<SystemModulePermissions[]>(
    initialModules && initialModules.length > 0 ? initialModules : DEFAULT_SYSTEM_MODULES
  );
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setName('');
      setDescription('');
      setSelectedPermissions(new Set());
      setFilterQuery('');
      return;
    }

    if (initialModules && initialModules.length > 0) {
      setAvailableModules(initialModules);
      return;
    }

    let isMounted = true;
    const fetchMasterPermissions = async () => {
      setLoadingModules(true);
      try {
        const modules = await usersApi.getAllPermissions();
        if (isMounted && Array.isArray(modules) && modules.length > 0) {
          setAvailableModules(modules);
        } else if (isMounted) {
          setAvailableModules(DEFAULT_SYSTEM_MODULES);
        }
      } catch (err: any) {
        console.error('Failed to load permissions master list:', err);
        if (isMounted) setAvailableModules(DEFAULT_SYSTEM_MODULES);
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    };

    fetchMasterPermissions();
    return () => {
      isMounted = false;
    };
  }, [visible, initialModules]);

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => {
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
    const allSelected = modulePerms.every((p) => selectedPermissions.has(p));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p));
      } else {
        modulePerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Role name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await usersApi.createRole({
        name: trimmedName,
        description: description.trim() || undefined,
        permissions: Array.from(selectedPermissions),
      });

      toast.success(`Role "${created.name}" created successfully.`);
      onSuccess?.(created);
      onHide();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create role.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredModules = availableModules
    .map((mod) => {
      const matching = mod.permissions.filter(
        (p) =>
          p.toLowerCase().includes(filterQuery.toLowerCase()) ||
          mod.module.toLowerCase().includes(filterQuery.toLowerCase())
      );
      return { ...mod, permissions: matching };
    })
    .filter((mod) => mod.permissions.length > 0);

  const totalPermissionsCount = availableModules.reduce((acc, m) => acc + m.permissions.length, 0);

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      size="lg"
      title="Create New Role"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FlatInputText
              id="role-name-input"
              label="ROLE NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WarehouseOfficer, Pharmacist"
              size="sm"
              required
            />
          </div>
          <div>
            <FlatInputText
              id="role-desc-input"
              label="DESCRIPTION (OPTIONAL)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of role responsibilities"
              size="sm"
            />
          </div>
        </div>

        {/* Permissions Table (Windows Security / Activity Grid) */}
        <div className="border border-portal-border/60 rounded bg-portal-canvas overflow-hidden">
          {/* Top Bar: Title & Filter / Bulk actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border-b border-portal-border/40 bg-portal-surface/70">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                Permissions
              </span>
              <span className="text-[11px] text-portal-muted font-mono">
                ({selectedPermissions.size} of {totalPermissionsCount} selected)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-portal-muted pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter permissions..."
                  className="h-[30px] pl-8 pr-3 bg-portal-canvas border border-portal-border rounded text-[11px] text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const allKeys = availableModules.flatMap((m) => m.permissions);
                  setSelectedPermissions(new Set(allKeys));
                }}
                className="text-[11px] text-portal-accent hover:underline font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-portal-muted text-xs">|</span>
              <button
                type="button"
                onClick={() => setSelectedPermissions(new Set())}
                className="text-[11px] text-portal-muted hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="hidden sm:grid sm:grid-cols-[160px_1fr] md:grid-cols-[190px_1fr] gap-4 px-3 py-2 bg-portal-canvas/90 border-b border-portal-border/60 text-[11px] font-bold uppercase tracking-wider text-portal-muted">
            <div>Feature / Module</div>
            <div>Activity</div>
          </div>

          {loadingModules ? (
            <div className="py-8 text-center text-xs text-portal-muted flex items-center justify-center gap-2">
              <i className="pi pi-spin pi-spinner text-portal-accent" />
              <span>Loading system permission catalog...</span>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="py-6 text-center text-xs text-portal-muted">
              No permissions matched your filter criteria.
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto divide-y divide-portal-border/40">
              {filteredModules.map((mod) => {
                const isAllSelected = mod.permissions.every((p) => selectedPermissions.has(p));
                const displayName =
                  MODULE_DISPLAY_NAMES[mod.module] ||
                  mod.module.replace(/([a-z])([A-Z])/g, '$1 $2');

                return (
                  <div
                    key={mod.module}
                    className="grid grid-cols-1 sm:grid-cols-[160px_1fr] md:grid-cols-[190px_1fr] gap-2 sm:gap-4 px-3 py-2.5 items-start sm:items-center hover:bg-portal-surface/40 transition-colors"
                  >
                    {/* Left Column: Feature / Module name & row toggle */}
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
                        const isChecked = selectedPermissions.has(permKey);
                        const rawAction = permKey.includes('.') ? permKey.split('.')[1] : permKey;
                        const actionLabel = rawAction.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

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

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-portal-border/40">
          <FlatButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onHide}
            disabled={submitting}
          >
            Cancel
          </FlatButton>
          <FlatButton
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={submitting || !name.trim()}
            icon="pi pi-check"
            label={submitting ? 'Creating Role...' : 'Create Role'}
          />
        </div>
      </form>
    </FlatModal>
  );
};
