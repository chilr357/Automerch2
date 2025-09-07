import { GoogleGenAI, Modality } from "@google/genai";

type Scenario = 'fashion_ad' | 'modern_chic' | 'studio_flatlay' | 'outdoor_lifestyle' | 'minimal_product_card';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

const SCENARIO_PROMPTS: Record<Scenario, string> = {
  fashion_ad: 'Create an elegant fashion ad layout with soft studio lighting, subtle shadows, and tasteful negative space. Place the product photo as the hero image on a clean background, with refined styling cues (no text).',
  modern_chic: 'Compose a modern chic ad: muted tones, high-contrast soft shadows, and a minimal interior environment (clean wall, subtle floor). Place the product photo naturally. No text, no logos.',
  studio_flatlay: 'Design a premium studio flat-lay scene with neutral paper backdrop and gentle top-lighting. Position the product photo centered with realistic shadow casting. No text.',
  outdoor_lifestyle: 'Generate an outdoor lifestyle scene (urban sidewalk or cafe table) with natural light. Place the product photo as if photographed in that context. Keep it realistic, no extra branding.',
  minimal_product_card: 'Create a minimal product card layout: soft gradient background, subtle rim-light, centered product photo with realistic shadow. No text elements.',
};

const buildPrompt = (scenario: Scenario) =>
  `${SCENARIO_PROMPTS[scenario]}
Rules:
- Do not add text or watermarks.
- Maintain the original product colors and proportions.
- Output only the composed image.`;

export async function generateAdfusionMockup(productImageUrl: string, scenario: Scenario): Promise<string> {
  if (!ai) throw new Error('Gemini API key not configured');
  // Fetch product image to inlineData
  const res = await fetch(productImageUrl);
  if (!res.ok) throw new Error('Failed to fetch product image');
  const blob = await res.blob();
  const b64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const [, data] = dataUrl.split(',');
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const prompt = buildPrompt(scenario);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: blob.type || 'image/png', data: b64 } },
        { text: prompt },
      ],
    },
    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if ((part as any).inlineData) {
      const id = (part as any).inlineData;
      const mime = id.mimeType || 'image/png';
      return `data:${mime};base64,${id.data}`;
    }
  }
  throw new Error('No image returned for adfusion mockup');
}

export async function generateAdfusionBatch(productImageUrl: string): Promise<string[]> {
  const scenarios: Scenario[] = ['fashion_ad', 'modern_chic', 'studio_flatlay', 'outdoor_lifestyle', 'minimal_product_card'];
  const results: string[] = [];
  for (const s of scenarios) {
    try { results.push(await generateAdfusionMockup(productImageUrl, s)); } catch (e) { console.warn('adfusion fail', s, e); }
  }
  return results;
}


