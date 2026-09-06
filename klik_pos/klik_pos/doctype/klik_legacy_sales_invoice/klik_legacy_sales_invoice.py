# Copyright (c) 2026, and contributors
# License: see license.txt

import frappe
from frappe.model.document import Document


class KlikLegacySalesInvoice(Document):
	"""Read-only reference record imported from the pre-migration MySQL system.

	Deliberately NOT submittable and never touched by ERPNext accounting --
	this exists purely so a cashier can look up an old bill for a customer
	and re-create it as a brand new Sales Invoice via the POS cart. It has
	no GL impact on the real Sales Invoice ledger and is not a substitute
	for it. Populated once (and re-run safely, keyed on legacy_header_id)
	by klik_pos.klik_pos.legacy_import.import_legacy_sales.execute_import.
	"""

	def before_insert(self):
		if not self.imported_on:
			self.imported_on = frappe.utils.now_datetime()

	def validate(self):
		# The importer sets customer_match_status explicitly (Matched / Walk-in /
		# Unmatched) based on how the legacy customer name was resolved. Here we
		# only guard against an inconsistent combination slipping through a
		# manual edit in the desk: no customer link can never be "Matched".
		if not self.customer:
			self.customer_match_status = "Unmatched"
		elif self.customer_match_status == "Unmatched":
			self.customer_match_status = "Matched"
