"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/existing/ui/resizable-navbar";
import { useState } from "react";
import Link from "next/link";

export function GenPredictsNavbar() {
  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "FAQs",
      link: "#faq",
    },
    {
      name: "Documentation",
      link: "https://docs.genlayer.com/",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            {/* <NavbarButton variant="secondary">Connect Wallet</NavbarButton> */}
            <NavbarButton
              as={Link}
              href="/dashboard"
              variant="primary"
            >
              Dashboard
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => {
              const handleMobileClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                if (item.link.startsWith('#')) {
                  e.preventDefault();
                  const element = document.querySelector(item.link);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
                setIsMobileMenuOpen(false);
              };
              
              return (
                <a
                  key={`mobile-link-${idx}`}
                  href={item.link}
                  onClick={handleMobileClick}
                  className="relative text-neutral-600 dark:text-neutral-300"
                >
                  <span className="block">{item.name}</span>
                </a>
              );
            })}
            <div className="flex w-full flex-col gap-4">
              {/* <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full"
              >
                Connect Wallet
              </NavbarButton> */}
              <NavbarButton
                as={Link}
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full"
              >
                Dashboard
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Navbar */}
    </div>
  );
}


