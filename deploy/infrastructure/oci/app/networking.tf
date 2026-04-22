resource "oci_core_vcn" "this" {
  compartment_id = local.deployment_compartment_id
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.name_prefix}-vcn"
  dns_label      = "musictools"
}

resource "oci_core_internet_gateway" "this" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-igw"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-public-rt"

  route_rules {
    network_entity_id = oci_core_internet_gateway.this.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_security_list" "public_subnet" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-public-sl"

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 443
      max = 443
    }
  }

  egress_security_rules {
    protocol    = "6"
    destination = var.private_subnet_cidr

    tcp_options {
      min = 80
      max = 80
    }
  }

  egress_security_rules {
    protocol    = "6"
    destination = var.private_subnet_cidr

    tcp_options {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_security_list" "private_subnet" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-private-sl"

  egress_security_rules {
    protocol    = "all"
    destination = var.vcn_cidr
  }
}

resource "oci_core_subnet" "public_lb" {
  compartment_id             = local.deployment_compartment_id
  vcn_id                     = oci_core_vcn.this.id
  availability_domain        = null
  cidr_block                 = var.public_subnet_cidr
  display_name               = "${var.name_prefix}-public-lb-subnet"
  dns_label                  = "publiclb"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public_subnet.id]
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_subnet" "private_app" {
  compartment_id             = local.deployment_compartment_id
  vcn_id                     = oci_core_vcn.this.id
  availability_domain        = null
  cidr_block                 = var.private_subnet_cidr
  display_name               = "${var.name_prefix}-private-app-subnet"
  dns_label                  = "privateapp"
  security_list_ids          = [oci_core_security_list.private_subnet.id]
  prohibit_public_ip_on_vnic = true
}

resource "oci_core_network_security_group" "lb" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-lb-nsg"
}

resource "oci_core_network_security_group_security_rule" "lb_ingress_http" {
  network_security_group_id = oci_core_network_security_group.lb.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_ingress_https" {
  network_security_group_id = oci_core_network_security_group.lb.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_egress_http_to_app" {
  network_security_group_id = oci_core_network_security_group.lb.id
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = oci_core_network_security_group.app.id
  destination_type          = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_egress_https_to_app" {
  network_security_group_id = oci_core_network_security_group.lb.id
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = oci_core_network_security_group.app.id
  destination_type          = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group" "app" {
  compartment_id = local.deployment_compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name_prefix}-app-nsg"
}

resource "oci_core_network_security_group_security_rule" "app_ingress_http_from_lb" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.lb.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_ingress_https_from_lb" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.lb.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_ingress_ssh_from_bastion_service" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.vcn_cidr
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }

  description = "SSH is only allowed from within the VCN path used for Bastion access."
}

resource "oci_core_network_security_group_security_rule" "app_egress_vcn" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = var.vcn_cidr
  destination_type          = "CIDR_BLOCK"
}
