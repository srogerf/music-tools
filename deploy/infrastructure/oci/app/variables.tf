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

variable "availability_domain" {
  description = "Optional availability domain name for the compute instance. Leave null to select by availability_domain_index."
  type        = string
  default     = null
}

variable "availability_domain_index" {
  description = "Zero-based availability domain index to use when availability_domain is unset. Phoenix Always Free E2 Micro is expected in PHX-AD-3, usually index 2."
  type        = number
  default     = 2

  validation {
    condition     = var.availability_domain_index >= 0 && var.availability_domain_index <= 2
    error_message = "availability_domain_index must be 0, 1, or 2."
  }
}

variable "ssh_public_key" {
  description = "SSH public key content for the compute instance."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[^ ]+)[[:space:]]+", var.ssh_public_key)) && !can(regex("\\.\\.\\.|example|replace", lower(var.ssh_public_key)))
    error_message = "ssh_public_key must be a real SSH public key, not the example placeholder."
  }
}

variable "client_cidr_allowlist" {
  description = "CIDRs allowed to create Bastion sessions."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "name_prefix" {
  description = "Prefix used for OCI resource display names."
  type        = string
  default     = "music-tools"
}

variable "apps_compartment_name" {
  description = "Top-level compartment name to create under the tenancy."
  type        = string
  default     = "apps"
}

variable "project_compartment_name" {
  description = "Project compartment name to create under the apps compartment."
  type        = string
  default     = "music-tools"
}

variable "vcn_cidr" {
  description = "VCN CIDR block."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public load balancer subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private app subnet."
  type        = string
  default     = "10.0.2.0/24"
}

variable "instance_shape" {
  description = "Compute shape. Defaults to the Phoenix Always Free E2 Micro shape."
  type        = string
  default     = "VM.Standard.E2.1.Micro"
}

variable "instance_ocpus" {
  description = "OCPUs for the compute instance."
  type        = number
  default     = 1
}

variable "instance_memory_gbs" {
  description = "Memory in GB for the compute instance."
  type        = number
  default     = 1
}

variable "boot_volume_size_gbs" {
  description = "Boot volume size in GB."
  type        = number
  default     = 50
}

variable "instance_image_ocid" {
  description = "OCID of the base image for the compute instance."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ocid1\\.image\\.", var.instance_image_ocid)) && !can(regex("example|replace", lower(var.instance_image_ocid)))
    error_message = "instance_image_ocid must be a real OCI image OCID starting with ocid1.image."
  }
}

variable "health_check_port" {
  description = "Backend health check port."
  type        = number
  default     = 80
}

variable "bastion_session_ttl_seconds" {
  description = "Maximum Bastion session TTL."
  type        = number
  default     = 10800
}
