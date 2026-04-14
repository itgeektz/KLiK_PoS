import frappe
from frappe import _
from frappe.utils import flt

from klik_pos.klik_pos.utils import get_current_pos_profile

from ..sql_builder import apply_sql_permissions
from .item_price import fetch_item_price
from .item_stock import fetch_item_balance


@frappe.whitelist(allow_guest=True)
def get_items_with_balance_and_price(
    limit: int = 1000,
    offset: int = 0,
    search: str | None = None,
    category: str | None = None,
    customer: str | None = None,
):
    try:
        limit = int(limit) if limit else 1000
        offset = int(offset) if offset else 0
    except (ValueError, TypeError):
        limit = 1000
        offset = 0

    limit = min(limit, 2000)

    pos_doc, warehouse, price_list, hide_unavailable = _get_pos_context()
    
    # Apply priority-based price list selection considering customer
    price_list = _get_priority_price_list(customer, pos_doc, price_list)

    try:
        select_fields = "i.name, i.item_name, i.description, i.item_group, i.image, i.stock_uom, i.has_batch_no, i.has_serial_no"
        params_list = []
        count_params = []

        if hide_unavailable:
            base_query = [
                f"SELECT DISTINCT {select_fields}",
                "FROM `tabItem` i",
                "INNER JOIN `tabBin` b ON i.name = b.item_code",
                "WHERE i.disabled = 0",
                "AND i.is_stock_item = 1",
                "AND b.actual_qty > 0",
            ]
            count_query = [
                "SELECT COUNT(DISTINCT i.name) as total",
                "FROM `tabItem` i",
                "INNER JOIN `tabBin` b ON i.name = b.item_code",
                "WHERE i.disabled = 0",
                "AND i.is_stock_item = 1",
                "AND b.actual_qty > 0",
            ]
        else:
            base_query = [
                f"SELECT DISTINCT {select_fields}",
                "FROM `tabItem` i",
                "WHERE i.disabled = 0",
                "AND i.is_stock_item = 1",
            ]
            count_query = [
                "SELECT COUNT(DISTINCT i.name) as total",
                "FROM `tabItem` i",
                "WHERE i.disabled = 0",
                "AND i.is_stock_item = 1",
            ]

        if hide_unavailable and warehouse:
            base_query.append("AND b.warehouse = %s")
            count_query.append("AND b.warehouse = %s")
            params_list.append(warehouse)
            count_params.append(warehouse)

        if getattr(pos_doc, "item_groups", None):
            item_group_names = [d.item_group for d in pos_doc.item_groups if d.item_group]
            if item_group_names:
                placeholders = ", ".join(["%s"] * len(item_group_names))
                base_query.append(f"AND i.item_group IN ({placeholders})")
                count_query.append(f"AND i.item_group IN ({placeholders})")
                params_list.extend(item_group_names)
                count_params.extend(item_group_names)

        if category and category != "all":
            base_query.append("AND i.item_group = %s")
            count_query.append("AND i.item_group = %s")
            params_list.append(category)
            count_params.append(category)

        search_term = None
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            search_condition = """
                AND (
                    i.name LIKE %s
                    OR i.item_name LIKE %s
                    OR i.description LIKE %s
                    OR EXISTS (
                        SELECT 1 FROM `tabItem Barcode` ib
                        WHERE ib.parent = i.name AND ib.barcode LIKE %s
                    )
                )
            """
            base_query.append(search_condition)
            count_query.append(search_condition)
            params_list.extend([search_term, search_term, search_term, search_term])
            count_params.extend([search_term, search_term, search_term, search_term])

        count_sql = "\n".join(count_query)
        count_sql = apply_sql_permissions(count_sql)

        total_result = frappe.db.sql(
            count_sql,
            tuple(count_params),
            as_dict=True,
        )

        total_count = total_result[0]["total"] if total_result else 0

        if hide_unavailable:
            unfiltered_count_query = [
                "SELECT COUNT(DISTINCT i.name) as total",
                "FROM `tabItem` i",
                "WHERE i.disabled = 0",
                "AND i.is_stock_item = 1",
            ]

            unfiltered_params = []

            if getattr(pos_doc, "item_groups", None):
                item_group_names = [d.item_group for d in pos_doc.item_groups if d.item_group]
                if item_group_names:
                    placeholders = ", ".join(["%s"] * len(item_group_names))
                    unfiltered_count_query.append(f"AND i.item_group IN ({placeholders})")
                    unfiltered_params.extend(item_group_names)

            if category and category != "all":
                unfiltered_count_query.append("AND i.item_group = %s")
                unfiltered_params.append(category)

            if search_term:
                unfiltered_count_query.append(
                    """
                    AND (
                        i.name LIKE %s OR i.item_name LIKE %s OR i.description LIKE %s
                        OR EXISTS (
                            SELECT 1 FROM `tabItem Barcode` ib
                            WHERE ib.parent = i.name AND ib.barcode LIKE %s
                        )
                    )
                    """
                )
                unfiltered_params.extend([search_term, search_term, search_term, search_term])

            unfiltered_sql = "\n".join(unfiltered_count_query)
            unfiltered_sql = apply_sql_permissions(unfiltered_sql)

            unfiltered_res = frappe.db.sql(
                unfiltered_sql,
                tuple(unfiltered_params),
                as_dict=True,
            )

            total_count = unfiltered_res[0]["total"] if unfiltered_res else 0

        base_query.append("ORDER BY i.item_name ASC LIMIT %s OFFSET %s")
        params_list.extend([limit, offset])

        main_sql = "\n".join(base_query)
        main_sql = apply_sql_permissions(main_sql)

        items = frappe.db.sql(
            main_sql,
            tuple(params_list),
            as_dict=True,
        )

        if not items:
            return {
                "items": [],
                "total_count": total_count,
                "has_more": False,
                "limit": limit,
                "offset": offset,
            }

        item_codes = [item["name"] for item in items]

        barcode_map = {}
        barcode_results = frappe.get_list(
            "Item Barcode",
            filters={"parent": ["in", item_codes]},
            fields=["parent", "barcode"],
            ignore_permissions=True,
        )

        for row in barcode_results:
            if row.parent not in barcode_map:
                barcode_map[row.parent] = row.barcode

        uom_map = {
            item["name"]: item.get("stock_uom", "Nos") for item in items
        }

        stock_map = _fetch_batch_stock(item_codes, warehouse)
        price_map = _fetch_batch_prices(item_codes, price_list, uom_map)

        enriched_items = []

        for item in items:
            item_code = item["name"]
            balance = stock_map.get(item_code, 0)

            if hide_unavailable and balance <= 0:
                continue

            price_info = price_map.get(
                item_code,
                {"price": 0, "currency": "SAR", "currency_symbol": "SAR"},
            )

            enriched_items.append(
                {
                    "id": item_code,
                    "name": item.item_name or item_code,
                    "description": item.description or "",
                    "category": item.item_group or "General",
                    "price": price_info["price"],
                    "currency": price_info["currency"],
                    "currency_symbol": price_info["currency_symbol"],
                    "available": balance,
                    "image": item.image,
                    "sold": 0,
                    "preparationTime": 10,
                    "uom": item.stock_uom or "Nos",
                    "barcode": barcode_map.get(item_code),
                    "has_batch_no": item.has_batch_no,
                    "has_serial_no": item.has_serial_no,
                }
            )

        return {
            "items": enriched_items,
            "total_count": total_count,
            "has_more": (offset + len(enriched_items)) < total_count,
            "limit": limit,
            "offset": offset,
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Get Combined Item Data Error",
        )
        frappe.throw(_("Something went wrong while fetching item data."))


