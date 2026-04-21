"use client";

import { useState, useEffect } from "react";
import type { CartItem } from "../../../types";

interface UOMSelectFieldProps {
  item: CartItem;
  onUOMChange: (itemId: string, selectedUOM: string, newPrice: number) => void;
  isMobile?: boolean;
  selectedCustomer?: { id: string } | null;
}

export const UOMSelectField = ({
  item,
  onUOMChange,
  isMobile,
  selectedCustomer,
}: UOMSelectFieldProps) => {
  const [availableUOMs, setAvailableUOMs] = useState<string[]>(["Nos"]);
  const [selectedUOM, setSelectedUOM] = useState<string>(item.uom || "Nos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const fetchUOMs = async (itemCode: string) => {
    try {
      const customerParam = selectedCustomer?.id
        ? `&customer=${encodeURIComponent(selectedCustomer.id)}`
        : "";
      const response = await fetch(
        `/api/method/frappe.desk.search.search_link?txt=&doctype=UOM&ignore_user_permissions=0&reference_doctype=&page_length=10&link_fieldname=uom&query=erpnext.controllers.queries.get_item_uom_query&filters=${encodeURIComponent(JSON.stringify({ item_code: itemCode }))}${customerParam}&_=${Date.now()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.message) {
          let uoms: string[] = [];
          if (Array.isArray(data.message)) {
            uoms = data.message.map((uom: any) => uom.value || uom.uom || uom);
          } else if (data.message?.uoms && Array.isArray(data.message.uoms)) {
            uoms = data.message.uoms.map((uom: any) => uom.uom || uom);
          }
          if (uoms.length > 0) {
            setAvailableUOMs(uoms);
            return;
          }
        }
      }
      setAvailableUOMs(["Nos"]);
    } catch (error) {
      console.error("Error loading item-specific UOMs:", error);
      setAvailableUOMs(["Nos"]);
    }
  };

  useEffect(() => {
    const loadItemSpecificUOMs = async () => {
      const itemCode = item.item_code || item.id;
      if (itemCode) {
        await fetchUOMs(itemCode);
      } else {
        setAvailableUOMs(["Nos"]);
      }
    };

    loadItemSpecificUOMs();
  }, [item.id, item.item_code, selectedCustomer?.id]);

  useEffect(() => {
    setSelectedUOM(item.uom || "Nos");
  }, [item.uom]);

  const filteredUOMs = availableUOMs.filter((uom) =>
    uom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUOMSelect = (newUOM: string) => {
    setSelectedUOM(newUOM);
    setIsDropdownOpen(false);
    setSearchQuery("");
    onUOMChange(item.id, newUOM, item.price);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`w-full ${
          isMobile ? "text-sm" : "text-sm"
        } px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left flex items-center justify-between`}
      >
        <span>{selectedUOM}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
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

      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <input
              type="text"
              placeholder="Search UOM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredUOMs.length > 0 ? (
              filteredUOMs.map((uom) => (
                <button
                  key={uom}
                  type="button"
                  onClick={() => handleUOMSelect(uom)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    uom === selectedUOM
                      ? "bg-beveren-50 dark:bg-beveren-900/20 text-beveren-600 dark:text-beveren-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {uom}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No UOMs found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};