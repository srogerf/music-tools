resource "oci_network_load_balancer_network_load_balancer" "public" {
  compartment_id                 = local.deployment_compartment_id
  display_name                   = "${var.name_prefix}-nlb"
  subnet_id                      = oci_core_subnet.public_lb.id
  is_private                     = false
  network_security_group_ids     = [oci_core_network_security_group.lb.id]
  is_preserve_source_destination = false

  listeners {
    name                     = "http"
    default_backend_set_name = "app-http"
    port                     = 80
    protocol                 = "TCP"
  }

  listeners {
    name                     = "https"
    default_backend_set_name = "app-https"
    port                     = 443
    protocol                 = "TCP"
  }

  backend_sets {
    name = "app-http"

    health_checker {
      protocol = "TCP"
      port     = var.health_check_port
    }

    backends {
      ip_address = oci_core_instance.app.private_ip
      port       = 80
      is_backup  = false
      is_drain   = false
      is_offline = false
      weight     = 1
    }
  }

  backend_sets {
    name = "app-https"

    health_checker {
      protocol = "TCP"
      port     = 443
    }

    backends {
      ip_address = oci_core_instance.app.private_ip
      port       = 443
      is_backup  = false
      is_drain   = false
      is_offline = false
      weight     = 1
    }
  }
}
