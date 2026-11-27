export const ROLE_PRIORITY: Record<string, number> = {
  owner: 0,
  admin: 1,
  faculty_advisor: 2,
  president: 3,
  vice_president: 4,
  technical_officer: 5,
  documentation_officer: 6,
  field_officer: 7,
  advocacy_officer: 8,
  works_dept: 9,
  applicant: 10,
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  president: "President",
  vice_president: "Vice President",
  documentation_officer: "Documentation Officer",
  field_officer: "Field Officer",
  advocacy_officer: "Advocacy Officer",
  technical_officer: "Technical Officer",
  faculty_advisor: "Faculty Advisor",
  works_dept: "Works Dept Liaison",
  applicant: "Applicant",
};

export function toRoleLabel(role: string | null | undefined) {
  if (!role) return "Member";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export function sortByRoleHierarchy<T extends { role: string; full_name?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const byRole = (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    if (byRole !== 0) return byRole;

    const aName = (a.full_name ?? "").toLowerCase();
    const bName = (b.full_name ?? "").toLowerCase();
    return aName.localeCompare(bName);
  });
}
