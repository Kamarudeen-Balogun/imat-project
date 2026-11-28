export const contentEditorRoles = ["advocacy_officer", "president", "admin", "owner"] as const;
export const contentDeleterRoles = ["president", "admin", "owner"] as const;
export const wikiEditorRoles = ["documentation_officer", "president", "admin", "owner"] as const;
export const wikiDeleterRoles = ["president", "admin", "owner"] as const;
export const evidenceGalleryEditorRoles = ["documentation_officer", "admin", "owner"] as const;
export const activityModeratorRoles = ["admin", "owner"] as const;
export const socialLinksManagerRoles = ["admin", "owner"] as const;

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

// Application review (accept/reject) and direct invites are owner/admin
// only. The applications list itself is viewable by every member; the
// page gates the review controls on this same helper.
export const applicationReviewerRoles = ["owner", "admin"] as const;

export function canReviewApplications(role: string | null | undefined) {
  return hasRole(role, applicationReviewerRoles);
}

// Approval workflow: every member role can initiate a publish (news, wiki,
// evidence), but it only goes live after an owner/admin approves it.
// Approvers are owner/admin everywhere. Applicants are not members yet and
// cannot author or submit anything.
export const contentApproverRoles = ["owner", "admin"] as const;

export function canApproveContent(role: string | null | undefined) {
  return hasRole(role, contentApproverRoles);
}

// Any member role except applicant (see ROLE_PRIORITY in roleHierarchy.ts).
export function isMemberAuthor(role: string | null | undefined) {
  return Boolean(role && role !== "applicant");
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
