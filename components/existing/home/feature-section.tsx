import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSection() {
  const features = [
    {
      title: "AI-Native Blockchain",
      description:
        "Powered by Genlayer's AI-native infrastructure. Intelligent contracts process natural language and make autonomous decisions on-chain.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Real-Time Web Data",
      description:
        "Genlayer enables contracts to fetch live web data directly on-chain. Markets update instantly with real-world information, no oracles needed.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Intelligent Contracts",
      description:
        "Built on GenVM, our contracts interpret unstructured data and adapt to real-world events. Python-based development for maximum flexibility.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Optimistic Democracy",
      description:
        "Leveraging Genlayer's enhanced dPoS consensus. Validators with diverse AI models reach consensus on complex, context-aware decisions.",
      icon: <IconCloud />,
    },
    {
      title: "Autonomous Markets",
      description:
        "Markets can automatically resolve based on real-time data analysis. AI evaluates outcomes and executes settlements without manual intervention.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Unstructured Data Processing",
      description:
        "Genlayer processes text, images, and complex data structures. Create markets on any event with rich context and nuanced evaluation.",
      icon: <IconHelp />,
    },
    {
      title: "Python Development",
      description:
        "Write contracts in Python on GenVM. Familiar syntax, powerful AI integration, and seamless access to web data and AI models.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "AI-Governed Ecosystem",
      description:
        "Join the future of decentralized prediction markets. Built on Genlayer's AI-native infrastructure for truly autonomous operations.",
      icon: <IconHeart />,
    },
  ];
  return (
    <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-neutral-100/80 dark:bg-neutral-800/80 pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-neutral-100/80 dark:bg-neutral-800/80 pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
