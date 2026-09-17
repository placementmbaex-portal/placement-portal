import type { Metadata, Viewport } from "next";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "IIM Calcutta MBAEx Placement Portal",
    template: "%s · MBAEx Placements",
  },
  description: "Placement noticeboard for the IIM Calcutta MBAEx cohort.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MBAEx",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

// themeColor lives here rather than in `metadata` -- Next.js moved it out
// of the Metadata API and warns on every build if it's left there, even
// though the two render the identical <meta name="theme-color"> tag.
// viewportFit: "cover" is what makes env(safe-area-inset-*) resolve to a
// real number on iOS at all -- without it the page never extends under
// the status bar/notch in the first place, so the header's inset padding
// would be inert.
export const viewport: Viewport = {
  themeColor: "#014488",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
