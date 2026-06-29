import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const org = await prisma.organization_profile.findFirst({
      select: { app_name: true, subtitle: true, logo_path: true },
    });
    const appName = org?.app_name || "Aplikasi Keuangan";
    const subtitle = org?.subtitle || "Sistem manajemen keuangan";
    const logoUrl = org?.logo_path
      ? (org.logo_path.startsWith("/") ? org.logo_path : `/uploads/${org.logo_path.replace("storage/public/uploads/", "")}`)
      : undefined;

    return {
      title: `${appName} - ${subtitle}`,
      description: subtitle,
      icons: logoUrl ? { icon: logoUrl } : undefined,
    };
  } catch {
    return {
      title: "Aplikasi Keuangan",
      description: "Sistem manajemen keuangan",
    };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
