import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Eski manzil — admin kirish endi /qw da. */
export default function LoginRedirect() {
  redirect("/qw");
}
