export const apiErrorDetail = (error, fallback) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === "string") return detail
  if (detail && typeof detail === "object") {
    const issues = Array.isArray(detail.issues) ? detail.issues : []
    if (issues.length) return issues.map((item) => item.message).join("\n")
    if (detail.message) {
      const facts = []
      if (detail.code) facts.push(`真寻错误码：${detail.code}`)
      if (detail.provider_code) facts.push(`QQ错误码：${detail.provider_code}`)
      if (detail.provider_explanation) facts.push(detail.provider_explanation)
      if (detail.suggestion) facts.push(`处理建议：${detail.suggestion}`)
      if (detail.http_status) facts.push(`HTTP：${detail.http_status}`)
      if (detail.trace_id) facts.push(`Trace ID：${detail.trace_id}`)
      return [detail.message, ...facts].join("\n")
    }
  }
  return error?.message || fallback
}

export const apiErrorIssues = (error) => {
  const detail = error?.response?.data?.detail
  return detail && Array.isArray(detail.issues) ? detail.issues : []
}

export const apiErrorDiagnostic = (error, fallback) => {
  const detail = error?.response?.data?.detail
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    return {
      code: detail.code || "request_failed",
      message: detail.message || fallback,
      provider_code: detail.provider_code || null,
      provider_explanation: detail.provider_explanation || null,
      suggestion: detail.suggestion || null,
      http_status: detail.http_status || error?.response?.status || null,
      trace_id: detail.trace_id || null,
    }
  }
  return {
    code: "request_failed",
    message: apiErrorDetail(error, fallback),
    provider_code: null,
    provider_explanation: null,
    suggestion: null,
    http_status: error?.response?.status || null,
    trace_id: null,
  }
}
