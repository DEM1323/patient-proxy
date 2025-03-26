import AppLayout from "@/app/components/layouts/AppLayout";

export default function CreateProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
