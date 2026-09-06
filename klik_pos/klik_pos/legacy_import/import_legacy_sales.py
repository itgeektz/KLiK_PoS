# Copyright (c) 2026, and contributors
# License: see license.txt
"""One-time (idempotent, restartable) import of the curated legacy-bills
workbook into `Klik Legacy Sales Invoice` / `Klik Legacy Sales Invoice Item`.

WHERE THE WORKBOOK LIVES: nowhere in this git repo. It contains customer
names, phone numbers, balances and transaction history, so it must never be
committed. The intended flow on Frappe Cloud is:

    1. Upload the workbook as a Private File in the site's desk (or `scp`/
       drag it onto the bench host some other way you already trust).
    2. Find its real path on disk -- for a Private File, that's
       `frappe.utils.get_files_path(fname, is_private=1)`, or just the
       absolute path if you put it there yourself over SSH.
    3. From Bench Console:

        bench --site yoursite.frappe.cloud execute \\
            klik_pos.klik_pos.legacy_import.import_legacy_sales.execute_import \\
            --kwargs "{'file_path': '/path/to/Legacy_customer_bills_2023-09_to_2026-08.xlsx', 'dry_run': True}"

       Read the returned report. Then re-run with 'dry_run': False to
       actually write the records. Re-running (dry or not) is always safe:
       every row is keyed on legacy_header_id (the old system's own row ID,
       which is genuinely unique, unlike Old Sale No -- see the two GLOVO
       header collisions already dropped in the "Ignored Duplicates" sheet)
       and an existing record is left untouched, never duplicated.
    4. Once you've spot-checked a handful of customers' history against the
       old system, delete the uploaded Private File -- the archive doctype
       is the only copy that needs to persist.

Expected workbook shape (as produced by the segregation pass): a "Legacy
Bills" sheet (one row per header) and a "Legacy Bill Items" sheet (one row
per line, joined back to its header via the "Archive ID" column that appears
in both sheets). "Ignored Duplicates" and "Unmapped Items" sheets are
informational only and are not read here.
"""

import frappe
from frappe.utils import cint, flt


HEADER_DOCTYPE = "Klik Legacy Sales Invoice"
ITEM_DOCTYPE = "Klik Legacy Sales Invoice Item"

BILLS_SHEET = "Legacy Bills"
ITEMS_SHEET = "Legacy Bill Items"


def _read_sheet_as_dicts(ws):
	"""openpyxl worksheet -> list[dict], keyed by its first-row headers."""
	rows = ws.iter_rows(values_only=True)
	headers = [str(h).strip() if h is not None else "" for h in next(rows)]
	out = []
	for row in rows:
		if row is None or all(v is None for v in row):
			continue
		out.append(dict(zip(headers, row)))
	return out


def _s(value):
	"""Excel cell -> trimmed string, treating None/NaN-ish as ''."""
	if value is None:
		return ""
	return str(value).strip()


def _resolve_item(erpnext_item_name, mapping_status):
	"""The workbook already did the hard matching work (by barcode/old code)
	and recorded the result as an ERPNext Item NAME (not a docname -- Item
	naming on this site is separate from Customer naming, so this still
	needs one lookup). Re-resolving live, rather than trusting the sheet
	blindly, also catches an item renamed or removed since the mapping was
	done.
	"""
	if mapping_status != "Mapped" or not erpnext_item_name:
		return None, "None", False

	item = frappe.db.get_value(
		"Item",
		{"item_name": erpnext_item_name},
		["name", "disabled", "is_sales_item"],
		as_dict=True,
	)
	if not item:
		return None, "None", False

	eligible = not item.disabled and cint(item.is_sales_item if item.is_sales_item is not None else 1)
	return item.name, "Name", bool(eligible)


def _resolve_customer(erpnext_customer_id):
	"""The workbook already carries the real Customer document ID (e.g.
	"CUST-2026-00003") in the "ERPNext Customer" column -- NOT the display
	name. Still verified live rather than trusted blindly, in case a
	customer was renamed/merged/deleted between the segregation pass and
	this import.
	"""
	if not erpnext_customer_id:
		return None, "Unmatched"
	if frappe.db.exists("Customer", erpnext_customer_id):
		return erpnext_customer_id, "Matched"
	return None, "Unmatched"


