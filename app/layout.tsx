import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import DynamicMeta from "@/components/dynamic-meta";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const org = await prisma.organization_profile.findFirst({
      select: {
        app_name: true,
        subtitle: true,
        logo_path: true,
      },
    });

    const appName = org?.app_name ?? "Aplikasi Keuangan";
    const subtitle = org?.subtitle ?? "Sistem manajemen keuangan";

    let logoUrl: string | undefined;

    if (org?.logo_path) {
      if (org.logo_path.startsWith("/")) {
        logoUrl = org.logo_path;
      } else {
        logoUrl = `/uploads/${org.logo_path
          .replace("storage/public/", "")
          .replace("public/uploads/", "")}`;
      }
    }

    return {
      title: `${appName} - ${subtitle}`,
      description: subtitle,
      icons: logoUrl ? { icon: logoUrl } : undefined,
    };
  } catch (error) {
    console.error("generateMetadata() failed:", error);

    return {
      title: "Aplikasi Keuangan",
      description: "Sistem manajemen keuangan",
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        {/* Sinkronisasi title & favicon setelah aplikasi berjalan */}
        <DynamicMeta />

        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}