# Copyright (c) 2026, and contributors
# License: see license.txt
"""Read-only access to bills imported from the pre-migration (MySQL) system.

These endpoints never touch `tabSales Invoice` -- they only read from
`Klik Legacy Sales Invoice` / `Klik Legacy Sales Invoice Item`, which were populated
once by klik_pos.klik_pos.legacy_import.import_legacy_sales.execute_import.
The only "write" path here is resolve_legacy_invoice_for_cart, and even that
only returns a payload for the frontend to drop into the POS cart -- it does
not create or modify any document.
"""

import frappe
from frappe import _


@frappe.whitelist()
def get_legacy_invoices_for_customer(customer, from_date=None, to_date=None, limit=50, start=0):
	"""Old-system bills for a single, already-matched Customer.

	Used by the "Old System Bills" tab on the customer detail page -- only
	reachable when the customer record is linked from a Klik Legacy Sales
	Invoice, i.e. customer_match_status in (Matched, Walk-in). Date filtering
	happens here, server-side, on purpose: the frontend must never fetch a
	customer's whole legacy history and filter it in the browser.
	"""
	if not customer:
		return {"success": True, "data": [], "total_count": 0}

	limit = int(limit) if limit else 50
	start = int(start) if start else 0

	filters = {"customer": customer}
	if from_date and to_date:
		filters["posting_date"] = ["between", [from_date, to_date]]
	elif from_date:
		filters["posting_date"] = [">=", from_date]
	elif to_date:
		filters["posting_date"] = ["<=", to_date]

	total_count = frappe.db.count("Klik Legacy Sales Invoice", filters)

	rows = frappe.get_all(
		"Klik Legacy Sales Invoice",
		filters=filters,
		fields=[
			"name",
			"legacy_header_id",
			"legacy_saleno",
			"legacy_refno",
			"posting_date",
			"posting_time",
			"legacy_customer_name",
			"legacy_customer_code",
			"net_amount",
			"gross_amount",
			"served_by",
		],
		order_by="posting_date desc, posting_time desc",
		limit_page_length=limit,
		limit_start=start,
	)

	# Item counts, batched in one query rather than N+1.
	if rows:
		counts = frappe.db.sql(
			"""
			SELECT parent, COUNT(*) AS item_count
			FROM `tabKlik Legacy Sales Invoice Item`
			WHERE parent IN %(names)s
			GROUP BY parent
			""",
			{"names": [r.name for r in rows]},
			as_dict=True,
		)
		count_map = {c.parent: c.item_count for c in counts}
		for r in rows:
			r["item_count"] = count_map.get(r.name, 0)

	return {"success": True, "data": rows, "total_count": total_count}


@frappe.whitelist()
def search_legacy_invoices(search_text=None, item_name=None, date_from=None, date_to=None,
	unmatched_only=False, limit=50, start=0):
	"""Free-text search across ALL legacy bills, matched or not.

	This is the fallback for the ~roughly-a-few-hundred legacy customer
	names that don't correspond to any current Customer record -- their
	bills aren't reachable from a customer profile page, so this search
	(by old customer name, item name, and/or date) is the only way back to
	them. Also usable by an admin to sanity-check the import.
	"""
	if isinstance(unmatched_only, str):
		unmatched_only = unmatched_only.lower() in ("1", "true", "yes")

	limit = int(limit) if limit else 50
	start = int(start) if start else 0

	conditions = ["1=1"]
	params = {}

	if unmatched_only:
		conditions.append("li.customer_match_status = 'Unmatched'")

	if search_text and search_text.strip():
		conditions.append("li.legacy_customer_name LIKE %(search_text)s")
		params["search_text"] = f"%{search_text.strip()}%"

	if date_from:
		conditions.append("li.posting_date >= %(date_from)s")
		params["date_from"] = date_from

	if date_to:
		conditions.append("li.posting_date <= %(date_to)s")
		params["date_to"] = date_to

	item_join = ""
	if item_name and item_name.strip():
		item_join = "INNER JOIN `tabKlik Legacy Sales Invoice Item` lii ON lii.parent = li.name"
		conditions.append("lii.item_name_legacy LIKE %(item_name)s")
		params["item_name"] = f"%{item_name.strip()}%"

	where_clause = " AND ".join(conditions)

	total_count = frappe.db.sql(
		f"""
		SELECT COUNT(DISTINCT li.name) AS total
		FROM `tabKlik Legacy Sales Invoice` li
		{item_join}
		WHERE {where_clause}
		""",
		params,
		as_dict=True,
	)[0]["total"]

	rows = frappe.db.sql(
		f"""
		SELECT DISTINCT li.name, li.legacy_saleno, li.legacy_refno, li.posting_date,
			li.posting_time, li.legacy_customer_name, li.customer, li.customer_match_status,
			li.net_amount, li.gross_amount
		FROM `tabKlik Legacy Sales Invoice` li
		{item_join}
		WHERE {where_clause}
		ORDER BY li.posting_date DESC, li.posting_time DESC
		LIMIT %(limit)s OFFSET %(start)s
		""",
		{**params, "limit": limit, "start": start},
		as_dict=True,
	)

	return {"success": True, "data": rows, "total_count": total_count}


