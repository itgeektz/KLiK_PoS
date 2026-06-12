# Returns

Klik POS uses ERPNext return Sales Invoices. A return invoice has `is_return = 1` and references the original Sales Invoice through `return_against`.

Returns are controlled by POS Profile `Allow Return`. If disabled, the return APIs are blocked.

## Full Return

Use a full return when all items from the original invoice are returned.

1. Open the invoice from Closing Shift or Invoice History.
2. Select the return action.
3. Klik POS maps the original Sales Invoice to a return Sales Invoice.
4. Item quantities are made negative.
5. Payment rows are copied as refund rows.
6. The return Sales Invoice is submitted.

The response returns the created return invoice name.

## Partial Return

Use a partial return when only some quantities are returned.

1. Open the return dialog for the original invoice.
2. Select item quantities to return.
3. Select the refund payment method.
4. Enter or confirm the refund amount.
5. Submit the return.

Klik POS:

- Loads original invoice items.
- Calculates previously returned quantities.
- Restricts available quantities based on submitted returns.
- Creates a mapped return Sales Invoice.
- Keeps only selected returned item rows.
- Sets negative quantities.
- Adds a refund payment row.
- Submits the return Sales Invoice.

## Multi-Invoice Return

Klik POS can create multiple return invoices from a multi-invoice return payload. Each original invoice is processed through the partial return workflow. The API returns the list of created return invoice names.

## Quantity Restrictions

Returned quantity is calculated from submitted return Sales Invoices for the same customer, original invoice, and item code. Available quantity is:

```text
Original Quantity - Already Returned Quantity
```

## Payment Refund Behavior

Full returns copy the original payment methods as refund rows. Partial returns use the selected refund method and amount.

When write-off or round-off was involved, the return logic adjusts custom round-off fields so the return total and refund amount can align.

> **Important:** Refund behavior affects cash, bank, and ledger balances. Accounts should verify return invoices and refund payment methods during closing.

## Stock and Accounting Impact

Because Klik POS submits ERPNext return Sales Invoices:

- Stock impact follows ERPNext Sales Invoice return behavior.
- Accounting impact follows ERPNext Sales Invoice return and payment behavior.
- The original invoice is referenced through `return_against`.

> **Warning:** Do not cancel or manually edit submitted invoices to process a return. Use the return workflow so stock and accounting reversals remain traceable.

## Common Return Errors

| Error | Meaning | Resolution |
| --- | --- | --- |
| Returns are disabled | POS Profile `Allow Return` is off. | Enable it for the POS Profile or use an authorized profile. |
| Only submitted invoices can be returned | Original invoice is Draft or cancelled. | Submit or select a valid submitted invoice. |
| This invoice is already a return | User selected a return invoice as the original. | Select the original non-return Sales Invoice. |
| No returnable quantity | All quantities have already been returned. | Review existing return invoices linked to the original invoice. |

---

Previous: [Selling](selling.md) | Next: [Payments and Reconciliation](payments-and-reconciliation.md)
