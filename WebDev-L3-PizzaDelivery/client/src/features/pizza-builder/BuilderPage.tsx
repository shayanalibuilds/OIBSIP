import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiCatalog, type CatalogItem } from '../../shared/lib/api';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';
import { LoadingState, EmptyState } from '../../shared/ui/States';

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = ['Base', 'Sauce', 'Cheese', 'Vegetables', 'Summary'];

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
      className="builder-card"
    >
      <div className="flex-between">
        <span className="builder-card__name">{item.name}</span>
        {selected && <span className="builder-card__check" aria-hidden="true">✓</span>}
      </div>
      <div className="builder-card__slug">{item.slug}</div>
      <div className="builder-card__footer">
        <span className="builder-card__price">{formatPrice(item.price)}</span>
        {item.stock <= item.lowStockThreshold ? (
          <span className="badge badge--low">Low stock</span>
        ) : (
          <span className="text-sm subtle">{multi ? 'pick many' : 'pick one'}</span>
        )}
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
  const [submitErr, setSubmitErr] = useState<string | null>(null);

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
    if (!base || !sauce || !cheese) {
      setSubmitErr('Pick a base, sauce, and cheese first.');
      return;
    }
    setSubmitErr(null);
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
    <div className="stack--lg">
      <div className="section-header">
        <h1>Build your pizza</h1>
        <p>Four steps. The server prices your pizza — never trust client totals.</p>
      </div>

      <ol className="steps" aria-label="Builder steps">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            className={`step${i === step ? ' step--active' : i < step ? ' step--done' : ''}`}
          >
            <span className="step__num">{i < step ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section aria-label="Choose a base">
          <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-4)' }}>Pick your base</h2>
          <div className="grid grid--catalog">
            {items.filter((i) => i.category === 'base').map((it) => (
              <ItemCard key={it.id} item={it} selected={baseId === it.id} onToggle={() => setBaseId(it.id)} />
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-label="Choose a sauce">
          <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-4)' }}>Pick your sauce</h2>
          <div className="grid grid--catalog">
            {items.filter((i) => i.category === 'sauce').map((it) => (
              <ItemCard key={it.id} item={it} selected={sauceId === it.id} onToggle={() => setSauceId(it.id)} />
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-label="Choose a cheese">
          <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-4)' }}>Pick your cheese</h2>
          <div className="grid grid--catalog">
            {items.filter((i) => i.category === 'cheese').map((it) => (
              <ItemCard key={it.id} item={it} selected={cheeseId === it.id} onToggle={() => setCheeseId(it.id)} />
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-label="Choose vegetables">
          <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-4)' }}>Pick your vegetables (up to 8)</h2>
          <div className="grid grid--catalog">
            {items.filter((i) => i.category === 'vegetable').map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                multi
                selected={vegIds.includes(it.id)}
                onToggle={() => toggleVeg(it.id)}
              />
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section aria-label="Order summary">
          <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-4)' }}>Summary</h2>
          <div className="card" style={{ maxWidth: 480 }}>
            <div className="detail-row">
              <span className="detail-row__label">Base</span>
              <span className="detail-row__value">{base?.name ?? '—'} {base ? `· ${formatPrice(base.price)}` : ''}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Sauce</span>
              <span className="detail-row__value">{sauce?.name ?? '—'} {sauce ? `· ${formatPrice(sauce.price)}` : ''}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Cheese</span>
              <span className="detail-row__value">{cheese?.name ?? '—'} {cheese ? `· ${formatPrice(cheese.price)}` : ''}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Vegetables ({vegs.length})</span>
              <span className="detail-row__value">{vegs.map((v) => v.name).join(', ') || '—'}</span>
            </div>
            <div className="detail-row">
              <label htmlFor="qty" style={{ textTransform: 'none', letterSpacing: '0', marginBottom: 0 }}>Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{ width: 80 }}
              />
            </div>
            <div className="detail-row detail-row--total">
              <span className="detail-row__label">Total (server-confirmed at checkout)</span>
              <span className="detail-row__value">{formatPrice(totalPriceMinor / 100)}</span>
            </div>
          </div>
        </section>
      )}

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      <div className="flex-between">
        <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
        {step < 4 ? (
          <Button onClick={next} disabled={!canNext}>Next</Button>
        ) : (
          <Button onClick={handleCheckout}>Proceed to checkout</Button>
        )}
      </div>
    </div>
  );
}
