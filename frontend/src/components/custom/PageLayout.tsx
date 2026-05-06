import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className="bg-[var(--background)]">
      <main
        id="main"
        className={cn(
          "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
