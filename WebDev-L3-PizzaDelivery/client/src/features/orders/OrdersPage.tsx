import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiOrders, type OrderPublic } from '../../shared/lib/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { authSocket, onOrderStatusChanged } from '../../shared/lib/socket';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { Flame, Check, ChevronRight } from 'lucide-react';

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
    <article className="order-card" aria-labelledby={`order-${order.id}-title`}>
      <div className="order-top">
        <div>
          <h2 id={`order-${order.id}-title`} className="order-id">Order #{order.id.slice(-6)}</h2>
          <p className="order-date">{formatDate(order.createdAt)}</p>
        </div>
        <div className="badge-group">
          <span className={`badge badge--${order.status}`}>{STATUS_LABEL[order.status]}</span>
          <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>
        </div>
      </div>
      <p className="order-desc">{order.quantity} × {order.base.name}, {order.sauce.name}, {order.cheese.name}{order.vegetables.length > 0 ? `, ${order.vegetables.map((v) => v.name).join(', ')}` : ''}</p>
      <div className="order-bot">
        <span className="order-price">{formatPrice(order.price)}</span>
        {order.status !== 'cancelled' && (
          <ol className="timeline" aria-label="Order tracking timeline">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <li className={`timeline-step${i <= currentIdx ? ' done' : ' pending'}`}>
                  <span className="step-icon">
                    {i <= currentIdx ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span>{STATUS_LABEL[s]}</span>
                </li>
                {i < STATUS_FLOW.length - 1 && <li className="timeline-arrow"><ChevronRight size={14} /></li>}
              </div>
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
    const off = onOrderStatusChanged(() => {
      setTick((t) => t + 1);
      void qc.invalidateQueries({ queryKey: ['orders'] });
    });
    return off;
  }, [user, qc]);

  if (isLoading) return <LoadingState label="Loading your orders…" />;
  if (error) return <EmptyState title="Could not load orders" hint={(error as Error).message} />;

  const orders = data?.orders ?? [];

  return (
    <main className="orders-wrap">
      <header className="orders-header">
        <div>
          <h1 className="page-title">Your orders</h1>
          <p className="page-subtitle">Status updates in real time when an admin moves your order forward.</p>
        </div>
        <Link to="/build" className="btn btn--primary btn--sm">
          <Flame size={16} />
          <span>Build another</span>
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-state__icon">🍕</span>
          <p style={{ fontWeight: 500 }}>No orders yet</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Build your first pizza to see it here.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </main>
  );
}
