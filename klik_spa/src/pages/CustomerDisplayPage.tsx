import { useEffect, useRef, useState } from "react";
import {
  customerDisplayService,
  type CustomerDisplaySnapshot,
} from "../services/customerDisplayService";

function money(currency: string, amount: number) {
  return `${currency} ${Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerDisplayPage() {
  const [snapshot, setSnapshot] = useState<CustomerDisplaySnapshot>(customerDisplayService.getSnapshot());
  const itemListRef = useRef<HTMLDivElement>(null);

  useEffect(() => customerDisplayService.subscribe(setSnapshot), []);

  const isIdle = snapshot.mode === "idle";
  const isSuccess = snapshot.mode === "success";
  const hasItemDiscount = Number(snapshot.itemDiscountTotal || 0) > 0;
  const hasBillDiscount = Number(snapshot.billDiscount || 0) > 0;
  const hasLoyaltyDiscount = Number(snapshot.loyaltyDiscount || 0) > 0;

  useEffect(() => {
    if (snapshot.mode !== "cart" && snapshot.mode !== "checkout") return;
    itemListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [snapshot.updatedAt, snapshot.mode]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-white flex flex-col antialiased">
      <header className="shrink-0 px-[clamp(1rem,2.5vw,2.5rem)] py-[clamp(0.75rem,2vh,1.5rem)] border-b border-slate-700 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-[clamp(1.5rem,2.4vw,2.5rem)] leading-tight font-bold">Virdi Pharmacy</h1>
          <p className="text-[clamp(0.8rem,1.2vw,1.1rem)] text-slate-400 mt-1">Customer display</p>
        </div>
        {snapshot.customerName && <p className="max-w-[45vw] truncate text-[clamp(1rem,1.7vw,1.5rem)] text-slate-200">{snapshot.customerName}</p>}
      </header>

      {isIdle ? (
        <section className="flex-1 flex flex-col items-center justify-center text-center p-10">
          <h2 className="text-[clamp(3rem,7vw,6rem)] font-bold tracking-tight">Welcome</h2>
          <p className="text-[clamp(1.25rem,2.5vw,2rem)] text-slate-400 mt-5">Thank you for choosing Virdi Pharmacy</p>
        </section>
      ) : isSuccess ? (
        <section className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-emerald-950/40">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-6xl mb-7">✓</div>
          <h2 className="text-6xl font-bold">Thank you!</h2>
          <p className="text-3xl text-emerald-300 mt-5">Payment completed successfully</p>
          {snapshot.change > 0 && (
            <div className="mt-10">
              <p className="text-2xl text-slate-300">Change</p>
              <p className="text-6xl font-bold text-amber-300 mt-2">{money(snapshot.currency, snapshot.change)}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="flex-1 grid grid-cols-[minmax(0,68fr)_minmax(300px,32fr)] min-h-0 overflow-hidden">
          <div ref={itemListRef} className="min-h-0 p-[clamp(0.75rem,1.8vw,1.5rem)] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-10 bg-slate-950 grid grid-cols-[minmax(0,1fr)_clamp(55px,7vw,100px)_clamp(115px,13vw,170px)] gap-[clamp(0.5rem,1.5vw,1rem)] pb-3 border-b border-slate-700 text-slate-400 text-[clamp(0.7rem,1vw,0.9rem)] uppercase tracking-wide">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-800">
              {snapshot.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_clamp(55px,7vw,100px)_clamp(115px,13vw,170px)] gap-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.55rem,1.25vh,0.9rem)] items-center">
                  <div className="min-w-0">
                    <p className="truncate text-[clamp(0.95rem,1.45vw,1.3rem)] leading-tight font-semibold">{item.name}</p>
                    <p className="truncate text-[clamp(0.7rem,1vw,0.95rem)] text-slate-400 mt-1">
                      {Number(item.itemDiscount || 0) > 0 && item.originalUnitPrice ? (
                        <>
                          <span className="line-through mr-2">{money(snapshot.currency, item.originalUnitPrice)}</span>
                          <span className="text-emerald-300">{money(snapshot.currency, item.unitPrice)}</span>
                        </>
                      ) : (
                        money(snapshot.currency, item.unitPrice)
                      )}
                      {item.uom ? ` / ${item.uom}` : " each"}
                    </p>
                    {Number(item.itemDiscount || 0) > 0 && (
                      <p className="truncate text-[clamp(0.68rem,0.95vw,0.9rem)] text-emerald-300 mt-1">
                        Item discount: -{money(snapshot.currency, Number(item.itemDiscount || 0))}
                      </p>
                    )}
                  </div>
                  <p className="text-right text-[clamp(0.95rem,1.5vw,1.35rem)]">{item.quantity}</p>
                  <div className="text-right">
                    {Number(item.itemDiscount || 0) > 0 && item.originalLineTotal ? (
                      <p className="text-[clamp(0.68rem,0.95vw,0.85rem)] text-slate-500 line-through">{money(snapshot.currency, item.originalLineTotal)}</p>
                    ) : null}
                    <p className="text-[clamp(0.95rem,1.5vw,1.35rem)] font-semibold">{money(snapshot.currency, item.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="h-full min-h-0 bg-slate-900 p-[clamp(0.85rem,2vw,1.6rem)] flex flex-col justify-center md:border-l border-t md:border-t-0 border-slate-700 overflow-hidden">
            <div className="space-y-[clamp(0.45rem,1.2vh,0.8rem)] text-[clamp(0.9rem,1.35vw,1.2rem)]">
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{money(snapshot.currency, snapshot.subtotal)}</span></div>
              {hasItemDiscount && <div className="flex justify-between text-emerald-300"><span>Item discounts</span><span>-{money(snapshot.currency, Number(snapshot.itemDiscountTotal || 0))}</span></div>}
              {hasBillDiscount && <div className="flex justify-between text-emerald-300"><span>Bill discount</span><span>-{money(snapshot.currency, Number(snapshot.billDiscount || 0))}</span></div>}
              {hasLoyaltyDiscount && <div className="flex justify-between text-emerald-300"><span>Loyalty</span><span>-{money(snapshot.currency, Number(snapshot.loyaltyDiscount || 0))}</span></div>}
              {!hasItemDiscount && !hasBillDiscount && !hasLoyaltyDiscount && snapshot.discount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>-{money(snapshot.currency, snapshot.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Tax</span><span>{money(snapshot.currency, snapshot.tax)}</span></div>
              <div className="flex justify-between gap-4 pt-4 border-t border-slate-600 text-[clamp(1.35rem,2.05vw,1.85rem)] font-bold"><span>Total</span><span className="text-right">{money(snapshot.currency, snapshot.payableTotal)}</span></div>
              {snapshot.mode === "checkout" && (
                <>
                  <div className="flex justify-between pt-4"><span className="text-slate-400">Paid</span><span className="text-blue-300">{money(snapshot.currency, snapshot.paid)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Due</span><span>{money(snapshot.currency, snapshot.outstanding)}</span></div>
                  <div className="flex justify-between gap-4 text-[clamp(1.15rem,1.8vw,1.55rem)] font-bold text-amber-300"><span>Change</span><span className="text-right">{money(snapshot.currency, snapshot.change)}</span></div>
                </>
              )}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
