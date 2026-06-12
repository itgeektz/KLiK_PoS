# Additional Features

## Batch and Serial Handling

Klik POS supports batch and serial selection for normal items.

- Serial-tracked items require serial selection.
- Batch-tracked items require batch selection unless auto-fetch is enabled.
- Auto-fetch uses FIFO-style batch selection and skips expired batches.
- Serial and Batch Bundle documents are created for selected batch/serial entries.
- Queued invoices reserve stock while waiting for background submission.

## Product Bundles

Klik POS lists ERPNext Product Bundles where `Product Bundle` matches an item.

- Product bundle items appear in item listing.
- Available bundle quantity is calculated from component stock in the POS Profile warehouse.
- On checkout, Klik POS validates stock for stock components.
- Bundles with batch-tracked or serial-tracked components are blocked because component batch/serial selection is not supported.

Limitations:

- Batch/serial component selection for bundled components is not supported.
- Component stock is checked in the POS Profile warehouse.

## Item Templates and Variants

Klik POS supports ERPNext item variants.

- Template items with `Has Variants = 1` can appear in the item listing.
- Variant options include item attributes and attribute values.
- Variant rows include stock, price, barcode, UOM, image, batch flag, and serial flag.
- Checkout rejects variant template items and requires a specific variant item.

Common setup mistakes:

- Template item selected instead of variant item.
- Variant has no Item Price in the active price list.
- Variant stock is missing in the POS Profile warehouse.
- Variant attribute rows are disabled or incomplete.

## Delivery Charges

Delivery charge support is implemented through a configured Item.

Setup:

1. Create a non-stock Item.
2. Mark it as allowed in sales.
3. Add income/expense accounting defaults through company settings or item defaults.
4. Enable `Enable Delivery Charge` on POS Profile.
5. Set `Delivery Charge Item`.

At checkout, Klik POS appends or updates that item as a Sales Invoice row with quantity `1` and the entered delivery charge as rate.

Tax treatment follows the item and Sales Taxes and Charges setup applied to the Sales Invoice.

## Delivery Personnel

The app adds a Delivery Personnel DocType with a unique delivery personnel name. Sales Invoice has fields for Delivery Personnel and Delivery Personnel Name.

## Loyalty Points

Klik POS integrates with ERPNext Loyalty Program.

- Customer list and customer detail shows the customers loyalty summary.
- Redemption of loyalty points preview validates available points and transaction amount.
- Sales Invoice submission sets native ERPNext loyalty redemption fields.
- ERPNext validates loyalty points.
- Invoice details include loyalty points redeemed, amount, earned points, and current balance.

Prerequisites:

- ERPNext Loyalty Program configured.
- Customer assigned to a Loyalty Program.
- Expense account and cost center configured as required by ERPNext loyalty setup.

## WhatsApp, Email, and SMS Sharing

Klik POS includes:

- WhatsApp Setup single DocType for Meta API credentials.
- WhatsApp Message Templates DocType.
- WhatsApp Message Notification DocType.
- WhatsApp API utilities for sending invoice messages.
- Sales Invoice form button “Send via WhatsApp”.
- Email template lookup and email sending API.
- SMS enablement flag and SMS API file.

WhatsApp requires valid Meta/WhatsApp credentials and approved templates where template messages are used.

## ZATCA Awareness

Klik POS checks whether Company has `custom_enable_zatca_e_invoicing`. Invoice list UI also checks for ZATCA status fields when present.

The ZATCA implementation itself is not in this repository. Use a compatible ZATCA app and validate the full compliance flow separately.

## M-Pesa Integration

Klik POS frontend calls API methods from an external app named `frappe_mpsa_payments`. The M-Pesa backend implementation is not in this repository.

- A payment method is treated as M-Pesa when its Mode of Payment type is `Phone` or the method name contains `mpesa`/`m-pesa`.
- Cashier can open M-Pesa options from the payment dialog.
- STK Push requires phone number, amount, mode of payment.
- When STK completes, the payment row receives the transaction/request reference.
- C2B/register payments can be fetched, selected, and processed against a draft invoice.
- Selected M-Pesa register payments can be linked to a draft invoice before final submission.

### Required Setup

1. Install and configure `frappe_mpsa_payments`.
2. Configure M-Pesa credentials in that app.
3. Create or enable a Mode of Payment for M-Pesa.
4. Add the M-Pesa mode to the POS Profile payment methods.
5. Ensure the mode has a valid company account.
6. Register M-Pesa C2B Callbacks for C2B reconciliation.
7. Test STK Push and C2B reconciliation before go-live.

### Troubleshooting

| Problem | Likely Cause | Resolution |
| --- | --- | --- |
| M-Pesa options are not available | Mode of Payment is not recognized as phone/M-Pesa. | Rename or configure the mode so the frontend identifies it. |
| STK push fails | External app or credentials are missing. | Verify `frappe_mpsa_payments` setup and API logs. |
| Payment confirmed but invoice unpaid | Request was not linked or invoice submission failed. | Inspect M-Pesa Express Request and Sales Invoice queue status. |
| Callback delayed | External provider/app delay. | Refresh STK status and reconcile register payment once it appears. |
