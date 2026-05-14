import { GoogleGenAI, Modality } from "@google/genai";
import type { AdfusionResult } from '../types';
import { uploadToAdfusion, generateAdfusionVideo } from './adfusionIntegrationService';
import { highQualityGeminiService } from './highQualityGeminiService';
import { generateProxyVideo, isMediaProxyConfigured } from './mediaProxyService';

type StillScenario =
  | 'flatlay_signature'
  | 'cozy_lifestyle'
  | 'street_style'
  | 'outdoor_cafe'
  | 'detail_macro'
  | 'gift_presentation';

type Scenario = StillScenario | 'fashion_video_ad' | 'chic_video_ad';

const STILL_SCENARIOS: StillScenario[] = [
  'flatlay_signature',
  'cozy_lifestyle',
  'street_style',
  'outdoor_cafe',
  'detail_macro',
  'gift_presentation',
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

const isAdfusionIntegrationEnabled = (() => {
  try {
    const flag = (import.meta as any).env?.VITE_ENABLE_ADFUSION_INTEGRATION;
    if (typeof flag === 'string') {
      const normalized = flag.trim().toLowerCase();
      return normalized === '1' || normalized === 'true';
    }
  } catch {}
  return false;
})();

const deriveCategory = (productType?: string): string => {
  const type = (productType || '').toLowerCase();
  if (type.includes('shirt') || type.includes('hoodie')) return 'Apparel & Wearables';
  if (type.includes('mug')) return 'Drinkware & Kitchen Gifts';
  if (type.includes('tote')) return 'Bags & Everyday Carry';
  if (type.includes('poster') || type.includes('canvas')) return 'Wall Art & Decor';
  if (type.includes('pillow') || type.includes('blanket')) return 'Home Textiles & Cozy Decor';
  if (type.includes('phone')) return 'Tech Accessories';
  if (type.includes('sticker')) return 'Stickers & Stationery';
  if (type.includes('journal')) return 'Paper Goods & Journals';
  return 'Handmade & Custom Goods';
};

const deriveAudience = (productType?: string): string => {
  const type = (productType || '').toLowerCase();
  if (type.includes('shirt') || type.includes('hoodie')) return 'style-conscious shoppers seeking limited-run apparel';
  if (type.includes('mug')) return 'gift givers looking for cozy, personalized kitchen items';
  if (type.includes('tote')) return 'creative professionals and students wanting sustainable carryalls';
  if (type.includes('poster') || type.includes('canvas')) return 'home decorators seeking art that elevates living spaces';
  if (type.includes('pillow') || type.includes('blanket')) return 'comfort seekers building warm, inviting rooms';
  if (type.includes('phone')) return 'tech-savvy buyers who expect fashion-forward protection';
  if (type.includes('sticker')) return 'collectors and planners decorating laptops, bottles, and journals';
  if (type.includes('journal')) return 'stationery lovers and mindful note-takers';
  return 'Etsy buyers who appreciate artisan-made quality and storytelling';
};

type ProductGenre =
  | 'apparel'
  | 'drinkware'
  | 'bag'
  | 'wall_art'
  | 'home_textile'
  | 'tech_accessory'
  | 'sticker'
  | 'journal';

const categorizeProduct = (productType?: string): ProductGenre => {
  const type = (productType || '').toLowerCase();
  if (type.includes('shirt') || type.includes('hoodie')) return 'apparel';
  if (type.includes('mug')) return 'drinkware';
  if (type.includes('tote')) return 'bag';
  if (type.includes('poster') || type.includes('canvas')) return 'wall_art';
  if (type.includes('pillow') || type.includes('blanket')) return 'home_textile';
  if (type.includes('phone')) return 'tech_accessory';
  if (type.includes('sticker')) return 'sticker';
  if (type.includes('journal')) return 'journal';
  return 'apparel';
};

const describeProductLabel = (productType?: string): string => {
  switch (productType) {
    case 'T-Shirt':
      return 'premium cotton unisex T-shirt';
    case 'Hoodie':
      return 'pigment-dyed hoodie';
    case 'Mug':
      return 'glossy ceramic mug';
    case 'Tote Bag':
      return 'sturdy canvas tote bag';
    case 'Poster':
      return 'archival matte poster print';
    case 'Canvas':
      return 'gallery-wrapped canvas print';
    case 'Blanket':
      return 'plush sherpa blanket';
    case 'Pillow':
      return 'spun polyester throw pillow';
    case 'Phone Case':
      return 'protective phone case';
    case 'Sticker':
      return 'die-cut vinyl sticker';
    case 'Journal':
      return 'hardcover journal';
    default:
      if (productType && productType.trim()) return productType.trim();
      return 'custom product';
  }
};

const STILL_PROMPT_TEMPLATES: Record<ProductGenre, Record<StillScenario, string>> = {
  apparel: {
    flatlay_signature:
      "Create a clean, bright studio flat lay featuring the {PRODUCT_LABEL} folded neatly on a white table. Style minimal props such as a tiny succulent, a ceramic latte mug, and a soft linen napkin. Show the printed artwork covering the entire front panel with natural shadows.",
    cozy_lifestyle:
      "Photograph a cozy sunlit living room with a relaxed model wearing the {PRODUCT_LABEL} while seated on a sofa and holding a warm latte in both hands. Keep the garment draped naturally with the design centered and fully visible.",
    street_style:
      "Capture a fashionable street-style scene where a confident model wears the {PRODUCT_LABEL} while leaning against an urban brick wall in natural morning light. Highlight the edge-to-edge print on the garment's front.",
    outdoor_cafe:
      "Create a trendy outdoor café vignette with the {PRODUCT_LABEL} worn by a model seated at a pastel bistro table surrounded by pastries and a latte. Keep the composition airy with soft depth of field and the design front and center.",
    detail_macro:
      "Produce a detail-focused close-up of the {PRODUCT_LABEL}, showcasing sleeve folds, stitching, and the full-width print texture across the torso. Use reflectors for soft highlights and accurate color.",
    gift_presentation:
      "Style a gift-ready presentation with the {PRODUCT_LABEL} folded inside an open kraft gift box lined with tissue paper, accompanied by a handwritten tag and sprig of greenery. Ensure the design remains visible across the folded front.",
  },
  drinkware: {
    flatlay_signature:
      "Arrange a clean, bright studio flat lay of the {PRODUCT_LABEL} on a white table with a small succulent, teaspoon, and scattered coffee beans. Angle the mug so the printed artwork faces the camera.",
    cozy_lifestyle:
      "Show a cozy sunlit living room where someone lounges with the {PRODUCT_LABEL} cradled beside a stack of books and a knit throw. Capture gentle steam rising from the latte.",
    street_style:
      "Photograph an urban street moment with a person holding the {PRODUCT_LABEL} near a brick wall and vintage bike, using natural light to emphasize the wraparound print.",
    outdoor_cafe:
      "Place the {PRODUCT_LABEL} on a pastel bistro table outdoors alongside pastries and latte art, with a softly blurred café backdrop.",
    detail_macro:
      "Deliver a crisp macro close-up of the {PRODUCT_LABEL}'s handle, rim, and printed artwork, highlighting glossy reflections and ceramic texture.",
    gift_presentation:
      "Present the {PRODUCT_LABEL} nestled in shredded kraft filler inside an open gift box with tissue paper, ribbon, and a thank-you tag.",
  },
  bag: {
    flatlay_signature:
      "Design a clean studio flat lay of the {PRODUCT_LABEL} spread on a white table with a notebook, glasses, and sprigs of eucalyptus. Show the artwork filling the main panel edge to edge.",
    cozy_lifestyle:
      "Capture a cozy living room where a model casually holds the {PRODUCT_LABEL} by the handles near a sunlit window while sipping a latte.",
    street_style:
      "Photograph a stylish urban sidewalk scene with the {PRODUCT_LABEL} slung over a model's shoulder against a brick wall, natural light revealing the full print.",
    outdoor_cafe:
      "Create an outdoor café setup with the {PRODUCT_LABEL} hanging on the back of a pastel bistro chair beside pastries and coffee.",
    detail_macro:
      "Shoot a close-up of the {PRODUCT_LABEL}'s canvas texture, reinforced seams, and print, with the bag partially folded to show depth.",
    gift_presentation:
      "Stage a gifting moment with the {PRODUCT_LABEL} folded inside a kraft box with tissue paper, ribbon, and a thank-you card.",
  },
  wall_art: {
    flatlay_signature:
      "Arrange a clean studio flat lay of the {PRODUCT_LABEL} resting on a white desk with artist pencils, a succulent, and binder clips.",
    cozy_lifestyle:
      "Show a cozy living room featuring the {PRODUCT_LABEL} framed and hung above a sofa while someone sits nearby holding a latte.",
    street_style:
      "Capture an industrial loft scene with the {PRODUCT_LABEL} mounted on an exposed brick wall, natural window light grazing the artwork.",
    outdoor_cafe:
      "Present the {PRODUCT_LABEL} displayed on a pastel café wall behind a bistro table with desserts and coffee, creating an aspirational retail moment.",
    detail_macro:
      "Deliver a detailed close-up of the {PRODUCT_LABEL}'s frame corners or canvas edges, emphasizing print clarity and texture.",
    gift_presentation:
      "Style the {PRODUCT_LABEL} as a gift with the print nestled inside a kraft portfolio or tube with tissue, ribbon, and a handwritten tag.",
  },
  home_textile: {
    flatlay_signature:
      "Create a clean studio flat lay of the {PRODUCT_LABEL} on a white bedspread with a succulent, book, and mug. Ensure the artwork spans the visible surface.",
    cozy_lifestyle:
      "Photograph a cozy living room with the {PRODUCT_LABEL} draped over a model's lap on a sofa while they hold a latte.",
    street_style:
      "Capture a stylish loft setting with the {PRODUCT_LABEL} layered on an accent chair against an exposed brick wall, lit by natural side light.",
    outdoor_cafe:
      "Present the {PRODUCT_LABEL} in an outdoor café patio scene, draped over a chair beside a pastel table and pastries.",
    detail_macro:
      "Deliver a close-up showing the {PRODUCT_LABEL}'s fabric texture, stitching, and edge-to-edge print.",
    gift_presentation:
      "Arrange the {PRODUCT_LABEL} folded inside a kraft gift box with tissue, ribbon, and a sprig of greenery.",
  },
  tech_accessory: {
    flatlay_signature:
      "Design a clean flat lay of the {PRODUCT_LABEL} on a white desk with a succulent, wireless earbuds, and stylus. Show the printed backplate clearly.",
    cozy_lifestyle:
      "Capture a cozy living room moment with someone reclining on a sofa using a phone fitted with the {PRODUCT_LABEL} while holding a latte.",
    street_style:
      "Shoot an urban street scene where a person leans against a brick wall snapping a photo with the {PRODUCT_LABEL}, natural light reflecting on the case.",
    outdoor_cafe:
      "Create an outdoor café vignette with the {PRODUCT_LABEL} resting on a pastel bistro table beside pastries, sunglasses, and coffee.",
    detail_macro:
      "Produce a close-up of the {PRODUCT_LABEL} featuring the camera cutout, glossy edges, and full print.",
    gift_presentation:
      "Stage the {PRODUCT_LABEL} placed in a craft gift box with shredded paper, ribbon, and a thank-you note.",
  },
  sticker: {
    flatlay_signature:
      "Arrange a clean flat lay of the {PRODUCT_LABEL} sticker set on a white desk with pens, a succulent, and coffee mug.",
    cozy_lifestyle:
      "Show a cozy scene with someone seated in a living room decorating a journal with the {PRODUCT_LABEL} while sipping a latte.",
    street_style:
      "Capture an urban studio workspace with the {PRODUCT_LABEL} applied to a laptop near a brick wall and natural window light.",
    outdoor_cafe:
      "Create an outdoor café scene where the {PRODUCT_LABEL} is displayed on a water bottle resting on a pastel bistro table.",
    detail_macro:
      "Provide a macro close-up of the {PRODUCT_LABEL}'s vinyl surface and die-cut edges, highlighting print clarity.",
    gift_presentation:
      "Present the {PRODUCT_LABEL} bundled as a gift pack tied with twine inside a kraft box with tissue.",
  },
  journal: {
    flatlay_signature:
      "Design a clean flat lay of the {PRODUCT_LABEL} on a white desk with pencils, a succulent, and latte, showcasing the cover art.",
    cozy_lifestyle:
      "Show a cozy living room where someone writes in the {PRODUCT_LABEL} beside a sunlit window with a latte nearby.",
    street_style:
      "Capture an urban loft workspace with the {PRODUCT_LABEL} resting on a brick ledge next to glasses and a pen.",
    outdoor_cafe:
      "Create an outdoor café scene where the {PRODUCT_LABEL} lies open on a pastel table with pastries and coffee.",
    detail_macro:
      "Deliver a close-up of the {PRODUCT_LABEL}'s cover texture, spine stitching, and printed artwork.",
    gift_presentation:
      "Stage the {PRODUCT_LABEL} wrapped in tissue inside a kraft gift box with ribbon and a gift tag.",
  },
};

const COMMON_STILL_SUFFIX =
  'Use soft natural lighting, balanced color tones, consistent shadows, and clean white space for Etsy-ready thumbnails. Render at 2000x2000 pixels with accurate colors and realistic materials. Ensure the printed artwork looks true to life and perfectly aligned.';

const VIDEO_PROMPT_TEMPLATES: Record<'fashion_video_ad' | 'chic_video_ad', string> = {
  fashion_video_ad:
    'Film a cinematic fashion commercial featuring the {PRODUCT_LABEL} on a professional set. Show a real model interacting with the product under dramatic key and back lighting, slow dolly moves, and subtle haze. The footage should feel like it was captured on a cinema camera—natural skin tones, believable motion blur, and realistic materials. Integrate the supplied product exactly as-is with true reflections and no AI distortions. No text, logos, watermarks, or synthetic glitches.',
  chic_video_ad:
    'Shoot a lifestyle commercial in an aspirational home highlighting the {PRODUCT_LABEL}. Follow a model through authentic moments—morning routine, hosting, relaxing—with handheld or gimbal camera moves, soft daylight, and gentle depth of field. The clip must feel documentary-real, with accurate shadows, tactile surfaces, and the provided product seamlessly composited. Do not introduce text, overlays, or artificial visual effects.',
};

const VIDEO_SCENARIOS = new Set<Scenario>(['fashion_video_ad', 'chic_video_ad']);

const getScenarioBasePrompt = (scenario: Scenario, productType?: string): string => {
  if (VIDEO_SCENARIOS.has(scenario)) {
    const label = describeProductLabel(productType);
    return VIDEO_PROMPT_TEMPLATES[scenario as 'fashion_video_ad' | 'chic_video_ad'].replaceAll('{PRODUCT_LABEL}', label);
  }
  const genre = categorizeProduct(productType);
  const label = describeProductLabel(productType);
  const templates = STILL_PROMPT_TEMPLATES[genre] || STILL_PROMPT_TEMPLATES.apparel;
  const stillScenario = scenario as StillScenario;
  const baseTemplate = templates[stillScenario] || STILL_PROMPT_TEMPLATES.apparel[stillScenario];
  const base = baseTemplate.replaceAll('{PRODUCT_LABEL}', label);
  return `${base} ${COMMON_STILL_SUFFIX}`;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = String(reader.result || '');
      const [, data] = value.split(',');
      resolve(data || '');
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

const fetchAssetData = async (url: string): Promise<{ base64: string; mimeType: string; dataUri: string }> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch product image');
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  const mimeType = blob.type || 'image/png';
  const dataUri = `data:${mimeType};base64,${base64}`;
  return { base64, mimeType, dataUri };
};

type PromptMode = 'image' | 'video';

const buildPrompt = (scenario: Scenario, productType?: string, mode: PromptMode = 'image') => {
  const typeLabel = describeProductLabel(productType);
  const base = getScenarioBasePrompt(scenario, productType);
  const videoRules = mode === 'video'
    ? [
        '- Render a vertical (4:5) commercial clip lasting about 5–6 seconds with natural camera or subject motion.',
        '- Keep the provided product photo perfectly integrated in every frame without distortion.',
        '- Return a silent video without captions, logos, or overlays.',
      ]
    : [];
  const outputRule = mode === 'video'
    ? '- Output only the composed video clip.'
    : '- Output only the composed image.';
  const commonRules = [
    '- Do not add text or watermarks.',
    '- Maintain the original product colors, proportions, and perspective.',
    `- Keep the design perfectly aligned and naturally wrapped on the ${typeLabel}.`,
    '- Use realistic lighting and shadows; keep background clean.',
  ];
  const rules = [...commonRules, ...videoRules, outputRule].join('\n');
  return `${base}
Rules:
${rules}`;
};

export async function generateAdfusionMockup(productImageUrl: string, scenario: Scenario, productType?: string): Promise<string> {
  if (!ai) throw new Error('Gemini API key not configured');
  const wantsVideo = VIDEO_SCENARIOS.has(scenario);
  const { base64, mimeType, dataUri } = await fetchAssetData(productImageUrl);
  let prompt = buildPrompt(scenario, productType, wantsVideo ? 'video' : 'image');

  try {
    const professionalBrief = await highQualityGeminiService.generateProfessionalMockupPrompt({
      name: productType || 'Product',
      category: deriveCategory(productType),
      targetAudience: deriveAudience(productType),
    });
    if (professionalBrief) {
      prompt = `${professionalBrief}\n\n---\n\n${prompt}`;
    }
  } catch (error) {
    console.warn('High quality mockup brief failed', error);
  }

  if (wantsVideo && isMediaProxyConfigured()) {
    try {
      const videoUrl = await generateProxyVideo({ prompt, imageDataUri: dataUri });
      if (videoUrl) return videoUrl;
    } catch (error) {
      console.warn('Media proxy video generation failed, falling back to Gemini', error);
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ],
    },
    config: wantsVideo
      ? { responseModalities: ['VIDEO'] }
      : { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  });

  const asset = await extractPreferredAsset(response, wantsVideo ? 'video' : 'image');
  if (asset) return asset.dataUri;

  // If video attempt failed, fall back to best-available image.
  if (wantsVideo) {
    const fallback = await extractPreferredAsset(response, 'image');
    if (fallback) return fallback.dataUri;
  }

  throw new Error('No media returned for adfusion mockup');
}

