export const ADMIN_USER_ID = 'b0ac5859-b7bb-475d-85b0-dcea19dd6012'

export const V4_ENABLED_USERS = null // null = todos los usuarios

export function isV4Enabled(userId) {
  if (!userId) return false
  if (V4_ENABLED_USERS === null) return true
  return V4_ENABLED_USERS.includes(userId)
}
