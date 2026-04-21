resource "oci_bastion_bastion" "admin" {
  bastion_type                 = "standard"
  compartment_id               = local.deployment_compartment_id
  target_subnet_id             = oci_core_subnet.private_app.id
  name                         = "${var.name_prefix}-bastion"
  client_cidr_block_allow_list = var.client_cidr_allowlist
  max_session_ttl_in_seconds   = var.bastion_session_ttl_seconds
}
