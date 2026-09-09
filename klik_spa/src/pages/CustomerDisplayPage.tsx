import { useEffect, useState } from "react";
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

  useEffect(() => customerDisplayService.subscribe(setSnapshot), []);

  const isIdle = snapshot.mode === "idle";
  const isSuccess = snapshot.mode === "success";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Virdi Pharmacy</h1>
          <p className="text-slate-400 mt-1">Customer display</p>
        </div>
        {snapshot.customerName && <p className="text-xl text-slate-200">{snapshot.customerName}</p>}
      </header>

      {isIdle ? (
        <section className="flex-1 flex flex-col items-center justify-center text-center p-10">
          <h2 className="text-6xl font-bold tracking-tight">Welcome</h2>
          <p className="text-2xl text-slate-400 mt-5">Thank you for choosing Virdi Pharmacy</p>
        </section>
      ) : isSuccess ? (
        <section className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-emerald-950/40">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-6xl mb-7">✓</div>
          <h2 className="text-6xl font-bold">Thank you!</h2>
          <p className="text-3xl text-emerald-300 mt-5">Payment completed successfully</p>
          {snapshot.invoiceName && <p className="text-xl text-slate-300 mt-4">Invoice {snapshot.invoiceName}</p>}
          {snapshot.change > 0 && (
            <div className="mt-10">
              <p className="text-2xl text-slate-300">Change</p>
              <p className="text-6xl font-bold text-amber-300 mt-2">{money(snapshot.currency, snapshot.change)}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] min-h-0">
          <div className="p-8 overflow-auto">
            <div className="grid grid-cols-[1fr_100px_150px] gap-4 pb-3 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wide">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-800">
              {snapshot.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_100px_150px] gap-4 py-5 items-center">
                  <div>
                    <p className="text-2xl font-semibold">{item.name}</p>
                    <p className="text-slate-400 mt-1">{money(snapshot.currency, item.unitPrice)} {item.uom ? `/ ${item.uom}` : "each"}</p>
                  </div>
                  <p className="text-right text-2xl">{item.quantity}</p>
                  <p className="text-right text-2xl font-semibold">{money(snapshot.currency, item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="bg-slate-900 p-8 flex flex-col justify-end border-l border-slate-700">
            <div className="space-y-4 text-xl">
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{money(snapshot.currency, snapshot.subtotal)}</span></div>
              {snapshot.discount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>-{money(snapshot.currency, snapshot.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Tax</span><span>{money(snapshot.currency, snapshot.tax)}</span></div>
              <div className="flex justify-between pt-5 border-t border-slate-600 text-3xl font-bold"><span>Total</span><span>{money(snapshot.currency, snapshot.payableTotal)}</span></div>
              {snapshot.mode === "checkout" && (
                <>
                  <div className="flex justify-between pt-5"><span className="text-slate-400">Paid</span><span className="text-blue-300">{money(snapshot.currency, snapshot.paid)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Due</span><span>{money(snapshot.currency, snapshot.outstanding)}</span></div>
                  <div className="flex justify-between text-2xl font-bold text-amber-300"><span>Change</span><span>{money(snapshot.currency, snapshot.change)}</span></div>
                </>
              )}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}