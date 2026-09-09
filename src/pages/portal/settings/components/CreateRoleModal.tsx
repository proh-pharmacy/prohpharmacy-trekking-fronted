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
      subtitle="Define a custom operational role and configure its initial authority scope."
      badge={<span className="text-portal-accent text-[11px] font-mono">Custom Role</span>}
      icon="pi pi-shield"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <p className="text-[11px] text-portal-muted mt-1">Unique alphanumeric role identifier.</p>
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
            <p className="text-[11px] text-portal-muted mt-1">Maximum 200 characters.</p>
          </div>
        </div>

        {/* Permissions Picker */}
        <div className="border border-portal-border/60 rounded bg-portal-canvas p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-portal-border/40 pb-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                Initial Module Permissions
              </span>
              <span className="ml-2 text-[11px] text-portal-muted font-mono">
                ({selectedPermissions.size} of {totalPermissionsCount} selected)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-portal-muted" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter permissions..."
                  className="h-[30px] pl-8 pr-3 bg-portal-surface border border-portal-border rounded text-[11px] text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent"
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
            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
              {filteredModules.map((mod) => {
                const isAllSelected = mod.permissions.every((p) => selectedPermissions.has(p));

                return (
                  <div
                    key={mod.module}
                    className="border border-portal-border/40 rounded bg-portal-surface/60 p-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-portal-border/30 pb-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <i className="pi pi-folder text-portal-accent text-xs" />
                        <span className="text-xs font-semibold text-white">{mod.module}</span>
                        <span className="text-[10px] text-portal-muted font-mono">
                          (
                          {mod.permissions.filter((p) => selectedPermissions.has(p)).length}/
                          {mod.permissions.length})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleModuleAll(mod.permissions)}
                        className="text-[11px] text-portal-muted hover:text-white font-medium cursor-pointer"
                      >
                        {isAllSelected ? 'Deselect Module' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {mod.permissions.map((permKey) => {
                        const isChecked = selectedPermissions.has(permKey);
                        return (
                          <label
                            key={permKey}
                            onClick={() => togglePermission(permKey)}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition border select-none ${
                              isChecked
                                ? 'bg-portal-accent/10 border-portal-accent/30 text-white'
                                : 'bg-portal-canvas/50 border-portal-border/30 text-portal-muted hover:text-white hover:bg-portal-surface'
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                isChecked
                                  ? 'bg-portal-accent border-portal-accent text-portal-canvas'
                                  : 'border-portal-border bg-portal-surface'
                              }`}
                            >
                              {isChecked && <i className="pi pi-check text-[9px] font-bold" />}
                            </div>
                            <span className="text-[11px] font-mono truncate">{permKey}</span>
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
