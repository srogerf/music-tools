output "nat_gateway_id" {
  value = oci_core_nat_gateway.bootstrap.id
}

output "route_table_id" {
  value = oci_core_route_table.private_bootstrap_nat.id
}

output "private_subnet_id" {
  value     = var.private_subnet_id
  sensitive = true
}
