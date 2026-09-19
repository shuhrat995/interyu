import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromToken, COOKIE_NAME, type SessionData } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session: SessionData | null = token ? await getSessionFromToken(token) : null;
  if (!session) redirect("/login");
  return <AdminShell session={session}>{children}</AdminShell>;
}
