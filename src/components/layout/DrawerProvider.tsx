"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Drawer } from "@/components/layout/Drawer";

interface DrawerCtxValue {
  openDrawer: () => void;
}

const DrawerContext = createContext<DrawerCtxValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setOpen(true) }}>
      {children}
      <Drawer open={open} onClose={() => setOpen(false)} />
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within DrawerProvider");
  return ctx;
}
