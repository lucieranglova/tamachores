const BASE = '/api'

function token() {
  return localStorage.getItem('token')
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const t = token()
  if (t) headers['Authorization'] = `Bearer ${t}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status })
  }
  return res.json()
}

export const api = {
  login: (username, password) => req('POST', '/auth/login', { username, password }),
  changePassword: (current_password, new_password) =>
    req('POST', '/auth/change-password', { current_password, new_password }),

  getChores: () => req('GET', '/chores'),
  getAllChores: () => req('GET', '/chores/all'),
  createChore: (data) => req('POST', '/chores', data),
  toggleChore: (id) => req('PUT', `/chores/${id}/toggle`),
  deleteChore: (id) => req('DELETE', `/chores/${id}`),

  claimChore: (chore_id) => req('POST', '/claims', { chore_id }),

  getStats: () => req('GET', '/stats'),
  getMe: () => req('GET', '/users/me'),
  updatePushSubscription: (subscription) =>
    req('PUT', '/users/push-subscription', { subscription }),

  getRewards: () => req('GET', '/rewards'),
  createReward: (data) => req('POST', '/rewards', data),
  deleteReward: (id) => req('DELETE', `/rewards/${id}`),
  redeemReward: (id) => req('POST', `/rewards/${id}/redeem`),

  getVapidKey: () => req('GET', '/vapid-public-key'),
}

export function createWebSocket(onMessage) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${window.location.host}/ws`)
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {}
  }
  return ws
}

export async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const { public_key } = await api.getVapidKey()
    if (!public_key) return null

    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(public_key),
    })
    await api.updatePushSubscription(sub.toJSON())
    return sub
  } catch (e) {
    console.warn('Push registration failed:', e)
    return null
  }
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
