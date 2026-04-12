import frappe
from frappe import _
from klik_pos.klik_pos.utils import get_current_pos_profile

@frappe.whitelist(allow_guest=True)
def get_item_groups_for_pos():
    try:
        pos_profile = get_current_pos_profile()
        item_group_names = [d.item_group for d in pos_profile.get("item_groups", []) if d.item_group]

        group_filters = {"is_group": 0}
        if item_group_names:
            group_filters["name"] = ["in", item_group_names]

        item_groups = frappe.get_list(
            "Item Group",
            filters=group_filters,
            fields=["name", "item_group_name", "parent_item_group"],
            order_by="modified desc" if not item_group_names else None,
            limit=100 if not item_group_names else None
        )

        item_filters = {"disabled": 0, "is_stock_item": 1}
        if item_group_names:
            item_filters["item_group"] = ["in", item_group_names]

        total_item_count = frappe.db.count("Item", filters=item_filters)

        all_items = frappe.get_list(
            "Item",
            filters={"disabled": 0},
            fields=["item_group"],
            limit_page_length=0
        )
        
        counts_map = {}
        for item in all_items:
            counts_map[item.item_group] = counts_map.get(item.item_group, 0) + 1

        formatted_groups = []
        for group in item_groups:
            formatted_groups.append({
                "id": group.name,
                "name": group.item_group_name or group.name,
                "parent": group.parent_item_group or None,
                "icon": "📦",
                "count": counts_map.get(group.name, 0)
            })

        return {
            "groups": formatted_groups,
            "total_items": total_item_count
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Get Item Groups for POS Error {str(e)}")
        frappe.throw(_("Something went wrong while fetching item group data."))