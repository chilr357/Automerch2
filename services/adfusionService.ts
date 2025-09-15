import { GoogleGenAI, Modality } from "@google/genai";

type Scenario =
  | 'fashion_ad'
  | 'modern_chic'
  | 'studio_flatlay'
  | 'outdoor_lifestyle'
  | 'minimal_product_card'
  | 'fashion_video_ad'
  | 'chic_video_ad';

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
  // Explicit stills optimized to seed motion for video ads (with human models)
  fashion_video_ad:
    'Create a high‑production fashion commercial still featuring a human model interacting with the product. Vibrant studio gradient background (pink→violet), soft rim lighting, editorial feel. Show the model using or wearing the product naturally (pose can be half‑body or full‑body). Integrate the provided product photo exactly, realistic shadows and lighting. No text, no logos, no watermarks, do not alter the product design.',
  chic_video_ad:
    'Create a high‑production chic lifestyle commercial still featuring a human model using the product in an in‑home or everyday context. Minimal dark gray gradient background with refined glow and soft shadows. Scene, pose and context should be appropriate to the product type; show natural interaction that highlights everyday use. Integrate the provided product photo exactly with realistic lighting. No text, no logos, no watermarks.',
};

const buildPrompt = (scenario: Scenario, productType?: string) => {
  let base = SCENARIO_PROMPTS[scenario];
  if (scenario === 'chic_video_ad' && productType) {
    base += ` Tailor the interaction and scene to the product type (“${productType}”) for a believable everyday or in‑home use.`;
  }
  return `${base}
Rules:
- Do not add text or watermarks.
- Maintain the original product colors and proportions.
- Use realistic lighting and shadows; keep background clean.
- Output only the composed image.`;
};

export async function generateAdfusionMockup(productImageUrl: string, scenario: Scenario, productType?: string): Promise<string> {
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

  const prompt = buildPrompt(scenario, productType);

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
  // Special handling for Tote Bag: ensure first two stills are the explicit video-ad stills
  if ((productType || '').toLowerCase() === 'tote bag') {
    const out: string[] = [];
    // 1) Guaranteed first two stills for video ads
    try { out.push(await generateAdfusionMockup(productImageUrl, 'fashion_video_ad', productType)); } catch (e) { console.warn('adfusion fail', 'fashion_video_ad', e); }
    try { out.push(await generateAdfusionMockup(productImageUrl, 'chic_video_ad', productType)); } catch (e) { console.warn('adfusion fail', 'chic_video_ad', e); }

    // 2) Fill remaining up to 5 with tote-focused prompts (diverse representation)
    const totePrompts: string[] = [
      `Create an editorial studio fashion image that CLEARLY includes a human model. Use the provided tote product photo exactly as given and composite it so the model is holding the tote by the handles or wearing it on one shoulder. Full or three-quarter body in frame, head visible. Clean seamless background, softbox lighting, crisp but natural shadows. Ensure realistic hand/bag interaction. Use a model with deep brown skin tone to ensure diverse representation. No text.`,
      `Create a lookbook studio fashion shot featuring a human model holding the provided tote. Neutral backdrop, gentle rim light, editorial grading. Show the model from waist-up or full body, face visible. Use a model with East Asian features for diversity. Keep the tote exactly as provided and integrate shadows realistically. No text.`,
      `Generate a lifestyle scene on a sunny city street that includes a human model walking while carrying the provided tote on the shoulder or in-hand. Natural daylight, depth-of-field street background, realistic motion and shadow. Use a model with a medium tan skin tone. Keep the tote unchanged. No text.`,
      `Generate a cozy cafe lifestyle scene with a human model seated by a window holding or wearing the provided tote. Warm ambient light, candid feel, reflections on glass. Use a model with light/fair skin tone. Keep the tote unchanged and realistically integrated with hands/strap. No text.`,
      `Generate a relaxed weekend park scene with a human model posing with the provided tote on the shoulder. Soft afternoon light, greenery background, casual outfit. Use a model with South Asian features. Keep the tote design intact and realistically composited. No text.`,
    ];
    for (const p of totePrompts) {
      if (out.length >= 5) break;
      try { out.push(await generateFromPrompt(productImageUrl, p)); } catch (e) { console.warn('adfusion custom fail', e); }
    }
    return out;
  }

  // Default generic batch when no specific product logic is needed
  // First two are guaranteed video-ad stills
  const scenarios: Scenario[] = ['fashion_video_ad', 'chic_video_ad', 'studio_flatlay', 'outdoor_lifestyle', 'minimal_product_card'];
  const results: string[] = [];
  for (const s of scenarios) {
    try { results.push(await generateAdfusionMockup(productImageUrl, s, productType)); } catch (e) { console.warn('adfusion fail', s, e); }
  }
  return results;
}
