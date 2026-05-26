import Image from "next/image";
import Link from "next/link";

const stats = [
  { label: "Main contract", value: "0x87bC...5924" },
  { label: "Market token", value: "0x3c4f...b577" },
  { label: "Network", value: "GenLayer Studio" },
];

const workflow = [
  "Create a market with a source URL",
  "Participants back an outcome with GEN",
  "The intelligent contract reads the source",
  "Validators agree on the result on-chain",
];

const categories = ["Crypto", "Sports", "Finance", "Technology", "Politics", "Gaming"];

function MarkIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 40 40" fill="none">
      <path d="M20 4V36" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M4 20H36" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M8.69 8.69L31.31 31.31" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M31.31 8.69L8.69 31.31" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path d="M4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      <path d="M11.5 5.5L16 10L11.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span className="text-[#9AF0E3]">
              <MarkIcon />
            </span>
            <span className="text-xl font-semibold tracking-tight">Gen Predicts</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#markets" className="hover:text-white">Markets</a>
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="https://docs.genlayer.com/" target="_blank" rel="noreferrer" className="hover:text-white">
              Docs
            </a>
          </nav>
          <Link
            href="/dashboard/market"
            className="inline-flex h-11 items-center justify-center border border-[#9AF0E3] bg-[#9AF0E3] px-5 text-sm font-semibold text-[#07100e] transition hover:bg-white"
          >
            Open app
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-[#F2A33A]">
            Intelligent prediction markets
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-7xl">
            Resolve markets with AI consensus, not admin trust.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">
            Gen Predicts lets creators open factual markets and uses a GenLayer intelligent contract to read public
            sources, reason over outcomes, and settle the result on-chain.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/market"
              className="inline-flex h-12 items-center justify-center gap-2 border border-[#9AF0E3] bg-[#9AF0E3] px-6 text-sm font-semibold text-[#07100e] transition hover:bg-white"
            >
              Trade markets <ArrowIcon />
            </Link>
            <a
              href="https://docs.genlayer.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center border border-white/16 px-6 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Read GenLayer docs
            </a>
          </div>
        </div>

        <div className="border border-white/12 bg-[#0b1017] p-3">
          <div className="border border-white/10 bg-[#080c12] p-3">
            <Image
              src="/image1.png"
              alt="Gen Predicts market dashboard"
              width={1400}
              height={900}
              priority
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          <div className="grid border-x border-b border-white/10 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="border-t border-white/10 p-4 md:border-r md:last:border-r-0">
                <p className="text-xs uppercase tracking-[0.22em] text-white/38">{item.label}</p>
                <p className="mt-2 font-mono text-sm text-[#9AF0E3]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="markets" className="border-y border-white/10 bg-[#0a0e14]">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 py-12 md:grid-cols-3">
          <div className="border border-white/10 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Source based</p>
            <h2 className="mt-4 text-2xl font-semibold">Markets carry their own evidence link.</h2>
          </div>
          <div className="border border-white/10 p-6 md:border-l-0">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">AI resolved</p>
            <h2 className="mt-4 text-2xl font-semibold">The contract asks validators to verify the result.</h2>
          </div>
          <div className="border border-white/10 p-6 md:border-l-0">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">On-chain</p>
            <h2 className="mt-4 text-2xl font-semibold">Bets, pools, and outcomes stay visible on GenLayer.</h2>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#F2A33A]">Workflow</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              A short path from question to settlement.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className="border border-white/12 px-3 py-2 text-xs font-semibold text-white/70">
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-0 md:grid-cols-4">
          {workflow.map((step, index) => (
            <div key={step} className="border border-white/10 p-6 md:border-r-0 md:last:border-r">
              <p className="font-mono text-sm text-[#9AF0E3]">0{index + 1}</p>
              <p className="mt-8 min-h-20 text-xl font-semibold leading-7 text-white">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-white/52 md:flex-row">
          <p>Gen Predicts on GenLayer Studio</p>
          <p className="font-mono">Main 0x87bC6D1e5Ae83B8fe3e806b45Ffe96B4ED615924</p>
        </div>
      </footer>
    </main>
  );
}
