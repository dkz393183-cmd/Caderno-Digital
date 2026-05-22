export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { system, messages } = req.body;

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : m.content.filter(b => b.type === 'text').map(b => b.text).join('\n') }]
    }));

    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gemini error', detail: data });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';

    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
