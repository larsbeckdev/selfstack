"use client";

import { icons, type LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
  iconUrl?: string | null;
}

export function DynamicIcon({ name, iconUrl, ...props }: DynamicIconProps) {
  if (iconUrl) {
    const size =
      props.className?.match(/size-(\d+)/)?.[1] ??
      (typeof props.size === "number" ? props.size : 16);
    return (
      <img
        src={iconUrl}
        alt={name}
        width={typeof size === "string" ? parseInt(size) * 4 : size}
        height={typeof size === "string" ? parseInt(size) * 4 : size}
        className={props.className}
        style={{ objectFit: "contain" }}
      />
    );
  }

  const pascalName = name
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