def _get_pos_context():
    try:
        pos_doc = get_current_pos_profile()
    except Exception:
        pos_doc = frappe._dict({})

    warehouse = getattr(pos_doc, "warehouse", None)

    if not warehouse:
        default_company = (
            frappe.defaults.get_user_default("Company")
            or frappe.db.get_single_value("Global Defaults", "default_company")
        )

        warehouse = frappe.db.get_value(
            "Company",
            default_company,
            "default_warehouse",
        )

    if not warehouse:
        any_wh = frappe.get_list(
            "Warehouse",
            filters={"is_group": 0},
            fields=["name"],
            limit=1,
        )
        warehouse = any_wh[0].name if any_wh else None

    return (
        pos_doc,
        warehouse,
        getattr(pos_doc, "selling_price_list", None),
        getattr(pos_doc, "hide_unavailable_items", False),
    )


def _get_priority_price_list(customer=None, pos_profile=None, default_price_list=None):
	"""
	Implement priority-based price list selection:
	1. Customer's default price list
	2. Customer group's default price list
	3. POS Profile's default price list
	4. Selling Settings' default price list
	5. None (fallback to most recent item price)
	"""
	try:
		# Priority 1: Customer's default price list
		if customer:
			try:
				customer_doc = frappe.get_doc("Customer", customer)
				if customer_doc.default_price_list:
					frappe.logger().info(
						f"Using customer {customer}'s default price list: {customer_doc.default_price_list}"
					)
					return customer_doc.default_price_list
			except Exception:
				pass
			
			# Priority 2: Customer group's default price list
			try:
				customer_doc = frappe.get_doc("Customer", customer)
				if customer_doc.customer_group:
					customer_group_doc = frappe.get_doc("Customer Group", customer_doc.customer_group)
					if getattr(customer_group_doc, "default_price_list", None):
						frappe.logger().info(
							f"Using customer group {customer_doc.customer_group}'s default price list: {customer_group_doc.default_price_list}"
						)
						return customer_group_doc.default_price_list
			except Exception:
				pass
	except Exception as e:
		frappe.logger().warning(f"Error getting customer-based price list: {e}")
	
	# Priority 3: POS Profile's default price list
	if pos_profile and getattr(pos_profile, "selling_price_list", None):
		frappe.logger().info(f"Using POS profile's price list: {pos_profile.selling_price_list}")
		return pos_profile.selling_price_list
	
	# Priority 4: Selling Settings' default price list
	try:
		selling_settings_price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
		if selling_settings_price_list:
			frappe.logger().info(f"Using Selling Settings' default price list: {selling_settings_price_list}")
			return selling_settings_price_list
	except Exception:
		pass
	
	# Priority 5: Use provided default (fallback)
	if default_price_list:
		frappe.logger().info(f"Using default price list: {default_price_list}")
		return default_price_list
	
	# No price list found - will use most recent item price (handled by fetch_item_price fallback)
	frappe.logger().info("No price list found in priority chain, will use most recent item price")
	return None





