import axios from 'axios';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

function buildPrompt({ meal, availableIngredients, equipment, mood }) {
  const lines = ['Bir kullanıcı için Türkçe yemek tarifi öner.'];

  if (mood.trim().length > 0) {
    lines.push(`Kullanıcının notu: "${mood.trim()}" — bunu göz önünde bulundurarak öneri yap.`);
  }

  if (availableIngredients.trim().length > 0) {
    lines.push(`Evde şu malzemeler var, öncelikli olarak bunları kullan: ${availableIngredients.trim()}`);
  }

  if (equipment.length > 0) {
    lines.push(`Sadece şu ekipmanları kullanabilir: ${equipment.join(', ')}`);
  }

  lines.push(`Öğün: ${meal}`);
  lines.push('');
  lines.push('Her malzeme için "evde" alanını true (evde mevcut) veya false (satın alınacak) olarak belirt. "alisverisListesi" yalnızca evde olmayan malzemeleri içersin.');
  lines.push('Malzemeleri değerlendirirken şu kuralı uygula: tuz, karabiber, kırmızı pul biber, zeytinyağı, ayçiçek yağı, sirke, şeker, un, nişasta gibi temel mutfak staples\'ları kullanıcı belirtmese bile evde var kabul et ve evde: true işaretle. Ancak yumurta, süt, tereyağı, yoğurt, peynir, et, tavuk, sebze, meyve gibi malzemeleri yalnızca kullanıcı açıkça belirttiyse evde: true yap. Kullanıcının belirttiği malzemelerle birebir eşleşmese bile benzer/aynı malzeme ise evde: true say (örneğin kullanıcı "somon" yazdıysa "somon füme" evde var sayılabilir, ama "yumurta" yazdıysa sadece o zaman evde var).');
  lines.push('');
  lines.push('Yanıt olarak sadece JSON ver, başka hiçbir şey yazma:');
  lines.push('');
  lines.push(JSON.stringify({
    tarifAdi: '...',
    malzemeler: [{ isim: '...', miktar: '...', evde: true }],
    yapilis: ['adım 1', 'adım 2'],
    sure: '...',
    zorluk: 'Kolay',
    alisverisListesi: ['sadece eksik malzemeler'],
  }, null, 2));

  return lines.join('\n');
}

export async function generateMealSuggestion(formData) {
  try {
    const response = await axios.post(API_URL, {
      contents: [
        {
          parts: [{ text: buildPrompt(formData) }],
        },
      ],
    });

    const rawText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini API boş yanıt döndürdü.');
    }

    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Gemini yanıtı geçerli bir JSON formatında değil.');
    }
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message ?? err.message;
      throw new Error(`Gemini API hatası (${status}): ${message}`);
    }
    throw err;
  }
}
