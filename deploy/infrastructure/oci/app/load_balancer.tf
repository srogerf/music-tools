resource "oci_network_load_balancer_network_load_balancer" "public" {
  compartment_id                 = local.deployment_compartment_id
  display_name                   = "${var.name_prefix}-nlb"
  subnet_id                      = oci_core_subnet.public_lb.id
  is_private                     = false
  network_security_group_ids     = [oci_core_network_security_group.lb.id]
  is_preserve_source_destination = false
}

resource "oci_network_load_balancer_backend_set" "app_http" {
  name                     = "app-http"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  policy                   = "FIVE_TUPLE"

  health_checker {
    protocol = "TCP"
    port     = var.health_check_port
  }
}

resource "oci_network_load_balancer_backend" "app_http" {
  backend_set_name         = oci_network_load_balancer_backend_set.app_http.name
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  ip_address               = oci_core_instance.app.private_ip
  port                     = 80
  is_backup                = false
  is_drain                 = false
  is_offline               = false
  weight                   = 1
}

resource "oci_network_load_balancer_listener" "http" {
  name                     = "http"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  default_backend_set_name = oci_network_load_balancer_backend_set.app_http.name
  port                     = 80
  protocol                 = "TCP"
}

resource "oci_network_load_balancer_backend_set" "app_https" {
  name                     = "app-https"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  policy                   = "FIVE_TUPLE"

  health_checker {
    protocol = "TCP"
    port     = 443
  }
}

resource "oci_network_load_balancer_backend" "app_https" {
  backend_set_name         = oci_network_load_balancer_backend_set.app_https.name
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  ip_address               = oci_core_instance.app.private_ip
  port                     = 443
  is_backup                = false
  is_drain                 = false
  is_offline               = false
  weight                   = 1
}

resource "oci_network_load_balancer_listener" "https" {
  name                     = "https"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.public.id
  default_backend_set_name = oci_network_load_balancer_backend_set.app_https.name
  port                     = 443
  protocol                 = "TCP"
}
