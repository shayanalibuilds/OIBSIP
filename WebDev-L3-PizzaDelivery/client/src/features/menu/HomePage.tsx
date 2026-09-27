import { Link } from 'react-router-dom';
import { Flame, ArrowRight, ChevronRight, Clock, Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';

export function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <div className="hero-layout">
            <div>
              <div className="hero-badge">
                <Flame size={16} style={{ color: 'var(--primary)' }} />
                Wood-Fired at 900°F • 72-Hour Sourdough
              </div>
              <h1 className="hero-headline" id="hero-title">
                Build the pizza you <em>actually</em> want.
              </h1>
              <p className="hero-subheading">
                Handcraft your pie with slow-fermented organic doughs, San Marzano tomato bases, and
                farm-sourced cheeses. Instant test checkout with real-time oven-to-door tracking.
              </p>
              <div className="hero-actions">
                <Link to="/build" className="btn btn--primary">
                  <span>Build your pizza</span>
                  <ArrowRight size={18} />
                </Link>
                <Link to="/menu" className="btn btn--secondary">
                  <span>Browse the menu</span>
                  <ChevronRight size={18} />
                </Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat-item">
                  <div className="stat-num"><Flame size={18} /> 900°F</div>
                  <div className="stat-label">Bespoke Italian Stone Oven</div>
                </div>
                <div className="hero-stat-item">
                  <div className="stat-num"><Clock size={18} /> 72 hrs</div>
                  <div className="stat-label">Cold Fermentation Period</div>
                </div>
                <div className="hero-stat-item">
                  <div className="stat-num"><Sparkles size={18} /> 100%</div>
                  <div className="stat-label">Non-GMO Heirloom Flours</div>
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lift)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtxVhUIukZTDhmW5w-CN0bvc-EPR1gQJLuMBWYXM0sC9_8XaRHgHCRqTjsPi6ip7i5dzos8IDa3xI4laicMdm_bPxZWoZjS3zOm8Q2y-7IIHeoLmvrOx85Y7W4YYpVLpjeEGlh_gVTJosRKOrXi6gTb5GzJ1IfmG8vAZqInMqDWdWVmx9OQV9aBuHRZfsoqXeZGiXR4lHuj0yixCBcjbV_YS3yQN-idyBLEiWqxZv3ts3TqdsA1JRF"
                alt="Artisanal wood-fired sourdough pizza"
                style={{ width: '100%', height: 480, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 20, left: 20, right: 20,
                background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(234,221,207,0.8)', borderRadius: 'var(--radius-md)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Margherita Autentica</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>San Marzano D.O.P. • Fior di Latte • Sweet Basil</div>
                </div>
                <div style={{ background: 'var(--color-basil-soft)', color: 'var(--color-basil)', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> In Oven Now
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="trust-bar" aria-label="Kitchen standards">
        <div className="container">
          <div className="trust-items">
            <div className="trust-item"><Flame size={18} /><span>Beechwood &amp; Oak Hand-Fired</span></div>
            <div className="trust-item"><Clock size={18} /><span>90-Second Rapid Flash Bake</span></div>
            <div className="trust-item"><CheckCircle size={18} /><span>Zero Preservatives or Additives</span></div>
            <div className="trust-item"><ShieldCheck size={18} /><span>Temperature-Preserved Delivery</span></div>
          </div>
        </div>
      </section>

      {/* Ingredient Pantry Section */}
      <section style={{ padding: '72px 0 84px', background: 'var(--bg-warm-tint)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow"><ShieldCheck size={14} /> Pantry &amp; Provenance</span>
            <h2 className="section-title-lg">Fresh, Uncompromising Components</h2>
            <p className="section-subtitle">
              Every layer of your custom pizza is prepared from scratch every morning in our open prep kitchen.
            </p>
          </div>
          <div className="ingredient-grid-home">
            <article className="ingredient-card-home">
              <span className="ingredient-tag" style={{ color: 'var(--color-crust)' }}>Crust Foundations</span>
              <div className="ingredient-icon-wrap">🥖</div>
              <h3 className="ingredient-title">5 Bases</h3>
              <p className="ingredient-desc">Classic Hand Tossed, Thin Crust, Cheese Burst, Whole Wheat, and Sicilian Thick.</p>
            </article>
            <article className="ingredient-card-home">
              <span className="ingredient-tag" style={{ color: 'var(--primary)' }}>Handmade Sauces</span>
              <div className="ingredient-icon-wrap" style={{ background: '#FCECE8' }}>🍅</div>
              <h3 className="ingredient-title">5 Sauces</h3>
              <p className="ingredient-desc">Classic Tomato, Spicy Arrabbiata, Pesto, White Garlic, and smoky BBQ.</p>
            </article>
            <article className="ingredient-card-home">
              <span className="ingredient-tag" style={{ color: 'var(--accent)' }}>Artisan Dairy</span>
              <div className="ingredient-icon-wrap" style={{ background: '#FEF5E7' }}>🧀</div>
              <h3 className="ingredient-title">4 Cheeses</h3>
              <p className="ingredient-desc">Mozzarella, Cheddar, Parmesan, and crumbly Feta.</p>
            </article>
            <article className="ingredient-card-home">
              <span className="ingredient-tag" style={{ color: 'var(--color-basil)' }}>Market Produce</span>
              <div className="ingredient-icon-wrap" style={{ background: 'var(--color-basil-soft)' }}>🫑</div>
              <h3 className="ingredient-title">8 Vegetables</h3>
              <p className="ingredient-desc">Onion, Capsicum, Mushroom, Olive, Sweet Corn, Jalapeno, Tomato, and Spinach.</p>
            </article>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow"><Clock size={14} /> Simple &amp; Transparent Flow</span>
            <h2 className="section-title-lg">How It Works: Craft to Door</h2>
            <p className="section-subtitle">
              An intuitive digital experience designed to get piping-hot artisanal pizza into your hands without friction.
            </p>
          </div>
          <div className="flow-wrapper">
            <div className="step-item">
              <span className="step-badge">Step 1</span>
              <div className="step-img-icon">🔨</div>
              <h3 className="step-title">1. Build</h3>
              <p className="step-desc">Select dough, layer signature sauces, pick farm-fresh cheeses, and curate premium toppings with live pricing.</p>
            </div>
            <div className="step-divider-arrow"><ArrowRight size={28} /></div>
            <div className="step-item">
              <span className="step-badge">Step 2</span>
              <div className="step-img-icon">💳</div>
              <h3 className="step-title">2. Pay</h3>
              <p className="step-desc">Check out friction-free with instant test-mode sandboxing. Transparent itemized receipts, zero hidden fees.</p>
            </div>
            <div className="step-divider-arrow"><ArrowRight size={28} /></div>
            <div className="step-item">
              <span className="step-badge">Step 3</span>
              <div className="step-img-icon">📦</div>
              <h3 className="step-title">3. Track</h3>
              <p className="step-desc">Follow your pie from dough stretch to 900°F oven blister, packaging, and live courier geolocation to your doorstep.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Craft Banner */}
      <section className="craft-banner">
        <div className="container">
          <div className="craft-banner-inner">
            <div className="craft-content">
              <div className="craft-eyebrow"><Sparkles size={14} /> The Ovenly Standard</div>
              <h2 className="craft-title">Ready to experience real wood-fired pizza?</h2>
              <p className="craft-desc">
                Every pie is made to order in under 2 minutes of bake time at blistering temperature. Try our custom interactive builder now.
              </p>
            </div>
            <div>
              <Link to="/build" className="btn btn--primary" style={{ background: 'var(--accent)', color: 'var(--text)', fontWeight: 700 }}>
                <span>Start Custom Pizza</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
