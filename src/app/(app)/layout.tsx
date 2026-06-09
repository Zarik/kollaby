import { redirect } from "next/navigation";
import { getServerAuthPayload } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getServerAuthPayload();
  if (!payload) redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav teamNumber={payload.number} teamName={payload.name} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
