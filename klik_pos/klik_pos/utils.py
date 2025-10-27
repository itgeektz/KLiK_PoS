import frappe
from frappe import _

# Performance optimization: Cache frequently accessed data per user
# Key: user email, Value: POS Profile document
_cached_pos_profiles = {}
_cached_company_data = {}


def get_current_pos_profile():
	"""Optimized POS profile getter with per-user caching - gets from current opening entry"""
	user = frappe.session.user

	# Check cache for this specific user
	if user in _cached_pos_profiles:
		return _cached_pos_profiles[user]

	from klik_pos.api.sales_invoice import get_current_pos_opening_entry

	current_opening_entry = get_current_pos_opening_entry()

	if current_opening_entry:
		opening_doc = frappe.get_doc("POS Opening Entry", current_opening_entry)
		pos_profile_name = opening_doc.pos_profile
	else:
		pos_profile_name = frappe.get_value("POS Profile User", {"user": user}, "parent")
		if not pos_profile_name:
			frappe.throw(_("No POS Profile found for user {0}").format(user))

	pos_profile_doc = frappe.get_doc("POS Profile", pos_profile_name)

	# Cache for this specific user
	_cached_pos_profiles[user] = pos_profile_doc
	return pos_profile_doc


def clear_pos_profile_cache(user=None):
	"""Clear the cached POS profile to force refresh"""
	global _cached_pos_profiles

	if user:
		# Clear cache for specific user
		if user in _cached_pos_profiles:
			del _cached_pos_profiles[user]
			frappe.logger().info(f"🧹 POS Profile cache cleared for user: {user}")
	else:
		# Clear cache for current user
		current_user = frappe.session.user
		if current_user in _cached_pos_profiles:
			del _cached_pos_profiles[current_user]
			frappe.logger().info(f"🧹 POS Profile cache cleared for user: {current_user}")


def get_user_default_company():
	user = frappe.session.user
	return frappe.defaults.get_user_default(user, "Company")
