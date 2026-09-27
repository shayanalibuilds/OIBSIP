import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiAdmin, type OrderPublic } from '../../shared/lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { authSocket, onOrderStatusChanged } from '../../shared/lib/socket';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Flame, Truck, CheckCircle } from 'lucide-react';

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

function OrderRow({ order, tick }: { order: OrderPublic; tick: number }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const advance = useMutation({
    mutationFn: (next: OrderPublic['status']) => apiAdmin.changeOrderStatus(order.id, next),
    onSuccess: (data) => {
      // Optimistically update the cache to avoid full refetch CLS
      qc.setQueryData<{ orders: OrderPublic[] }>(['admin-orders', tick], (old) => {
        if (!old) return old;
        return { orders: old.orders.map((o) => (o.id === data.order.id ? data.order : o)) };
      });
    },
    onError: (e) => setErr((e as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => apiAdmin.changeOrderStatus(order.id, 'cancelled'),
    onSuccess: (data) => {
      qc.setQueryData<{ orders: OrderPublic[] }>(['admin-orders', tick], (old) => {
        if (!old) return old;
        return { orders: old.orders.map((o) => (o.id === data.order.id ? data.order : o)) };
      });
    },
    onError: (e) => setErr((e as Error).message),
  });

  const next = NEXT_STATUS[order.status];

  return (
    <article className="order-card" aria-label={`Order ${order.id.slice(-6)}`}>
      <div className="order-top">
        <div>
          <h3 className="order-number">#{order.id.slice(-6)}</h3>
          <p className="order-desc-text">{order.quantity} × {order.base.name}, {order.sauce.name}, {order.cheese.name}{order.vegetables.length > 0 ? ` + ${order.vegetables.map((v) => v.name).join(', ')}` : ''}</p>
        </div>
        <div className="badge-group">
          <span className={`badge badge--${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
          <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>
        </div>
      </div>
      {err && <div className="alert alert--error"><span>{err}</span></div>}
      <div className="order-bot">
        <span className="order-meta">{new Date(order.createdAt).toLocaleString()} · {formatPrice(order.price)}</span>
        <div className="actions-group">
          {next && (
            <button type="button" className="btn-action-primary" onClick={() => advance.mutate(next)} disabled={advance.isPending}>
              <span>Move to {next.replace(/_/g, ' ')}</span>
              {next === 'in_kitchen' && <Flame size={14} />}
              {next === 'out_for_delivery' && <Truck size={14} />}
              {next === 'delivered' && <CheckCircle size={14} />}
            </button>
          )}
          {(order.status === 'received' || order.status === 'in_kitchen') && (
            <button type="button" className="btn-action-danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel order
            </button>
          )}
        </div>
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
    <main className="board-wrap">
      <header>
        <h1 className="page-title">Orders board</h1>
        <p className="page-subtitle">Customer-side status updates fire automatically when you change a status.</p>
      </header>

      <section aria-labelledby="active-orders-title">
        <h2 id="active-orders-title" className="board-section-title">Active ({active.length})</h2>
        {active.length === 0 ? (
          <div className="empty-state-card">
            <span className="empty-state__icon">🍕</span>
            <p style={{ fontWeight: 500 }}>No active orders</p>
          </div>
        ) : (
          <div className="stack--sm" style={{ marginBottom: 48 }}>
            {active.map((o) => <OrderRow key={o.id} order={o} tick={tick} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="completed-orders-title">
        <h2 id="completed-orders-title" className="board-section-title">Completed ({done.length})</h2>
        {done.length === 0 ? (
          <div className="empty-state-card">
            <span className="empty-state__icon">🍕</span>
            <p style={{ fontWeight: 500 }}>No completed orders yet</p>
          </div>
        ) : (
          <div className="stack--sm">
            {done.map((o) => <OrderRow key={o.id} order={o} tick={tick} />)}
          </div>
        )}
      </section>
    </main>
  );
}
