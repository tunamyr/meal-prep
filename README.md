# 🍳 Tarif Asistanı

Yapay zeka destekli, kişisel tarif öneri uygulaması. Evdeki malzemeleri, mutfak ekipmanlarını ve o anki ruh halini analiz ederek sana özel yemek tarifleri oluşturur.

## Özellikler

- **Öğün seçimi** — Kahvaltı, Öğle veya Akşam yemeği için ayrı ayrı tarif önerisi
- **Evdeki malzemeler** — Elindeki malzemeleri gir, tarif onları öncelikli kullansın
- **Mutfak ekipmanları** — Sadece sahip olduğun ekipmanlarla yapılabilecek tarifler
- **Ruh hali girişi** — "Yorgunum, pratik bir şey istiyorum" gibi serbest metin destekli akıllı öneri
- **Akıllı stok tahmini** — Tuz, yağ, baharat gibi temel malzemeler otomatik olarak evde kabul edilir
- **Alışveriş listesi** — Eksik malzemeleri tek tıkla panoya kopyala

## Teknolojiler

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Gemini API](https://ai.google.dev/) (`gemini-2.5-flash-lite`)
- [Axios](https://axios-http.com/)
- Vanilla CSS

## Kurulum

### 1. Repoyu klonla

```bash
git clone https://github.com/tunamyr/meal-planner.git
cd meal-planner
```

### 2. Bağımlılıkları yükle

```bash
npm install
```

### 3. API anahtarını ayarla

Proje kök dizininde bir `.env` dosyası oluştur:

```env
VITE_GEMINI_API_KEY=senin_api_anahtarin
```

> Gemini API anahtarı almak için: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 4. Geliştirme sunucusunu başlat

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

## Proje Yapısı

```
src/
├── components/        # Yeniden kullanılabilir bileşenler
├── pages/
│   └── Home.jsx       # Ana sayfa — form ve tarif sonucu
├── utils/
│   └── geminiApi.js   # Gemini API entegrasyonu
├── App.jsx
├── main.jsx
└── index.css
```

## Kullanım

1. Öğün türünü seç (Kahvaltı / Öğle / Akşam)
2. Varsa evdeki malzemeleri virgülle ayırarak yaz
3. Sahip olduğun mutfak ekipmanlarını seç
4. İstersen ruh halini veya özel isteğini yaz
5. **Tarif Oluştur** butonuna bas
