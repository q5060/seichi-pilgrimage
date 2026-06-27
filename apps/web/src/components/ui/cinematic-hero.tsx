"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface CinematicHeroProps {
  imageUrl?: string | null;
  collageUrls?: string[];
  alt?: string;
  children: React.ReactNode;
  className?: string;
  height?: "sm" | "md" | "lg";
}

const heights = {
  sm: "min-h-[280px]",
  md: "min-h-[400px]",
  lg: "min-h-[520px]",
};

export function CinematicHero({
  imageUrl,
  collageUrls,
  alt = "",
  children,
  className,
  height = "md",
}: CinematicHeroProps) {
  const collage = collageUrls?.filter(Boolean).slice(0, 4) ?? [];

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        heights[height],
        className
      )}
    >
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-cover scale-105"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-40"
            style={{ backgroundImage: `url(${imageUrl})` }}
            aria-hidden
          />
        </>
      ) : collage.length > 0 ? (
        <div className="absolute inset-0 grid grid-cols-2">
          {collage.map((url, i) => (
            <div key={url} className="relative overflow-hidden">
              <Image
                src={url}
                alt=""
                fill
                className="object-cover scale-105"
                priority={i === 0}
                sizes="50vw"
              />
            </div>
          ))}
          {collage.length === 1 && <div className="bg-elevated" />}
          {collage.length === 3 && <div className="bg-elevated" />}
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-background to-primary/5" />
      )}

      {/* Top vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
      {/* Brand radial glow */}
      <div className="absolute inset-0 bg-brand-radial" />
      {/* Bottom content fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/25" />
      {/* Side fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-8 pt-24 md:px-8">
        {children}
      </div>
    </section>
  );
}
