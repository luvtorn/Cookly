"use client";

import Link from "next/link";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const close = () => {
    setIsOpen(false);
    toggle.current?.focus();
  };

  return (
    <div
      className="mobile-navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) close();
      }}
    >
      <button
        ref={toggle}
        className="icon-button"
        type="button"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mobile-menu glass"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <Link href="/" onClick={close}>
              Home
            </Link>
            <Link href="/#recipes" onClick={close}>
              Discover recipes
            </Link>
            <Link href="/#categories" onClick={close}>
              Explore categories
            </Link>
            <Link href="/#pantry" onClick={close}>
              Pantry
            </Link>
            <span className="mobile-menu-note">A taste of what’s cooking.</span>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
