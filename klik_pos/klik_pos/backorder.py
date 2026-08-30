"""Fulfills Klik POS Backorder records as inward stock arrives.

Wired up in hooks.py -- add BOTH keys below to the doc_events dict that already
exists there (don't replace the whole dict, it already has Sales Invoice,
POS Opening Entry, Sales Person and POS Profile entries):

	doc_events = {
		...
		"Purchase Receipt": {
			"on_submit": "klik_pos.klik_pos.backorder.fulfill_backorders_on_purchase_receipt",
		},
		"Purchase Invoice": {
			"on_submit": "klik_pos.klik_pos.backorder.fulfill_backorders_on_purchase_invoice",
		},
	}

BOTH are required. Stock can arrive into ERPNext two ways: a Purchase Receipt, or a
Purchase Invoice with "Update Stock" checked (the common shortcut when a business
wants one document to both bill and receive, with no separate Purchase Receipt at
all). Whichever one actually posts the incoming stock ledger entry is the one that
needs to trigger fulfillment -- a business using only stock-updating Purchase
Invoices would otherwise never clear a single backorder, since no Purchase Receipt
would ever exist for this hook to react to.

Nothing here touches the incoming document itself or its own stock ledger entries --
by the time on_submit fires, it has already posted its own Bin increase as usual.
This only reacts to that increase: for each item/warehouse it received, it walks any
open Klik POS Backorder rows oldest-first (FIFO by creation, i.e. by original sale
order) and, for each, issues a Delivery Note for the qty just made available --
exactly the same mechanism _issue_delivery_note_for_available_qty in
klik_pos.api.sales_invoice uses for the "available now" portion of an oversold sale,
just running again later once real stock exists. That Delivery Note is the point the
deferred COGS for that backordered qty hits the books, per the "at fulfillment date"
choice made when this feature was designed -- not backdated to the original sale,
since there was genuinely no inventory to cost until now. Because a backorder can
only exist once an item's stock hit zero, there's no older/cheaper layer already
sitting in the warehouse when this stock lands -- so under FIFO the backorder
consumes this exact incoming layer, and under moving average the new rate IS this
purchase's rate (nothing to blend with). The trade-off to know about: revenue on the
original sale posted back on the sale date, but its COGS doesn't post until this runs
-- so that sale's original period shows revenue with no matching cost, and the cost
shows up later, in whatever period the stock actually arrives.

Any qty that arrives beyond what's needed to clear open backorders is left alone
deliberately -- it's just normal incoming stock, no different from any other receipt,
and needs no action here.
"""

import contextlib

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, nowtime

# Whoever submitted the incoming Purchase Receipt/Invoice has purchasing rights, not
# necessarily rights on Delivery Note or on the Klik POS Backorder doctype itself (see
# its permissions -- System Manager and read-only Sales User only). The Delivery Note
# and Backorder update this creates run with ignore_permissions=True for the same
# reason the sale-time side does (see klik_pos.api.sales_invoice), and for the same
# audit-trail reason should be attributed to the system, not to whoever happened to be
# submitting a purchase document. Frappe unconditionally stamps owner/modified_by from
# frappe.session.user on every insert/save (set_user_and_timestamp in
# frappe/model/document.py) -- pre-setting the field on the document itself is silently
# overwritten, so the session user has to actually change for the duration of the call.
SYSTEM_AUTOMATION_USER = "Administrator"


@contextlib.contextmanager
def _as_system_user():
	previous_user = frappe.session.user
	if previous_user == SYSTEM_AUTOMATION_USER:
		yield
		return
	frappe.set_user(SYSTEM_AUTOMATION_USER)
	try:
		yield
	finally:
		frappe.set_user(previous_user)


def fulfill_backorders_on_purchase_receipt(doc, method=None):
	_fulfill_backorders_for_incoming_document(doc, "Purchase Receipt")


def fulfill_backorders_on_purchase_invoice(doc, method=None):
	# A Purchase Invoice only moves real stock when Update Stock is checked -- one
	# that merely bills against an existing Purchase Receipt (the two-document flow)
	# posts no stock ledger entries of its own, so there's nothing to react to here;
	# that case was already handled when the Purchase Receipt itself submitted.
	if not cint(doc.get("update_stock")):
		return
	_fulfill_backorders_for_incoming_document(doc, "Purchase Invoice")


def _fulfill_backorders_for_incoming_document(doc, source_doctype):
	for row in doc.items:
		if not row.item_code or not row.warehouse:
			continue
		incoming_qty = flt(row.qty)
		if incoming_qty <= 1e-6:
			continue

		try:
			_fulfill_backorders_for_item_warehouse(
				row.item_code, row.warehouse, incoming_qty, doc, source_doctype
			)
		except Exception:
			# One item's backorder fulfillment failing must never block the document
			# that already submitted, or stop the next item in it from being processed.
			frappe.log_error(
				frappe.get_traceback(),
				f"Failed to fulfill backorders for {row.item_code} in {row.warehouse} "
				f"from {source_doctype} {doc.name}",
			)


