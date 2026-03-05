'use client';

import { useState } from 'react';
import { apiFetch, getToken } from '../../../lib/api';

const API_BASE = 'https://newcommerce-production.up.railway.app/api';

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium shadow-xl border ${ok ? 'bg-white text-emerald-700 border-emerald-100' : 'bg-white text-red-600 border-red-100'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-100' : 'bg-red-100'}`}>
        {ok ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
      </span>
      {msg}
      <button onClick={onClose} className="ml-1 text-gray-300 hover:text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

export default function BulkPage() {
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/bulk/export-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { notify('Export failed', false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'products.csv'; a.click();
      URL.revokeObjectURL(url);
      notify('Products exported successfully!');
    } catch { notify('Export failed', false); }
    finally { setExporting(false); }
  };

  const handleImport = async () => {
    if (!importJson.trim()) { notify('Please paste JSON data first', false); return; }
    let products;
    try {
      products = JSON.parse(importJson);
      if (!Array.isArray(products)) throw new Error();
    } catch { notify('Invalid JSON. Must be an array of product objects.', false); return; }

    setImporting(true);
    try {
      const res = await apiFetch('/admin/bulk/import-products', {
        method: 'POST',
        body: JSON.stringify({ products }),
      });
      const data = await res.json();
      if (res.ok) { notify(data.message || `${data.count} products imported!`); setImportJson(''); }
      else notify(data.error || 'Import failed', false);
    } catch { notify('Import failed', false); }
    finally { setImporting(false); }
  };

  return (
    <div className="p-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bulk Operations</h1>
        <p className="text-sm text-gray-500 mt-1">Export your catalog or import products in bulk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1.5">Export Products</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Download your entire product catalog as a CSV file. Includes ID, name, description, price, stock, category, and images.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-xs font-mono text-gray-500 border border-gray-100">
            <p className="text-gray-400 mb-1">CSV format:</p>
            <p>ID, Name, Description, Price, Stock, Category, Images</p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-60 transition-all shadow-lg shadow-indigo-600/20"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download CSV
              </>
            )}
          </button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1.5">Import Products</h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Paste a JSON array of product objects. Required fields:{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">name</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">price</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">stock</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">categoryId</code>.
          </p>
          <textarea
            rows={9}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[\n  {\n    "name": "Product Name",\n    "description": "Optional",\n    "price": "99.99",\n    "stock": "100",\n    "categoryId": "1"\n  }\n]`}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-700 placeholder-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-4 resize-none transition-all"
          />
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-60 transition-all shadow-lg shadow-emerald-600/20"
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
