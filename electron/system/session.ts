import { branding, flagTrust, isDegraded } from './runtime';

type RpcModule = typeof import('discord-rpc');
type RpcClient = any;

let rpcModule: RpcModule | null = null;
let moduleFailed = false;
let client: RpcClient | null = null;
let ready = false;
let startedAt = 0;
let detailText = '';
let profileUrl = '';
let lastKey = '';
let stopped = false;

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const RETRY_MS = 15_000;
const REFRESH_MS = 30_000;
const noop = (): void => undefined;

function loadModule(): RpcModule | null {
  if (rpcModule) return rpcModule;
  if (moduleFailed) return null;
  try {
    rpcModule = require('discord-rpc') as RpcModule;
    return rpcModule;
  } catch {
    moduleFailed = true;
    return null;
  }
}

export async function hydrateClientContext(): Promise<void> {
  if (isDegraded()) return;
  stopped = false;
  await connect();
}

async function connect(): Promise<void> {
  if (stopped || isDegraded() || client) return;
  const RPC = loadModule();
  if (!RPC) {
    flagTrust('DEGRADED');
    return;
  }
  try {
    const clientId = branding.clientId();
    try { RPC.register(clientId); } catch {  }
    const c = new RPC.Client({ transport: 'ipc' });
    client = c;
    c.on('ready', () => {
      ready = true;
      if (!startedAt) startedAt = Date.now();
      pushActivity(true);
      startRefresh();
    });
    c.on('disconnected', () => handleDrop());
    c.on('error', () => handleDrop());
    await c.login({ clientId });
  } catch {
    handleDrop();
  }
}

function handleDrop(): void {
  ready = false;
  stopRefresh();
  if (client) {
    try { client.destroy()?.catch?.(noop); } catch {  }
    client = null;
  }
  if (!stopped && !isDegraded()) scheduleReconnect();
}

function scheduleReconnect(): void {
  if (stopped || retryTimer) return;
  retryTimer = setTimeout(() => { retryTimer = null; void connect(); }, RETRY_MS);
}

function startRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => pushActivity(true), REFRESH_MS);
}

function stopRefresh(): void {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

function buttons(): { label: string; url: string }[] {
  if (profileUrl) {
    return [
      { label: 'Krypt Profile', url: profileUrl },
      { label: 'Krypt.cc', url: branding.discord() },
    ];
  }
  return [
    { label: 'Free Tools', url: branding.tools() },
    { label: 'Krypt.cc', url: branding.discord() },
  ];
}

function pushActivity(force = false): void {
  if (!client || !ready) return;
  const key = `${detailText}|${profileUrl}`;
  if (!force && key === lastKey) return;
  lastKey = key;
  try {
    client.setActivity({
      details: detailText || branding.rpcDetails(),
      state: branding.rpcState(),
      startTimestamp: startedAt,
      largeImageKey: branding.rpcLargeKey(),
      largeImageText: branding.rpcLargeText(),
      instance: false,
      buttons: buttons(),
    })?.catch?.(noop);
  } catch {
  }
}

function profileUrlFor(username: string): string {
  const clean = (username || '').trim().replace(/^@+/, '');
  if (!clean || !/^[A-Za-z0-9_.~-]{1,32}$/.test(clean)) return '';
  return `${branding.site()}/${clean}`;
}

export function setPresenceProfile(username: string): void {
  const next = profileUrlFor(username);
  if (next === profileUrl) return;
  profileUrl = next;
  pushActivity();
}

export function syncRuntimeState(detail?: string): void {
  if (detail) detailText = detail;
  pushActivity();
}

export function releaseClientContext(): void {
  stopped = true;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  stopRefresh();
  if (!client) return;
  try {
    client.clearActivity?.()?.catch?.(noop);
    client.destroy?.()?.catch?.(noop);
  } catch {
  }
  client = null;
  ready = false;
}
