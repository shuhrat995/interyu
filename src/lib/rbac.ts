export type Role = "super_admin" | "admin" | "recruiter" | "editor" | "viewer";

export const ROLES: Role[] = ["super_admin", "admin", "recruiter", "editor", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  recruiter: "Rekruter",
  editor: "Muharrir",
  viewer: "Ko'ruvchi"
};

// Amallar kaliti: module:action
// TZ 4.3 matritsasi
export const PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  admin: [
    "question:create",
    "question:update",
    "question:delete",
    "topic:*",
    "question:import",
    "question:export",
    "interview:view",
    "interview:update",
    "audit:view",
    "ai:reprompts"
  ],
  recruiter: ["interview:view", "interview:update", "question:export"],
  editor: ["question:create", "question:update", "question:import", "question:export", "interview:view"],
  viewer: ["question:export", "interview:view"]
};

export function can(role: Role | undefined, perm: string): boolean {
  if (!role) return false;
  const list = PERMISSIONS[role] ?? [];
  if (list.includes("*")) return true;
  if (list.includes(perm)) return true;
  // "interview:view:own" eski sessiyalar uchun: interview:view bo'lsa ham o'tadi
  if (perm === "interview:view" && list.includes("interview:view:own")) return true;
  // wildcard: "topic:*" amallarga mos keladi
  const [mod] = perm.split(":");
  return list.includes(`${mod}:*`);
}

export function hasQuestionDelete(role: Role): boolean {
  return role === "super_admin" || role === "admin";
}
