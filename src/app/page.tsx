import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-helper";

export default async function HomePage() {
  const session = await getAuthSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
