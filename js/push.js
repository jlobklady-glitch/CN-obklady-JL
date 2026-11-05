// Push upozornění na nové poptávky z webu (Web Push přes Supabase Edge Function "push").
// Soukromý klíč zůstává jen na serveru; aplikace dostane jen veřejný klíč.
import { h, toast } from './util.js';
import { sb } from './store.js';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function b64uToBytes(s) {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
}

async function currentSub() {
  const reg = await navigator.serviceWorker.ready;
  return { reg, sub: await reg.pushManager.getSubscription() };
}

async function callPush(action) {
  const { data, error } = await sb.functions.invoke('push', { body: { action } });
  if (error) throw new Error(error.message || 'Funkce neodpověděla');
  if (data && data.error) throw new Error(data.error);
  return data;
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('Toto zařízení upozornění nepodporuje.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Upozornění nejsou povolená v nastavení telefonu nebo prohlížeče.');
  const { publicKey } = await callPush('key');
  const { reg, sub: old } = await currentSub();
  const sub = old || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
  const j = sub.toJSON();
  const { error } = await sb.from('push_subscriptions').upsert(
    { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, label: String(navigator.userAgent).slice(0, 120) },
    { onConflict: 'endpoint' });
  if (error) throw error;
  // ověření, že se zařízení opravdu uložilo na server
  const { data: chk, error: e2 } = await sb.from('push_subscriptions').select('id').eq('endpoint', j.endpoint).maybeSingle();
  if (e2 || !chk) throw new Error('Zařízení se nepodařilo uložit na server.' + (e2 ? ' ' + e2.message : ''));
}

export async function disablePush() {
  const { sub } = await currentSub();
  if (!sub) return;
  await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush() {
  return callPush('test');
}

// Karta do Nastavení
export function pushCard() {
  const info = h('p', { class: 'muted' }, '');
  const btns = h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } });
  const card = h('div', { class: 'card' }, h('h2', null, 'Upozornění na nové poptávky'), info, btns);

  const render = async () => {
    btns.replaceChildren();
    if (!pushSupported()) {
      info.textContent = isIos() && !isStandalone()
        ? 'Na iPhonu fungují upozornění jen v aplikaci přidané na plochu (Sdílet → Přidat na plochu) a s iOS 16.4 nebo novějším. Otevřete aplikaci z plochy a vraťte se sem.'
        : 'Toto zařízení nebo prohlížeč upozornění nepodporuje.';
      return;
    }
    let on = false;
    try { on = !!(await currentSub()).sub && Notification.permission === 'granted'; } catch (_) { /* nic */ }
    info.textContent = on
      ? 'Na tomto zařízení jsou upozornění zapnutá. Telefon zavibruje, když z webu přijde nová objednávka nabídky.'
      : 'Zapněte, aby vám telefon dal vědět, když z webu přijde nová objednávka nabídky. Nastavuje se zvlášť na každém telefonu.';
    if (Notification.permission === 'denied') info.textContent = 'Upozornění jsou zablokovaná v nastavení telefonu nebo prohlížeče. Povolte je tam a vraťte se sem.';
    const run = (fn, ok) => async (e) => {
      e.target.disabled = true;
      try { await fn(); if (ok) toast(ok); } catch (er) { toast(er.message, 'err'); }
      await render();
    };
    if (on) {
      btns.append(
        h('button', { class: 'btn small', onclick: run(async () => {
          const r = await sendTestPush();
          if (r.error) throw new Error(r.error);
          if (!r.sent) {
            const d = (r.details || []).map((x) => (x.host || '?') + ' ' + (x.status || '') + ' ' + (x.message || '')).join('; ');
            if (!r.total) throw new Error('Na serveru není uloženo žádné zařízení. Vypněte upozornění a zapněte je znovu.');
            throw new Error('Zkušební upozornění se nepodařilo doručit. ' + (r.removed ? 'Zařízení bylo odhlášeno (' + r.removed + '), zapněte upozornění znovu. ' : '') + d);
          }
        }, 'Zkušební upozornění odesláno') }, 'Poslat zkušební upozornění'),
        h('button', { class: 'btn small ghost', onclick: run(disablePush, 'Upozornění vypnuta') }, 'Vypnout na tomto zařízení'));
    } else {
      btns.append(h('button', { class: 'btn small gold', onclick: run(enablePush, 'Upozornění zapnuta') }, 'Zapnout upozornění'));
    }
  };
  render();
  return card;
}
