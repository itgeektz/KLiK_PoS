"use client"

import { useEffect, useState, useRef } from "react"
import type { MenuItem } from "../../types"

interface Batch {
  batch_id: string
  qty: number
  expiry_date?: string
}

interface PriceListEntry {
  price_list: string
  rate: number
  currency?: string
  uom?: string
  customer?: string
  note?: string
}

interface ItemFullData {
  item_name: string
  item_code: string
  standard_rate: number
  valuation_rate: number
  price_lists: PriceListEntry[]
  batches: Batch[]
  uom: string
  brand?: string
}

interface ProductTooltipProps {
  item: MenuItem
  warehouse?: string
  onClose: () => void
  onViewDetails: (item: MenuItem) => void
}

export default function ProductTooltip({ item, warehouse = "Stores", onClose, onViewDetails }: ProductTooltipProps) {
  const [data, setData] = useState<ItemFullData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFullData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/method/klik_pos.api.item.get_full_pricing_and_batch_details?item_code=${encodeURIComponent(item.id)}&warehouse=${encodeURIComponent(warehouse)}`
        )
        const res = await response.json()
        if (res?.message) setData(res.message)
      } catch (error) {
        console.error("Tooltip fetch failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFullData()
  }, [item.id, warehouse])

  const costPrice = data?.valuation_rate || data?.standard_rate || item.cost_price || 0

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    onViewDetails(item)
    onClose()
  }

  return (
    <div 
      ref={tooltipRef}
      className="absolute z-[100] w-80 bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-4 border border-gray-200 dark:border-gray-700 top-full left-0 -mt-2 text-left"
    >
      <div className="border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">
        <h3 className="font-bold text-gray-900 dark:text-white leading-tight truncate">{item.name}</h3>
        <p className="text-[10px] text-gray-400 font-mono">{item.id}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-6">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Syncing...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
              <p className="text-[9px] text-gray-500 uppercase font-black">Cost</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {item.currency_symbol}{costPrice.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
              <p className="text-[9px] text-gray-500 uppercase font-black">Retail</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {item.currency_symbol}{item.price.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <p className="text-[9px] text-green-600 dark:text-green-400 uppercase font-black">Profit</p>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">
                {item.currency_symbol}{(item.price - costPrice).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Price Lists</p>
            <div className="space-y-1">
              {data?.price_lists?.slice(0, 3).map((pl, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{pl.price_list}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {item.currency_symbol}{pl.rate.toFixed(2)}
                  </span>
                </div>
              ))}
              {data?.price_lists && data.price_lists.length > 3 && (
                <div className="text-[10px] text-gray-400 text-center pt-1">
                  +{data.price_lists.length - 3} more price lists
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Warehouse Batches</p>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
              {data?.batches?.slice(0, 2).map((b, i) => (
                <div key={i} className="flex justify-between text-[11px] p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-100 dark:border-gray-600">
                  <span className="font-mono text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{b.batch_id}</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{b.qty}</span>
                </div>
              ))}
              {data?.batches && data.batches.length > 2 && (
                <div className="text-[10px] text-gray-400 text-center pt-1">
                  +{data.batches.length - 2} more batches
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleViewDetails}
            className="w-full mt-2 text-center text-xs font-semibold text-beveren-600 dark:text-beveren-400 hover:text-beveren-700 dark:hover:text-beveren-300 py-1.5 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-b transition-colors"
          >
            View Full Details →
          </button>
        </div>
      )}
    </div>
  )
}