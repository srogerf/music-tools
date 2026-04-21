resource "oci_core_instance" "app" {
  availability_domain = local.availability_domain
  compartment_id      = local.deployment_compartment_id
  display_name        = "${var.name_prefix}-app"
  shape               = var.instance_shape

  dynamic "shape_config" {
    for_each = var.instance_shape == "VM.Standard.A1.Flex" ? [1] : []

    content {
      ocpus         = var.instance_ocpus
      memory_in_gbs = var.instance_memory_gbs
    }
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private_app.id
    assign_public_ip = false
    nsg_ids          = [oci_core_network_security_group.app.id]
    display_name     = "${var.name_prefix}-app-vnic"
    hostname_label   = "app"
  }

  source_details {
    source_type             = "image"
    source_id               = var.instance_image_ocid
    boot_volume_size_in_gbs = var.boot_volume_size_gbs
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}
