export async function generateMetadata(): Promise<Metadata> {
  try {
    const org = await prisma.organization_profile.findFirst({
      select: { app_name: true, subtitle: true, logo_path: true },
    });

    const appName = org?.app_name || "Aplikasi Keuangan";
    const subtitle = org?.subtitle || "Sistem manajemen keuangan";
    const logoUrl = org?.logo_path
      ? (
          org.logo_path.startsWith("/")
            ? org.logo_path
            : `/uploads/${org.logo_path.replace("public/uploads/", "")}`
        )
      : undefined;

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