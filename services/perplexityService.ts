const PERPLEXITY_API_KEY = (import.meta as any).env?.VITE_PERPLEXITY_API_KEY || '';

const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'llama-3.1-sonar-large-128k-online';

const CREDIBLE_HOSTS = new Set([
  'crunchyroll.com', 'www.crunchyroll.com',
  'funimation.com', 'www.funimation.com',
  'hulu.com', 'www.hulu.com',
  'netflix.com', 'www.netflix.com',
  'disneyplus.com', 'www.disneyplus.com',
  'primevideo.com', 'www.primevideo.com',
  'amazon.com', 'www.amazon.com',
  'toei-animation.com', 'www.toei-animation.com',
  'aniplex.co.jp', 'www.aniplex.co.jp',
  'viz.com', 'www.viz.com',
  'fandom.com', 'www.fandom.com',
  'static.wikia.nocookie.net',
  'myanimelist.net',
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
]);

const WORKFLOW_PROMPT = `Objective:
Use Perplexity API to research metadata for the top 100 anime action scenes,
then output structured data for each scene so that a separate video tool can
capture the exact screenshot. Return the direct frame (URL or base64) so the
image can be displayed without any mockup treatment.

Steps:
1. Get Top 100 Anime:
   “Query: ‘List the 100 most popular anime series as of 2024 (MyAnimeList, Crunchyroll, etc.),
    including title, studio, and popularity rank.’”

2. For each anime title:
   “Query: ‘For [ANIME_TITLE], identify the single most iconic action scene.
    Provide episode number, exact timestamp (MM:SS), character names present,
    and a detailed visual description (positions, lighting, effects).
    Only accept video sources from official streamers or licensed channels
    (Crunchyroll, Funimation, Hulu, Netflix, Disney+, Prime Video, official Toei/Aniplex/VIZ channels, etc.).
    If the video URL is not from a verified distributor, mark the entry as requiring manual review and leave screenshot empty.’”

3. Output JSON array with entries:
   {
     anime_title,
     popularity_rank,
     scene_name,
     episode,
     timestamp,
     video_url,
      screenshot,
     characters: [
       { name, position, expression, attire, props }
     ],
     description
   }

Screenshot field requirements:
- Provide the raw frame as an HTTPS URL when possible (no watermarks, no
  additional framing, no mockups).
- If no direct URL exists, embed a Base64-encoded PNG or JPEG string.
- Do not generate or hallucinate new artwork—only supply frames sourced from
  the referenced video.
- If a credible source cannot be confirmed, do not fabricate the frame—return
  an empty screenshot field and mark the entry as requiring manual review.

Return only valid JSON. Do not include narrative text.`;

export interface AnimeScene {
  anime_title: string;
  popularity_rank: number;
  scene_name: string;
  episode: string;
  timestamp: string;
  video_url: string;
  screenshot: string;
  screenshot_source?: string;
  manual_review?: boolean;
  characters: Array<{
    name: string;
    position?: string;
    expression?: string;
    attire?: string;
    props?: string[];
  }>;
  description: string;
}

export async function fetchAnimeSceneDataset(): Promise<AnimeScene[]> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key is not configured');
  }

  const response = await fetch(PERPLEXITY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a meticulous research agent which only returns verified, structured data.'
        },
        {
          role: 'user',
          content: WORKFLOW_PROMPT,
        },
      ],
      temperature: 0,
      stream: false,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Perplexity API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected Perplexity response format');
  }

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('Perplexity response is not an array');
    }
    return parsed.map((item) => sanitizeScene(item)) as AnimeScene[];
  } catch (err) {
    throw new Error(`Failed to parse Perplexity JSON: ${err instanceof Error ? err.message : String(err)}\nRaw response:\n${content}`);
  }
}

const isCredibleUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return CREDIBLE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const sanitizeScene = (scene: any): AnimeScene => {
  const safe: AnimeScene = {
    anime_title: scene?.anime_title ?? '',
    popularity_rank: Number(scene?.popularity_rank ?? 0),
    scene_name: scene?.scene_name ?? '',
    episode: scene?.episode ?? '',
    timestamp: scene?.timestamp ?? '',
    video_url: typeof scene?.video_url === 'string' && isCredibleUrl(scene.video_url) ? scene.video_url : '',
    screenshot: '',
    characters: Array.isArray(scene?.characters) ? scene.characters : [],
    description: scene?.description ?? '',
    manual_review: false,
  };

  if (typeof scene?.screenshot === 'string') {
    const value = scene.screenshot.trim();
    if (value.startsWith('data:image/')) {
      safe.screenshot = value;
    } else if (isCredibleUrl(value)) {
      safe.screenshot = value;
    }
  }

  if (typeof scene?.screenshot_source === 'string' && isCredibleUrl(scene.screenshot_source)) {
    safe.screenshot_source = scene.screenshot_source;
  } else if (safe.video_url) {
    safe.screenshot_source = safe.video_url;
  }

  if (!safe.video_url && !safe.screenshot) {
    safe.manual_review = true;
  }

  return safe;
};