def _fulfill_backorders_for_item_warehouse(item_code, warehouse, incoming_qty, source_doc, source_doctype):
	remaining = flt(incoming_qty)

	open_backorders = frappe.get_all(
		"Klik POS Backorder",
		filters={
			"item_code": item_code,
			"warehouse": warehouse,
			"status": ["in", ["Open", "Partially Fulfilled"]],
		},
		fields=["name", "pending_qty"],
		order_by="creation asc",
	)

	for row in open_backorders:
		if remaining <= 1e-6:
			break
		fulfill_qty = min(flt(row.pending_qty), remaining)
		if fulfill_qty <= 1e-6:
			continue

		_fulfill_one_backorder(row.name, fulfill_qty, source_doc, source_doctype)
		remaining -= fulfill_qty


def _assign_batch_to_delivery_note_row(dn_row, item_code, warehouse, qty):
	"""Give a fulfillment Delivery Note row a batch to consume, if the item is
	batch-tracked. Reuses the same FIFO auto-fetch klik_pos.api.sales_invoice uses at
	sale time -- it returns a single batch name when one batch alone covers `qty`, or a
	list of {batch_no, qty} entries when it took more than one, in which case a Serial
	and Batch Bundle is built here the same way _create_batch_and_serial_bundle does
	for a normal sale. Does nothing for a non-batch-tracked item.
	"""
	has_batch_no = frappe.db.get_value("Item", item_code, "has_batch_no")
	if not has_batch_no:
		return

	from klik_pos.api.sales_invoice import _autofetch_batch_fifo

	auto_batch = _autofetch_batch_fifo(item_code, warehouse, qty)
	if isinstance(auto_batch, list):
		bundle = frappe.new_doc("Serial and Batch Bundle")
		bundle.item_code = item_code
		bundle.company = frappe.db.get_value("Warehouse", warehouse, "company")
		bundle.warehouse = warehouse
		bundle.has_batch_no = 1
		bundle.type_of_transaction = "Outward"
		bundle.voucher_type = "Delivery Note"
		for entry in auto_batch:
			bundle.append(
				"entries",
				{"batch_no": entry.get("batch_no"), "qty": -abs(flt(entry.get("qty") or 0))},
			)
		with _as_system_user():
			bundle.insert(ignore_permissions=True)
		dn_row.serial_and_batch_bundle = bundle.name
	elif auto_batch:
		dn_row.batch_no = auto_batch
		dn_row.use_serial_batch_fields = 1


def _fulfill_one_backorder(backorder_name, qty, source_doc, source_doctype):
	backorder = frappe.get_doc("Klik POS Backorder", backorder_name)
	if backorder.status in ("Fulfilled", "Cancelled"):
		return

	dn = frappe.new_doc("Delivery Note")
	dn.customer = backorder.customer
	dn.company = backorder.company
	dn.posting_date = nowdate()
	dn.posting_time = nowtime()
	dn.set_posting_time = 1
	dn.remarks = _(
		"Backorder fulfillment for POS Sales Invoice {0} (Klik POS Backorder {1}), "
		"stocked by {2} {3}."
	).format(backorder.sales_invoice, backorder.name, source_doctype, source_doc.name)

	income_account = frappe.db.get_value(
		"Sales Invoice Item",
		backorder.sales_invoice_item,
		"income_account",
	)
	expense_account = frappe.db.get_value(
		"Sales Invoice Item",
		backorder.sales_invoice_item,
		"expense_account",
	)
	cost_center = frappe.db.get_value(
		"Sales Invoice Item",
		backorder.sales_invoice_item,
		"cost_center",
	)

	dn_row = dn.append(
		"items",
		{
			"item_code": backorder.item_code,
			"item_name": backorder.item_name,
			"qty": qty,
			"rate": backorder.rate,
			"warehouse": backorder.warehouse,
			"income_account": income_account,
			"expense_account": expense_account,
			"cost_center": cost_center,
			"against_sales_invoice": backorder.sales_invoice,
			"si_detail": backorder.sales_invoice_item,
		},
	)

	# A backorder row was deliberately never given a batch at sale time (see
	# _split_oversold_items / _validate_and_autofetch_batch_and_serial in
	# klik_pos.api.sales_invoice -- there was no real stock behind it yet to pick a
	# batch from). Now that this qty has actually arrived, this Delivery Note is the
	# first real stock-consuming transaction for it, so a batch-tracked item needs a
	# batch assigned here, or ERPNext will refuse to submit the Delivery Note at all.
	_assign_batch_to_delivery_note_row(dn_row, backorder.item_code, backorder.warehouse, qty)

	with _as_system_user():
		dn.insert(ignore_permissions=True)
		dn.submit()

	frappe.db.set_value(
		"Sales Invoice Item",
		backorder.sales_invoice_item,
		{
			"delivery_note": dn.name,
			"dn_detail": dn_row.name,
			"delivered_qty": flt(
				frappe.db.get_value("Sales Invoice Item", backorder.sales_invoice_item, "delivered_qty")
			)
			+ flt(qty),
		},
	)

	backorder.append(
		"fulfillment_log",
		{
			"purchase_doctype": source_doctype,
			"purchase_document": source_doc.name,
			"delivery_note": dn.name,
			"qty": qty,
			"posting_date": nowdate(),
		},
	)
	backorder.pending_qty = flt(backorder.pending_qty) - flt(qty)
	backorder.fulfilled_qty = flt(backorder.fulfilled_qty) + flt(qty)
	with _as_system_user():
		backorder.save(ignore_permissions=True)