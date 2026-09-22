import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
  customersApi,
  organisationApi,
  type Customer,
  type PricingMarkupRule,
  type Product,
  type Region,
} from '../../../api-client';
import apiClient from '../../../api-client/api';
import { FlatDataTable, resetTableData, type ColumnDef } from '../../../components/data-table';
import { FlatAsyncSelect, FlatButton, FlatDropdown, FlatInputNumber } from '../../../components/flat-form';
import { FlatConfirmDialog, FlatModal } from '../../../components/overlay';
import { usePermissions } from '../../../hooks/usePermissions';

type RuleScope = 'region' | 'customer';

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.detail || error?.response?.data?.message || fallback;

const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;

export const ProductPricingRulesPage: React.FC = () => {
  const { hasAnyPermission } = usePermissions();
  const canManageRules = hasAnyPermission('Products.Manage', 'Products.Create', 'Products.Edit');
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: RuleScope = searchParams.get('tab') === 'customer' ? 'customer' : 'region';

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionId, setRegionId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [rules, setRules] = useState<PricingMarkupRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState('');
  const rulesRequestRef = useRef(0);

  const [editingRule, setEditingRule] = useState<PricingMarkupRule | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorRegionId, setEditorRegionId] = useState('');
  const [editorCustomerId, setEditorCustomerId] = useState('');
  const [editorCustomer, setEditorCustomer] = useState<Customer | undefined>();
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [markupPercentage, setMarkupPercentage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteRule, setDeleteRule] = useState<PricingMarkupRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    organisationApi.getRegions()
      .then((items) => { if (active) setRegions(items); })
      .catch(() => { if (active) toast.error('Failed to load regions.'); })
      .finally(() => { if (active) setRegionsLoading(false); });
    return () => { active = false; };
  }, []);

  const loadRules = useCallback(async () => {
    const requestId = ++rulesRequestRef.current;
    if (scope !== 'region' || regionId) {
      setRules([]);
      setRulesError('');
      setRulesLoading(false);
      return;
    }
    if (regionsLoading) {
      setRulesLoading(true);
      return;
    }

    setRules([]);
    setRulesLoading(true);
    setRulesError('');
    try {
      const pages = await Promise.all(regions.map((region) => organisationApi.getRegionMarkups(region.id)));
      const items = pages.flatMap((page) => Array.isArray(page) ? page : page.data || []);
      if (requestId !== rulesRequestRef.current) return;
      setRules(items);
    } catch (error: any) {
      if (requestId !== rulesRequestRef.current) return;
      setRules([]);
      setRulesError(getErrorMessage(error, 'Failed to load pricing rules.'));
    } finally {
      if (requestId === rulesRequestRef.current) setRulesLoading(false);
    }
  }, [scope, regionId, regions, regionsLoading]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const resetEditor = useCallback(() => {
    setEditorVisible(false);
    setEditingRule(null);
    setEditorRegionId('');
    setEditorCustomerId('');
    setEditorCustomer(undefined);
    setProductId('');
    setSelectedProduct(undefined);
    setMarkupPercentage(null);
  }, []);

  const handleScopeChange = (nextScope: RuleScope) => {
    if (nextScope === scope) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextScope);
    setSearchParams(nextParams, { replace: true });
    setRegionId('');
    setCustomerId('');
    setSelectedCustomer(undefined);
    setRules([]);
    setRulesError('');
    resetEditor();
  };

  const handleTargetChange = (value: string, customer?: Customer) => {
    setRules([]);
    setRulesError('');
    if (scope === 'region') {
      setRegionId(value || '');
    } else {
      setCustomerId(value || '');
      setSelectedCustomer(customer);
    }
    resetEditor();
  };

  const fetchCustomers = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const response = await customersApi.getCustomers(params);
    const items: Customer[] = response?.data ?? response?.items ?? (Array.isArray(response) ? response : []);
    return {
      data: items,
      totalPages: response?.totalPages ?? 1,
      totalCount: response?.totalCount ?? items.length,
      currentPage: response?.currentPage ?? response?.page ?? params.pageNumber,
    };
  }, []);

  const fetchProducts = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const response = await apiClient.get<any>('/products', {
      params: { ...params, isActive: true, sort: 'name_asc' },
    });
    const payload = response.data;
    const items: Product[] = payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
    return {
      data: items,
      totalPages: payload?.totalPages ?? 1,
      totalCount: payload?.totalCount ?? items.length,
      currentPage: payload?.currentPage ?? params.pageNumber,
    };
  }, []);

  const startEditing = (rule: PricingMarkupRule) => {
    setEditingRule(rule);
    setEditorRegionId(rule.regionId || regionId);
    setEditorCustomerId(rule.customerId || customerId);
    setEditorCustomer(rule.customerId ? ({
      id: rule.customerId,
      businessName: rule.customerName || 'Customer',
    } as Customer) : selectedCustomer);
    setProductId(rule.productId || '');
    setSelectedProduct(rule.productId ? ({ id: rule.productId, name: rule.productName || 'Product' } as Product) : undefined);
    setMarkupPercentage(Number(rule.markupPercentage));
    setEditorVisible(true);
  };

  const startAdding = () => {
    resetEditor();
    setEditorRegionId(regionId);
    setEditorCustomerId(customerId);
    setEditorCustomer(selectedCustomer);
    setEditorVisible(true);
  };

  const handleSave = async () => {
    const mutationTargetId = scope === 'region'
      ? editorRegionId || regionId
      : editorCustomerId || customerId;
    if (!mutationTargetId) {
      toast.error(`Select a ${scope} first.`);
      return;
    }
    if (markupPercentage === null || Number.isNaN(markupPercentage)) {
      toast.error('Enter a markup percentage.');
      return;
    }
    if (markupPercentage < -99.99 || markupPercentage > 500) {
      toast.error('Markup percentage must be between -99.99 and 500.');
      return;
    }

    setSaving(true);
    try {
      const payload = { productId: productId || null, markupPercentage };
      if (scope === 'region') {
        await organisationApi.upsertRegionMarkup(mutationTargetId, payload);
      } else {
        await customersApi.upsertCustomerMarkup(mutationTargetId, payload);
      }
      resetTableData();
      toast.success(editingRule ? 'Pricing rule updated.' : 'Pricing rule saved.');
      resetEditor();
      if (scope === 'region' && !regionId) await loadRules();
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save pricing rule.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRule) return;
    const mutationTargetId = scope === 'region'
      ? deleteRule.regionId || regionId
      : deleteRule.customerId || customerId;
    if (!mutationTargetId) return;
    setDeleting(true);
    try {
      if (scope === 'region') {
        await organisationApi.deleteRegionMarkup(mutationTargetId, deleteRule.id);
      } else {
        await customersApi.deleteCustomerMarkup(mutationTargetId, deleteRule.id);
      }
      resetTableData();
      toast.success('Pricing rule deleted.');
      if (editingRule?.id === deleteRule.id) resetEditor();
      setDeleteRule(null);
      if (scope === 'region' && !regionId) await loadRules();
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete pricing rule.'));
    } finally {
      setDeleting(false);
    }
  };

  const regionOptions = useMemo(() => regions.map((region) => ({
    label: region.name,
    value: region.id,
  })), [regions]);

  const previewBasePrice = selectedProduct?.basicUnitPrice ?? 10;
  const previewPrice = markupPercentage === null
    ? previewBasePrice
    : Math.round(previewBasePrice * (1 + markupPercentage / 100) * 100) / 100;
  const selectedTargetLabel = scope === 'region'
    ? regions.find((region) => region.id === regionId)?.name || 'All Regions'
    : selectedCustomer?.businessName || 'All Customers';
  const editorTargetLabel = scope === 'region'
    ? regions.find((region) => region.id === (editorRegionId || regionId))?.name || 'Regional rule'
    : editorCustomer?.businessName || selectedCustomer?.businessName || 'Customer rule';
  const isAllRegionsView = scope === 'region' && !regionId;
  const rulesDataSourceUrl = scope === 'region'
    ? regionId ? `/organisation/regions/${regionId}/markups` : undefined
    : '/customers/markups';
  const columns: ColumnDef<PricingMarkupRule>[] = [
    {
      field: scope === 'region' ? 'regionName' : 'customerName',
      header: scope === 'region' ? 'Region' : 'Customer',
      body: (rule) => (
        <span className="text-xs font-semibold text-portal-heading">
          {scope === 'region' ? rule.regionName || '—' : rule.customerName || selectedCustomer?.businessName || '—'}
        </span>
      ),
    },
    {
      field: 'productName',
      header: 'Product',
      body: (rule) => (
        <span className="text-xs font-semibold text-portal-heading">{rule.productName || 'All Products'}</span>
      ),
    },
    {
      field: 'markupPercentage',
      header: 'Adjustment',
      style: { width: '140px' },
      body: (rule) => (
        <span className={`font-mono text-xs font-bold ${
          Number(rule.markupPercentage) < 0 ? 'text-red-accent' : 'text-portal-accent'
        }`}>
          {formatPercentage(Number(rule.markupPercentage))}
        </span>
      ),
    },
    {
      field: 'effect',
      header: 'Effect',
      style: { width: '140px' },
      body: (rule) => (
        <span className="text-[11px] text-portal-muted">
          {Number(rule.markupPercentage) < 0 ? 'Price reduction' : 'Price increase'}
        </span>
      ),
    },
    ...(canManageRules ? [{
      field: 'actions',
      header: 'Actions',
      style: { width: '110px', textAlign: 'right' as const },
      headerStyle: { textAlign: 'right' as const },
      body: (rule: PricingMarkupRule) => (
        <div className="flex items-center justify-end gap-1">
          <FlatButton
            variant="ghost"
            size="icon-sm"
            icon="pi pi-pencil"
            aria-label={`Edit ${rule.productName || 'all products'} rule`}
            onClick={() => startEditing(rule)}
          />
          <FlatButton
            variant="ghost"
            size="icon-sm"
            icon="pi pi-trash"
            aria-label={`Delete ${rule.productName || 'all products'} rule`}
            className="hover:!text-red-accent"
            onClick={() => setDeleteRule(rule)}
          />
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <div
        className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-portal-border/60 text-sm font-semibold"
        role="tablist"
        aria-label="Pricing rule scope"
      >
        {(['region', 'customer'] as RuleScope[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={scope === item}
            onClick={() => handleScopeChange(item)}
            className={`-mb-px cursor-pointer !rounded-none border-b-2 pb-3 transition ${
              scope === item
                ? 'border-portal-accent font-bold text-portal-heading'
                : 'border-transparent text-portal-muted hover:text-portal-heading'
            }`}
          >
            {item === 'region' ? 'Regional Rules' : 'Customer Rules'}
          </button>
        ))}
      </div>

      {isAllRegionsView && rulesLoading ? (
        <div className="flex min-h-44 items-center justify-center gap-2 border border-portal-border/60 bg-portal-surface text-xs text-portal-muted">
          <i className="pi pi-spin pi-spinner" /> Loading pricing rules...
        </div>
      ) : isAllRegionsView && rulesError ? (
        <section className="bg-portal-surface p-4">
          <div className="flex min-h-36 flex-col items-center justify-center rounded bg-red-accent/10 px-5 text-center text-red-accent">
            <div className="flex items-center gap-2 text-xs font-medium">
              <i className="pi pi-exclamation-triangle shrink-0 text-sm" />
              <span>{rulesError}</span>
            </div>
            <FlatButton variant="outline" size="sm" className="mt-3" onClick={() => void loadRules()}>
              Try again
            </FlatButton>
          </div>
        </section>
      ) : (
        <FlatDataTable<PricingMarkupRule>
          key={scope}
          columns={columns}
          data={isAllRegionsView ? rules : undefined}
          dataSourceUrl={rulesDataSourceUrl}
          enablePaginator={!isAllRegionsView}
          initialPageSize={20}
          filterablePlaceholder="Search pricing rules..."
          postData={scope === 'region'
            ? regionId ? { regionId } : {}
            : customerId ? { customerId } : {}}
          extendedFilter={{
            enable: true,
            filters: scope === 'region'
              ? [{
                  type: 'SelectFilter',
                  accessor: 'regionId',
                  label: 'Region',
                  args: {
                    options: regionOptions,
                    placeholder: 'All Regions',
                    disabled: regionsLoading,
                    size: 'sm',
                  },
                }]
              : [
                  {
                    type: 'AsyncSelectFilter',
                    accessor: 'customerId',
                    label: 'Customer',
                    args: {
                      fetchFn: fetchCustomers,
                      optionValue: 'id',
                      optionLabel: (customer: Customer) => customer.businessName,
                      initialSelectedItem: selectedCustomer,
                      itemTemplate: (customer: Customer) => (
                        <div>
                          <div className="text-xs font-semibold text-portal-heading">{customer.businessName}</div>
                          <div className="text-[11px] text-portal-muted">{customer.customerCode}</div>
                        </div>
                      ),
                      onSelectedItemChange: (customer?: Customer) => setSelectedCustomer(customer),
                      placeholder: 'Search by customer name or code',
                      size: 'sm',
                    },
                  },
                  {
                    type: 'AsyncSelectFilter',
                    accessor: 'productId',
                    label: 'Product',
                    args: {
                      fetchFn: fetchProducts,
                      optionValue: 'id',
                      optionLabel: 'name',
                      placeholder: 'Search products',
                      size: 'sm',
                    },
                  },
                ],
          }}
          isFilterVisibleOnStart={false}
          onFiltersChange={(filters) => {
            if (scope === 'region') {
              const nextRegionId = String(filters.regionId || '');
              if (nextRegionId !== regionId) handleTargetChange(nextRegionId);
              return;
            }
            const nextCustomerId = String(filters.customerId || '');
            if (nextCustomerId !== customerId) handleTargetChange(nextCustomerId);
          }}
          heading={(
            <div>
              <h2 className="text-sm font-semibold text-portal-heading">Rules for {selectedTargetLabel}</h2>
              <p className="mt-0.5 text-[11px] text-portal-muted">
                Product-specific rules take priority over all-products rules.
              </p>
            </div>
          )}
          hasAction={canManageRules}
          actionName="Add Rule"
          actionNameMobile="Add Rule"
          onAction={startAdding}
          emptyDataText={scope === 'region' && !regionId
              ? 'No regional pricing rules found.'
              : `No pricing rules for this ${scope}.`}
        />
      )}

      <FlatModal
        visible={editorVisible}
        onHide={saving ? () => {} : resetEditor}
        title={editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
        subtitle={`${editorTargetLabel} · Leave product blank to cover all products`}
        size="sm"
        closable={!saving}
        footer={
          <>
            <FlatButton variant="outline" size="sm" onClick={resetEditor} disabled={saving}>
              Cancel
            </FlatButton>
            <FlatButton size="sm" leftIcon="pi pi-check" loading={saving} onClick={handleSave}>
              {editingRule ? 'Update Rule' : 'Save Rule'}
            </FlatButton>
          </>
        }
      >
        <div className="space-y-4">
          {scope === 'region' && !regionId && (
            <FlatDropdown
              id="pricing-rule-editor-region"
              label="Region"
              placeholder="Select a region"
              value={editorRegionId}
              options={regionOptions}
              onChange={(value) => setEditorRegionId(value || '')}
              required
              disabled={Boolean(editingRule)}
              helperText={editingRule ? 'The owning region cannot be changed while editing.' : undefined}
              size="sm"
            />
          )}

          {scope === 'customer' && !customerId && (
            <FlatAsyncSelect<Customer>
              id="pricing-rule-editor-customer"
              label="Customer"
              placeholder="Search by customer name or code"
              value={editorCustomerId}
              initialSelectedItem={editorCustomer}
              onChange={(value, customer) => {
                setEditorCustomerId(value || '');
                setEditorCustomer(customer);
              }}
              fetchFn={fetchCustomers}
              optionValue="id"
              optionLabel={(customer) => customer.businessName}
              itemTemplate={(customer) => (
                <div>
                  <div className="text-xs font-semibold text-portal-heading">{customer.businessName}</div>
                  <div className="text-[11px] text-portal-muted">{customer.customerCode}</div>
                </div>
              )}
              required
              disabled={Boolean(editingRule)}
              helperText={editingRule ? 'The owning customer cannot be changed while editing.' : undefined}
              size="sm"
            />
          )}

          <FlatAsyncSelect<Product>
            id="pricing-rule-product"
            label="Product (optional)"
            placeholder="All Products"
            value={productId}
            initialSelectedItem={selectedProduct}
            onChange={(value, product) => {
              setProductId(value || '');
              setSelectedProduct(product);
            }}
            fetchFn={fetchProducts}
            optionValue="id"
            optionLabel="name"
            helperText="Clear this field to make the rule apply to every product."
            size="sm"
          />

          <FlatInputNumber
            id="pricing-rule-percentage"
            label="Markup percentage"
            value={markupPercentage}
            onChange={setMarkupPercentage}
            min={-99.99}
            max={500}
            minFractionDigits={0}
            maxFractionDigits={2}
            suffix="%"
            placeholder="e.g. 10 or -5"
            helperText="Positive values increase the price; negative values reduce it."
            size="sm"
          />

          <div className="border border-portal-border/60 bg-portal-canvas px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-portal-muted">Price preview</div>
            <div className="mt-1 font-mono text-sm font-semibold text-portal-heading">
              GHS {previewBasePrice.toFixed(2)} <span className="px-1 text-portal-muted">→</span> GHS {previewPrice.toFixed(2)}
            </div>
            <p className="mt-1 text-[11px] text-portal-muted">
              {selectedProduct?.basicUnitPrice != null ? 'Based on this product’s basic-unit price.' : 'Example using a GHS 10.00 base price.'}
            </p>
          </div>
        </div>
      </FlatModal>

      <FlatConfirmDialog
        visible={Boolean(deleteRule)}
        onHide={() => setDeleteRule(null)}
        onConfirm={handleDelete}
        title="Delete pricing rule"
        message={
          <span>
            Remove the rule for <strong className="text-portal-heading">{deleteRule?.productName || 'All Products'}</strong>?
            {' '}Prices will fall back to the next applicable rule or the base catalog price.
          </span>
        }
        confirmLabel="Delete Rule"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default ProductPricingRulesPage;
