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

  useEffect(() => {
    const loadItemSpecificUOMs = async () => {
      try {
        const itemCode = item.item_code || item.id;
        if (itemCode) {
          const customerParam = selectedCustomer?.id
            ? `&customer=${selectedCustomer.id}`
            : "";
          const response = await fetch(
            `/api/method/klik_pos.api.item.item_details.get_item_uoms_and_prices?item_code=${itemCode}${customerParam}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data?.message?.uoms) {
              const uoms = data.message.uoms.map((uom: any) => uom.uom);
              setAvailableUOMs(uoms);
            } else {
              setAvailableUOMs(["Nos"]);
            }
          } else {
            setAvailableUOMs(["Nos"]);
          }
        } else {
          setAvailableUOMs(["Nos"]);
        }
      } catch (error) {
        console.error("❌ Error loading item-specific UOMs:", error);
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

  const handleUOMSelect = async (newUOM: string) => {
    setSelectedUOM(newUOM);
    setIsDropdownOpen(false);
    setSearchQuery("");

    try {
      const itemCode = item.item_code || item.id;
      if (itemCode) {
        const customerParam = selectedCustomer?.id
          ? `&customer=${selectedCustomer.id}`
          : "";
        const response = await fetch(
          `/api/method/klik_pos.api.item.item_details.get_item_uoms_and_prices?item_code=${itemCode}${customerParam}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data?.message?.uoms) {
            const selectedUOMData = data.message.uoms.find(
              (uom: any) => uom.uom === newUOM
            );
            if (selectedUOMData && selectedUOMData.price !== undefined) {
              console.log(`✅ Found UOM data for ${newUOM}:`, selectedUOMData);
              onUOMChange(item.id, newUOM, selectedUOMData.price);
            } else {
              console.warn(
                `⚠️ UOM data not found for ${newUOM}. Available UOMs:`,
                data.message.uoms.map((u: any) => u.uom)
              );
              try {
                const priceResponse = await fetch(
                  `/api/method/klik_pos.api.item.item_price.get_item_price_for_customer?item_code=${itemCode}&uom=${encodeURIComponent(newUOM)}${customerParam}`,
                  {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                  }
                );
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  if (
                    priceData?.message?.success &&
                    priceData.message.price > 0
                  ) {
                    console.log(
                      `✅ Got price from fallback API for ${newUOM}:`,
                      priceData.message.price
                    );
                    onUOMChange(item.id, newUOM, priceData.message.price);
                  }
                }
              } catch (fallbackError) {
                console.error(
                  `❌ Error in fallback price fetch for ${newUOM}:`,
                  fallbackError
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error fetching UOM pricing:", error);
    }
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