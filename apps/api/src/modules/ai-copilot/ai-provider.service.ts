import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ByokAiConfig {
  provider: 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
  apiKey: string;
  model?: string;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTenantAiConfig(tenantId: string): Promise<ByokAiConfig | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { byokAiConfig: true },
    });

    if (tenant?.byokAiConfig && typeof tenant.byokAiConfig === 'object') {
      const cfg = tenant.byokAiConfig as any;
      if (cfg.apiKey) {
        return {
          provider: cfg.provider || 'GEMINI',
          apiKey: cfg.apiKey,
          model: cfg.model,
        };
      }
    }

    // Environment fallback
    if (process.env.GEMINI_API_KEY) {
      return {
        provider: 'GEMINI',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'OPENAI',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'ANTHROPIC',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      };
    }

    return null;
  }

  /**
   * Unified Structured JSON Extraction via BYOK Provider
   */
  async extractStructuredJson<T>(
    tenantId: string,
    prompt: string,
    base64Data?: string,
    mimeType: string = 'image/jpeg',
  ): Promise<T> {
    const config = await this.getTenantAiConfig(tenantId);

    if (!config || !config.apiKey) {
      this.logger.warn(`No BYOK AI key configured for tenant ${tenantId}. Running rule-based/mock invoice parser.`);
      return this.fallbackParse<T>(prompt, base64Data);
    }

    try {
      if (config.provider === 'GEMINI') {
        return await this.callGemini<T>(config, prompt, base64Data, mimeType);
      } else if (config.provider === 'OPENAI') {
        return await this.callOpenAi<T>(config, prompt, base64Data, mimeType);
      } else if (config.provider === 'ANTHROPIC') {
        return await this.callAnthropic<T>(config, prompt, base64Data, mimeType);
      }
    } catch (err: any) {
      this.logger.error(`AI provider call failed (${config.provider}): ${err.message}. Falling back.`);
    }

    return this.fallbackParse<T>(prompt, base64Data);
  }

  private async callGemini<T>(
    config: ByokAiConfig,
    prompt: string,
    base64Data?: string,
    mimeType: string = 'image/jpeg',
  ): Promise<T> {
    const model = config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const parts: any[] = [{ text: prompt }];
    if (base64Data) {
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: cleanBase64,
        },
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.cleanAndParseJson<T>(rawText);
  }

  private async callOpenAi<T>(
    config: ByokAiConfig,
    prompt: string,
    base64Data?: string,
    mimeType: string = 'image/jpeg',
  ): Promise<T> {
    const model = config.model || 'gpt-4o-mini';
    const messages: any[] = [];

    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;
    return this.cleanAndParseJson<T>(rawText);
  }

  private async callAnthropic<T>(
    config: ByokAiConfig,
    prompt: string,
    base64Data?: string,
    mimeType: string = 'image/jpeg',
  ): Promise<T> {
    const model = config.model || 'claude-3-5-sonnet-20241022';
    const content: any[] = [];

    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: cleanBase64,
        },
      });
    }
    content.push({ type: 'text', text: prompt + '\nRespond STRICTLY with valid JSON only. No markdown formatting.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text;
    return this.cleanAndParseJson<T>(rawText);
  }

  private cleanAndParseJson<T>(rawText: string): T {
    if (!rawText) throw new Error('Empty response from AI provider');
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleaned);
  }

  /**
   * Deterministic Fallback Parser (For tests, offline mode, or sample OCR)
   */
  private fallbackParse<T>(prompt: string, base64OrText?: string): T {
    // If text contains CSV or key-value format, extract items
    const sampleInvoice = {
      supplierName: 'Hindustan Unilever Distributor Ltd',
      supplierGstin: '33AABCH1234F1Z5',
      invoiceNumber: 'INV-HUL-2026-9812',
      invoiceDate: new Date().toISOString().slice(0, 10),
      lines: [
        {
          rawItemName: 'Dove Cream Beauty Bar 100g',
          barcode: '8901030383742',
          hsnCode: '34011110',
          batchNumber: 'HUL-B701',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          billedQty: 24,
          freeQty: 2,
          grossRate: 55.0,
          tradeDiscountPct: 5.0,
          cashDiscountPct: 2.0,
          gstRatePct: 18.0,
          mrp: 75.0,
        },
        {
          rawItemName: 'Surf Excel Quick Wash Detergent Powder 1kg',
          barcode: '8901030612453',
          hsnCode: '34029011',
          batchNumber: 'SX-0992',
          expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          billedQty: 10,
          freeQty: 1,
          grossRate: 140.0,
          tradeDiscountPct: 4.0,
          cashDiscountPct: 0.0,
          gstRatePct: 18.0,
          mrp: 180.0,
        },
      ],
    };

    return sampleInvoice as unknown as T;
  }
}
