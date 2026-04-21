variable "tenancy_ocid" {
  description = "OCI tenancy OCID."
  type        = string
  sensitive   = true
}

variable "user_ocid" {
  description = "OCI user OCID."
  type        = string
  sensitive   = true
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
}

variable "state_bucket_name" {
  description = "Name of the OCI Object Storage bucket for Terraform state."
  type        = string
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
