output "apps_compartment_id" {
  value = oci_identity_compartment.apps.id
}

output "project_compartment_id" {
  value = oci_identity_compartment.project.id
}

output "vcn_id" {
  value = oci_core_vcn.this.id
}

output "private_subnet_id" {
  value = oci_core_subnet.private_app.id
}

output "public_load_balancer_ip_addresses" {
  value = oci_network_load_balancer_network_load_balancer.public.ip_addresses
}

output "public_load_balancer_public_ip" {
  value = try([
    for address in oci_network_load_balancer_network_load_balancer.public.ip_addresses :
    address.ip_address
    if address.is_public
  ][0], null)
}

output "public_load_balancer_public_ips" {
  value = [
    for address in oci_network_load_balancer_network_load_balancer.public.ip_addresses :
    address.ip_address
    if address.is_public
  ]
}

output "private_instance_id" {
  value = oci_core_instance.app.id
}

output "private_instance_private_ip" {
  value = oci_core_instance.app.private_ip
}

output "bastion_id" {
  value = oci_bastion_bastion.admin.id
}

output "bastion_name" {
  value = oci_bastion_bastion.admin.name
}