@frappe.whitelist()
def get_legacy_invoice_detail(name):
	"""Full header + line items for one old bill."""
	if not frappe.db.exists("Klik Legacy Sales Invoice", name):
		frappe.throw(_("Legacy bill not found: {0}").format(name))

	doc = frappe.get_doc("Klik Legacy Sales Invoice", name)
	return {
		"success": True,
		"data": {
			"name": doc.name,
			"legacy_header_id": doc.legacy_header_id,
			"legacy_saleno": doc.legacy_saleno,
			"legacy_refno": doc.legacy_refno,
			"posting_date": doc.posting_date,
			"posting_time": doc.posting_time,
			"customer": doc.customer,
			"customer_match_status": doc.customer_match_status,
			"legacy_customer_name": doc.legacy_customer_name,
			"legacy_customer_code": doc.legacy_customer_code,
			"served_by": doc.served_by,
			"gross_amount": doc.gross_amount,
			"vat_amount": doc.vat_amount,
			"net_amount": doc.net_amount,
			"payment_breakdown": {
				"cash": doc.cash_amount,
				"invoice": doc.invoice_amount,
				"cheque": doc.cheque_amount,
				"credit_card": doc.credit_card_amount,
				"voucher": doc.voucher_amount,
				"returned": doc.sales_return_amount,
			},
			"items": [
				{
					"item_code_legacy": it.item_code_legacy,
					"item_name_legacy": it.item_name_legacy,
					"qty": it.qty,
					"rate": it.rate,
					"amount": it.amount,
					"matched_item": it.matched_item,
					"match_method": it.match_method,
					"add_to_cart_eligible": it.add_to_cart_eligible,
				}
				for it in doc.items
			],
		},
	}


def _match_item(item_code_legacy, item_name_legacy):
	"""Best-effort resolution of a legacy line into a current Item.

	Tried in order: exact Item.name (old PCODE was often already the
	barcode/SKU), Item Barcode child table, then an exact (not fuzzy)
	item_name match. Anything else is left for the cashier to add
	manually -- we never guess silently on price-bearing data.
	"""
	item_code_legacy = (item_code_legacy or "").strip()
	item_name_legacy = (item_name_legacy or "").strip()

	if item_code_legacy:
		if frappe.db.exists("Item", item_code_legacy):
			return item_code_legacy, "Item Code"

		barcode_hit = frappe.db.get_value(
			"Item Barcode", {"barcode": item_code_legacy}, "parent"
		)
		if barcode_hit:
			return barcode_hit, "Barcode"

	if item_name_legacy:
		name_hit = frappe.db.get_value(
			"Item", {"item_name": item_name_legacy, "disabled": 0}, "name"
		)
		if name_hit:
			return name_hit, "Name"

	return None, "None"


@frappe.whitelist()
def resolve_legacy_invoice_for_cart(name):
	"""Resolve every line of an old bill against the current Item master.

	Returns cart-ready rows: a matched line carries the real item_code and
	its CURRENT selling price/stock (never the frozen old-system price);
	an unmatched line is flagged so the frontend can add it as a manual /
	free-text line instead. Nothing is written -- the frontend decides
	whether and how to load the result into the cart.
	"""
	doc = frappe.get_doc("Klik Legacy Sales Invoice", name)

	from klik_pos.klik_pos.utils import get_current_pos_profile
	try:
		pos_doc = get_current_pos_profile()
		price_list = getattr(pos_doc, "selling_price_list", None)
	except Exception:
		price_list = None

	resolved = []
	matched_count = 0
	for it in doc.items:
		item_code = it.matched_item
		match_method = it.match_method
		if not item_code:
			item_code, match_method = _match_item(it.item_code_legacy, it.item_name_legacy)

		line = {
			"legacy_item_name": it.item_name_legacy,
			"legacy_item_code": it.item_code_legacy,
			"qty": it.qty,
			"legacy_rate": it.rate,
			"matched": bool(item_code),
			"match_method": match_method,
		}

		item_data = (
			frappe.db.get_value(
				"Item", item_code, ["item_name", "image", "stock_uom", "disabled", "is_sales_item"], as_dict=True
			)
			if item_code
			else None
		)
		# An item that existed at import time can since have been disabled or
		# marked not-for-sale -- re-check live rather than trusting the stale
		# add_to_cart_eligible flag, since that's exactly the kind of drift a
		# "resolve at cart time" step exists to catch.
		is_sellable = bool(item_data) and not item_data.get("disabled") and item_data.get("is_sales_item", 1)

		if item_code and is_sellable:
			matched_count += 1
			current_rate = it.rate
			if price_list:
				price_row = frappe.db.get_value(
					"Item Price",
					{"item_code": item_code, "price_list": price_list, "selling": 1},
					"price_list_rate",
				)
				if price_row:
					current_rate = price_row
			line.update({
				"item_code": item_code,
				"item_name": item_data.get("item_name") or it.item_name_legacy,
				"image": item_data.get("image") or "",
				"uom": item_data.get("stock_uom") or "Nos",
				"disabled": item_data.get("disabled", 0),
				"rate": current_rate,
			})
		else:
			if item_code and not is_sellable:
				# Matched at import time, but no longer sellable -- flip this
				# specific line back to "unmatched" for cart purposes so it
				# falls through to a manual line instead of silently failing.
				line["matched"] = False
				line["match_method"] = f"{match_method} (no longer sellable)"
			line.update({
				"item_code": None,
				"item_name": it.item_name_legacy,
				"image": "",
				"uom": "Nos",
				"disabled": 0,
				"rate": it.rate,
			})

		resolved.append(line)

	return {
		"success": True,
		"data": {
			"name": doc.name,
			"customer": doc.customer,
			"legacy_customer_name": doc.legacy_customer_name,
			"posting_date": doc.posting_date,
			"total_lines": len(resolved),
			"matched_lines": matched_count,
			"items": resolved,
		},
	}
