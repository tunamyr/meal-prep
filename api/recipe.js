const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

function buildPrompt({ meal, availableIngredients, equipment, mood, targetRecipe }) {
  const lines = ['Bir kullanıcı için Türkçe yemek tarifi öner.'];

  if (targetRecipe) {
    lines.push(`Önereceğin tarif: "${targetRecipe}". Bu tarifi seç ve tam tarifi ver.`);
  }

  if (mood && mood.trim().length > 0) {
    lines.push(`Kullanıcının notu: "${mood.trim()}" — bunu göz önünde bulundurarak öneri yap.`);
  }

  if (availableIngredients && availableIngredients.trim().length > 0) {
    lines.push(
      `Evdeki malzemeler kullanıcının elinde ne olduğunu gösterir: ${availableIngredients.trim()}. ` +
      'Bunları kullanmak zorunda değilsin — o öğün için en lezzetli ve mantıklı tarifi öner. ' +
      'Eğer birden fazla malzeme birlikte güzel bir yemek oluşturuyorsa kullanabilirsin, ' +
      'ama sırf elimde var diye uyumsuz malzemeleri aynı tarifte birleştirme.'
    );
  }

  if (equipment && equipment.length > 0) {
    lines.push(`Sadece şu ekipmanları kullanabilir: ${equipment.join(', ')}`);
  }

  lines.push(`Öğün: ${meal}`);
  lines.push('');
  lines.push(
    'Her malzeme için "evde" alanını true (evde mevcut) veya false (satın alınacak) olarak belirt. ' +
    '"alisverisListesi" yalnızca evde olmayan malzemeleri içersin.'
  );
  lines.push(
    'Malzemeleri değerlendirirken şu kuralı uygula: tuz, karabiber, kırmızı pul biber, zeytinyağı, ' +
    "ayçiçek yağı, sirke, şeker, un, nişasta gibi temel mutfak staples'ları kullanıcı belirtmese bile " +
    'evde var kabul et ve evde: true işaretle. Ancak yumurta, süt, tereyağı, yoğurt, peynir, et, ' +
    'tavuk, sebze, meyve gibi malzemeleri yalnızca kullanıcı açıkça belirttiyse evde: true yap.'
  );
  lines.push('');
  lines.push('makrolar alanında tarifin tamamı için tahmini değerleri ver (1 porsiyon):');
  lines.push('Yanıt olarak sadece JSON ver, başka hiçbir şey yazma:');
  lines.push('');
  lines.push(JSON.stringify({
    tarifAdi: '...',
    malzemeler: [{ isim: '...', miktar: '...', evde: true }],
    yapilis: ['adım 1', 'adım 2'],
    sure: '...',
    zorluk: 'Kolay',
    alisverisListesi: ['sadece eksik malzemeler'],
    makrolar: { kalori: 0, protein: 0, karb: 0, yag: 0 },
  }, null, 2));

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tanımlı değil.' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(req.body) }] }],
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = data?.error?.message ?? `Gemini hatası (${geminiRes.status})`;
      return res.status(geminiRes.status).json({ error: message });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(500).json({ error: 'Gemini API boş yanıt döndürdü.' });
    }

    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    return res.status(200).json(JSON.parse(cleaned));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
