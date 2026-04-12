import frappe
from frappe import _
from klik_pos.klik_pos.utils import get_current_pos_profile

@frappe.whitelist(allow_guest=True)
def get_item_groups_for_pos():
    try:
        pos_profile = get_current_pos_profile()

        formatted_groups = []
        item_group_names = []

        if pos_profile.item_groups:
            item_group_names = [
                d.item_group for d in pos_profile.item_groups if d.item_group
            ]

            item_groups = frappe.get_list(
                "Item Group",
                filters={
                    "name": ["in", item_group_names],
                    "is_group": 0,
                    "exclude_from_pos": 0,
                },
                fields=["name", "item_group_name", "parent_item_group"],
            )
        else:
            item_groups = frappe.get_list(
                "Item Group",
                filters={"is_group": 0, "exclude_from_pos": 0},
                fields=["name", "item_group_name"],
                limit=100,
                order_by="modified desc",
            )

        if item_group_names:
            total_item_count = frappe.db.count(
                "Item",
                filters={
                    "disabled": 0,
                    "is_stock_item": 1,
                    "item_group": ["in", item_group_names],
                },
            )
        else:
            total_item_count = frappe.db.count(
                "Item",
                filters={"disabled": 0, "is_stock_item": 1},
            )

        for group in item_groups:
            item_count = frappe.db.count(
                "Item",
                filters={"item_group": group["name"]},
            )

            formatted_groups.append(
                {
                    "id": group["name"],
                    "name": group.get("item_group_name") or group["name"],
                    "parent": group.get("parent_item_group") or None,
                    "icon": "📦",
                    "count": item_count,
                }
            )

        return {
            "groups": formatted_groups,
            "total_items": total_item_count,
        }

    except Exception as e:
        frappe.log_error(
            frappe.get_traceback(),
            f"Get Item Groups for POS Error {e!s}",
        )
        frappe.throw(_("Something went wrong while fetching item group data."))