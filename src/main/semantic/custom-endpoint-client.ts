import OpenAI from 'openai'
import type { ChatContentItem, ChatRequest, SemanticChatClient } from './types'

export function createCustomEndpointClient(input: {
  apiKey: string
  serverURL: string
  getTimeoutMs: () => number
}): SemanticChatClient {
  const client = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.serverURL,
    maxRetries: 0,
  })

  return {
    chat: {
      send: async (request: ChatRequest): Promise<unknown> => {
        return client.chat.completions.create(
          {
            model: request.model,
            messages: request.messages.map((message) => ({
              role: message.role,
              content: message.content.map((item) => mapContentItem(item)),
            })),
          } as never,
          {
            timeout: input.getTimeoutMs(),
            maxRetries: 0,
          },
        )
      },
    },
  }
}

function mapContentItem(item: ChatContentItem): Record<string, unknown> {
  switch (item.type) {
    case 'text':
      return {
        type: 'text',
        text: item.text,
      }
    case 'image_url':
      return {
        type: 'image_url',
        image_url: {
          url: item.imageUrl.url,
          detail: item.imageUrl.detail,
        },
      }
    case 'input_video':
      return {
        type: 'input_video',
        video_url: {
          url: item.videoUrl.url,
        },
      }
  }
}
