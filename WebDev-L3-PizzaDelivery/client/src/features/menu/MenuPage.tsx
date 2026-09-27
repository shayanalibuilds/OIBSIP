import { useQuery } from '@tanstack/react-query';
import { apiCatalog, type CatalogItem } from '../../shared/lib/api';
import { LoadingState, EmptyState } from '../../shared/ui/States';

const CATEGORY_LABEL: Record<CatalogItem['category'], string> = {
  base: 'Bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  vegetable: 'Vegetables',
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
    <div className="stack">
      <div>
        <h1 className="text-2xl font-bold mb-2">Menu</h1>
        <p className="muted">All ingredients are priced per pizza. Build your own from /build.</p>
      </div>
      {(['base', 'sauce', 'cheese', 'vegetable'] as const).map((cat) => (
        <section key={cat}>
          <h2 className="text-xl font-semibold mb-3">{CATEGORY_LABEL[cat]}</h2>
          <div className="grid grid--catalog">
            {(byCat[cat] ?? []).map((it) => (
              <article key={it.id} className="card">
                <h3 className="font-semibold">{it.name}</h3>
                <div className="muted text-sm">{it.slug}</div>
                <div className="flex-between mt-4">
                  <span className="font-bold">{formatPrice(it.price)}</span>
                  {it.stock <= it.lowStockThreshold ? (
                    <span className="badge badge--low">Low stock</span>
                  ) : (
                    <span className="muted text-sm">{it.stock} in stock</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
