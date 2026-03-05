'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Analytics } from '../../../lib/types';

interface Trends {
  dailyRevenue: Record<string, number>;
  dailyOrders: Record<string, number>;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  processing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  shipped: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-600 ring-red-600/20',
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/analytics/overview').then(r => r.json()),
      apiFetch('/admin/analytics/trends?days=30').then(r => r.json()),
    ])
      .then(([overview, trendsData]) => { setAnalytics(overview); setTrends(trendsData); })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const trendEntries = trends
    ? Object.entries(trends.dailyRevenue).sort(([a], [b]) => b.localeCompare(a))
    : [];

  const totalRevenue = parseFloat(analytics?.totalRevenue ?? '0');

  const maxRevenue = trendEntries.length > 0 ? Math.max(...trendEntries.map(([, v]) => v), 1) : 1;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Store performance and revenue insights</p>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-7 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-28 mb-4" />
              <div className="h-10 bg-gray-100 rounded w-40" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-7">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Revenue</p>
              <p className="text-4xl font-bold text-gray-900">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-400">All time</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-7">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Orders</p>
              <p className="text-4xl font-bold text-gray-900">{(analytics?.totalOrders ?? 0).toLocaleString()}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-xs text-gray-400">All time</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Popular products */}
        {analytics?.popularProducts && analytics.popularProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="text-base font-bold text-gray-900">Popular Products</h2>
              <p className="text-xs text-gray-400 mt-0.5">By units sold</p>
            </div>
            <div className="p-6 space-y-4">
              {analytics.popularProducts.slice(0, 8).map((p, i) => {
                const max = analytics.popularProducts[0]?.totalQuantity || 1;
                const pct = Math.round((p.totalQuantity / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-6 text-xs font-bold text-gray-400 text-right shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.product?.name ?? 'N/A'}</p>
                        <p className="text-xs text-gray-500 ml-4 shrink-0">{p.totalQuantity} sold</p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Revenue by status */}
        {analytics?.revenueByStatus && analytics.revenueByStatus.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="text-base font-bold text-gray-900">Revenue by Status</h2>
              <p className="text-xs text-gray-400 mt-0.5">Order fulfillment breakdown</p>
            </div>
            <div className="divide-y divide-gray-50">
              {analytics.revenueByStatus.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ring-inset capitalize ${STATUS_STYLES[r.status] ?? 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                      {r.status}
                    </span>
                    <span className="text-sm text-gray-500">{r._count?.status ?? 0} orders</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    ${parseFloat(r._sum?.totalAmount ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily trends */}
      {trendEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-bold text-gray-900">Last 30 Days</h2>
            <p className="text-xs text-gray-400 mt-0.5">Daily revenue trend</p>
          </div>

          {/* Mini bar chart */}
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="flex items-end gap-1 h-16">
              {trendEntries.slice(0, 30).reverse().map(([date, revenue]) => {
                const h = Math.max(4, Math.round((revenue / maxRevenue) * 64));
                return (
                  <div key={date} className="flex-1 group relative">
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                      <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow">
                        {date}<br />${revenue.toFixed(2)}
                      </div>
                    </div>
                    <div
                      className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-colors cursor-default"
                      style={{ height: `${h}px` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {['Date', 'Revenue', 'Orders'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trendEntries.map(([date, revenue]) => (
                  <tr key={date} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-sm text-gray-700">{date}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">${revenue.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{trends?.dailyOrders[date] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
