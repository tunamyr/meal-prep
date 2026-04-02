async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `Sunucu hatası (${res.status})`);
  }

  return data;
}

export async function generateMealSuggestion(formData) {
  return post('/api/recipe', formData);
}

export async function generateSimilarRecipes(recipeName, meal) {
  return post('/api/similar', { recipeName, meal });
}

export async function generateFoodImage(recipeName) {
  const { dataUrl } = await post('/api/image', { recipeName });
  return dataUrl;
}

