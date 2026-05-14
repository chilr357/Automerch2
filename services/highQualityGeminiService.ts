import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface MockupPromptProduct {
  name: string;
  category?: string;
  targetAudience?: string;
}

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

const systemInstruction = `You are an Etsy merchandising creative director. You craft detailed photo briefs that convert browsers into buyers. Every prompt must describe believable photography: real lighting, lenses, styling, scene composition, posing, and emotional cues that resonate with Etsy shoppers. Avoid generic AI wording and focus on tactile details, authentic props, and storytelling moments that highlight product benefits.`;

export class HighQualityGeminiService {
  private readonly api = client;

  private async processingDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateProfessionalMockupPrompt(product: MockupPromptProduct): Promise<string> {
    if (!this.api) {
      throw new Error('Gemini API key not configured');
    }

    const brief = `As a professional e-commerce photographer and Etsy marketplace expert, craft a concise but detailed mockup brief.
Product Name: ${product.name}
Category: ${product.category || 'General Merchandise'}
Primary Audience: ${product.targetAudience || 'Modern Etsy shoppers looking for unique handmade quality'}

Requirements:
- Studio-quality lighting decisions and suggested camera/lens setup
- Lifestyle context that aligns with top-selling Etsy listings for this category
- Styling direction, color palette, and prop suggestions that feel brand-authentic
- Notes on showcasing craftsmanship and conversion-driving details

Write the brief as instructions for a photographer. Avoid bullet fatigue—use short paragraphs with clear directives.`;

    await this.processingDelay(1500);

    const result = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      config: {
        ...generationConfig,
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: brief }],
        },
      ],
    });

    const text = result.text;
    if (!text) {
      throw new Error('High-quality prompt generation returned empty content');
    }
    return text.trim();
  }
}

export const highQualityGeminiService = new HighQualityGeminiService();
