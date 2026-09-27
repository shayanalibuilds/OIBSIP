import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  apiCatalog,
  apiOrders,
  apiPayments,
  ApiError,
  type OrderPublic,
} from '../../shared/lib/api';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';
import { LoadingState, EmptyState } from '../../shared/ui/States';

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

declare global {
  interface Window {
    Razorpay?: new (opts: {
      key: string;
      amount: number;
      currency: string;
      order_id: string;
      name: string;
      description: string;
      handler: (resp: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => void;
      prefill?: { email?: string };
      theme?: { color?: string };
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
const IS_DEV = import.meta.env.DEV;

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.head.appendChild(s);
  });
}

export function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderPublic | null>(null);

  const baseId = params.get('baseId') ?? '';
  const sauceId = params.get('sauceId') ?? '';
  const cheeseId = params.get('cheeseId') ?? '';
  const vegIds = (params.get('vegetableIds') ?? '').split(',').filter(Boolean);
  const quantity = Number(params.get('quantity') ?? '1') || 1;

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: apiCatalog.list,
  });

  const createOrder = useMutation({
    mutationFn: () =>
      apiOrders.create({ baseId, sauceId, cheeseId, vegetableIds: vegIds, quantity }),
    onSuccess: (data) => setOrder(data.order),
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not create order'),
  });

  const payWithRazorpay = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order');
      const created = await apiPayments.createRazorpayOrder(order.id);
      await loadRazorpayScript();
      return created;
    },
    onSuccess: async (created) => {
      if (!window.Razorpay) {
        setErr('Razorpay script failed to load');
        return;
      }
      const rzp = new window.Razorpay({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        order_id: created.razorpayOrderId,
        name: 'Ovenly',
        description: 'Pizza order (test mode)',
        handler: async (resp) => {
          try {
            await apiPayments.verify({
              orderId: created.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            navigate('/orders');
          } catch (e) {
            setErr(e instanceof ApiError ? e.message : 'Payment verification failed');
          }
        },
        theme: { color: '#c8341a' },
        modal: { ondismiss: () => setErr('Payment cancelled') },
      });
      rzp.open();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not start payment'),
  });

  const payWithDevMock = useMutation({
    mutationFn: () => (order ? apiPayments.devMock(order.id) : Promise.reject(new Error('No order'))),
    onSuccess: () => navigate('/orders'),
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Dev mock failed'),
  });

  // Auto-create the order when the page loads.
  useEffect(() => {
    if (!order && !createOrder.isPending) {
      createOrder.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <LoadingState label="Loading ingredients…" />;
  if (!catalog) return <EmptyState title="Could not load catalog" />;

  if (!baseId || !sauceId || !cheeseId) {
    return (
      <div className="stack">
        <Alert variant="error">Missing pizza configuration. Please build your pizza first.</Alert>
        <Button onClick={() => navigate('/build')}>Build your pizza</Button>
      </div>
    );
  }

  const byId = (id: string) => catalog.items.find((i) => i.id === id);
  const base = byId(baseId);
  const sauce = byId(sauceId);
  const cheese = byId(cheeseId);
  const vegs = vegIds.map(byId).filter(Boolean);
  const unit = (base?.price ?? 0) + (sauce?.price ?? 0) + (cheese?.price ?? 0) +
    vegs.reduce((s, v) => s + (v?.price ?? 0), 0);

  return (
    <div className="stack">
      <div>
        <h1 className="text-2xl font-bold mb-2">Checkout</h1>
        <p className="muted">Server recalculates the total — the number below is informational.</p>
      </div>

      {err && <Alert variant="error">{err}</Alert>}
      {createOrder.isError && (
        <Alert variant="error">Could not create order: {(createOrder.error as Error).message}</Alert>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4">Order details</h2>
        <div className="flex-between mb-2"><span>Base</span><span>{base?.name ?? '—'}</span></div>
        <div className="flex-between mb-2"><span>Sauce</span><span>{sauce?.name ?? '—'}</span></div>
        <div className="flex-between mb-2"><span>Cheese</span><span>{cheese?.name ?? '—'}</span></div>
        <div className="flex-between mb-2"><span>Vegetables</span><span>{vegs.map((v) => v?.name).join(', ') || '—'}</span></div>
        <div className="flex-between mb-2"><span>Quantity</span><span>{quantity}</span></div>
        <div className="flex-between mb-2"><span>Unit price</span><span>{formatPrice(unit)}</span></div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
        <div className="flex-between mt-4">
          <span className="font-semibold">Estimated total</span>
          <span className="font-bold text-lg">{formatPrice(unit * quantity)}</span>
        </div>
        {order && (
          <div className="muted text-sm mt-2">
            Server-confirmed total: <strong>{formatPrice(order.price)}</strong> (status:{' '}
            <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>)
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Payment</h2>
        {!RAZORPAY_KEY && IS_DEV && (
          <Alert variant="info">
            No Razorpay test key configured. Use the dev mock button below — it mirrors the verify flow
            server-side (marks paid, decrements stock) without making a real charge. Disabled in production.
          </Alert>
        )}
        {!RAZORPAY_KEY && !IS_DEV && (
          <Alert variant="error">Razorpay key missing and dev mock is disabled outside development.</Alert>
        )}
        <div className="flex flex-wrap mt-4">
          {RAZORPAY_KEY ? (
            <Button
              onClick={() => payWithRazorpay.mutate()}
              loading={payWithRazorpay.isPending || createOrder.isPending || !order}
              disabled={!order}
            >
              Pay {order ? formatPrice(order.price) : ''}
            </Button>
          ) : IS_DEV ? (
            <Button
              onClick={() => payWithDevMock.mutate()}
              loading={payWithDevMock.isPending || createOrder.isPending || !order}
              disabled={!order}
            >
              Pay (dev mock)
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate('/build')}>Back to builder</Button>
        </div>
      </div>
    </div>
  );
}