async function generateAdfusionBatchFallback(productImageUrl: string, productType?: string): Promise<string[]> {
  const scenarios: StillScenario[] = STILL_SCENARIOS;
  const results: string[] = [];
  for (const s of scenarios) {
    try {
      const media = await generateAdfusionMockup(productImageUrl, s, productType);
      if (media) results.push(media);
    } catch (e) {
      console.warn('adfusion fail', s, e);
    }
  }
  if (!results.length) {
    console.warn('Adfusion produced no media assets');
  }
  return results;
}

export async function generateAdfusionBatch(productImageUrl: string, productType?: string): Promise<AdfusionResult> {
  const toResult = async (errorMessage?: string): Promise<AdfusionResult> => {
    const stills = await generateAdfusionBatchFallback(productImageUrl, productType);
    return {
      success: stills.length > 0,
      stills,
      videos: [],
      scenario: 'fallback',
      error: errorMessage,
    };
  };

  if (!productImageUrl) {
    return {
      success: false,
      stills: [],
      videos: [],
      scenario: 'adfusion_batch',
      error: 'Product image URL is required',
    };
  }

  if (!isAdfusionIntegrationEnabled) {
    return toResult('Adfusion integration disabled');
  }

  try {
    const upload = await uploadToAdfusion(productImageUrl);
    if (!upload.success || !upload.imageId) {
      return toResult(upload.error || 'Adfusion upload failed');
    }

    const adFormats: Array<'chic' | 'fashion' | 'billboard' | 'lifestyle'> = ['chic', 'fashion', 'billboard', 'lifestyle'];
    const settled = await Promise.allSettled(
      adFormats.map((format) => generateAdfusionVideo(upload.imageId!, format)),
    );

    const stills: string[] = [];
    const videos: string[] = [];
    let anySuccess = false;

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const value = result.value;
        if (value.stills.length || value.videos.length) {
          anySuccess = true;
        }
        stills.push(...value.stills);
        videos.push(...value.videos);
      }
    });

    if (!anySuccess) {
      return toResult('Adfusion returned no assets');
    }

    return {
      success: true,
      stills,
      videos,
      scenario: 'adfusion_batch',
    };
  } catch (error) {
    console.error('Adfusion batch generation failed:', error);
    const message = error instanceof Error ? error.message : 'Adfusion integration failed';
    return toResult(message);
  }
}

