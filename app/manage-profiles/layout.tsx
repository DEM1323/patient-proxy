import AppLayout from "@/app/components/layouts/AppLayout";

export default function ManageProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
