"use client";

import dynamic from "next/dynamic";
import { ListPageLoading } from "@/components/ui/page-loading";

const ListDetailClient = dynamic(() => import("./list-detail-client"), {
  ssr: false,
  loading: () => <ListPageLoading />,
});

export default function ListDetailPage() {
  return <ListDetailClient />;
}
