import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAdmin, type AdminInventoryItem } from '../../shared/lib/api';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Alert } from '../../shared/ui/Alert';

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
        <div className="font-semibold">{item.name}</div>
        <div className="muted text-sm">{item.slug}</div>
        {item.isLow && <span className="badge badge--low">low</span>}
      </td>
      <td>
        <input
          aria-label={`Stock for ${item.name}`}
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          style={{ width: 80 }}
        />
      </td>
      <td>
        <input
          aria-label={`Low-stock threshold for ${item.name}`}
          type="number"
          min={0}
          value={lowAt}
          onChange={(e) => setLowAt(e.target.value)}
          style={{ width: 80 }}
        />
      </td>
      <td>
        <input
          aria-label={`Price for ${item.name}`}
          type="number"
          step="0.01"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: 90 }}
        />
      </td>
      <td>
        <label className="flex gap-2" style={{ fontWeight: 'normal' }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span className="text-sm">{active ? 'active' : 'hidden'}</span>
        </label>
      </td>
      <td>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {msg && <div className="muted text-sm mt-2">{msg}</div>}
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
    <div className="stack--lg">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <h1>Inventory</h1>
        <p>{items.length} items · {lowCount} low</p>
      </div>
      {lowCount > 0 && (
        <Alert variant="info">
          <span className="alert__icon">ℹ</span>
          <span>{lowCount} item(s) are at or below their low-stock threshold. A cron email runs every 15 minutes.</span>
        </Alert>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Stock</th>
              <th>Low at</th>
              <th>Price (₹)</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <Row key={it.id} item={it} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
