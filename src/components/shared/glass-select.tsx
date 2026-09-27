"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type GlassSelectOption = { value: string; label: string };

export function GlassSelect({
  name,
  ariaLabel,
  options,
  value,
  defaultValue = "",
  onChange,
  disabled = false,
}: {
  name?: string;
  ariaLabel: string;
  options: GlassSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const selected = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected),
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const position = () => {
      if (!trigger.current || !menu.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 8;
      let bottom =
        (viewport?.offsetTop ?? 0) +
        (viewport?.height ?? window.innerHeight) -
        8;
      const navigation = document.querySelector(
        ".mobile-bottom-navigation:not(.mobile-bottom-navigation--hidden)",
      );
      if (navigation && navigation.getClientRects().length)
        bottom = Math.min(bottom, navigation.getBoundingClientRect().top - 16);
      const above = Math.max(0, rect.top - top - 6);
      const below = Math.max(0, bottom - rect.bottom - 6);
      const desired = Math.min(280, menu.current.scrollHeight);
      const upward = below < desired && above > below;
      menu.current.dataset.side = upward ? "top" : "bottom";
      menu.current.style.maxHeight = `${Math.min(280, upward ? above : below)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [isOpen]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (next: string) => {
    setInternalValue(next);
    onChange?.(next);
    setIsOpen(false);
    trigger.current?.focus();
  };

  return (
    <div
      ref={root}
      className={clsx("glass-select", isOpen && "glass-select--open")}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          setIsOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      {name ? (
        <input type="hidden" name={name} value={selected} disabled={disabled} />
      ) : null}
      <button
        ref={trigger}
        type="button"
        className="glass-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={id}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled || options.length === 0}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() =>
              optionRefs.current[selectedIndex]?.focus(),
            );
          }
        }}
      >
        <span>{options[selectedIndex]?.label ?? "—"}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div
          ref={menu}
          id={id}
          role="listbox"
          aria-label={ariaLabel}
          className="glass-select-menu"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={option.value === selected}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown")
                  next = (index + 1) % options.length;
                else if (event.key === "ArrowUp")
                  next = (index - 1 + options.length) % options.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = options.length - 1;
                else return;
                event.preventDefault();
                optionRefs.current[next]?.focus();
              }}
            >
              <span>{option.label}</span>
              {option.value === selected ? (
                <Check size={16} aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
