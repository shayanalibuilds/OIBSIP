import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiCatalog, type CatalogItem } from '../../shared/lib/api';
import { LoadingState, EmptyState } from '../../shared/ui/States';
import { AlertTriangle } from 'lucide-react';

const CATEGORY_LABEL: Record<CatalogItem['category'], string> = {
  base: 'Bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  vegetable: 'Vegetables',
};

const CATEGORY_ICON: Record<CatalogItem['category'], string> = {
  base: '🥖',
  sauce: '🍅',
  cheese: '🧀',
  vegetable: '🫑',
};

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

export function MenuPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: apiCatalog.list,
  });

  if (isLoading) return <LoadingState label="Loading menu…" />;
  if (error) return <EmptyState title="Could not load menu" hint={(error as Error).message} />;
  if (!data || data.items.length === 0) return <EmptyState title="No items available" />;

  const byCat = data.items.reduce<Record<string, CatalogItem[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});

  return (
    <main>
      <header style={{ maxWidth: 1200, margin: '48px auto 36px', padding: '0 24px' }}>
        <h1 className="page-title">Menu</h1>
        <p className="page-subtitle">All ingredients are priced per pizza. Build your own from <Link to="/build">/build</Link>.</p>
      </header>

      <div className="menu-container">
        {(['base', 'sauce', 'cheese', 'vegetable'] as const).map((cat) => (
          <section key={cat} aria-labelledby={`section-${cat}`}>
            <div className="section-title-row">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{CATEGORY_ICON[cat]}</span>
                {CATEGORY_LABEL[cat]}
              </h2>
              <span className="section-badge">{(byCat[cat] ?? []).length} Options</span>
            </div>
            <div className="grid grid--catalog">
              {(byCat[cat] ?? []).map((it) => (
                <article key={it.id} className="menu-card">
                  <div className="menu-card__header">
                    <h3 className="menu-card__name">{it.name}</h3>
                    <p className="menu-card__slug">{it.slug}</p>
                  </div>
                  <div className="menu-card__footer">
                    <span className="menu-card__price">{formatPrice(it.price)}</span>
                    {it.stock <= it.lowStockThreshold ? (
                      <span className="stock-badge low">
                        <AlertTriangle size={12} />
                        Low stock
                      </span>
                    ) : (
                      <span className="stock-badge normal">{it.stock} in stock</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
