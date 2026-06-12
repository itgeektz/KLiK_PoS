# Configuration

<img src="./screenshots/klik_pos_settings.png" alt="Klik POS settings" width="100%" />


| Setting | Purpose | Recommended Use |
| --- | --- | --- |
| `Allow Holding Invoices` | Enables holding transactions as draft Sales Invoices. | Enable for stores that pause transactions. |
| `Allow Credit Sales` | Allows credit sale checkout behavior with due-date and non-walk-in customer validation. | Enable only where customer credit is allowed. |
| `Allow Selling Items at Zero Rate` | Allows item rate `0` when no discount is applied. | Keep disabled unless free-of-charge sales are controlled operationally. |
| `Allow Return` | Enables return APIs for the current POS Profile. | Enable for supervisors or stores allowed to process returns. |
| `Allow to Create and Edit Customers` | Controls customer create/edit UI behavior. | Enable for stores that onboard customers at POS. |
| `Allow Write Off` | Indicates whether write-off behavior is permitted in POS configuration. | Use with a configured POS Profile Write Off Account. |
| `Ignore write off on Partial Returns` | Indicates partial-return write-off behavior. | Requires business validation before use. |
| `Auto Allocate Remaining Payment` | Controls payment allocation behavior in the frontend. | Enable where cashier should allocate remaining amount automatically. |
| `Auto-fetch Batch/Serial` | Auto-fetches a batch for batch-tracked items when no batch is selected. | Enable only where FIFO batch selection is acceptable. |
| `Business Type` | Filters customers and influences POS/cash behavior. Options: `B2C`, `B2B`, `B2B & B2C`. | Use `B2C` for walk-in retail, `B2B` for company customers, mixed mode only when both are needed. |
| `Cart Item Insertion Position` | Adds new cart lines at `Top` or `Bottom`. | Use `Bottom` for conventional cart order. |
| `Clear Draft Invoices on Closing Shift` | Deletes draft Sales Invoices linked to the POS Opening Entry after closing. | Enable only if held/draft invoices must not survive shift close. |
| `Default Sales Type` | Sets initial sale type: `Cash` or `Credit`. | Use `Cash` unless credit sales are common. |
| `Default View` | Selects item display mode: `Grid View` or `List View`. | `Grid View` for image-based retail, `List View` for dense/scanner counters. |
| `Delivery Required?` | Indicates delivery is required in the POS Profile. | Use where delivery workflow is mandatory. |
| `Enable Delivery Charge` | Allows a delivery charge amount at checkout. | Enable only after configuring `Delivery Charge Item`. |
| `Delivery Charge Item` | Item used for delivery fee invoice row. | Use a non-stock sales item. |
| `Enable Service Items` | Includes non-stock service items in POS item listing. | Enable for service charges or non-stock sellable services. |
| `Enable SMS` | Enables SMS sharing controls. | Enable only after SMS gateway setup. |
| `Enable Whatsapp` | Enables WhatsApp sharing controls. | Enable only after WhatsApp Setup and templates are configured. |
| `Enhanced Search` | Expands item search behavior. | Enable for stores relying on broad item lookup. |
| `Hide Expected Amount` | Hides expected closing amounts from cashier UI. | Enable where cash count should be blind. |
| `Is Tax Included In Basic Rate` | Forces tax rows to be treated as included in print/basic rate. | Enable for tax-inclusive shelf pricing. |
| `Prevent Invoice Reprinting` | Prevents repeated invoice printing. | Enable where receipt reprints must be controlled. |
| `Restrict Cost Visibility in Tooltip` | Hides cost and margin details in item tooltip. | Enable for cashier profiles. |
| `Sales Person PIN required` | Requires a valid Sales Person before submitting a POS Sales Invoice. | Enable for commission or salesperson accountability. |
| `Sales Person` child table | Lists allowed Sales Persons for PIN selection. | Maintain active salespeople per POS Profile. |
| `Show Item Code` | Shows item code in product list. | Enable for barcode/SKU-heavy stores. |
| `Use Scanner Fully` | Restricts item addition to scanner flow. | Use at barcode-only counters. |
| `Barcode Start Pattern` | Supports scale barcode pattern behavior. | Use for weighing-scale barcode deployments. |
| `Whatsapp Template` | Default WhatsApp template for invoice sharing. | Select an approved WhatsApp Message Template. |
| `Email Template` | Default email template for invoice sharing. | Use branded invoice email templates. |
| `Enable Background Invoice Submission` | Saves the invoice as Draft, reserves stock, and queues submission. | Use where checkout must stay responsive and workers are reliable. |
| `Allow Price List Switching` | Allows cashier-selected price list. | Enable only for trusted users or controlled retail scenarios. |
| Standard POS Profile `Print Format` | Selects the print format used for receipts, PDFs, email, SMS, and WhatsApp sharing. | Use a tested thermal or invoice print format. |


## Important Setting Interactions

### Default Sales Type and Credit Sales

If checkout does not explicitly pass a sale type, Klik POS uses `Default Sales Type`. Credit sale requires:

- Credit sale mode selected or defaulted.
- Customer selected.
- Customer is not marked `Is WalkIn`.
- Due date entered.
- No positive payment amount on payment rows.

