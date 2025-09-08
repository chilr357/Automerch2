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

async function generateFromPrompt(productImageUrl: string, textPrompt: string): Promise<string> {
  if (!ai) throw new Error('Gemini API key not configured');
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
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [ { inlineData: { mimeType: blob.type || 'image/png', data: b64 } }, { text: textPrompt } ] },
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

export async function generateAdfusionBatch(productImageUrl: string, productType?: string): Promise<string[]> {
  // Special handling for Tote Bag: 2 fashion-look models + 3 lifestyle-models with diverse representation
  if ((productType || '').toLowerCase() === 'tote bag') {
    const prompts: string[] = [
      // Fashion look (studio) — model 1
      `Create an editorial studio fashion image that CLEARLY includes a human model. Use the provided tote product photo exactly as given and composite it so the model is holding the tote by the handles or wearing it on one shoulder. Full or three-quarter body in frame, head visible. Clean seamless background, softbox lighting, crisp but natural shadows. Ensure realistic hand/bag interaction. Use a model with deep brown skin tone to ensure diverse representation. Do not add text or logos. Do not alter the product art. Output only the composed image.`,
      // Fashion look (studio) — model 2
      `Create a lookbook studio fashion shot featuring a human model holding the provided tote. Neutral backdrop, gentle rim light, editorial grading. Show the model from waist-up or full body, face visible. Use a model with East Asian features for diversity. Keep the tote exactly as provided and integrate shadows realistically. No text. Output only the composed image.`,
      // Lifestyle model — city street
      `Generate a lifestyle scene on a sunny city street that includes a human model walking while carrying the provided tote on the shoulder or in-hand. Natural daylight, depth-of-field street background, realistic motion and shadow. Use a model with a medium tan skin tone (Latina/Hispanic appearance). Keep the tote unchanged. No text. Output only the composed image.`,
      // Lifestyle model — cafe
      `Generate a cozy cafe lifestyle scene with a human model seated by a window holding or wearing the provided tote. Warm ambient light, candid feel, reflections on glass. Use a model with light/fair skin tone. Keep the tote unchanged and realistically integrated with hands/strap. No text. Output only the composed image.`,
      // Lifestyle model — park
      `Generate a relaxed weekend park scene with a human model posing with the provided tote on the shoulder. Soft afternoon light, greenery background, casual outfit. Use a model with South Asian features for diversity. Keep the tote design intact and realistically composited. No text. Output only the composed image.`,
    ];
    const out: string[] = [];
    for (const p of prompts) {
      try { out.push(await generateFromPrompt(productImageUrl, p)); } catch (e) { console.warn('adfusion custom fail', e); }
    }
    return out;
  }

  // Default generic batch when no specific product logic is needed
  const scenarios: Scenario[] = ['fashion_ad', 'modern_chic', 'studio_flatlay', 'outdoor_lifestyle', 'minimal_product_card'];
  const results: string[] = [];
  for (const s of scenarios) {
    try { results.push(await generateAdfusionMockup(productImageUrl, s)); } catch (e) { console.warn('adfusion fail', s, e); }
  }
  return results;
}


