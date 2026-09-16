import type { CausewayApi } from './index'

declare global {
  interface Window {
    causeway: CausewayApi
  }
}

export {}
