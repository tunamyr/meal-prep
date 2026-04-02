const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tanımlı değil.' });
  }

  const { recipeName, meal } = req.body;
  const prompt = [
    `"${recipeName}" tarifini beğenen biri için ${meal} öğününe uygun 3 farklı tarif öner.`,
    'Yanıt olarak sadece JSON dizi ver, başka hiçbir şey yazma:',
    JSON.stringify([{ isim: '...', aciklama: 'tek cümle açıklama' }], null, 2),
  ].join('\n');

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = data?.error?.message ?? `Gemini hatası (${geminiRes.status})`;
      return res.status(geminiRes.status).json({ error: message });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
