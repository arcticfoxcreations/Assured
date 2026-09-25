import { Header } from "@/components/shell/Header";
import { MobileNav } from "@/components/shell/MobileNav";
import { Footer } from "@/components/shell/Footer";
import { MewviLauncher } from "@/components/mewvi/MewviLauncher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <MewviLauncher />
    </div>
  );
}
