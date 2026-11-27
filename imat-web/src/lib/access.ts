export const contentEditorRoles = ["advocacy_officer", "president", "admin"] as const;
export const contentDeleterRoles = ["president", "admin"] as const;
export const wikiEditorRoles = ["documentation_officer", "president", "admin"] as const;
export const wikiDeleterRoles = ["president", "admin"] as const;
export const evidenceGalleryEditorRoles = ["documentation_officer", "admin"] as const;
export const activityModeratorRoles = ["admin"] as const;
export const socialLinksManagerRoles = ["admin"] as const;

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

export function canEditEvidenceGallery(role: string | null | undefined) {
  return hasRole(role, evidenceGalleryEditorRoles);
}

export function canDeleteWiki(role: string | null | undefined) {
  return hasRole(role, wikiDeleterRoles);
}

export function canModerateActivity(role: string | null | undefined) {
  return hasRole(role, activityModeratorRoles);
}

export function canManageSocialLinks(role: string | null | undefined) {
  return hasRole(role, socialLinksManagerRoles);
}

export const applicationReviewerRoles = ["owner", "admin", "president", "technical_officer"] as const;

export function canReviewApplications(role: string | null | undefined) {
  return hasRole(role, applicationReviewerRoles);
}

export function isOwner(role: string | null | undefined) {
  return role === "owner";
}

export function isAdminOrOwner(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export function canAssignRole(actorRole: string | null | undefined, targetRole: string | null | undefined) {
  if (!actorRole || !targetRole) return false;
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole !== "owner" && targetRole !== "admin";
  return false;
}
