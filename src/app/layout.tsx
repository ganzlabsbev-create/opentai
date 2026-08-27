import Script from "next/script";
import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/hooks/useTheme";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthSessionProvider } from "@/features/auth/store/AuthSessionProvider";
import { SettingsProvider } from "@/features/settings/store/SettingsProvider";
import { ConversationsProvider } from "@/features/chat/store/ConversationsProvider";
import { ModelSelectionProvider } from "@/features/models/store/ModelSelectionProvider";
import { FilesProvider } from "@/features/files/store/FilesProvider";
import { ProjectsProvider } from "@/features/projects/store/ProjectsProvider";
import { DrawerProvider } from "@/components/layout/DrawerProvider";
import { AppFrame } from "@/components/layout/AppFrame";

export const metadata: Metadata = {
  title: "OpenTai",
  description: "Client-first, serverless, provider-agnostic AI workspace",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthSessionProvider>
              <SettingsProvider>
                <ConversationsProvider>
                  <ModelSelectionProvider>
                    <FilesProvider>
                      <ProjectsProvider>
                        <DrawerProvider>
                          <AppFrame>{children}</AppFrame>
                        </DrawerProvider>
                      </ProjectsProvider>
                    </FilesProvider>
                  </ModelSelectionProvider>
                </ConversationsProvider>
              </SettingsProvider>
            </AuthSessionProvider>
          </ToastProvider>
        </ThemeProvider>
        {/* Puter SDK — client-only, entirely separate from GitHub Login above.
            lazyOnload so it never blocks initial render; usePuterChat checks
            `window.puter` before use. */}
        <Script src="https://js.puter.com/v2/" strategy="lazyOnload" />
      </body>
    </html>
  );
}
