import AppLayout from "@/app/components/layouts/AppLayout";

export default function PatientProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