def execute_import(file_path, migration_batch=None, dry_run=True, batch_size=200):
	"""Import the curated legacy-bills workbook at `file_path`.

	dry_run=True (the default): validates everything and returns a report,
	writes NOTHING to the database. Always run this first and read the
	report before running for real.
	"""
	import openpyxl

	if not migration_batch:
		migration_batch = f"legacy-import-{frappe.utils.now_datetime().strftime('%Y%m%d-%H%M%S')}"

	wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
	if BILLS_SHEET not in wb.sheetnames or ITEMS_SHEET not in wb.sheetnames:
		frappe.throw(
			f"Expected sheets {BILLS_SHEET!r} and {ITEMS_SHEET!r} not found in {file_path}. "
			f"Sheets present: {wb.sheetnames}"
		)

	bill_rows = _read_sheet_as_dicts(wb[BILLS_SHEET])
	item_rows = _read_sheet_as_dicts(wb[ITEMS_SHEET])

	items_by_archive_id = {}
	for row in item_rows:
		items_by_archive_id.setdefault(_s(row.get("Archive ID")), []).append(row)

	report = {
		"migration_batch": migration_batch,
		"dry_run": bool(dry_run),
		"bills_in_workbook": len(bill_rows),
		"items_in_workbook": len(item_rows),
		"already_imported_skipped": 0,
		"newly_imported": 0,
		"customers_unmatched": [],
		"items_could_not_re_resolve": [],
		"errors": [],
	}

	created_since_commit = 0

	for bill in bill_rows:
		legacy_header_id = _s(bill.get("Legacy Header ID"))
		if not legacy_header_id:
			report["errors"].append({"archive_id": bill.get("Archive ID"), "error": "missing Legacy Header ID"})
			continue

		if frappe.db.exists(HEADER_DOCTYPE, {"legacy_header_id": legacy_header_id}):
			report["already_imported_skipped"] += 1
			continue

		customer, match_status = _resolve_customer(_s(bill.get("ERPNext Customer")))
		if match_status == "Unmatched":
			report["customers_unmatched"].append({
				"legacy_header_id": legacy_header_id,
				"old_customer_name": _s(bill.get("Old Customer Name")),
			})

		# The workbook's own two "good" values are "Ready" and "Ready with
		# unmapped items" (the latter just means some lines fell back to a
		# manual add -- not a reason to flag the whole bill). Anything else,
		# or a customer that didn't re-resolve live, goes to Needs Review.
		workbook_status = _s(bill.get("Archive Status"))
		if workbook_status in ("Ready", "Ready with Unmapped Items", "Ready with unmapped items"):
			archive_status = "Ready" if workbook_status == "Ready" else "Ready with Unmapped Items"
		else:
			archive_status = "Needs Review"
		if match_status == "Unmatched":
			archive_status = "Needs Review"

		child_rows = []
		for line in items_by_archive_id.get(_s(bill.get("Archive ID")), []):
			matched_item, match_method, eligible = _resolve_item(
				_s(line.get("ERPNext Item")), _s(line.get("Mapping Status"))
			)
			if _s(line.get("Mapping Status")) == "Mapped" and not matched_item:
				report["items_could_not_re_resolve"].append({
					"legacy_header_id": legacy_header_id,
					"old_item_name": _s(line.get("Old Item Name")),
					"expected_erpnext_item": _s(line.get("ERPNext Item")),
				})

			child_rows.append({
				"line_no": cint(line.get("Line No")) or None,
				"item_code_legacy": _s(line.get("Old Item Code")),
				"item_name_legacy": _s(line.get("Old Item Name")),
				"item_group_legacy": _s(line.get("Item Group")),
				"qty": flt(line.get("Quantity")),
				"cost": flt(line.get("Historical Cost")),
				"vat_code": _s(line.get("VAT Code")),
				"vat_rate": flt(line.get("VAT Rate")),
				"rate": flt(line.get("Historical Rate")),
				"amount": flt(line.get("Historical Line Total")),
				"matched_item": matched_item,
				"match_method": match_method,
				"add_to_cart_eligible": 1 if eligible else 0,
				"legacy_barcode": _s(line.get("Barcode")),
			})

		if dry_run:
			report["newly_imported"] += 1
			continue

		try:
			doc = frappe.get_doc({
				"doctype": HEADER_DOCTYPE,
				"legacy_header_id": legacy_header_id,
				"legacy_saleno": _s(bill.get("Old Sale No")),
				"legacy_refno": _s(bill.get("Old Reference")),
				"posting_date": bill.get("Posting Date"),
				"posting_time": bill.get("Posting Time"),
				"customer": customer,
				"customer_match_status": match_status,
				"legacy_customer_name": _s(bill.get("Old Customer Name")),
				"legacy_customer_code": _s(bill.get("Old Customer Code")),
				"served_by": _s(bill.get("Served By")),
				"gross_amount": flt(bill.get("Gross Amount")),
				"vat_amount": flt(bill.get("Tax Amount")),
				"net_amount": flt(bill.get("Net Amount")),
				"cash_amount": flt(bill.get("Cash")),
				"invoice_amount": flt(bill.get("Credit")),
				"cheque_amount": flt(bill.get("Cheque")),
				"credit_card_amount": flt(bill.get("Card")),
				"voucher_amount": flt(bill.get("Voucher")),
				"sales_return_amount": flt(bill.get("Return Amount")),
				"branch": _s(bill.get("Branch")),
				"migration_batch": migration_batch,
				"archive_status": archive_status,
				"items": child_rows,
			})
			doc.insert(ignore_permissions=True)
			report["newly_imported"] += 1
			created_since_commit += 1
		except Exception as e:
			frappe.log_error(
				title="Legacy sales import row failed",
				message=f"legacy_header_id={legacy_header_id}: {frappe.get_traceback()}",
			)
			report["errors"].append({"legacy_header_id": legacy_header_id, "error": str(e)})

		if not dry_run and created_since_commit >= batch_size:
			frappe.db.commit()
			created_since_commit = 0

	if not dry_run:
		frappe.db.commit()

	print(frappe.as_json(report, indent=2))
	return report
