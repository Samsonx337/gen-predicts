"use client";
import { Metrics } from "@/components/metrics/Metrics";
import React from "react";
import MonthlySalesChart from "@/components/metrics/MonthlySalesChart";
import StatisticsChart from "@/components/metrics/StatisticsChart";
import RecentOrders from "@/components/metrics/RecentOrders";
import { QuickStats } from "@/components/metrics/QuickStats";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <Metrics />
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <QuickStats />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12">
        <RecentOrders />
      </div>
    </div>
  );
}
