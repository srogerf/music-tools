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
  description = "Compartment OCID where the state bucket will be created."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.(tenancy|compartment)\\.", var.compartment_ocid))
    error_message = "compartment_ocid must be an OCI tenancy or compartment OCID. Do not enter yes; this is not the apply confirmation prompt."
  }
}

variable "state_bucket_name" {
  description = "Name of the OCI Object Storage bucket for Terraform state."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_-]+$", var.state_bucket_name))
    error_message = "state_bucket_name must contain only letters, numbers, dashes, and underscores. This is an OCI bucket name, not a local .tfstate path."
  }
}

variable "state_bucket_access_type" {
  description = "Access type for the Terraform state bucket."
  type        = string
  default     = "NoPublicAccess"

  validation {
    condition     = contains(["NoPublicAccess", "ObjectRead", "ObjectReadWithoutList"], var.state_bucket_access_type)
    error_message = "state_bucket_access_type must be NoPublicAccess, ObjectRead, or ObjectReadWithoutList."
  }
}
