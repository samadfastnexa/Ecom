import { AdminLayout } from "@/components/layout/AdminLayout";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
