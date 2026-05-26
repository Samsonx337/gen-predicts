"use client";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How do I resolve a market?",
    answer:
      "Only the market creator can resolve a market after its deadline has passed. When the deadline expires, you'll see a 'Resolve' button on your market. Click it to trigger the resolution process, which uses AI reasoning based on the resolution URL you provided when creating the market. The system will automatically determine the outcome and distribute winnings to participants.",
  },
  {
    question: "How do I create a prediction market?",
    answer:
      "Click the 'Create Market' button on the homepage or dashboard. Fill in the market question, select a category, set an end date, define your options (typically 'Yes' and 'No'), set the price per share in GEN tokens, and optionally add an image and resolution URL. Once created, your market will appear in the markets list where others can participate.",
  },
  {
    question: "How do I place a bet on a market?",
    answer:
      "Browse the available markets and click on one that interests you. Connect your wallet if you haven't already, ensure you have enough GEN tokens (at least the market's price per share), then click either 'YES' or 'NO' to place your bet. Your bet amount will be deducted from your wallet, and you'll receive shares in the outcome you chose.",
  },
  {
    question: "What happens when a market is resolved?",
    answer:
      "When a market is resolved, the AI system analyzes the resolution URL and determines the correct outcome. Participants who bet on the winning option will receive their share of the total pool proportional to their bet amount. The market will show as 'Resolved' and display the winning result. All participants can then see the final outcome and their winnings.",
  },
  {
    question: "Can I resolve my market before the deadline?",
    answer:
      "No, markets can only be resolved after their deadline has passed. This ensures fairness and gives all participants a chance to place their bets. Once the deadline expires, the market creator will see a 'Resolve' button and can trigger the resolution process.",
  },
  {
    question: "What is a resolution URL?",
    answer:
      "A resolution URL is an optional link you provide when creating a market that points to a source of truth for determining the market's outcome. When the market is resolved, the AI system uses this URL to analyze and determine which option won. It could be a news article, official announcement, or any verifiable source of information.",
  },
  {
    question: "How are winnings calculated?",
    answer:
      "Winnings are distributed proportionally based on your bet amount relative to the total pool for the winning option. If you bet 10 GEN on 'YES' and the total 'YES' pool is 100 GEN, you own 10% of the winning pool. When the market resolves in favor of 'YES', you'll receive your share of the total winnings pool.",
  },
  {
    question: "What happens if I don't have enough GEN tokens?",
    answer:
      "You need at least the market's price per share in GEN tokens to place a bet. If your balance is insufficient, you'll see a warning message indicating how much GEN you need. All EVM addresses are supported and will show 0 balance by default if they don't have GEN tokens.",
  },
  {
    question: "Can I cancel or change my bet?",
    answer:
      "No, once you place a bet, it cannot be canceled or changed. This ensures the integrity of the prediction market. Make sure you're confident in your prediction before placing your bet.",
  },
  {
    question: "What categories are available for markets?",
    answer:
      "You can create markets in various categories including Crypto, Sports, Gaming, Politics, Technology, Finance, and Other. Each category helps organize markets and makes it easier for users to find predictions they're interested in.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative w-full py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Everything you need to know about creating, participating in, and resolving prediction markets on Gen Predicts.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-700"
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none rounded-lg bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 pr-8 group-hover:text-neutral-900 dark:group-hover:text-neutral-50 transition-colors">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180 text-neutral-900 dark:text-neutral-100" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-5 pt-2">
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Still have questions?
          </p>
          <a
            href="https://docs.genlayer.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-lg transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            View Documentation
          </a>
        </div>
      </div>
    </section>
  );
}

