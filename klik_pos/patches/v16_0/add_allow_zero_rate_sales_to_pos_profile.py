import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


FIELDNAME = "allow_zero_rate_sales"


def execute():
    custom_fields = {
        "POS Profile": [
            {
                "fieldname": FIELDNAME,
                "label": "Allow Selling Items at Zero Rate",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "default_sales_type",
                "description": "Allow cashiers using this POS Profile to add items with a selling rate of 0.00.",
                "in_list_view": 0,
                "read_only": 0,
                "reqd": 0,
            }
        ]
    }

    create_custom_fields(custom_fields, update=True)

    if frappe.db.has_column("POS Profile", FIELDNAME):
        frappe.db.sql(
            """
            UPDATE `tabPOS Profile`
            SET allow_zero_rate_sales = 0
            WHERE allow_zero_rate_sales IS NULL
            """
        )
