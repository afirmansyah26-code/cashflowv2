"use client";
import { useEffect } from "react";

export default function DynamicMeta() {
  useEffect(() => {
    fetch("/api/app-meta")
      .then((r) => r.json())
      .then((d) => {
        // Update page title
        if (d.app_name) {
          document.title = d.app_name + (d.subtitle ? ` - ${d.subtitle}` : "");
        }

        // Update favicon to org logo
        if (d.logo_path) {
          const logoUrl = d.logo_path.startsWith("/")
            ? d.logo_path
            : `/uploads/${d.logo_path.replace("public/uploads/", "")}`;

          let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = logoUrl;
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
