# Selling

Klik POS creates ERPNext Sales Invoices from the POS cart.

## Standard Sale Lifecycle

```text
Open POS Session
-> Select Customer
-> Add Items
-> Review Prices, Discounts, Delivery, Loyalty, and Taxes
-> Select Sale Type
-> Add Payment or Due Date
-> Submit Sale
-> Create and Submit Sales Invoice, or Queue Draft Sales Invoice
-> Print or Share Receipt
```

## Select a Customer

Customer search uses the POS Profile business type:

- `B2C`: shows Individual customers.
- `B2B`: shows Company customers.
- `B2B & B2C`: shows both.

Customer group filters from POS Profile and ERPNext User Permissions are applied. If the POS Profile has a default customer, Klik POS returns its customer details to the frontend.

Walk-in customers are identified by the Customer field `Is WalkIn`.

## Verify Salesperson PIN

If the POS Profile has `Sales Person PIN required` enabled, the salesperson must be verified before checkout completion. This supports shared POS machines or shared login sessions where the business still needs to record the actual salesperson on each sale.

Confirmed behavior:

- Sales Person PINs are set from the ERPNext Sales Person form.
- A valid PIN must be exactly four digits.
- The selected salesperson is added to the Sales Invoice Sales Team.
- Sales Invoice submission is blocked if the POS Profile requires a salesperson but the invoice has no Sales Team row.

> **Important:** Salesperson PIN identifies the salesperson for the sale. It does not replace ERPNext user permissions, audit logs, or login security.

## Add Items

Item listing includes enabled sales items that match the POS Profile warehouse, item group restrictions, stock visibility settings, and service-item setting.

Klik POS supports:

- Item name/code/barcode search.
- Item group/category filtering.
- Stock availability display.
- Product bundles.
- Item templates and variants.
- Batch and serial indicators.
- UOM and price list handling.

If `Use Scanner Fully` is enabled, the intended operation is scanner-led item addition.

## Pricing and Discounts

Prices are resolved using customer-aware price list priority:

1. Customer default price list, where available.
2. Customer Group default price list, where available.
3. POS Profile selling price list.
4. Selling Settings fallback, where available.

The cart refreshes pricing and can include pricing-rule details. The checkout payload sends item-level discount percentage or amount.

Zero-rate sales are blocked unless `Allow Selling Items at Zero Rate` is enabled or a discount justifies the zero amount.

## Taxes

Klik POS sets the Sales Invoice `taxes_and_charges` from the POS Profile unless the frontend sends another Sales Taxes and Charges Template. Item Tax Templates and item tax rates are resolved using ERPNext item details logic.

If `Is Tax Included In Basic Rate` is enabled, Klik POS marks applicable tax rows as included in the print/basic rate.

## Delivery Charges

When enabled, the cashier may enter a delivery charge. Klik POS validates that the POS Profile has a Delivery Charge Item and appends it as a non-stock service row on the Sales Invoice.

Delivery personnel can also be selected and stored on the Sales Invoice.

## Loyalty Points

If the customer has an ERPNext Loyalty Program, Klik POS can show a loyalty summary and preview redemption. On submission, it sets native ERPNext Sales Invoice loyalty redemption fields and lets ERPNext validate the points.

## Cash Sale

For cash sales:

1. Select one or more payment methods.
2. Enter positive payment amounts.
3. Submit the sale.

The backend rejects a cash sale with positive-priced items when no positive payment amount is provided, unless loyalty redemption covers the sale.

If the paid amount is less than the invoice total, ERPNext POS Profile partial-payment rules determine whether submission is allowed.

## Credit Sale

Credit sale rules are enforced in the backend:

- A due date is required.
- The customer must not be marked `Is WalkIn`.
- Payment rows must not contain positive amounts.
- Klik POS normalizes payment rows to zero amount using the default POS Profile payment mode when needed.

The submitted Sales Invoice remains outstanding. Accounts staff can later collect payment using Klik POS customer payment features or standard ERPNext Payment Entry.

## Background Submission

When background submission is enabled in the checkout payload:

1. Klik POS saves a Draft Sales Invoice.
2. It sets `queue_status = Queued`.
3. It marks the invoice as created from Klik POS.
4. It reserves stock for queued stock items.
5. It enqueues `process_queued_sales_invoice` on the long queue.
6. The worker submits the Sales Invoice.

If submission fails, Klik POS sets `queue_status = Failed`, stores `queue_error`, increments attempts, and can notify the user/managers.

Consultants can identify failed submissions from Sales Invoice fields:

- `queue_status`
- `queue_error`
- `queue_attempts`
- `queue_last_attempt_at`
- `custom_is_created_from_klik`
- `custom_is_submitted`

> **Warning:** Background submission requires healthy Frappe workers. A queued invoice is not financially posted until the Sales Invoice is submitted.

## Holding a Sale

Held transactions are saved through `create_draft_invoice`.

- A Draft Sales Invoice is created.
- `custom_is_held` is set.
- The invoice is linked to the active POS Opening Entry when one exists.
- Customer, items, taxes, payments, discounts, loyalty fields, delivery fields, and salesperson fields can be saved.
- Existing held Draft invoices can be updated and held again.
- Draft invoices can be submitted later.
- Draft invoices can be deleted if their status is `Draft`.
- If `Clear Draft Invoices on Closing Shift` is enabled, drafts linked to the session are deleted after closing.

- Held transactions do not reserve stock.

## Printing and Sharing

The Sales Invoice has a `Is Printed` field to mark invoices as printed. POS Profile includes `Prevent Invoice Reprinting`.

Invoice sharing features include:

- Email template lookup and sending.
- WhatsApp sending from the Sales Invoice form and POS sharing UI.
- SMS controls where SMS gateway setup exists.

---

Previous: [Opening and Closing](opening-and-closing.md) | Next: [Returns](returns.md)
