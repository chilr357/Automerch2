import express from 'express';
import cors from 'cors';
import { GoogleGenAI, GoogleAIVideoOperationsClient, Modality } from '@google/genai';

const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
const SERVER_API_KEY = process.env.VIDEO_API_KEY;

if (!GEMINI_KEY) {
  throw new Error('Missing required env VITE_GEMINI_API_KEY');
}
if (!SERVER_API_KEY) {
  throw new Error('Missing required env VIDEO_API_KEY');
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_KEY });
const videoOperationsClient = new GoogleAIVideoOperationsClient({ apiKey: GEMINI_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  const headerKey = req.header('x-api-key');
  if (headerKey !== SERVER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/health', (_req, res) => {
  res.send('ok');
});

const parseBase64Image = (imageBase64) => {
  if (!imageBase64) return null;
  const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
  if (match) {
    return { mimeType: match[1] || 'image/png', data: match[2] };
  }
  return { mimeType: 'image/png', data: imageBase64 };
};

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024, imageBase64 } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const imagePart = parseBase64Image(imageBase64);

    const contents = imagePart
      ? { parts: [{ inlineData: { mimeType: imagePart.mimeType, data: imagePart.data } }, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents,
      config: {
        responseModalities: [Modality.IMAGE],
        imageGeneration: { aspectRatio: `${width}:${height}` },
      },
    });

    const asset = response?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
    if (!asset?.inlineData?.data) {
      return res.status(500).json({ error: 'Image generation returned no data' });
    }

    const dataUri = `data:${asset.inlineData.mimeType || 'image/png'};base64,${asset.inlineData.data}`;
    return res.json({ imageUrl: dataUri });
  } catch (error) {
    console.error('[/generate-image] failed', error?.response?.data || error);
    return res.status(500).json({ error: 'Image generation failed' });
  }
});

app.post('/generate-video', async (req, res) => {
  try {
    const { prompt, duration = 8, imageBase64 } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const imagePart = parseBase64Image(imageBase64);

    let operation = await genAI.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt,
      image: imagePart ? { imageBytes: imagePart.data, mimeType: imagePart.mimeType } : undefined,
      config: { numberOfVideos: 1, duration },
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      operation = await videoOperationsClient.getOperation(operation);
    }

    const generatedVideo = operation?.response?.generatedVideos?.[0]?.video;
    const uri = generatedVideo?.uri;
    if (!uri) {
      return res.status(500).json({ error: 'Video generation returned no URI' });
    }

    // Download video bytes directly into base64 to avoid CORS issues for the client
    const videoResponse = await fetch(`${uri}&key=${GEMINI_KEY}`);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video asset (${videoResponse.status})`);
    }
    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUri = `data:video/mp4;base64,${buffer.toString('base64')}`;

    return res.json({ videoUrl: dataUri });
  } catch (error) {
    console.error('[/generate-video] failed', error?.response?.data || error);
    return res.status(500).json({ error: 'Video generation failed' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Gemini proxy listening on port ${PORT}`);
});
