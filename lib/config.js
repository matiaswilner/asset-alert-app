export const ADMIN_USER_ID = 'b0ac5859-b7bb-475d-85b0-dcea19dd6012'

export const V4_ENABLED_USERS = [ADMIN_USER_ID]

export function isV4Enabled(userId) {
  return V4_ENABLED_USERS.includes(userId)
}
