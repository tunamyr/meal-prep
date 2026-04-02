import { useState } from 'react';
import { generateMealSuggestion, generateFoodImage } from '../utils/geminiApi';

const MEAL_OPTIONS = ['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği'];
const EQUIPMENT_OPTIONS = [
  { id: 'Fırın',             icon: '🔥' },
  { id: 'Tava',              icon: '🍳' },
  { id: 'Tencere',           icon: '🫕' },
  { id: 'Air Fryer',         icon: '💨' },
  { id: 'Düdüklü Tencere',   icon: '♨️' },
  { id: 'Izgara',            icon: '🥩' },
  { id: 'Mikro Dalga',       icon: '📡' },
  { id: 'Wok',               icon: '🥘' },
];

const initialForm = {
  meal: 'Akşam Yemeği',
  availableIngredients: '',
  equipment: [],
  mood: '',
};

function Home() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  }

  function handleEquipmentToggle(id) {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const result = await generateMealSuggestion({
        meal: form.meal,
        availableIngredients: form.availableIngredients,
        equipment: form.equipment,
        mood: form.mood,
      });
      setImageUrl(null);
      setImageLoading(true);
      setRecipe(result);
      generateFoodImage(result.tarifAdi)
        .then((url) => setImageUrl(url))
        .catch(() => {})
        .finally(() => setImageLoading(false));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const text = recipe.alisverisListesi.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="home-container">
      <h1 className="home-title">Tarif Asistanı</h1>

      <form className="meal-form" onSubmit={handleSubmit}>
        {/* Öğün */}
        <div className="form-group">
          <span className="form-label">Öğün</span>
          <div className="radio-group">
            {MEAL_OPTIONS.map((option) => (
              <label key={option} className={`radio-label${form.meal === option ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="meal"
                  value={option}
                  checked={form.meal === option}
                  onChange={handleChange}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        {/* Mutfak ekipmanları */}
        <div className="form-group">
          <span className="form-label">Mutfak Ekipmanları</span>
          <div className="equipment-grid">
            {EQUIPMENT_OPTIONS.map(({ id, icon }) => {
              const selected = form.equipment.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`equipment-card${selected ? ' selected' : ''}`}
                  onClick={() => handleEquipmentToggle(id)}
                  aria-pressed={selected}
                >
                  {selected && <span className="equipment-check">✓</span>}
                  <span className="equipment-icon">{icon}</span>
                  <span className="equipment-label">{id}</span>
                </button>
              );
            })}
          </div>
          <span className="input-hint">Seçilmezse ekipman kısıtlaması uygulanmaz</span>
        </div>

        {/* Evdeki malzemeler */}
        <div className="form-group">
          <label htmlFor="availableIngredients">Evdeki Malzemeler</label>
          <textarea
            id="availableIngredients"
            name="availableIngredients"
            placeholder="ör. yumurta, domates, soğan, zeytinyağı"
            value={form.availableIngredients}
            onChange={handleChange}
            rows={3}
          />
          <span className="input-hint">Virgülle ayırarak yazın</span>
        </div>

        {/* Ruh hali */}
        <div className="form-group">
          <label htmlFor="mood">Bugün nasıl hissediyorsun?</label>
          <textarea
            id="mood"
            name="mood"
            placeholder="Örnek: İşten geldim yorgunum, pratik bir şey istiyorum. Tava kullanmak istemiyorum."
            value={form.mood}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Hazırlanıyor...' : 'Tarif Oluştur'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="status-loading">
          <span className="spinner" />
          Tarif hazırlanıyor...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="status-error">
          <strong>Hata:</strong> {error}
        </div>
      )}

      {/* Recipe result */}
      {recipe && (
        <section className="results">
          {/* Title + badges */}
          <div className="recipe-header">
            <h2 className="recipe-title">{recipe.tarifAdi}</h2>
            <div className="recipe-badges">
              <span className="badge badge-time">{recipe.sure}</span>
              <span className={`badge badge-difficulty badge-${recipe.zorluk.toLowerCase()}`}>
                {recipe.zorluk}
              </span>
            </div>
          </div>

          {/* AI food image */}
          {(imageLoading || imageUrl) && (
            <div className="recipe-image-wrap">
              {imageLoading && <div className="recipe-image-skeleton" />}
              {imageUrl && (
                <img
                  className="recipe-image"
                  src={imageUrl}
                  alt={recipe.tarifAdi}
                />
              )}
            </div>
          )}

          {/* Ingredients */}
          <div className="recipe-section">
            <h3 className="section-title">Malzemeler</h3>
            <ul className="ingredients-list">
              {recipe.malzemeler.map((item, i) => (
                <li key={i} className={`ingredient-item${item.evde ? ' at-home' : ''}`}>
                  <span className="ingredient-name">{item.isim}</span>
                  <span className="ingredient-amount">{item.miktar}</span>
                  {item.evde && <span className="at-home-tag">✓ Evde var</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="recipe-section">
            <h3 className="section-title">Yapılış</h3>
            <ol className="steps-list">
              {recipe.yapilis.map((step, i) => (
                <li key={i} className="step-item">{step}</li>
              ))}
            </ol>
          </div>

          {/* Shopping list */}
          {recipe.alisverisListesi.length > 0 && (
            <div className="shopping-section">
              <div className="shopping-header">
                <h3 className="section-title" style={{ margin: 0 }}>Alışveriş Listesi</h3>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? 'Kopyalandı!' : 'Kopyala'}
                </button>
              </div>
              <ul className="shopping-list">
                {recipe.alisverisListesi.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default Home;
