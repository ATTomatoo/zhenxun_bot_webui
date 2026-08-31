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

const targetKind = (url) => {
  const hostname = url.hostname.toLowerCase()
  return ["localhost", "127.0.0.1", "::1"].includes(hostname)
    ? "local"
    : "network"
}

const uniqueTargets = (values) => {
  const seen = new Set()
  return values.reduce((result, value) => {
    const origin = normalizeBaseUrl(value)
    if (origin && !seen.has(origin)) {
      seen.add(origin)
      result.push(origin)
    }
    return result
  }, [])
}

const choosePreferredOrigin = ({ policy, preferredUrl, targets, currentOrigin }) => {
  const current = normalizeBaseUrl(currentOrigin)
  if (policy === "preserve" && current) return current
  const explicit = normalizeBaseUrl(preferredUrl)
  if (explicit) return explicit
  const wantedKind = policy === "local" ? "local" : policy === "network" ? "network" : null
  if (wantedKind) {
    const matched = targets.find((target) => {
      try {
        return targetKind(new URL(target.url)) === wantedKind
      } catch (error) {
        return false
      }
    })
    if (matched) return normalizeBaseUrl(matched.url)
  }
  return normalizeBaseUrl(targets[0]?.url) || current
}

export const restartRecoveryState = () => {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null")
    if (!value || !value.bootId || !Array.isArray(value.accessUrls)) return null
    const policy = value.policy || (value.setup ? "legacy-setup" : "preserve")
    const preferredOrigin =
      policy === "preserve"
        ? normalizeBaseUrl(window.location.origin)
        : normalizeBaseUrl(value.preferredOrigin) || normalizeBaseUrl(value.accessUrls[0])
    return {
      ...value,
      policy,
      preferredOrigin,
      fallbackUrls: Array.isArray(value.fallbackUrls)
        ? uniqueTargets(value.fallbackUrls)
        : value.accessUrls.filter((url) => normalizeBaseUrl(url) !== preferredOrigin),
    }
  } catch (error) {
    return null
  }
}

export const startRestartRecovery = ({
  bootId,
  accessUrls = [],
  accessTargets = [],
  preferredUrl = "",
  policy = "preserve",
  returnRoute = "/dashboard",
  message = "配置将在新进程中生效。",
  setup = false,
}) => {
  const targets = [
    ...accessTargets,
    ...accessUrls.map((url) => ({ url })),
  ].filter((target) => normalizeBaseUrl(target?.url))
  const preferredOrigin = choosePreferredOrigin({
    policy,
    preferredUrl,
    targets,
    currentOrigin: window.location.origin,
  })
  const urls = uniqueTargets([
    preferredOrigin,
    ...targets.map((target) => target.url),
    window.location.origin,
  ])
  const state = {
    bootId,
    preferredOrigin: preferredOrigin || urls[0],
    fallbackUrls: urls.filter((url) => url !== preferredOrigin),
    accessUrls: urls,
    policy,
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
