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

variable "availability_domain" {
  description = "Availability domain name for the compute instance."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key content for the compute instance."
  type        = string
  sensitive   = true
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
  description = "Compute shape. Defaults to an Always Free-friendly Arm shape."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "OCPUs for the compute instance."
  type        = number
  default     = 1
}

variable "instance_memory_gbs" {
  description = "Memory in GB for the compute instance."
  type        = number
  default     = 6
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
