resource "oci_core_nat_gateway" "bootstrap" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.name_prefix}-nat-gateway"
  block_traffic  = false
}

resource "oci_core_route_table" "private_bootstrap_nat" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_id
  display_name   = "${var.name_prefix}-private-nat-rt"

  route_rules {
    network_entity_id = oci_core_nat_gateway.bootstrap.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_route_table_attachment" "private_subnet" {
  subnet_id      = var.private_subnet_id
  route_table_id = oci_core_route_table.private_bootstrap_nat.id
}