type PreferredAsset = 'video' | 'image';

interface GeminiAsset {
  dataUri: string;
  kind: PreferredAsset;
  mimeType: string;
}

const inlineDataToAsset = (inline: any): GeminiAsset | null => {
  if (!inline?.data) return null;
  const mimeType = inline.mimeType || 'image/png';
  const kind: PreferredAsset = mimeType.startsWith('video') ? 'video' : 'image';
  if (kind === 'image' && !mimeType.startsWith('image')) return null;
  return { dataUri: `data:${mimeType};base64,${inline.data}`, kind, mimeType };
};

const fileDataToAsset = async (fileData: any): Promise<GeminiAsset | null> => {
  if (!fileData?.fileUri) return null;
  try {
    const response = await fetch(fileData.fileUri);
    if (!response.ok) return null;
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const mimeType = fileData.mimeType || blob.type || 'application/octet-stream';
    const kind: PreferredAsset | null = mimeType.startsWith('video') ? 'video' : mimeType.startsWith('image') ? 'image' : null;
    if (!kind) return null;
    return { dataUri: `data:${mimeType};base64,${base64}`, kind, mimeType };
  } catch {
    return null;
  }
};

async function extractPreferredAsset(response: any, preference: PreferredAsset): Promise<GeminiAsset | null> {
  const candidates = response?.candidates || [];
  let fallback: GeminiAsset | null = null;
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      let asset: GeminiAsset | null = null;
      if (part.inlineData) asset = inlineDataToAsset(part.inlineData);
      else if (part.fileData) asset = await fileDataToAsset(part.fileData);
      if (!asset) continue;
      if (preference === 'video') {
        if (asset.kind === 'video') return asset;
        if (!fallback) fallback = asset;
      } else {
        if (asset.kind === 'image') return asset;
      }
    }
  }
  return preference === 'video' ? fallback : null;
}
