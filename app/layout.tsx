import type { Metadata, Viewport } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mental Math Trainer",
  description: "Adaptive mental math drills: multiplication and addition sprints and ladders.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mental Math Trainer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAFBF7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* All routes are middleware-protected, so a user is always signed
              in here; UserButton renders nothing without one anyway. */}
          <div
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 16px)",
              right: 16,
              zIndex: 100,
            }}
          >
            <UserButton />
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
