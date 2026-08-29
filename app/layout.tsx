import type { Metadata, Viewport } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import "./globals.css";

const TITLE = "Mental Math Trainer";
const DESCRIPTION =
  "Adaptive mental math drills: multiplication and addition sprints and ladders.";

// Absolute base for the generated og:image / twitter:image URLs. Without it
// Next falls back to the per-deployment VERCEL_URL, which changes every push.
export const metadata: Metadata = {
  metadataBase: new URL("https://mental-math-trainer-theta.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: TITLE,
  },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
