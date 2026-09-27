import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAdmin, type AdminInventoryItem } from '../../shared/lib/api';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Info, AlertTriangle } from 'lucide-react';

function Row({ item }: { item: AdminInventoryItem }) {
  const qc = useQueryClient();
  const [stock, setStock] = useState(String(item.stock));
  const [lowAt, setLowAt] = useState(String(item.lowStockThreshold));
  const [price, setPrice] = useState(String((item.priceMinor / 100).toFixed(2)));
  const [active, setActive] = useState(item.isActive);
  const [msg, setMsg] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const patch: Partial<AdminInventoryItem> = {};
      if (Number(stock) !== item.stock) patch.stock = Number(stock);
      if (Number(lowAt) !== item.lowStockThreshold) patch.lowStockThreshold = Number(lowAt);
      const newMinor = Math.round(Number(price) * 100);
      if (newMinor !== item.priceMinor) patch.priceMinor = newMinor;
      if (active !== item.isActive) patch.isActive = active;
      if (Object.keys(patch).length === 0) return Promise.resolve({ item });
      return apiAdmin.patchInventory(item.id, patch);
    },
    onSuccess: () => {
      setMsg('Saved');
      void qc.invalidateQueries({ queryKey: ['admin-inventory'] });
      setTimeout(() => setMsg(null), 1500);
    },
    onError: (e) => setMsg((e as Error).message),
  });

  return (
    <tr>
      <td>
        <div className="item-cell-title">
          <span>{item.name}</span>
          {item.isLow && <span className="badge badge--low">low</span>}
        </div>
        <div className="item-cell-slug">{item.slug}</div>
      </td>
      <td>
        <input type="number" className="input-compact width-80" value={stock} min={0} aria-label={`Stock for ${item.name}`} onChange={(e) => setStock(e.target.value)} />
      </td>
      <td>
        <input type="number" className="input-compact width-70" value={lowAt} min={0} aria-label={`Low stock threshold for ${item.name}`} onChange={(e) => setLowAt(e.target.value)} />
      </td>
      <td>
        <input type="number" step="0.01" className="input-compact width-90" value={price} aria-label={`Price for ${item.name}`} onChange={(e) => setPrice(e.target.value)} />
      </td>
      <td>
        <label className="checkbox-label">
          <input type="checkbox" checked={active} aria-label={`Active state for ${item.name}`} onChange={(e) => setActive(e.target.checked)} />
          <span>{active ? 'active' : 'hidden'}</span>
        </label>
      </td>
      <td>
        <button type="button" className="btn-save" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {msg && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{msg}</div>}
      </td>
    </tr>
  );
}

export function AdminInventoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: apiAdmin.listInventory,
  });

  useEffect(() => {
    document.title = 'Admin inventory - Ovenly';
  }, []);

  if (isLoading) return <LoadingState label="Loading inventory…" />;
  if (error) return <EmptyState title="Could not load inventory" hint={(error as Error).message} />;

  const items = data?.items ?? [];
  const lowCount = items.filter((i) => i.isLow).length;

  return (
    <main className="inventory-wrap">
      <header>
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">{items.length} items · {lowCount} low</p>
      </header>

      {lowCount > 0 && (
        <div className="alert alert--info">
          <Info size={20} />
          <span>{lowCount} item(s) are at or below their low-stock threshold. A cron email runs every 15 minutes.</span>
        </div>
      )}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Stock</th>
                <th scope="col">Low at</th>
                <th scope="col">Price (₹)</th>
                <th scope="col">Active</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => <Row key={it.id} item={it} />)}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
