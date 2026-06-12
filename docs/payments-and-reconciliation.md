# Payments and Reconciliation

Klik POS uses standard ERPNext accounting documents and adds session links for easier reconciliation.

https://github.com/user-attachments/assets/8382b53a-c477-4768-962a-e0b27474656a

## Customer Payment Collection in Klik POS

Klik POS provides a customer Payment Entry flow.

1. Open the customer/payment interface.
2. Select a customer.
3. Select an outstanding submitted Sales Invoice, if allocating immediately.
4. Enter payment amount.
5. Select Mode of Payment.
6. Enter reference number/date if needed.
7. Submit.

The backend creates and submits a Payment Entry:

## Allocating an Existing Payment

Klik POS can reconcile an unallocated customer Payment Entry with an outstanding Sales Invoice.

1. Select a submitted Payment Entry with unallocated amount.
2. Select a submitted Sales Invoice for the same customer and company.
3. Enter allocation amount or let the API use the lower of unallocated and outstanding amounts.
4. Submit reconciliation.

The API creates a Payment Reconciliation document in memory, allocates entries, reconciles, and updates voucher outstanding amounts.

## Closing Reconciliation

Closing Shift compares:

```text
Opening Amount + Submitted Sales Invoice Payments + Klik Customer Payment Entries
```

against the counted closing amount for each payment mode.

If a cashier closing amount differs from expected:

1. Confirm counted amount.
2. Check Sales Invoice payment rows.
3. Check return invoices and refund methods.
4. Check customer Payment Entries collected during the session.
5. Check background invoices that remain Draft or Failed.
6. Document the variance through the organization’s finance process.

> **Warning:** Do not mark invoices as paid without a submitted payment document or valid payment row. Do not manually edit General Ledger entries.

---

Previous: [Returns](returns.md) | Next: [Additional Features](additional-features.md)
