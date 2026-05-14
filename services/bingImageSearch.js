const BING_ENDPOINT = process.env.BING_IMAGE_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/images/search';
const BING_KEY = process.env.BING_IMAGE_SEARCH_KEY || process.env.AZURE_BING_SEARCH_KEY || '';

export async function searchImage(query) {
  if (!BING_KEY) {
    throw new Error('Bing Image Search key not configured');
  }
  const response = await fetch(`${BING_ENDPOINT}?q=${encodeURIComponent(query)}&count=10&safeSearch=Strict`, {
    headers: {
      'Ocp-Apim-Subscription-Key': BING_KEY,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bing image search failed: ${response.status} ${text}`);
  }
  const json = await response.json();
  const images = Array.isArray(json?.value) ? json.value : [];
  return images.map((img) => ({
    url: img?.contentUrl,
    thumbnail: img?.thumbnailUrl,
    source: img?.hostPageUrl,
    name: img?.name,
  })).filter((img) => img.url);
}
