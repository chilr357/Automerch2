import { GoogleGenAI } from '@google/genai';

const VEO_MODEL_ID = 'veo-2.0-generate-001';
const VEO_POLL_INTERVAL_MS = 8_000;
const VEO_MAX_WAIT_MS = 240_000;
const VEO_DEFAULT_DURATION_S = 6;
const VEO_ASPECT_RATIO = '16:9';
const VEO_RESOLUTION = '720p';

let veoClient = null;

function resolveVeoApiKey() {
  return (
    process.env.VITE_VEO_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.NODE_VEO_API_KEY ||
    ''
  );
}

function getVeoClient() {
  if (veoClient) return veoClient;
  const key = resolveVeoApiKey();
  if (!key) {
    return null;
  }
  try {
    veoClient = new GoogleGenAI({ apiKey: key });
    return veoClient;
  } catch (err) {
    console.warn('Failed to init Veo client', err);
    return null;
  }
}

const VEO_PROMPTS = {
  fashion: [
    'Create a high-production, 5-second fashion video commercial featuring dynamic, quick-cut scenes with dramatic lighting and elegant camera movements using Google Gemini API for AI-powered content generation.',
    'API Configuration - Image Generation: gemini-2.5-flash-image-preview model. Video Generation: veo-3.0-generate-001 model. Base API: Google Gemini API.',
    'Core Requirements - Video Specifications: Duration exactly 5 seconds. Style: High-production fashion commercial with dynamic quick-cuts. Quality: Dramatic lighting with elegant camera movements. Pacing: Fast-paced, rhythmic editing typical of luxury fashion ads.',
    'Scene Settings - Generate authentic fashion industry scenarios with dynamic transitions. Runway Walk: Professional runway with dramatic spotlighting and audience. Photoshoot Close-up: Studio setting with professional photography equipment and soft boxes. Luxury Lifestyle: Upscale environment (penthouse, luxury hotel, or high-end boutique).',
    'Product Integration Rules - CRITICAL: The provided product image is a finished asset. DO NOT alter, redraw, or modify the product in any way. DO place the product realistically within fashion scenes. SHOW the product being worn/used naturally by professional models. Maintain product authenticity and brand integrity throughout all scenes.',
    'Visual Direction - Use dramatic, high-contrast lighting setups. Employ elegant camera movements (smooth pans, tilts, and tracking shots). Feature professional fashion models with confident poses and movements. Create quick-cut transitions between scenes for dynamic pacing. Focus on luxury aesthetics and aspirational fashion imagery. Utilize fashion photography techniques (depth of field, dramatic shadows).',
    'Technical Implementation - Example API structure for Cursor integration: const geminiConfig = { imageModel: "gemini-2.5-flash-image-preview", videoModel: "veo-3.0-generate-001", apiKey: process.env.GEMINI_API_KEY }. Fashion video generation parameters: const videoParams = { duration: 5, resolution: "1080p", style: "fashion_commercial", lighting: "dramatic_high_contrast", pacing: "quick_cut_dynamic", cameraMovement: "elegant_smooth" }.',
    'Scene Breakdown and Timing - Seconds 0-1.5: Runway scene with model walking, product prominently featured. Seconds 1.5-3: Close-up photoshoot with dramatic lighting on product details. Seconds 3-5: Luxury lifestyle scene showing product in aspirational context.',
    'Lighting Specifications - Runway: Dramatic spotlights, rim lighting, high contrast shadows. Photoshoot: Professional studio lighting, soft boxes, key/fill lighting setup. Luxury Setting: Ambient luxury lighting, golden hour effects, or elegant interior lighting.',
    'Camera Movement Patterns - Runway: Smooth tracking shots following model\'s movement. Photoshoot: Elegant close-up tilts and pans revealing product details. Luxury Scene: Sophisticated dolly movements and graceful reveals.',
    'Model Direction - Professional runway walking technique with confident posture. Natural interaction with product showing functionality and style. Fashion-forward poses that complement the product. Diverse representation while maintaining luxury aesthetic.',
    'Quick-Cut Editing Style - Sharp, rhythmic transitions between scenes. Match cuts that maintain visual flow. Dynamic pacing that builds excitement. Seamless product continuity across cuts.',
    'Prompt Structure for Implementation - Step 1: Product Analysis. Analyze the provided fashion product image to determine product category and styling requirements, best showcase angles and positions, appropriate model poses and interactions, optimal lighting for product features.',
    'Step 2: Scene Generation. For each fashion setting, generate professional model placement and poses, dramatic lighting setup appropriate to scene, luxury background elements and props, realistic product integration and styling.',
    'Step 3: Video Assembly. Create dynamic quick-cut sequence. Apply elegant camera movements. Maintain dramatic lighting consistency. Ensure smooth transitions between scenes. Preserve product authenticity throughout.',
    'Quality Assurance Checklist - Video duration exactly 5 seconds. Product remains unaltered from original image. Models display professional fashion poses. Lighting is dramatic and enhances luxury feel. Camera movements are elegant and smooth. Quick cuts maintain dynamic pacing. All scenes feel authentically fashion-forward. Product integration appears natural and stylish. Overall aesthetic matches high-end fashion commercial standards.',
    'Output Specifications - Format: High-resolution video file optimized for fashion advertising. Aspect Ratio: 16:9 (standard) or 9:16 (social media vertical). Frame Rate: 30fps minimum for smooth motion. Color Grading: High contrast, luxury fashion aesthetic. Audio: Optional elegant background music or sound design. Branding: Minimal, sophisticated placement.',
    'Fashion Industry Standards - Maintain aspirational luxury aesthetic throughout. Use industry-standard fashion photography lighting techniques. Ensure all scenes feel authentic to high-end fashion advertising. Create visual hierarchy that leads the eye to the product. Balance artistic expression with commercial product showcase.',
    'Implementation Notes - This prompt is optimized for Cursor IDE integration with Google Gemini API for fashion commercial production. The generated video should capture the essence of luxury fashion advertising while seamlessly incorporating the authentic product placement. Ensure proper API authentication and model access before execution. The final output should rival professional fashion commercials in production value and aesthetic appeal.',
  ].join(' '),
  phone: [
    'Create a high-production, 5-second phone commercial that mirrors the cinematic style of today\'s top-tier smartphone ads (e.g., iPhone). The video should fully showcase the phone\'s sleek dimensions, precision craftsmanship, and premium materials.',
    'API Configuration - Image Generation: gemini-2.5-flash-image-preview model. Video Generation: veo-2.0-generate-001 model. Base API: Google Gemini API.',
    'Core Requirements - Video Specifications: Duration exactly 5 seconds. Style: Ultra-high production quality, cinematic, minimalist. Pacing: Smooth, deliberate camera movements with slow reveals. Mood: Aspirational, luxurious, cutting-edge.',
    'Scene Settings - Precision Reveal (0–1.5s): Close-up of the phone edge rotating into frame. Focus on metal chamfers, glass curvature, button placement. Soft gradient background with subtle reflections.',
    'Detail Showcase (1.5–3s): Extreme close-up on camera module and logo embossing. Macro lighting to highlight lens rings, texturing, and finish. Slow rack focus from rear to front panel.',
    'Lifestyle Context (3–5s): Hand-held shot in a modern environment (desk, café, outdoors). Natural, warm lighting to show real-world use. Subtle interaction: tap, swipe, or launch animation on screen.',
    'Product Integration Rules - CRITICAL: The provided phone image is a completed asset. DO NOT alter, redraw, or modify the phone design. DO place it seamlessly and realistically within each shot. SHOW materials (metal, glass) and dimensions clearly.',
    'Visual Direction - Use cinematic lighting with soft gradients, specular highlights, and subtle shadows. Employ elegant camera moves: slow pans, tilts, and slider reveals. Use minimalist compositions with plenty of negative space. Emphasize texture and detail on every surface.',
    'Prompt Structure - Generate a 5-second ultra-high production smartphone commercial with Scenes 1–3 as above. Throughout: Do not alter the phone design. Show dimensions, craftsmanship, and materials clearly. Use cinematic lighting and smooth camera movements to create a luxurious, aspirational mood.'
  ].join(' '),
  chic: [
    'Create a high-production, 5-second video commercial with a chic and natural feel using Google Gemini API for AI-powered content generation.',
    'API Configuration - Image Generation: gemini-2.5-flash-image-preview model. Video Generation: veo-2.0-generate-001 model. Base API: Google Gemini API.',
    'Core Requirements - Video Specifications: Duration exactly 5 seconds. Style: High-production commercial with chic and natural aesthetic. Quality: Cinematic shots with beautiful, natural lighting. Mood: Aspirational but relatable.',
    'Scene Settings - Generate authentic, everyday lifestyle scenarios featuring realistic models: Morning Routine: Home setting with natural morning light. Urban Commuting: City environment with dynamic movement. Social Relaxation: Cafe setting with friends in casual interaction.',
    'Product Integration Rules - CRITICAL: The provided product image is a finished asset. DO NOT alter, redraw, or modify the product in any way. DO place the product realistically within scenes. SHOW the product being used naturally by models. Maintain product authenticity and brand integrity.',
    'Visual Direction - Use cinematic camera angles and movements. Employ natural, soft lighting that enhances the chic aesthetic. Feature diverse, realistic models in genuine interactions. Create seamless product integration that feels organic. Focus on lifestyle moments that resonate with target audience.',
    'Prompt Structure for Implementation - Step 1: Scene Analysis. Analyze the provided product image to determine product dimensions and characteristics, best usage scenarios, optimal placement angles, natural interaction methods.',
    'Step 2: Scene Generation. For each lifestyle setting, generate realistic model placement, natural lighting setup, appropriate background elements, seamless product integration.',
    'Step 3: Video Compilation. Combine generated scenes into cohesive 5-second narrative. Apply cinematic transitions. Maintain consistent lighting and color grading. Ensure product visibility throughout.',
    'Quality Assurance Checklist - Video duration exactly 5 seconds. Product remains unaltered from original image. Models appear realistic and diverse. Lighting is natural and aesthetically pleasing. Scenes feel authentic and relatable. Product integration appears organic. Overall mood is aspirational yet accessible. Cinematic quality maintained throughout.',
    'Output Specifications - Format: High-resolution video file. Aspect Ratio: 16:9 or 9:16 (specify based on platform). Frame Rate: 30fps minimum. Audio: Optional background music (chic, minimal). Branding: Subtle, non-intrusive placement.',
    'Implementation Notes - This prompt is designed for Cursor IDE integration with Google Gemini API. Ensure proper API authentication and model access before execution. The generated video should seamlessly blend AI-generated scenes with the authentic product placement to create a compelling commercial that drives engagement while maintaining brand integrity.',
  ].join(' '),
};

