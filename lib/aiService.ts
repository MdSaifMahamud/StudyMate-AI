// ================================================
// StudyMate AI - AI Service Abstraction Layer
// Supports: Groq, OpenAI, OpenRouter, Gemini, Together AI
// ================================================

export type AIProvider = 'groq' | 'openai' | 'openrouter' | 'together' | 'custom'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface AICompletionResult {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

function getProviderConfig(): {
  provider: AIProvider
  apiKey: string
  baseURL: string
  defaultModel: string
} {
  const provider = (process.env.AI_PROVIDER || 'groq') as AIProvider

  const configs: Record<AIProvider, { baseURL: string; defaultModel: string }> = {
    groq: {
      baseURL: 'https://api.groq.com/openai/v1',
      defaultModel: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    },
    openai: {
      baseURL: 'https://api.openai.com/v1',
      defaultModel: process.env.AI_MODEL || 'gpt-4o-mini',
    },
    openrouter: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: process.env.AI_MODEL || 'meta-llama/llama-3.1-70b-instruct:free',
    },
    together: {
      baseURL: 'https://api.together.xyz/v1',
      defaultModel: process.env.AI_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    },
    custom: {
      baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
      defaultModel: process.env.AI_MODEL || 'llama3',
    },
  }

  const config = configs[provider] || configs.groq
  const apiKey = process.env.AI_API_KEY || ''

  return { provider, apiKey, baseURL: config.baseURL, defaultModel: config.defaultModel }
}

export async function generateCompletion(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  const { apiKey, baseURL, defaultModel } = getProviderConfig()
  const model = options.model || defaultModel
  const maxTokens = options.maxTokens || 4096
  const temperature = options.temperature ?? 0.3

  if (!apiKey) {
    throw new Error('AI API key is not configured. Please set AI_API_KEY in your environment variables.')
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'StudyMate AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 429) {
      throw new Error('AI service rate limit reached. Please wait a moment and try again.')
    }
    if (response.status === 401) {
      throw new Error('Invalid AI API key. Please check your configuration.')
    }
    if (response.status === 503) {
      throw new Error('AI service is temporarily unavailable. Please try again later.')
    }
    throw new Error(`AI service error (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined,
  }
}

export async function generateStreamingCompletion(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, baseURL, defaultModel } = getProviderConfig()
  const model = options.model || defaultModel
  const maxTokens = options.maxTokens || 4096
  const temperature = options.temperature ?? 0.3

  if (!apiKey) {
    throw new Error('AI API key is not configured.')
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'StudyMate AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`AI streaming error: ${response.status}`)
  }

  return response.body
}

export function parseSSEStream(stream: ReadableStream<Uint8Array>): ReadableStream<string> {
  const decoder = new TextDecoder()
  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))
          for (const line of lines) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              controller.close()
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch {}
          }
        }
      } finally {
        reader.releaseLock()
      }
      controller.close()
    },
  })
}
