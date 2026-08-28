import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { Layout } from "@/components/Layout";
import { getAccessibleRoutesFromFunctionNames, getCurrentUserAccessProfile } from "@/lib/access/accessControl";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const profile = await getCurrentUserAccessProfile()
  const accessibleRoutes = profile ? getAccessibleRoutesFromFunctionNames(profile.grantedFunctionNames) : []

  return <Layout accessibleRoutes={accessibleRoutes}>{children}</Layout>;
}