const blobToBase64 = async (blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString('base64');
};

const fetchReferenceImage = async (url) => {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  const mimeType = response.headers.get('content-type') || blob.type || 'image/png';
  return {
    image: { imageBytes: base64, mimeType },
    referenceType: 'REFERENCE',
  };
};

export async function generateVeoVideo(theme, stillUrl) {
  const client = getVeoClient();
  if (!client) {
    throw new Error('Veo client not configured');
  }

  const prompt = VEO_PROMPTS[theme];
  if (!prompt) {
    throw new Error('Unsupported theme');
  }

  let reference;
  try {
    reference = await fetchReferenceImage(stillUrl);
  } catch (err) {
    console.warn('Failed to fetch reference image', err);
  }

  // Theme-specific overrides
  const durationSeconds = theme === 'phone' ? 5 : VEO_DEFAULT_DURATION_S;
  const resolution = theme === 'phone' ? '1080p' : VEO_RESOLUTION;

  let operation = await client.models.generateVideos({
    model: VEO_MODEL_ID,
    source: { prompt },
    config: {
      numberOfVideos: 1,
      durationSeconds,
      aspectRatio: VEO_ASPECT_RATIO,
      resolution,
      referenceImages: reference ? [reference] : undefined,
    },
  });

  if (operation.error && reference && /referenceImages/i.test(operation.error.message || '')) {
    console.warn('Veo rejected referenceImages, retrying without reference');
    operation = await client.models.generateVideos({
      model: VEO_MODEL_ID,
      source: { prompt },
      config: {
        numberOfVideos: 1,
        durationSeconds,
        aspectRatio: VEO_ASPECT_RATIO,
        resolution,
      },
    });
  }

  if (operation.error) {
    throw new Error(operation.error.message || 'Veo video generation failed');
  }

  const started = Date.now();
  while (!operation.done) {
    if (Date.now() - started > VEO_MAX_WAIT_MS) {
      throw new Error('Veo video generation timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, VEO_POLL_INTERVAL_MS));
    operation = await client.operations.getVideosOperation({ operation });
    if (operation.error) {
      throw new Error(operation.error.message || 'Veo video generation failed');
    }
  }

  const payload = operation.response?.generatedVideos?.[0]?.video;
  if (!payload) {
    throw new Error('Veo did not return a video asset');
  }

  if (payload.videoBytes) {
    const mimeType = payload.mimeType || 'video/mp4';
    return `data:${mimeType};base64,${payload.videoBytes}`;
  }

  if (payload.uri) {
    const response = await client.files.download({ name: payload.uri });
    if (!response.ok) {
      throw new Error(`Failed to download Veo video (${response.status})`);
    }
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const mimeType = response.headers.get('content-type') || 'video/mp4';
    return `data:${mimeType};base64,${base64}`;
  }

  throw new Error('Unrecognized Veo video payload');
}
