"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/app/client";
import { Menu, X } from "lucide-react";

type MenuItem = {
  name: string;
  path: string;
};

const menuItems: MenuItem[] = [
  { name: "Home", path: "/" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Create", path: "/create-item" },
  { name: "My NFTS", path: "/my-nfts" },
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState("Explore NFTs");
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (itemName: string) => {
    setActive(itemName);
    setIsOpen(false);
  };

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus trapping for accessibility
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const focusableElements = menuRef.current.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTabKey);
      firstElement?.focus();

      return () => document.removeEventListener("keydown", handleTabKey);
    }
  }, [isOpen]);

  return (
    <>
      <nav className="fixed top-0 min-w-full z-50 flex items-center justify-between px-6 py-4 bg-background border-b border-border shadow-sm">
        {/* Logo */}
        <Link href="/" onClick={() => handleMenuItemClick("Explore NFTs")}>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              width={40}
              height={40}
              alt="Alpha NFTs"
              className="object-contain rounded-full"
            />
            <span className="hidden sm:flex font-inter font-bold text-xl tracking-tight text-foreground">
              ALPHA NFT
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center fixed justify-center left-0 right-0 space-x-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`font-inter text-sm font-medium transition-colors hover:text-primary uppercase ${
                active === item.name ? "text-primary" : ""
              }`}
              onClick={() => setActive(item.name)}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right Section - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <div className="rounded-lg fixed right-2 text-white uppercase tracking-[10px] font-poppins font-extralight text-sm px-2 py-2 transition-all ">
            <ConnectButton client={client} />
          </div>
        </div>

        {/* Mobile Right Section */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={toggleMenu}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={`fixed top-[4.5rem] left-0 right-0 z-50 bg-background border-b border-border shadow-lg transform transition-all duration-300 ease-in-out md:hidden ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="px-6 py-4 space-y-4">
          {/* Mobile Navigation Links */}
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`block font-inter text-base font-medium transition-colors hover:text-primary uppercase py-2 ${
                active === item.name ? "text-primary" : ""
              }`}
              onClick={() => handleMenuItemClick(item.name)}
            >
              {item.name}
            </Link>
          ))}

          {/* Mobile Wallet Connection */}
          <div className="pt-4 border-t border-border">
            {/* <div className="flex items-center gap-4"> */}
              {/* <Image
                src="/logo.png"
                width={40}
                height={40}
                alt="Alpha NFTs"
                className="object-contain rounded-full"
              /> */}
              <div className="flex-1">
                <ConnectButton client={client} />
              </div>
            {/* </div> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;