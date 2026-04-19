export const contentEditorRoles = ["advocacy_officer", "president", "admin"] as const;
export const contentDeleterRoles = ["president", "admin"] as const;
export const wikiEditorRoles = ["documentation_officer", "president", "admin"] as const;
export const wikiDeleterRoles = ["president", "admin"] as const;
export const activityModeratorRoles = ["admin"] as const;

function hasRole(role: string | null | undefined, allowedRoles: readonly string[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export function canEditContent(role: string | null | undefined) {
  return hasRole(role, contentEditorRoles);
}

export function canDeleteContent(role: string | null | undefined) {
  return hasRole(role, contentDeleterRoles);
}

export function canEditWiki(role: string | null | undefined) {
  return hasRole(role, wikiEditorRoles);
}

export function canDeleteWiki(role: string | null | undefined) {
  return hasRole(role, wikiDeleterRoles);
}

export function canModerateActivity(role: string | null | undefined) {
  return hasRole(role, activityModeratorRoles);
}