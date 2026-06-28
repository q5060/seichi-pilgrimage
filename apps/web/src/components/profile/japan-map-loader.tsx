"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const JapanMap = dynamic(
  () => import("./japan-map").then((m) => ({ default: m.JapanMap })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
  }
);
