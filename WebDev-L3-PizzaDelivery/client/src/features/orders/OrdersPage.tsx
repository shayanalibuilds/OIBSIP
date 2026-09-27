import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiOrders, type OrderPublic } from '../../shared/lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { authSocket, onOrderStatusChanged } from '../../shared/lib/socket';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Button } from '../../shared/ui/Button';

const STATUS_LABEL: Record<OrderPublic['status'], string> = {
  received: 'Order received',
  in_kitchen: 'In kitchen',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_FLOW: OrderPublic['status'][] = ['received', 'in_kitchen', 'out_for_delivery', 'delivered'];

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function OrderCard({ order }: { order: OrderPublic }) {
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  return (
    <article className="card">
      <div className="flex-between mb-2">
        <div>
          <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
          <div className="muted text-sm">{formatDate(order.createdAt)}</div>
        </div>
        <div className="flex gap-2">
          <span className={`badge badge--${order.status}`}>{STATUS_LABEL[order.status]}</span>
          <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>
        </div>
      </div>
      <div className="text-sm muted">
        {order.quantity} × {order.base.name}, {order.sauce.name}, {order.cheese.name}
        {order.vegetables.length > 0 ? `, ${order.vegetables.map((v) => v.name).join(', ')}` : ''}
      </div>
      <div className="flex-between mt-4">
        <span className="font-bold">{formatPrice(order.price)}</span>
        {order.status !== 'cancelled' && (
          <ol className="flex gap-2" aria-label="Status timeline">
            {STATUS_FLOW.map((s, i) => (
              <li
                key={s}
                className={`step${i <= currentIdx ? ' step--done' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {STATUS_LABEL[s]}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}

export function OrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', tick],
    queryFn: apiOrders.listMine,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!user) return;
    authSocket({ userId: user.id });
    const off = onOrderStatusChanged((p) => {
      // Bump tick to trigger refetch
      setTick((t) => t + 1);
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void p;
    });
    return off;
  }, [user, qc]);

  if (isLoading) return <LoadingState label="Loading your orders…" />;
  if (error) return <EmptyState title="Could not load orders" hint={(error as Error).message} />;

  const orders = data?.orders ?? [];

  return (
    <div className="stack">
      <div className="flex-between">
        <div>
          <h1 className="text-2xl font-bold">Your orders</h1>
          <p className="muted">Status updates in real time when an admin moves your order forward.</p>
        </div>
        <Link to="/build"><Button>Build another</Button></Link>
      </div>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" hint="Build your first pizza to see it here." />
      ) : (
        <div className="stack">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
