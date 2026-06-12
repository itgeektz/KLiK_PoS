# Installation and Prerequisites

## Prerequisites

| Requirement | Purpose | Status |
| --- | --- | --- |
| Frappe and ERPNext site | Provides POS Profile, Sales Invoice, POS Opening Entry, POS Closing Entry, accounts, stock, customer, and loyalty documents. | Required. |
| Optional [`frappe_mpsa_payments`](https://github.com/navariltd/frappe-mpsa-payments.git) app | Provides M-Pesa STK and C2B API methods used by the frontend. | Required only for M-Pesa features. |
| Optional ZATCA app | Klik POS checks for ZATCA custom fields added by another app. | Required only for ZATCA workflows. |

## Install the App

From your Bench directory:

```bash
bench get-app https://github.com/navariltd/klik_pos
bench --site <site-name> install-app klik_pos
bench --site <site-name> migrate
bench restart
```

## What Installation Adds

Klik POS customizes standard ERPNext documents and adds several DocTypes.

### Custom Fields

| Document | Field | Purpose |
| --- | --- | --- |
| POS Profile | Klik POS tab and configuration fields | Controls POS behavior. See [Configuration](configuration.md). |
| Sales Invoice | `custom_pos_opening_entry` | Links invoices to the active POS Opening Entry. |
| Sales Invoice | `custom_is_held`, `custom_is_submitted`, `custom_is_created_from_klik` | Tracks held, submitted, and Klik-origin invoices. |
| Sales Invoice | `queue_status`, `queue_attempts`, `queue_error`, `queue_last_attempt_at` | Tracks background invoice submission. |
| Sales Invoice | `enable_background_invoice_submission` | Marks invoices submitted through the queue. |
| Sales Invoice | `reserve_stock` | Used with ERPNext Stock Reservation Entry for queued invoices. |
| Sales Invoice | `custom_roundoff_amount`, `custom_base_roundoff_amount`, `custom_roundoff_account` | Supports write-off/round-off posting. |
| Sales Invoice | `custom_delivery_personnel`, `custom_delivery_personnel_name` | Records delivery personnel. |
| Sales Invoice | `custom_is_printed` | Tracks receipt printing. |
| Customer | `custom_is_walkin` | Marks a walk-in customer; credit sales reject this customer type. |
| Item Group | `exclude_from_pos` | Excludes item groups from POS item group listing. |
| Payment Entry | `custom_pos_opening_entry`, `custom_is_created_from_klik` | Links customer payments to the POS session. |

### Added DocTypes

| DocType | Purpose |
| --- | --- |
| Delivery Personnel | Simple master for delivery personnel names. |
| POS Profile Sales Person | Child table for allowed Sales Persons on a POS Profile. |
| Klik Sales Invoice Reference | Child table reference to Sales Invoices. |
| WhatsApp Setup | Single DocType for Meta/WhatsApp API credentials. |
| WhatsApp Message Templates | WhatsApp template management. |
| WhatsApp Message Notification | Notification rules for WhatsApp templates. |
| WhatsApp Chat / WhatsApp Conversations | Stores WhatsApp message records. |



## Required ERPNext Master Data

> **Important:** Turns on ERPNext Stock Settings `Enable Stock Reservation` if its not already enabled.

| Master Data | Required When | Notes |
| --- | --- | --- |
| Company | Always | Must have default currency and accounting defaults. |
| Warehouse | Always for stock sales | POS Profile warehouse is used on Sales Invoice items. |
| Customers | Always | POS Profile can define a default customer. Credit sales require a non-walk-in customer. |
| Items | Always | Items must be enabled and allowed in sales. |
| Item Prices | Required for priced item listing | Prices are fetched from the customer/customer group/pos profile price list priority. |
| Modes of Payment | Always for cash sales and closing balances | Each mode should have a company default account. |
| Sales Taxes and Charges Template | Required if taxes apply | POS Profile `taxes_and_charges` is used unless the frontend sends another template. |
| Sales Persons | Required only if PIN validation is enabled | Sales Person PIN must be exactly four digits. |
| Loyalty Program | Required only for loyalty | Uses ERPNext Loyalty Program logic. |
| Delivery Charge Item | Required only for delivery charges | Must be a non-stock sales item. |

## Initial POS Profile Setup

At minimum:

1. Create or open an ERPNext POS Profile.
2. Set Company, Warehouse, Currency, Selling Price List, Cost Center, and Write Off Account.
3. Add payment methods under the standard POS Profile payment table.
4. Add applicable users and mark a default user profile if needed.
5. Configure the Klik POS tab fields described in [Configuration](configuration.md).
6. Ensure the cashier has the ERPNext permissions needed for POS Opening Entry, Sales Invoice, and payment documents.

## Post-Installation Checklist

- Run `bench --site <site-name> migrate`.
- Run `bench build --app klik_pos`.
- Clear cache and restart Bench workers.
- Confirm `/klik_pos` loads.
- Confirm the cashier sees at least one POS Profile.
- Confirm modes of payment load in the opening-entry modal.
- Create a test POS Opening Entry.
- Submit one low-value test sale.
- Verify the Sales Invoice has `custom_pos_opening_entry`.
- Close the shift and verify a POS Closing Entry is created.
- If using M-Pesa, install and configure the external [M-Pesa](https://github.com/navariltd/frappe-mpsa-payments.git) app and test STK/C2B flows.
- If using WhatsApp, configure WhatsApp Setup and templates.
