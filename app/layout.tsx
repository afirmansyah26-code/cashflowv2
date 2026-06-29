import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  console.log("========== generateMetadata() ==========");

  try {
    console.log("Connecting to database...");

    const org = await prisma.organization_profile.findFirst({
      select: {
        app_name: true,
        subtitle: true,
        logo_path: true,
      },
    });

    console.log("Organization profile:", org);

    const appName = org?.app_name || "Aplikasi Keuangan";
    const subtitle = org?.subtitle || "Sistem manajemen keuangan";

    let logoUrl: string | undefined;

    if (org?.logo_path) {
      console.log("Original logo_path:", org.logo_path);

      if (org.logo_path.startsWith("/")) {
        logoUrl = org.logo_path;
      } else {
        logoUrl = `/uploads/${org.logo_path.replace(
          "storage/public/uploads/",
          ""
        )}`;
      }

      console.log("Resolved logo URL:", logoUrl);
    }

    console.log("Metadata generated successfully.");

    return {
      title: `${appName} - ${subtitle}`,
      description: subtitle,
      icons: logoUrl ? { icon: logoUrl } : undefined,
    };
  } catch (error) {
    console.error("====================================");
    console.error("generateMetadata() FAILED");
    console.error(error);

    if (error instanceof Error) {
      console.error("Message :", error.message);
      console.error("Stack   :", error.stack);
    }

    console.error("====================================");

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
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}