const STORAGE_KEY = "zhenxunRestartRecovery"
const EVENT_NAME = "zhenxun-restart-recovery"

const normalizeBaseUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim())
    if (!["http:", "https:"].includes(url.protocol)) return null
    if (["0.0.0.0", "::"].includes(url.hostname)) return null
    return url.origin
  } catch (error) {
    return null
  }
}

export const restartRecoveryState = () => {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null")
    return value && value.bootId && Array.isArray(value.accessUrls) ? value : null
  } catch (error) {
    return null
  }
}

export const startRestartRecovery = ({
  bootId,
  accessUrls = [],
  returnRoute = "/dashboard",
  message = "配置将在新进程中生效。",
  setup = false,
}) => {
  const urls = [...accessUrls, window.location.origin]
    .map(normalizeBaseUrl)
    .filter(Boolean)
  const state = {
    bootId,
    accessUrls: [...new Set(urls)],
    returnRoute: returnRoute.startsWith("/") ? returnRoute : `/${returnRoute}`,
    message,
    setup,
    startedAt: Date.now(),
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }))
  return state
}

export const clearRestartRecovery = () => {
  window.sessionStorage.removeItem(STORAGE_KEY)
}

export const RESTART_RECOVERY_EVENT = EVENT_NAME
