export async function polishTextClient(text: string, locale?: string): Promise<string> {
  const normalizedText = text.trim();
  if (normalizedText.length < 3) return normalizedText;

  try {
    const res = await fetch('/api/ai/polish-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalizedText, locale }),
    });

    if (!res.ok) return normalizedText;

    const data = await res.json();
    if (typeof data.polished === 'string' && data.polished.trim()) {
      return data.polished.trim();
    }

    return normalizedText;
  } catch {
    return normalizedText;
  }
}