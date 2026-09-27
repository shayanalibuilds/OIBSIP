import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiCatalog, type CatalogItem } from '../../shared/lib/api';
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { LoadingState, EmptyState } from '../../shared/ui/States';

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = ['Base', 'Sauce', 'Cheese', 'Vegetables', 'Summary'];
const STEP_HINTS = [
  'Choose 1 of 5 crust foundations',
  'Choose 1 of 5 signature sauces',
  'Choose 1 of 4 artisan cheeses',
  'Pick up to 8 garden vegetables',
  'Review and proceed to checkout',
];

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

function ItemCard({
  item,
  selected,
  onToggle,
  multi,
}: {
  item: CatalogItem;
  selected: boolean;
  onToggle: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`option-card-btn${selected ? ' selected' : ''}`}
    >
      <div className="card-top">
        <div>
          <h3 className="card-title">{item.name}</h3>
          <p className="card-slug">{item.slug}</p>
        </div>
        <div className="check-indicator" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </div>
      </div>
      <div className="card-bot">
        <span className="card-price">{formatPrice(item.price)}</span>
        <span className="pick-hint">
          {selected ? (
            <><CheckCircle2 size={14} /> Selected</>
          ) : multi ? (
            'pick many'
          ) : (
            'pick one'
          )}
        </span>
      </div>
    </button>
  );
}

export function BuilderPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: apiCatalog.list,
  });

  const [step, setStep] = useState<Step>(0);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [sauceId, setSauceId] = useState<string | null>(null);
  const [cheeseId, setCheeseId] = useState<string | null>(null);
  const [vegIds, setVegIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const items = useMemo(() => data?.items ?? [], [data]);

  const byId = useMemo(() => {
    const m: Record<string, CatalogItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  if (isLoading) return <LoadingState label="Loading ingredients…" />;
  if (error) return <EmptyState title="Could not load ingredients" hint={(error as Error).message} />;
  if (items.length === 0) return <EmptyState title="No ingredients available" />;

  const base = baseId ? byId[baseId] : null;
  const sauce = sauceId ? byId[sauceId] : null;
  const cheese = cheeseId ? byId[cheeseId] : null;
  const vegs = vegIds.map((id) => byId[id]).filter(Boolean) as CatalogItem[];

  const unitPriceMinor =
    (base?.priceMinor ?? 0) +
    (sauce?.priceMinor ?? 0) +
    (cheese?.priceMinor ?? 0) +
    vegs.reduce((s, v) => s + v.priceMinor, 0);
  const totalPriceMinor = unitPriceMinor * quantity;

  const canNext =
    (step === 0 && base) ||
    (step === 1 && sauce) ||
    (step === 2 && cheese) ||
    step === 3 ||
    step === 4;

  const next = () => setStep((s) => Math.min(4, s + 1) as Step);
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const toggleVeg = (id: string) => {
    setVegIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 8 ? cur : [...cur, id]));
  };

  const handleCheckout = () => {
    if (!base || !sauce || !cheese) return;
    const params = new URLSearchParams({
      baseId: base.id,
      sauceId: sauce.id,
      cheeseId: cheese.id,
      vegetableIds: vegIds.join(','),
      quantity: String(quantity),
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <main style={{ maxWidth: 900, width: '100%', margin: '40px auto 60px', padding: '0 24px', flex: 1 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="page-title">Build your pizza</h1>
        <p className="page-subtitle">Four steps. Server prices your pizza — never trust client totals.</p>
      </header>

      {/* Step Indicator */}
      <nav className="step-indicator" aria-label="Pizza builder steps">
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: i === 4 ? '0 0 auto' : '1' }}>
            <div className={`step-pill${i === step ? ' active' : i < step ? ' done' : ''}`}>
              <span className="num-circle">{i < step ? '✓' : i + 1}</span>
              <span>{label}</span>
            </div>
            {i < 4 && <div className="step-divider"></div>}
          </div>
        ))}
      </nav>

      {/* Step Content */}
      <section className="step-card-box" aria-labelledby="step-title">
        <div className="step-heading">
          <h2 id="step-title">
            {step === 0 && 'Pick your base'}
            {step === 1 && 'Pick your sauce'}
            {step === 2 && 'Pick your cheese'}
            {step === 3 && 'Pick your vegetables'}
            {step === 4 && 'Summary'}
          </h2>
          <span className="step-hint-badge">{STEP_HINTS[step]}</span>
        </div>

        {step < 4 && (
          <div className="option-grid" role="radiogroup">
            {items.filter((i) => i.category === ['base', 'sauce', 'cheese', 'vegetable'][step]).map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                multi={step === 3}
                selected={
                  step === 0 ? baseId === it.id :
                  step === 1 ? sauceId === it.id :
                  step === 2 ? cheeseId === it.id :
                  vegIds.includes(it.id)
                }
                onToggle={() => {
                  if (step === 0) setBaseId(it.id);
                  else if (step === 1) setSauceId(it.id);
                  else if (step === 2) setCheeseId(it.id);
                  else toggleVeg(it.id);
                }}
              />
            ))}
          </div>
        )}

        {step === 4 && (
          <div style={{ maxWidth: 480 }}>
            <div className="order-row">
              <span className="order-label">Base</span>
              <span className="order-value">{base?.name ?? '—'} {base ? `· ${formatPrice(base.price)}` : ''}</span>
            </div>
            <div className="order-row">
              <span className="order-label">Sauce</span>
              <span className="order-value">{sauce?.name ?? '—'} {sauce ? `· ${formatPrice(sauce.price)}` : ''}</span>
            </div>
            <div className="order-row">
              <span className="order-label">Cheese</span>
              <span className="order-value">{cheese?.name ?? '—'} {cheese ? `· ${formatPrice(cheese.price)}` : ''}</span>
            </div>
            <div className="order-row">
              <span className="order-label">Vegetables ({vegs.length})</span>
              <span className="order-value">{vegs.map((v) => v.name).join(', ') || '—'}</span>
            </div>
            <div className="order-row">
              <span className="order-label">Quantity</span>
              <input
                type="number" min={1} max={20} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{ width: 80 }}
              />
            </div>
            <hr className="divider" />
            <div className="total-row">
              <span className="total-label">Total (server-confirmed at checkout)</span>
              <span className="total-value">{formatPrice(totalPriceMinor / 100)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Navigation */}
      <footer className="builder-bottom-nav">
        <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        {step < 4 ? (
          <button type="button" className="btn btn--primary" onClick={next} disabled={!canNext}>
            <span>Next: {STEP_LABELS[step + 1]}</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={handleCheckout}>
            <span>Proceed to checkout</span>
            <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}
