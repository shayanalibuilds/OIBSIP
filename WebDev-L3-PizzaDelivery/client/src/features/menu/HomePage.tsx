import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

export function HomePage() {
  return (
    <div className="stack">
      <section className="card" style={{ background: 'var(--color-primary-soft)' }}>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
          Build the pizza you actually want.
        </h1>
        <p className="mt-2">
          Pick your base, sauce, cheese, and vegetables. Pay in test mode. Track it from kitchen to your door
          in real time.
        </p>
        <div className="flex mt-4">
          <Link to="/build"><Button>Build your pizza</Button></Link>
          <Link to="/menu"><Button variant="secondary">Browse the menu</Button></Link>
        </div>
      </section>
      <section className="grid grid--catalog">
        <div className="card">
          <h3 className="font-semibold">5 bases</h3>
          <p className="muted text-sm mt-2">Hand-tossed, thin crust, cheese burst, whole wheat, Sicilian.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold">5 sauces</h3>
          <p className="muted text-sm mt-2">Tomato, arrabbiata, pesto, white garlic, BBQ.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold">4 cheeses</h3>
          <p className="muted text-sm mt-2">Mozzarella, cheddar, parmesan, feta.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold">8 vegetables</h3>
          <p className="muted text-sm mt-2">Onion, capsicum, mushroom, olive, corn, jalapeno, tomato, spinach.</p>
        </div>
      </section>
    </div>
  );
}
