import frappe


def before_install():
    """Remove custom fields and property setters added by the old POS extension."""
    custom_fields_to_remove = [
        "POS Profile-custom_require_sales_person",
        "POS Profile-custom_sales_person_pin_required",
        "Sales Person-pos_pin",
        "Customer-custom_is_walkin",
    ]

    for field_name in custom_fields_to_remove:
        if frappe.db.exists("Custom Field", field_name):
            frappe.delete_doc("Custom Field", field_name, ignore_permissions=True)
