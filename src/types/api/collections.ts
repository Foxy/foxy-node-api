export const collections = {
  "fx:taxes": "fx:tax",
  "fx:applied_coupon_codes": "fx:coupon_code",
  "fx:applied_taxes": "fx:applied_tax",
  "fx:attributes": "fx:attribute",
  "fx:billing_addresses": "fx:billing_address",
  "fx:cart_include_templates": "fx:cart_include_template",
  "fx:cart_templates": "fx:cart_template",
  "fx:checkout_templates": "fx:checkout_template",
  "fx:coupon_codes": "fx:coupon_code",
  "fx:coupon_item_categories": "fx:coupon_item_category",
  "fx:coupon_code_transactions": "fx:coupon_code_transaction",
  "fx:custom_fields": "fx:custom_field",
  "fx:downloadable_item_categories": "fx:item_category",
  "fx:discounts": "fx:discount",
  "fx:email_templates": "fx:email_template",
  "fx:error_entries": "fx:error_entry",
  "fx:hosted_payment_gateways": "fx:hosted_payment_gateway",
  "fx:integrations": "fx:integration",
  "fx:language_overrides": "fx:language_override",
  "fx:native_integrations": "fx:native_integration",
  "fx:payments": "fx:payment",
  "fx:payment_methods_expiring": "fx:payment_method_expiring",
  "fx:payment_method_sets": "fx:payment_method_set",
  "fx:payment_gateways": "fx:payment_gateway",
  "fx:items": "fx:item",
  "fx:item_categories": "fx:item_category",
  "fx:item_options": "fx:item_option",
  "fx:receipt_templates": "fx:receipt_template",
  "fx:shipping_containers": "fx:shipping_container",
  "fx:shipping_drop_types": "fx:shipping_drop_type",
  "fx:shipping_methods": "fx:shipping_method",
  "fx:shipping_services": "fx:shipping_service",
  "fx:shipments": "fx:shipment",
  "fx:stores": "fx:store",
  "fx:store_versions": "fx:store_version",
  "fx:store_shipping_methods": "fx:shipping_method",
  "fx:store_shipping_services": "fx:shipping_service",
  "fx:transactions": "fx:transaction",
  "fx:subscriptions": "fx:subscription",
  "fx:subscription_settings": "fx:subscription_settings",
  "fx:template_configs": "fx:template_config",
  "fx:template_sets": "fx:template_set",
  "fx:users": "fx:user",
} as const;

export type Collections = typeof collections;
