import Anthropic from '@anthropic-ai/sdk'

let _client = null

export function getClient() {
  if (!_client) {
    _client = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true,
    })
  }
  return _client
}
