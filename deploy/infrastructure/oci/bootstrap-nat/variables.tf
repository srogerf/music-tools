variable "tenancy_ocid" {
  description = "OCI tenancy OCID."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.tenancy\\.", var.tenancy_ocid))
    error_message = "tenancy_ocid must be an OCI tenancy OCID starting with ocid1.tenancy."
  }
}

variable "user_ocid" {
  description = "OCI user OCID."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.user\\.", var.user_ocid))
    error_message = "user_ocid must be an OCI user OCID starting with ocid1.user."
  }
}

variable "fingerprint" {
  description = "OCI API key fingerprint."
  type        = string
  sensitive   = true
}

variable "private_key_path" {
  description = "Path to the OCI API private key used by Terraform."
  type        = string
  sensitive   = true
}

variable "region" {
  description = "OCI region."
  type        = string
}

variable "compartment_ocid" {
  description = "Compartment OCID where the temporary NAT resources will be created."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.(tenancy|compartment)\\.", var.compartment_ocid))
    error_message = "compartment_ocid must be an OCI tenancy or compartment OCID."
  }
}

variable "vcn_id" {
  description = "VCN OCID that contains the private app subnet."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.vcn\\.", var.vcn_id))
    error_message = "vcn_id must be an OCI VCN OCID starting with ocid1.vcn."
  }
}

variable "private_subnet_id" {
  description = "Private app subnet OCID that should receive temporary NAT egress."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.subnet\\.", var.private_subnet_id))
    error_message = "private_subnet_id must be an OCI subnet OCID starting with ocid1.subnet."
  }
}

variable "name_prefix" {
  description = "Prefix used for temporary bootstrap NAT resource display names."
  type        = string
  default     = "music-tools-bootstrap"
}
