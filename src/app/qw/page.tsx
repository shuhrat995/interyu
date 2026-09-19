import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Kirish — AI Intervyu", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Admin panelga kirish: asosiy saytda havola yo'q, faqat /qw manzili orqali. */
export default async function AdminEntryPage() {
  const admins = await prisma.adminUser.count().catch(() => 1);
  return <LoginForm mode={admins === 0 ? "bootstrap" : "login"} />;
}
