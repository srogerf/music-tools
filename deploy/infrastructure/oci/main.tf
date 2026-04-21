locals {
  deployment_compartment_id = oci_identity_compartment.project.id
}

resource "oci_identity_compartment" "apps" {
  compartment_id = var.tenancy_ocid
  description    = "Top-level application compartment for project stacks."
  name           = var.apps_compartment_name
}

resource "oci_identity_compartment" "project" {
  compartment_id = oci_identity_compartment.apps.id
  description    = "Application compartment for the music-tools stack."
  name           = var.project_compartment_name
}
