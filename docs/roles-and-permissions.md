# Roles and Permissions

Klik POS relies mostly on standard ERPNext permissions.

## Recommended Responsibility Matrix

Cashiers normally need permissions, directly or through a role profile, for:

- POS Profile read.
- POS Opening Entry create/read/submit.
- POS Closing Entry create/read/submit.
- Sales Invoice create/read/write/submit.
- Customer read, and create/write only if customer creation is allowed.
- Item read.
- Mode of Payment read.
- Sales Taxes and Charges Template read.
- Warehouse read.
- Batch and Serial No read where tracked items are sold.

Accounts users normally need:

- Sales Invoice read.
- Payment Entry create/read/write/submit.
- Payment Reconciliation access.
- Customer ledger/report access.
- POS Closing Entry read.

System Managers or consultants need setup permissions for:

- POS Profile.
- Company.
- Account.
- Warehouse.
- Mode of Payment.
- Item and Item Price.
- Customer Group and User Permission.
- WhatsApp Setup and templates, if used.
- Delivery Personnel, if used.

## POS Profile Access Rules

The POS Profile list shown to a user follows this hierarchy:

1. If User Permissions exist for POS Profile, only those profiles are considered, and the user must also be in the POS Profile Applicable Users table.
2. If no POS Profile User Permissions exist, Klik POS falls back to POS Profile Applicable Users.
3. Disabled POS Profiles are excluded.
4. The default flag comes from the POS Profile Applicable Users row.

## Sales Person PIN

When `Sales Person PIN required` is enabled:

- Sales Person records can have a POS PIN.
- The PIN must be exactly four digits.
- Before Sales Invoice submission, Klik POS requires at least one Sales Team row.
- Duplicate Sales Person rows on POS Profile are removed during validation.

This feature is useful when multiple salespeople share one register or one logged-in POS session. The ERPNext login still controls system access, while the Sales Person PIN controls sales attribution on the invoice.

Recommended control split:

| Responsibility | Controlled By |
| --- | --- |
| Access to Klik POS | ERPNext User login and permissions |
| Access to a POS Profile | POS Profile Applicable Users and User Permissions |
| Sales attribution | Sales Person PIN and Sales Team row |
| Commission or salesperson reporting | ERPNext Sales Person and Sales Team data |

---

Previous: [Additional Features](additional-features.md)
