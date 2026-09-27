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
import { ArrowLeft, CheckCircle, Info, ShieldCheck } from 'lucide-react';
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
      if (data?.order) setOrder(data.order);
      else setErr('Server returned an unexpected response. Please retry.');
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not create order');
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
      if (!window.Razorpay) { setErr('Razorpay script failed to load'); return; }
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
      <main className="checkout-wrap">
        <div className="alert alert--error"><span>Missing pizza configuration. Please build your pizza first.</span></div>
        <button className="btn btn--primary" onClick={() => navigate('/build')}>Build your pizza</button>
      </main>
    );
  }

  const byId = (id: string) => catalog.items.find((i) => i.id === id);
  const base = byId(baseId);
  const sauce = byId(sauceId);
  const cheese = byId(cheeseId);
  const vegs = vegIds.map(byId).filter(Boolean);
  const unit = (base?.price ?? 0) + (sauce?.price ?? 0) + (cheese?.price ?? 0) + vegs.reduce((s, v) => s + (v?.price ?? 0), 0);

  const orderCreating = createOrder.isPending;
  const orderFailed = createOrder.isError && !order;

  return (
    <main className="checkout-wrap">
      <header>
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Server recalculates the total — the number below is informational.</p>
      </header>

      {err && <div className="alert alert--error"><Info size={20} /><span>{err}</span></div>}
      {orderFailed && (
        <div className="alert alert--error">
          <Info size={20} />
          <span>
            Could not create order: {err ?? 'Unknown error'}.{' '}
            <button onClick={handleRetry} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </span>
        </div>
      )}

      {/* Order Details Card */}
      <article className="checkout-card">
        <h2 className="card-heading">Custom Pie Configuration</h2>
        <div className="order-row"><span className="order-label">Base</span><span className="order-value">{base?.name ?? '—'}</span></div>
        <div className="order-row"><span className="order-label">Sauce</span><span className="order-value">{sauce?.name ?? '—'}</span></div>
        <div className="order-row"><span className="order-label">Cheese</span><span className="order-value">{cheese?.name ?? '—'}</span></div>
        <div className="order-row"><span className="order-label">Vegetables</span><span className="order-value">{vegs.map((v) => v?.name).join(', ') || '—'}</span></div>
        <div className="order-row"><span className="order-label">Quantity</span><span className="order-value">{quantity}</span></div>
        <div className="order-row"><span className="order-label">Unit price</span><span className="order-value">{formatPrice(unit)}</span></div>
        <hr className="divider" />
        <div className="total-row">
          <span className="total-label">Estimated total</span>
          <span className="total-value">{formatPrice(unit * quantity)}</span>
        </div>
        {order && (
          <p className="server-status-line">
            <span>Server-confirmed total: <strong>{formatPrice(order.price)}</strong></span>
            <span>(status: <span className={`badge badge--${order.paymentStatus}`}>{order.paymentStatus}</span>)</span>
          </p>
        )}
        {orderCreating && (
          <p className="server-status-line"><span className="spinner spinner--sm" /> Creating your order…</p>
        )}
      </article>

      {/* Payment Card */}
      <article className="checkout-card">
        <h2 className="card-heading">Payment</h2>
        {!RAZORPAY_KEY && IS_DEV && (
          <div className="alert alert--info">
            <Info size={20} />
            <div>No Razorpay test key configured. Use the dev mock button below — it mirrors the verify flow server-side without making a real charge. Disabled in production.</div>
          </div>
        )}
        <div className="button-group">
          {orderFailed ? (
            <button className="btn btn--secondary btn--full" onClick={handleRetry} disabled={orderCreating}>
              {orderCreating ? 'Retrying…' : 'Retry order creation'}
            </button>
          ) : RAZORPAY_KEY ? (
            <button className="btn btn--primary btn--full" onClick={() => payWithRazorpay.mutate()} disabled={!order || payWithRazorpay.isPending || orderCreating}>
              <CheckCircle size={18} />
              <span>Pay {order ? formatPrice(order.price) : ''}</span>
            </button>
          ) : IS_DEV ? (
            <button className="btn btn--primary btn--full" onClick={() => payWithDevMock.mutate()} disabled={!order || payWithDevMock.isPending || orderCreating}>
              <CheckCircle size={18} />
              <span>{orderCreating ? 'Creating order…' : `Pay (dev mock) ${order ? formatPrice(order.price) : ''}`}</span>
            </button>
          ) : null}
          <button className="btn btn--ghost btn--full" onClick={() => navigate('/build')}>
            <ArrowLeft size={16} />
            <span>Back to builder</span>
          </button>
        </div>
      </article>
    </main>
  );
}
