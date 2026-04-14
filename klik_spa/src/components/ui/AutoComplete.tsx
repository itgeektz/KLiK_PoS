"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "lucide-react";

interface AutoCompleteProps {
  options: { label: string; value: string; extra?: any }[];
  value: string;
  onChange: (val: string, extra?: any) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export const AutoComplete = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
}: AutoCompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">("bottom");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      calculateDropdownPosition();
    }
  }, [isOpen]);

  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      setDropdownPosition("top");
    } else {
      setDropdownPosition("bottom");
    }
  };

  const filteredOptions = options.filter((opt) =>
    (opt?.label ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const dropdown = isOpen && !disabled ? (
    <div
      style={{
        position: "fixed",
        top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 6 : 0,
        left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
        width: buttonRef.current ? buttonRef.current.getBoundingClientRect().width : 300,
        zIndex: 999999,
      }}
      className={`
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-xl shadow-2xl
        overflow-hidden
      `}
    >
      <div className="p-2 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg outline-none"
            placeholder="Search..."
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => {
                onChange(opt.value, opt.extra);
                setIsOpen(false);
                setSearch("");
              }}
              className={`
                px-3 py-2 cursor-pointer text-sm flex justify-between
                hover:bg-gray-100 dark:hover:bg-gray-800
                ${opt.value === value ? "bg-blue-50 dark:bg-blue-900/30" : ""}
              `}
            >
              <div>
                <div className="font-medium">{opt.label}</div>
                {opt.extra && (
                  <div className="text-xs text-gray-500">{opt.extra}</div>
                )}
              </div>
              {opt.value === value && <Check className="w-4 h-4" />}
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            No results
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full h-11 px-4
          border rounded-xl cursor-pointer bg-white dark:bg-gray-950
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span className="truncate text-sm text-gray-700 dark:text-gray-200">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
};