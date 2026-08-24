import type { ReactNode } from "react";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-screen w-full max-w-[480px] flex-col overflow-hidden bg-bg text-text shadow-md">
      {children}
    </div>
  );
}