def _fetch_batch_stock(item_codes, warehouse):
    if not item_codes or not warehouse:
        return {}

    stock_map = {code: 0 for code in item_codes}

    try:
        placeholders = ", ".join(["%s"] * len(item_codes))

        stock_sql = f"""
            SELECT item_code, actual_qty
            FROM `tabBin`
            WHERE item_code IN ({placeholders}) AND warehouse = %s
        """
        stock_sql = apply_sql_permissions(stock_sql)

        results = frappe.db.sql(
            stock_sql,
            (*item_codes, warehouse),
            as_dict=True,
        )

        for row in results:
            stock_map[row["item_code"]] = flt(row["actual_qty"])

    except Exception:
        for code in item_codes:
            stock_map[code] = fetch_item_balance(code, warehouse)

    return stock_map


def _fetch_batch_prices(item_codes, price_list, uom_map):
    if not item_codes:
        return {}

    price_map = {}
    placeholders = ", ".join(["%s"] * len(item_codes))

    query = f"""
        SELECT item_code, price_list_rate, currency
        FROM `tabItem Price`
        WHERE item_code IN ({placeholders}) AND selling = 1
    """

    params = list(item_codes)

    if price_list:
        query += " AND price_list = %s"
        params.append(price_list)

    try:
        query = apply_sql_permissions(query)

        results = frappe.db.sql(
            query,
            tuple(params),
            as_dict=True,
        )

        for row in results:
            price_map[row["item_code"]] = {
                "price": flt(row["price_list_rate"]),
                "currency": row["currency"],
                "currency_symbol": row["currency"],
            }

        for code in item_codes:
            if code not in price_map:
                p_info = fetch_item_price(
                    code,
                    price_list=price_list,
                    uom=uom_map.get(code),
                )
                price_map[code] = {
                    "price": flt(p_info.get("price", 0)),
                    "currency": p_info.get("currency", "SAR"),
                    "currency_symbol": p_info.get("currency", "SAR"),
                }

    except Exception:
        for code in item_codes:
            p_info = fetch_item_price(
                code,
                price_list=price_list,
                uom=uom_map.get(code),
            )
            price_map[code] = {
                "price": flt(p_info.get("price", 0)),
                "currency": p_info.get("currency", "SAR"),
                "currency_symbol": p_info.get("currency", "SAR"),
            }

    return price_map