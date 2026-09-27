import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAdmin, type OrderPublic } from '../../shared/lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { authSocket, onOrderStatusChanged } from '../../shared/lib/socket';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Alert } from '../../shared/ui/Alert';

const NEXT_STATUS: Record<OrderPublic['status'], OrderPublic['status'] | null> = {
  received: 'in_kitchen',
  in_kitchen: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: null,
  cancelled: null,
};

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

function OrderRow({ order }: { order: OrderPublic }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const advance = useMutation({
    mutationFn: (next: OrderPublic['status']) =>
      apiAdmin.changeOrderStatus(order.id, next),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-orders'] }),
    onError: (e) => setErr((e as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => apiAdmin.changeOrderStatus(order.id, 'cancelled'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-orders'] }),
    onError: (e) => setErr((e as Error).message),
  });

  const next = NEXT_STATUS[order.status];

  return (
    <article className="card">
      <div className="flex-between mb-2">
        <div>
          <h3 className="font-semibold">#{order.id.slice(-6)}</h3>
          <div className="muted text-sm">
            {order.quantity} × {order.base.name}, {order.sauce.name}, {order.cheese.name}
            {order.vegetables.length > 0 ? ` + ${order.vegetables.map((v) => v.name).join(', ')}` : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`badge badge--${order.status}`}>{order.status}</span>
          <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>
        </div>
      </div>
      <div className="muted text-sm">
        {new Date(order.createdAt).toLocaleString()} · {formatPrice(order.price)}
      </div>
      {err && <Alert variant="error">{err}</Alert>}
      <div className="flex flex-wrap mt-4">
        {next && (
          <button
            type="button"
            className="btn btn--small"
            onClick={() => advance.mutate(next)}
            disabled={advance.isPending}
          >
            Move to {next.replace(/_/g, ' ')}
          </button>
        )}
        {(order.status === 'received' || order.status === 'in_kitchen') && (
          <button
            type="button"
            className="btn btn--small btn--danger"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            Cancel order
          </button>
        )}
      </div>
    </article>
  );
}

export function AdminOrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', tick],
    queryFn: () => apiAdmin.listOrders(),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!user) return;
    authSocket({ role: 'admin' });
    const off = onOrderStatusChanged(() => {
      setTick((t) => t + 1);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    });
    return off;
  }, [user, qc]);

  if (isLoading) return <LoadingState label="Loading orders…" />;
  if (error) return <EmptyState title="Could not load orders" hint={(error as Error).message} />;

  const orders = data?.orders ?? [];
  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const done = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <div className="stack--lg">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <h1>Orders board</h1>
        <p>Customer-side status updates fire automatically when you change a status.</p>
      </div>
      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Active ({active.length})</h2>
        {active.length === 0 ? (
          <EmptyState title="No active orders" />
        ) : (
          <div className="stack">{active.map((o) => <OrderRow key={o.id} order={o} />)}</div>
        )}
      </section>
      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Completed ({done.length})</h2>
        {done.length === 0 ? (
          <EmptyState title="No completed orders yet" />
        ) : (
          <div className="stack">{done.map((o) => <OrderRow key={o.id} order={o} />)}</div>
        )}
      </section>
    </div>
  );
}