The resulting Sales Invoice is submitted with outstanding balance instead of being paid at checkout.

### Cash Sales and Partial Payments

For normal cash sales, the backend requires at least one payment method with a positive amount. If the amount paid is lower than the invoice total, submission depends on ERPNext POS Profile partial-payment settings. If partial payment is not allowed, Sales Invoice submission raises “Partial Payment in POS Transactions are not allowed.”

### Background Submission

When `Enable Background Invoice Submission` is used by the checkout:

1. A Draft Sales Invoice is saved.
2. Klik POS marks it queued.
3. Stock is reserved through ERPNext Stock Reservation Entry.
4. A background job submits the invoice.
5. On success, queue status becomes `Submitted`.
6. On failure, queue status becomes `Failed`, queue error is stored, and managers/users may be notified.

> **Warning:** If Frappe workers are stopped or the queue fails, invoices can remain in Draft. Accounts and supervisors must monitor `queue_status`, `queue_error`, and Draft Sales Invoices created from Klik POS.

### Inclusive and Exclusive Taxes

Klik POS uses the POS Profile Sales Taxes and Charges Template unless the frontend sends another template. If `Is Tax Included In Basic Rate` is enabled, Klik POS forces tax rows to be treated as inclusive for applicable tax calculations. If it is disabled, the tax template and item tax setup determine whether tax is included or added.

### Delivery Charges

Delivery charge requires both `Enable Delivery Charge` and `Delivery Charge Item`. The backend appends or updates one invoice item row using that item and the checkout delivery charge amount. The item must be a non-stock sales item.

### Held Transactions and Closing

Held transactions are Draft Sales Invoices. If `Clear Draft Invoices on Closing Shift` is enabled, closing the POS session deletes draft invoices linked to that POS Opening Entry.

> **Warning:** Do not enable draft clearing if the business expects held transactions to survive shift closure.

### Salesperson PINs for Shared Registers

Klik POS supports a common retail pattern where several salespeople use one POS machine or one logged-in ERPNext user, but each sale is attributed to the salesperson who enters their PIN.

Setup:

1. Open each ERPNext Sales Person record.
2. Use the `Set PIN` action.
3. Enter and confirm a four-digit numeric PIN.
4. Open the POS Profile.
5. Enable `Sales Person PIN required`.
6. Add the allowed Sales Persons in the POS Profile `Sales Person` child table.

Operational effect:

- The cashier must enter or verify a salesperson PIN before completing a sale.
- Klik POS adds the matched Sales Person to the Sales Invoice Sales Team with 100% allocation.
- If no Sales Person is present when the Sales Invoice is submitted, the backend blocks submission.
- Duplicate Sales Persons in the POS Profile child table are removed during POS Profile validation.

Use this when the business wants one cashier station but salesperson-level sales reporting, accountability, or commission tracking.

## Example Configurations

### Cash-Only Retail Store

| Area | Recommended Setup |
| --- | --- |
| Business Type | `B2C` |
| Default Sales Type | `Cash` |
| Allow Credit Sales | Disabled |
| Allow Holding Invoices | Optional |
| Payment Methods | Cash only, with cash account |
| Partial Payment | Disabled in ERPNext POS Profile |
| Is Tax Included In Basic Rate | Based on shelf pricing |

### Cash and Credit Store

| Area | Recommended Setup |
| --- | --- |
| Business Type | `B2B & B2C` |
| Default Sales Type | `Cash` unless credit is the normal flow |
| Allow Credit Sales | Enabled |
| Customer Setup | Mark walk-in customers with `Is WalkIn`; do not use walk-in for credit |
| Payment Methods | Cash/bank/mobile money as needed |
| Accounts Workflow | Use Payment Entry collection for credit invoices |

### Inclusive Tax Store

| Area | Recommended Setup |
| --- | --- |
| Sales Taxes and Charges Template | Tax rows configured for correct tax accounts |
| Is Tax Included In Basic Rate | Enabled |
| Item Prices | Enter shelf price inclusive of tax |
| Verification | Submit a test invoice and check net total, tax, and grand total |

### Exclusive Tax Store

| Area | Recommended Setup |
| --- | --- |
| Sales Taxes and Charges Template | Tax rows configured as normal ERPNext exclusive taxes |
| Is Tax Included In Basic Rate | Disabled |
| Item Prices | Enter pre-tax prices |
| Verification | Confirm tax is added to the invoice total |

### M-Pesa Store

| Area | Recommended Setup |
| --- | --- |
| External App | Install and configure `frappe_mpsa_payments` |
| Mode of Payment | Use a mode whose type is `Phone` or name contains `Mpesa`/`M-Pesa` |
| POS Profile Payment Method | Add the M-Pesa mode |
| Frontend Flow | Use M-Pesa options for STK or C2B reconciliation |

### Background Submission Store

| Area | Recommended Setup |
| --- | --- |
| Enable Background Invoice Submission | Enabled |
| Workers | Confirm long queue workers are running |
| Stock Reservation | Review ERPNext Stock Reservation setting |
| Monitoring | Review Draft Sales Invoices with queue status `Queued`, `Processing`, or `Failed` |
