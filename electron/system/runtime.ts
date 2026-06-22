import { app } from 'electron';
import type { AppMeta, TrustMode } from '../../shared/types';

const K = 0x5b;
const dx = (b: number[]): string => String.fromCharCode(...b.map((c) => c ^ K));

const P = {
  cid: [106, 111, 98, 110, 104, 105, 104, 98, 106, 99, 105, 104, 111, 111, 105, 104, 111, 107, 109],
  using: [14, 40, 50, 53, 60],
  details: [24, 46, 40, 47, 52, 54, 123, 56, 46, 41, 40, 52, 41, 123, 112, 123, 47, 41, 58, 50, 55, 40],
  tail: [24, 46, 41, 40, 52, 41],
  site: [51, 47, 47, 43, 40, 97, 116, 116, 48, 41, 34, 43, 47, 117, 56, 56],
  tools: [51, 47, 47, 43, 40, 97, 116, 116, 48, 41, 34, 43, 47, 117, 56, 56, 116, 47, 52, 52, 55, 40],
  discord: [51, 47, 47, 43, 40, 97, 116, 116, 63, 50, 40, 56, 52, 41, 63, 117, 60, 60, 116, 54, 46, 33, 29, 16, 9, 109, 110, 108, 29],
  large: [48, 41, 34, 43, 47],
};

export const DEBUG = process.env.KRYPT_DEBUG === '1';

const HEAD = 'Kr' + 'yp' + 't';
const productName = (): string => `${HEAD} ${dx(P.tail)}`;

export const WATERMARK = Array.from(productName()).reduce((a, c) => a + c.charCodeAt(0), 0);

let trust: TrustMode = 'CLEAN';

export function flagTrust(mode: TrustMode): void {
  if (DEBUG) return;
  if (mode === 'UNTRUSTED') trust = 'UNTRUSTED';
  else if (mode === 'DEGRADED' && trust === 'CLEAN') trust = 'DEGRADED';
}

function selfCheck(): void {
  if (DEBUG) return;
  const ok = productName() === 'Krypt Cursor' && WATERMARK === 1208 && typeof app.getVersion === 'function';
  if (!ok) flagTrust('DEGRADED');
}
selfCheck();

export const branding = {
  clientId: () => dx(P.cid),
  rpcLargeKey: () => dx(P.large),
  rpcLargeText: () => productName(),
  rpcDetails: () => dx(P.details),
  rpcState: () => `${dx(P.using)} ${productName()}`,
  site: () => dx(P.site),
  tools: () => dx(P.tools),
  discord: () => dx(P.discord),
};

export function resolveAppMeta(): AppMeta {
  const degraded = trust !== 'CLEAN' && !DEBUG;
  return {
    name: degraded ? 'Pointer Tool' : productName(),
    version: app.getVersion(),
    trust,
    links: degraded
      ? { site: '', discord: '', tools: '' }
      : { site: branding.site(), discord: branding.discord(), tools: branding.tools() },
  };
}

export function isDegraded(): boolean {
  return trust !== 'CLEAN' && !DEBUG;
}
