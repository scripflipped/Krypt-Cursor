import type { KryptBridge } from '../shared/types';

declare global {
  interface Window {
    krypt: KryptBridge;
  }
}

export {};
