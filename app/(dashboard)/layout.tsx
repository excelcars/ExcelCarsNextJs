import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { Layout } from "@/components/Layout";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <Layout>{children}</Layout>;
}
