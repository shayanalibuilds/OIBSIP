import { useEffect, useRef, useState } from 'react';
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
  const createdRef = useRef(false);

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
    onSuccess: (data) => {
      if (data?.order) {
        setOrder(data.order);
      } else {
        setErr('Server returned an unexpected response. Please retry.');
      }
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not create order';
      setErr(msg);
    },
  });

  const payWithRazorpay = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order to pay');
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
    mutationFn: () => {
      if (!order) return Promise.reject(new Error('No order to pay'));
      return apiPayments.devMock(order.id);
    },
    onSuccess: () => navigate('/orders'),
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Dev mock failed'),
  });

  // Auto-create the order ONCE, after the catalog loads and params are validated.
  // Uses a ref to prevent double-fire in React StrictMode.
  useEffect(() => {
    if (createdRef.current) return;
    if (isLoading || !catalog) return;
    if (!baseId || !sauceId || !cheeseId) return;
    createdRef.current = true;
    createOrder.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, catalog, baseId, sauceId, cheeseId]);

  const handleRetry = () => {
    setErr(null);
    createdRef.current = true;
    createOrder.mutate();
  };

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
  const unit =
    (base?.price ?? 0) + (sauce?.price ?? 0) + (cheese?.price ?? 0) +
    vegs.reduce((s, v) => s + (v?.price ?? 0), 0);

  const orderCreating = createOrder.isPending;
  const orderFailed = createOrder.isError && !order;

  return (
    <div className="stack--lg">
      <div className="section-header">
        <h1>Checkout</h1>
        <p>Server recalculates the total — the number below is informational.</p>
      </div>

      {err && <Alert variant="error"><span className="alert__icon">⚠</span><span>{err}</span></Alert>}
      {orderFailed && (
        <Alert variant="error">
          <span className="alert__icon">⚠</span>
          <span>
            Could not create order: {err ?? 'Unknown error'}.{' '}
            <button
              type="button"
              onClick={handleRetry}
              style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', display: 'inline', padding: 0, font: 'inherit', fontWeight: 600 }}
            >
              Retry
            </button>
          </span>
        </Alert>
      )}

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)' }}>Order details</h2>
        <div className="detail-row">
          <span className="detail-row__label">Base</span>
          <span className="detail-row__value">{base?.name ?? '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Sauce</span>
          <span className="detail-row__value">{sauce?.name ?? '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Cheese</span>
          <span className="detail-row__value">{cheese?.name ?? '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Vegetables</span>
          <span className="detail-row__value">{vegs.map((v) => v?.name).join(', ') || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Quantity</span>
          <span className="detail-row__value">{quantity}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Unit price</span>
          <span className="detail-row__value">{formatPrice(unit)}</span>
        </div>
        <div className="detail-row detail-row--total">
          <span className="detail-row__label">Estimated total</span>
          <span className="detail-row__value">{formatPrice(unit * quantity)}</span>
        </div>
        {order && (
          <div className="muted text-sm mt-4" style={{ textAlign: 'center' }}>
            Server-confirmed total: <strong>{formatPrice(order.price)}</strong> ·{' '}
            <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>
          </div>
        )}
        {orderCreating && (
          <div className="muted text-sm mt-3" style={{ textAlign: 'center' }}>
            <span className="spinner spinner--sm" aria-hidden="true" /> Creating your order…
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)' }}>Payment</h2>
        {!RAZORPAY_KEY && IS_DEV && (
          <Alert variant="info">
            <span className="alert__icon">ℹ</span>
            <span>
              No Razorpay test key configured. Use the dev mock button below — it mirrors the verify flow
              server-side without making a real charge. Disabled in production.
            </span>
          </Alert>
        )}
        {!RAZORPAY_KEY && !IS_DEV && (
          <Alert variant="error"><span className="alert__icon">⚠</span><span>Razorpay key missing and dev mock is disabled outside development.</span></Alert>
        )}
        <div className="flex flex-wrap mt-5">
          {orderFailed ? (
            <Button variant="secondary" onClick={handleRetry} loading={orderCreating}>
              Retry order creation
            </Button>
          ) : RAZORPAY_KEY ? (
            <Button
              onClick={() => payWithRazorpay.mutate()}
              loading={payWithRazorpay.isPending || orderCreating || !order}
              disabled={!order}
            >
              Pay {order ? formatPrice(order.price) : ''}
            </Button>
          ) : IS_DEV ? (
            <Button
              onClick={() => payWithDevMock.mutate()}
              loading={payWithDevMock.isPending || orderCreating || !order}
              disabled={!order}
            >
              {orderCreating ? 'Creating order…' : `Pay (dev mock)${order ? ' · ' + formatPrice(order.price) : ''}`}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate('/build')}>Back to builder</Button>
        </div>
      </div>
    </div>
  );
}
