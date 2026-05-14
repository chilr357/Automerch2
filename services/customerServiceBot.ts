import { apiManager } from './utils/apiManager';

export interface InquiryPayload {
  inquiryId: string;
  customerName?: string;
  question: string;
  orderId?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ResponseDraft {
  response: string;
  tone: 'friendly' | 'formal' | 'empathetic';
  confidence: number;
  suggestedActions?: string[];
}

export const draftResponse = async (payload: InquiryPayload): Promise<ResponseDraft> => {
  try {
    const response = await apiManager.request<ResponseDraft>('/support/draft-response', {
      method: 'POST',
      service: 'support',
      rateLimitMs: 1500,
      body: payload,
    });
    if (!response?.response) throw new Error('No response generated');
    return response;
  } catch (error) {
    console.warn('Support drafting unavailable, returning templated response', error);
    const base = `Hi ${payload.customerName || 'there'},\n\nThanks for reaching out! We received your message about "$${payload.question.slice(0, 90)}..." and will follow up with a detailed answer shortly.\n\nBest,\nAutoMerch Support`;
    return {
      response: base,
      tone: 'friendly',
      confidence: 0.3,
      suggestedActions: ['Review the order details manually', 'Send personalized follow up'],
    };
  }
};
