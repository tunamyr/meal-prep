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

const SURE_OPTIONS = [
  { label: 'Fark etmez', value: '' },
  { label: '15 dk',      value: '15' },
  { label: '30 dk',      value: '30' },
  { label: '45 dk',      value: '45' },
  { label: '60 dk',      value: '60' },
];

const ZORLUK_OPTIONS = [
  { label: 'Fark etmez', value: '' },
  { label: 'Kolay',      value: 'Kolay' },
  { label: 'Orta',       value: 'Orta' },
  { label: 'Zor',        value: 'Zor' },
];

const HISTORY_KEY = 'tarif-gecmisi';
const MAX_HISTORY  = 15;

const initialForm = {
  meal: 'Akşam Yemeği',
  availableIngredients: '',
  equipment: [],
  mood: '',
  kaloriHedefi: '',
  maxSure: '',
  zorlukFiltresi: '',
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

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
    catch { return []; }
  });

  const [showHistory, setShowHistory] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [draftNote, setDraftNote] = useState('');

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

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

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
    setShowHistory(false);

    try {
      const result = await generateMealSuggestion({
        meal: form.meal,
        availableIngredients: form.availableIngredients,
        equipment: form.equipment,
        mood: form.mood,
        kaloriHedefi: form.kaloriHedefi,
        maxSure: form.maxSure,
        zorlukFiltresi: form.zorlukFiltresi,
        targetRecipe,
      });
      setRecipe(result);
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.tarifAdi !== result.tarifAdi);
        return [{ ...result, _hid: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      });
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

  function updateNote(_id, note) {
    setFavorites((prev) =>
      prev.map((f) => (f._id === _id ? { ...f, note } : f))
    );
    setEditingNoteId(null);
    setDraftNote('');
  }

  function startEditingNote(fav) {
    setEditingNoteId(fav._id);
    setDraftNote(fav.note ?? '');
  }

  function cancelEditingNote() {
    setEditingNoteId(null);
    setDraftNote('');
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
            className={`fav-toggle-header${showHistory ? ' active' : ''}`}
            onClick={() => { setShowHistory((v) => !v); setShowFavorites(false); }}
          >
            ⏱ Geçmiş {history.length > 0 && <span className="fav-count">{history.length}</span>}
          </button>
          <button
            className={`fav-toggle-header${showFavorites ? ' active' : ''}`}
            onClick={() => { setShowFavorites((v) => !v); setShowHistory(false); }}
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

      {/* Geçmiş paneli */}
      {showHistory && (
        <div className="favorites-panel">
          {history.length === 0 ? (
            <p className="favorites-empty">Henüz bir tarif oluşturmadın.</p>
          ) : (
            <>
              <div className="history-header-row">
                <span className="history-count">{history.length} tarif</span>
                <button
                  className="history-clear-btn"
                  onClick={() => setHistory([])}
                >
                  Geçmişi temizle
                </button>
              </div>
              <div className="favorites-grid">
                {history.map((h) => (
                  <div key={h._hid} className="fav-card">
                    <button
                      className="fav-delete"
                      onClick={() => setHistory((p) => p.filter((x) => x._hid !== h._hid))}
                      aria-label="Geçmişten sil"
                    >
                      ×
                    </button>
                    <span className="fav-name">{h.tarifAdi}</span>
                    <div className="fav-badges">
                      <span className="badge badge-time">{h.sure}</span>
                      <span className={`badge badge-difficulty badge-${h.zorluk.toLowerCase()}`}>
                        {h.zorluk}
                      </span>
                      {h.makrolar && (
                        <span className="badge badge-time">{h.makrolar.kalori} kcal</span>
                      )}
                    </div>
                    <button className="fav-load-btn" onClick={() => { setRecipe(h); setSimilarRecipes([]); setShowHistory(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Tarifi Göster
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
                  {editingNoteId === fav._id ? (
                    <div className="fav-note-edit">
                      <textarea
                        className="fav-note-textarea"
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="Notunuzu yazın..."
                        rows={3}
                        maxLength={300}
                        autoFocus
                      />
                      <div className="fav-note-actions">
                        <button
                          className="fav-note-save"
                          onClick={() => updateNote(fav._id, draftNote)}
                        >
                          Kaydet
                        </button>
                        <button
                          className="fav-note-cancel"
                          onClick={cancelEditingNote}
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {fav.note && (
                        <p className="fav-note-text">{fav.note}</p>
                      )}
                      <button
                        className="fav-note-btn"
                        onClick={() => startEditingNote(fav)}
                      >
                        {fav.note ? '✏ Notu düzenle' : '+ Not ekle'}
                      </button>
                    </>
                  )}
                  <button className="fav-load-btn" onClick={() => loadFavorite(fav)}>
                    Tarifi Göster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !showHistory ? (
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
            <div className="label-row">
              <label htmlFor="availableIngredients">Evdeki Malzemeler</label>
              <span className={`char-count${form.availableIngredients.length >= 360 ? ' char-count-warn' : ''}`}>
                {form.availableIngredients.length}/400
              </span>
            </div>
            <textarea
              id="availableIngredients"
              name="availableIngredients"
              placeholder="ör. yumurta, domates, soğan, zeytinyağı"
              value={form.availableIngredients}
              onChange={handleChange}
              rows={3}
              maxLength={400}
            />
            <span className="input-hint">Virgülle ayırarak yazın</span>
          </div>

          {/* Ruh hali */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="mood">Bugün nasıl hissediyorsun?</label>
              <span className={`char-count${form.mood.length >= 270 ? ' char-count-warn' : ''}`}>
                {form.mood.length}/300
              </span>
            </div>
            <textarea
              id="mood"
              name="mood"
              placeholder="Örnek: İşten geldim yorgunum, pratik bir şey istiyorum. Tava kullanmak istemiyorum."
              value={form.mood}
              onChange={handleChange}
              rows={3}
              maxLength={300}
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

          {/* Süre filtresi */}
          <div className="form-group">
            <span className="form-label">En fazla süre</span>
            <div className="radio-group">
              {SURE_OPTIONS.map(({ label, value }) => (
                <label key={value} className={`radio-label${form.maxSure === value ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="maxSure"
                    value={value}
                    checked={form.maxSure === value}
                    onChange={handleChange}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Zorluk filtresi */}
          <div className="form-group">
            <span className="form-label">Zorluk</span>
            <div className="radio-group">
              {ZORLUK_OPTIONS.map(({ label, value }) => (
                <label key={value} className={`radio-label${form.zorlukFiltresi === value ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="zorlukFiltresi"
                    value={value}
                    checked={form.zorlukFiltresi === value}
                    onChange={handleChange}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Hazırlanıyor...' : 'Tarif Oluştur'}
          </button>
        </form>
      ) : null}

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
