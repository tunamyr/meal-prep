import { useState, useEffect } from 'react';
import { generateMealSuggestion, /* generateFoodImage, */ generateSimilarRecipes } from '../utils/geminiApi';

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
  kaloriHedefi: '',
};

function Home() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [copied, setCopied] = useState(false);
  const [similarRecipes, setSimilarRecipes] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tarif-favorileri') ?? '[]'); }
    catch { return []; }
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('tarif-favorileri', JSON.stringify(favorites));
  }, [favorites]);

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  }

  function handleEquipmentToggle(id) {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment, id],
    }));
  }

  async function fetchRecipe({ targetRecipe } = {}) {
    setLoading(true);
    setError('');
    setRecipe(null);
    setSimilarRecipes([]);
    setShowFavorites(false);

    try {
      const result = await generateMealSuggestion({
        meal: form.meal,
        availableIngredients: form.availableIngredients,
        equipment: form.equipment,
        mood: form.mood,
        kaloriHedefi: form.kaloriHedefi,
        targetRecipe,
      });
      setRecipe(result);
      generateSimilarRecipes(result.tarifAdi, form.meal)
        .then((list) => setSimilarRecipes(list))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(name) {
    fetchRecipe({ targetRecipe: name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await fetchRecipe();
  }

  function handleCopy() {
    const text = recipe.alisverisListesi.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleFavorite(rec) {
    setFavorites((prev) =>
      prev.find((f) => f.tarifAdi === rec.tarifAdi)
        ? prev.filter((f) => f.tarifAdi !== rec.tarifAdi)
        : [{ ...rec, _id: Date.now() }, ...prev]
    );
  }

  function loadFavorite(fav) {
    setRecipe(fav);
    setSimilarRecipes([]);
    setShowFavorites(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const isFavorite = recipe && favorites.some((f) => f.tarifAdi === recipe.tarifAdi);

  return (
    <main className="home-container">
      <div className="page-header">
        <h1 className="home-title">Tarif Asistanı</h1>
        <div className="header-actions">
          <button
            className={`fav-toggle-header${showFavorites ? ' active' : ''}`}
            onClick={() => setShowFavorites((v) => !v)}
          >
            ♥ Favoriler {favorites.length > 0 && <span className="fav-count">{favorites.length}</span>}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? 'Açık moda geç' : 'Koyu moda geç'}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Favoriler paneli */}
      {showFavorites ? (
        <div className="favorites-panel">
          {favorites.length === 0 ? (
            <p className="favorites-empty">Henüz favori tarif eklemedin.</p>
          ) : (
            <div className="favorites-grid">
              {favorites.map((fav) => (
                <div key={fav._id} className="fav-card">
                  <button
                    className="fav-delete"
                    onClick={() => setFavorites((p) => p.filter((f) => f._id !== fav._id))}
                    aria-label="Favoriden kaldır"
                  >
                    ×
                  </button>
                  <span className="fav-name">{fav.tarifAdi}</span>
                  <div className="fav-badges">
                    <span className="badge badge-time">{fav.sure}</span>
                    <span className={`badge badge-difficulty badge-${fav.zorluk.toLowerCase()}`}>
                      {fav.zorluk}
                    </span>
                    {fav.makrolar && (
                      <span className="badge badge-time">{fav.makrolar.kalori} kcal</span>
                    )}
                  </div>
                  <button className="fav-load-btn" onClick={() => loadFavorite(fav)}>
                    Tarifi Göster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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

          {/* Kalori hedefi */}
          <div className="form-group">
            <label htmlFor="kaloriHedefi">Kalori Hedefi</label>
            <div className="kalori-input-wrap">
              <input
                id="kaloriHedefi"
                name="kaloriHedefi"
                type="number"
                min="500"
                max="5000"
                step="50"
                placeholder="ör. 800"
                value={form.kaloriHedefi}
                onChange={handleChange}
              />
              <span className="kalori-unit">kcal</span>
            </div>
            <span className="input-hint">Bu öğün için üst sınır — boş bırakılırsa kısıtlama uygulanmaz</span>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Hazırlanıyor...' : 'Tarif Oluştur'}
          </button>
        </form>
      )}

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
          {/* Title + badges + fav button */}
          <div className="recipe-header">
            <div className="recipe-title-row">
              <h2 className="recipe-title">{recipe.tarifAdi}</h2>
              <button
                className={`fav-btn${isFavorite ? ' active' : ''}`}
                onClick={() => toggleFavorite(recipe)}
                aria-label={isFavorite ? 'Favoriden çıkar' : 'Favoriye ekle'}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            </div>
            <div className="recipe-badges">
              <span className="badge badge-time">{recipe.sure}</span>
              <span className={`badge badge-difficulty badge-${recipe.zorluk.toLowerCase()}`}>
                {recipe.zorluk}
              </span>
            </div>
          </div>

          {/* Macros */}
          {recipe.makrolar && (
            <div className="macros-row">
              <div className="macro-card macro-kalori">
                <span className="macro-value">{recipe.makrolar.kalori}</span>
                <span className="macro-label">kcal</span>
              </div>
              <div className="macro-card macro-protein">
                <span className="macro-value">{recipe.makrolar.protein}g</span>
                <span className="macro-label">Protein</span>
              </div>
              <div className="macro-card macro-karb">
                <span className="macro-value">{recipe.makrolar.karb}g</span>
                <span className="macro-label">Karb</span>
              </div>
              <div className="macro-card macro-yag">
                <span className="macro-value">{recipe.makrolar.yag}g</span>
                <span className="macro-label">Yağ</span>
              </div>
            </div>
          )}

          {/* AI food image — geçici olarak devre dışı
          {(imageLoading || imageUrl) && (
            <div className="recipe-image-wrap">
              {imageLoading && <div className="recipe-image-skeleton" />}
              {imageUrl && (
                <img className="recipe-image" src={imageUrl} alt={recipe.tarifAdi} />
              )}
            </div>
          )}
          */}

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

          {/* Re-roll */}
          <div className="reroll-section">
            <button className="reroll-btn" onClick={() => fetchRecipe()} disabled={loading}>
              {loading ? 'Hazırlanıyor...' : 'Beğenmedim, başka öner'}
            </button>
          </div>

          {/* Similar recipes */}
          {similarRecipes.length > 0 && (
            <div className="similar-section">
              <h3 className="section-title">Bunu sevdiysen şunu dene</h3>
              <div className="similar-grid">
                {similarRecipes.map((s, i) => (
                  <button
                    key={i}
                    className="similar-card"
                    onClick={() => handleSuggestionClick(s.isim)}
                    disabled={loading}
                  >
                    <span className="similar-name">{s.isim}</span>
                    <span className="similar-desc">{s.aciklama}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default Home;
