import { Suspense } from "react";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-md">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
