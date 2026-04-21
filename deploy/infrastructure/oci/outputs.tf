output "apps_compartment_id" {
  value = oci_identity_compartment.apps.id
}

output "project_compartment_id" {
  value = oci_identity_compartment.project.id
}

output "vcn_id" {
  value = oci_core_vcn.this.id
}

output "public_load_balancer_ip_addresses" {
  value = oci_network_load_balancer_network_load_balancer.public.ip_addresses
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
