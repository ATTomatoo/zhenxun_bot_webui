export const apiErrorDetail = (error, fallback) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === "string") return detail
  if (detail && typeof detail === "object") {
    const issues = Array.isArray(detail.issues) ? detail.issues : []
    if (issues.length) return issues.map((item) => item.message).join("\n")
    if (detail.message) return detail.message
  }
  return error?.message || fallback
}

export const apiErrorIssues = (error) => {
  const detail = error?.response?.data?.detail
  return detail && Array.isArray(detail.issues) ? detail.issues : []
}
