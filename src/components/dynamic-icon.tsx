"use client";

import { icons, type LucideProps } from "lucide-react";
import * as TablerIcons from "@tabler/icons-react";

interface DynamicIconProps extends LucideProps {
  name: string;
  iconUrl?: string | null;
}

const SELFHST_BASE = "https://cdn.jsdelivr.net/gh/selfhst/icons/svg";

function selfhstUrl(name: string) {
  return `${SELFHST_BASE}/${name}.svg`;
}

function tablerComponent(name: string) {
  // Convert kebab-case to PascalCase, e.g. "brand-github" -> "IconBrandGithub"
  const pascal = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const key = `Icon${pascal}` as keyof typeof TablerIcons;
  const Icon = TablerIcons[key];
  // Tabler components are React.forwardRef objects (typeof === "object").
  // Accept any truthy export that isn't a plain primitive.
  if (!Icon) return undefined;
  if (typeof Icon !== "function" && typeof Icon !== "object") return undefined;
  return Icon as unknown as React.ComponentType<LucideProps>;
}

export function DynamicIcon({ name, iconUrl, ...props }: DynamicIconProps) {
  let resolvedUrl = iconUrl;
  if (!resolvedUrl && name?.startsWith("selfhst:")) {
    resolvedUrl = selfhstUrl(name.slice("selfhst:".length));
  }

  if (resolvedUrl) {
    const size =
      props.className?.match(/size-(\d+)/)?.[1] ??
      (typeof props.size === "number" ? props.size : 16);
    return (
      <img
        src={resolvedUrl}
        alt={name}
        width={typeof size === "string" ? parseInt(size) * 4 : size}
        height={typeof size === "string" ? parseInt(size) * 4 : size}
        className={props.className}
        style={{ objectFit: "contain" }}
      />
    );
  }

  if (name?.startsWith("tabler:")) {
    const Icon = tablerComponent(name.slice("tabler:".length));
    if (Icon) return <Icon {...props} />;
  }

  const pascalName = name
    .replace(/^lucide:/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof icons;

  const Icon = icons[pascalName];

  if (!Icon) {
    const FallbackIcon = icons["Square"];
    return <FallbackIcon {...props} />;
  }

  return <Icon {...props} />;
}
