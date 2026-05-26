import type { Metadata } from "next";
import React, { Suspense } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { MarketHero } from "@/components/market/MarketHero";
import { MarketsGrid } from "@/components/market/MarketsGrid";

export const metadata: Metadata = {
  title: "Markets | Gen Predicts",
  description: "Create and participate in GenLayer prediction markets.",
};

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Markets" />
      <MarketHero />
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading markets...</div>}>
        <MarketsGrid />
      </Suspense>
    </div>
  );
}

