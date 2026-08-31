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
