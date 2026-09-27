import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

export function HomePage() {
  return (
    <div className="stack--lg">
      <section className="hero">
        <div className="hero__content">
          <h1>Build the pizza you actually want.</h1>
          <p>
            Pick your base, sauce, cheese, and vegetables. Pay in test mode. Track it from kitchen to
            your door in real time.
          </p>
          <div className="hero__actions">
            <Link to="/build"><Button>Build your pizza</Button></Link>
            <Link to="/menu"><Button variant="secondary">Browse the menu</Button></Link>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2 style={{ fontSize: '1.5rem' }}>Fresh ingredients, endless combinations</h2>
          <p>Every pizza is built to order from our catalog of bases, sauces, cheeses, and vegetables.</p>
        </div>
        <div className="ingredient-grid">
          <div className="ingredient-card">
            <div className="ingredient-card__icon" aria-hidden="true">🥖</div>
            <h3>5 Bases</h3>
            <p>Hand-tossed, thin crust, cheese burst, whole wheat, and Sicilian thick.</p>
          </div>
          <div className="ingredient-card">
            <div className="ingredient-card__icon" aria-hidden="true">🍅</div>
            <h3>5 Sauces</h3>
            <p>Tomato, arrabbiata, pesto, white garlic, and smoky BBQ.</p>
          </div>
          <div className="ingredient-card">
            <div className="ingredient-card__icon" aria-hidden="true">🧀</div>
            <h3>4 Cheeses</h3>
            <p>Mozzarella, cheddar, parmesan, and crumbly feta.</p>
          </div>
          <div className="ingredient-card">
            <div className="ingredient-card__icon" aria-hidden="true">🫑</div>
            <h3>8 Vegetables</h3>
            <p>Onion, capsicum, mushroom, olive, corn, jalapeno, tomato, and spinach.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2 style={{ fontSize: '1.5rem' }}>How it works</h2>
        </div>
        <div className="how-it-works">
          <div className="how-step">
            <div className="how-step__icon" aria-hidden="true">🔨</div>
            <div className="how-step__title">Build</div>
            <div className="how-step__desc">Choose your base, sauce, cheese, and vegetables in four quick steps.</div>
          </div>
          <div className="how-step">
            <div className="how-step__icon" aria-hidden="true">💳</div>
            <div className="how-step__title">Pay</div>
            <div className="how-step__desc">Secure test-mode checkout via Razorpay. The server sets the price.</div>
          </div>
          <div className="how-step">
            <div className="how-step__icon" aria-hidden="true">📦</div>
            <div className="how-step__title">Track</div>
            <div className="how-step__desc">Watch your order move from kitchen to delivery in real time.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
