"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { MoreDotIcon } from "../../icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useState, useEffect, useMemo } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { getBets, type Bet } from "@/lib/api";
import { useActiveAccount } from "thirdweb/react";
import { LoaderTwo } from "@/components/ui/loader";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlySalesChart() {
  const account = useActiveAccount();
  const userAddress = account?.address?.toLowerCase() || null;
  
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        setIsLoading(true);
        setHasFetched(false);
        const response = await getBets();
        if (response.success && response.data) {
          // Filter bets by user's wallet address
          if (userAddress) {
            const userBets = response.data.filter(
              (bet) => bet.bettor?.toLowerCase() === userAddress
            );
            setBets(userBets);
          } else {
            setBets([]);
          }
        } else {
          setBets([]);
        }
        setHasFetched(true);
      } catch (error) {
        console.error("Error fetching bets for chart:", error);
        setBets([]);
        setHasFetched(true);
      }
    };

    fetchBets();
  }, [userAddress]);

  // Wait for computed data to be ready before hiding loader
  useEffect(() => {
    if (hasFetched) {
      // Use requestAnimationFrame to ensure React has processed state updates
      // and useMemo has recalculated monthlyData
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsLoading(false);
        });
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [hasFetched, bets]);

  // Calculate monthly bets data
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyCounts = new Array(12).fill(0);

    // Group bets by month
    // Since we don't have a timestamp in the bet data, assign all bets to the current month
    if (bets.length > 0) {
      const currentMonth = new Date().getMonth(); // 0-11 (0 = January, 10 = November)
      monthlyCounts[currentMonth] = bets.length;
    }

    return monthlyCounts;
  }, [bets]);
  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  };
  const series = [
    {
      name: "Bets",
      data: monthlyData,
    },
  ];
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Monthly Bets Placed
        </h3>

        <div className="relative inline-block">
          <button onClick={toggleDropdown} className="dropdown-toggle">
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-[180px]">
              <LoaderTwo />
            </div>
          ) : (
            <ReactApexChart
              options={options}
              series={series}
              type="bar"
              height={180}
            />
          )}
        </div>
      </div>
    </div>
  );
}
