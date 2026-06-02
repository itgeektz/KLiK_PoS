import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


FIELDNAME = "default_sales_type"


def execute():
    custom_fields = {
        "POS Profile": [
            {
                "fieldname": FIELDNAME,
                "label": "Default Sales Type",
                "fieldtype": "Select",
                "options": "Cash\nCredit",
                "default": "Cash",
                "insert_after": "allow_partial_payment",
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
            SET default_sales_type = 'Cash'
            WHERE IFNULL(default_sales_type, '') = ''
            """
        )
