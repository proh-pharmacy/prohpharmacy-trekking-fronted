import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  dashboardApi,
  customersApi,
  reportsApi,
  organisationApi,
  type DashboardResponse,
  type LedgerSummaryCustomer,
  type TrekReportItem,
} from '../../../api-client';
import { FlatDropdown } from '../../../components/flat-form';
import { fmtGhs, fmtGhsShort } from '../../../lib/utils';

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Completed: 'text-portal-accent',
  InProgress: 'text-yellow-400',
  Scheduled: 'text-blue-400',
  Cancelled: 'text-red-400',
  Draft: 'text-portal-muted',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Cash',
  MobileMoney: 'Mobile Money',
  Cheque: 'Cheque',
  BankTransfer: 'Bank Transfer',
  Credit: 'Credit',
  Unspecified: 'Unspecified',
};

// ── Custom bar chart tooltip ───────────────────────────────────────────
const CollectionsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-portal-surface border border-portal-border rounded px-3 py-2 shadow-lg">
      <p className="text-[11px] text-portal-muted mb-1">{label}</p>
      <p className="text-xs font-semibold text-portal-accent">{fmtGhs(payload[0].value)}</p>
    </div>
  );
};

const PaymentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-portal-surface border border-portal-border rounded px-3 py-2 shadow-lg">
      <p className="text-[11px] text-portal-muted mb-1">{PAYMENT_METHOD_LABELS[label] ?? label}</p>
      <p className="text-xs font-semibold text-portal-accent">{fmtGhs(payload[0].value)}</p>
      <p className="text-[11px] text-portal-muted">{payload[0].payload.transactions} transactions</p>
    </div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [branchId, setBranchId] = useState('');
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [debtors, setDebtors] = useState<LedgerSummaryCustomer[]>([]);
  const [recentTreks, setRecentTreks] = useState<TrekReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organisationApi.getBranches()
      .then((branches) => {
        setBranchOptions([
          { label: 'All Branches', value: '' },
          ...branches.map((b) => ({ label: b.name, value: b.id })),
        ]);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, debtorData, trekData] = await Promise.all([
        dashboardApi.get({ period, ...(branchId ? { branchId } : {}) }),
        customersApi.getLedgerSummary({ pageSize: 5, sort: 'balance_desc', hasBalance: true }),
        reportsApi.getTrekReport({ pageSize: 5 }),
      ]);
      setDashboard(dashData);
      setDebtors(Array.isArray(debtorData.customers) ? debtorData.customers : []);
      setRecentTreks(Array.isArray(trekData.treks) ? trekData.treks : []);
    } catch {
      toast.error('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [period, branchId]);

  useEffect(() => { load(); }, [load]);

  const periodLabel = period === 'week' ? 'This Week' : 'This Month';

  // ── Loading skeleton ───────────────────────────────────────────────
  if (loading && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[140px] bg-portal-surface border border-portal-border/60 p-4 animate-pulse">
              <div className="h-2.5 w-20 bg-portal-border/40 rounded mb-3" />
              <div className="h-5 w-28 bg-portal-border/40 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-portal-surface border border-portal-border/60 p-5 h-64 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-portal-surface border border-portal-border/60 p-5 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header + controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex items-center bg-portal-canvas border border-portal-border/60 rounded overflow-hidden">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                  period === p
                    ? 'bg-portal-accent text-portal-canvas'
                    : 'text-portal-muted hover:text-white'
                }`}
              >
                {p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          {/* Branch filter */}
          <div className="w-44">
            <FlatDropdown
              value={branchId}
              options={branchOptions}
              onChange={(val: any) => setBranchId(val?.value !== undefined ? val.value : val)}
              placeholder="All Branches"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] min-w-0 bg-portal-surface border border-portal-border/60 p-4">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1.5">
            Collected · {periodLabel}
          </p>
          <p
            className="text-sm font-bold text-portal-accent truncate"
            title={fmtGhs(dashboard?.totalCollected ?? 0)}
          >
            {fmtGhsShort(dashboard?.totalCollected ?? 0)}
          </p>
        </div>
        <div className="flex-1 min-w-[140px] min-w-0 bg-portal-surface border border-portal-border/60 p-4">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1.5">
            Outstanding · All Time
          </p>
          <p
            className="text-sm font-bold text-orange-400 truncate"
            title={fmtGhs(dashboard?.totalOutstanding ?? 0)}
          >
            {fmtGhsShort(dashboard?.totalOutstanding ?? 0)}
          </p>
        </div>
        <div className="flex-1 min-w-[140px] min-w-0 bg-portal-surface border border-portal-border/60 p-4">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1.5">Active Treks</p>
          <p className="text-sm font-bold text-blue-400">{dashboard?.activeTreks ?? 0}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/portal/reports/ledger-summary?hasBalance=true')}
          className="flex-1 min-w-[140px] min-w-0 bg-portal-surface border border-portal-border/60 p-4 text-left hover:border-portal-accent/50 transition cursor-pointer group"
        >
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1.5">Customers with Debt</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">{dashboard?.customersWithDebt ?? 0}</p>
            <i className="pi pi-arrow-right text-[10px] text-portal-muted group-hover:text-portal-accent transition" />
          </div>
        </button>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Collections over time — wider */}
        <div className="lg:col-span-2 bg-portal-surface border border-portal-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">Collections Over Time</p>
            <p className="text-[11px] text-portal-muted">{periodLabel}</p>
          </div>
          {dashboard?.collectionsOverTime?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboard.collectionsOverTime} barCategoryGap="30%">
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#768390', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#768390', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  width={45}
                />
                <Tooltip content={<CollectionsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {dashboard.collectionsOverTime.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.total > 0 ? '#3fb950' : '#2d333b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-portal-muted">
              No data for this period.
            </div>
          )}
        </div>

        {/* By payment method — narrower */}
        <div className="bg-portal-surface border border-portal-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">By Payment Method</p>
            <p className="text-[11px] text-portal-muted">{periodLabel}</p>
          </div>
          {dashboard?.byPaymentMethod?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboard.byPaymentMethod} layout="vertical" barCategoryGap="25%">
                <XAxis
                  type="number"
                  tick={{ fill: '#768390', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                />
                <YAxis
                  type="category"
                  dataKey="paymentMethod"
                  tick={{ fill: '#768390', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tickFormatter={(v) => PAYMENT_METHOD_LABELS[v] ?? v}
                />
                <Tooltip content={<PaymentTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" fill="#3fb950" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-portal-muted">
              No collections this period.
            </div>
          )}
        </div>
      </div>

      {/* ── Widgets row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 5 debtors */}
        <div className="bg-portal-surface border border-portal-border/60">
          <div className="px-5 py-3 border-b border-portal-border/60 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Top Debtors</span>
            <button
              type="button"
              onClick={() => navigate('/portal/reports/ledger-summary')}
              className="text-[11px] text-portal-muted hover:text-portal-accent transition cursor-pointer"
            >
              View all →
            </button>
          </div>
          {debtors.length === 0 ? (
            <p className="text-xs text-portal-muted text-center py-10">No outstanding balances.</p>
          ) : (
            <div className="divide-y divide-portal-border/30">
              {debtors.map((d) => (
                <button
                  key={d.customerId}
                  type="button"
                  onClick={() => navigate(`/portal/customers/${d.customerId}`)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer group text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-portal-accent transition">
                      {d.businessName}
                    </p>
                    <p className="text-[11px] text-portal-muted font-mono">{d.customerCode || '—'}</p>
                  </div>
                  <span
                    className="font-mono text-xs font-bold text-orange-400 shrink-0"
                    title={fmtGhs(d.currentBalance)}
                  >
                    {fmtGhsShort(d.currentBalance)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent treks */}
        <div className="bg-portal-surface border border-portal-border/60">
          <div className="px-5 py-3 border-b border-portal-border/60 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Recent Treks</span>
            <button
              type="button"
              onClick={() => navigate('/portal/trekking')}
              className="text-[11px] text-portal-muted hover:text-portal-accent transition cursor-pointer"
            >
              View all →
            </button>
          </div>
          {recentTreks.length === 0 ? (
            <p className="text-xs text-portal-muted text-center py-10">No treks found.</p>
          ) : (
            <div className="divide-y divide-portal-border/30">
              {recentTreks.map((trek) => (
                <button
                  key={trek.id}
                  type="button"
                  onClick={() => navigate(`/portal/trekking/${trek.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer group text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-portal-accent group-hover:text-white transition">
                        {trek.trekNumber}
                      </p>
                      <span className={`text-[11px] font-semibold ${STATUS_COLORS[trek.status] ?? 'text-portal-muted'}`}>
                        {trek.status === 'InProgress' ? 'In Progress' : trek.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-portal-muted truncate">
                      {trek.scheduledDate}
                      {trek.driverName ? ` · ${trek.driverName}` : ''}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-portal-accent shrink-0" title={fmtGhs(trek.totalCollected)}>
                    {fmtGhsShort(trek.totalCollected)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
