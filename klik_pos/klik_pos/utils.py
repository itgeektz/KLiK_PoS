import frappe

# Performance optimization: Cache frequently accessed data
_cached_pos_profile = None
_cached_company_data = {}


def get_current_pos_profile():
	"""Optimized POS profile getter with caching"""
	global _cached_pos_profile

	if _cached_pos_profile is None:
		user = frappe.session.user
		pos_profile = frappe.get_value("POS Profile User", {"user": user}, "parent")
		_cached_pos_profile = frappe.get_doc("POS Profile", pos_profile)

	return _cached_pos_profile


def clear_pos_profile_cache():
	"""Clear the cached POS profile to force refresh"""
	global _cached_pos_profile
	_cached_pos_profile = None
	frappe.logger().info("🧹 POS Profile cache cleared")


def get_user_default_company():
	user = frappe.session.user
	return frappe.defaults.get_user_default(user, "Company")
