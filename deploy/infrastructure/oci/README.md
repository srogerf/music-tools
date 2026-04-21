# OCI Infrastructure

This directory contains a Terraform starter for running `music-tools` on Oracle
Cloud Infrastructure using an Always Free-friendly shape and a private compute
instance behind a public load balancer.

Terraform creates and uses the nested OCI compartment path `apps/music-tools`
under the tenancy, so you do not need to supply a project compartment OCID.

## Architecture

The current layout creates:

- one VCN
- one public subnet for the load balancer
- one private subnet for the app instance
- one internet gateway
- one route table for the public subnet
- NSGs for the load balancer and app instance
- one public network load balancer with only ports `80` and `443`
- one private compute instance with no public IP
- one OCI Bastion targeting the private subnet for admin access

The app subnet only allows:

- app traffic from the load balancer NSG on `80` and `443`
- SSH on `22` from within the VCN path used for Bastion access

## Free Tier Notes

This starter is aimed at OCI Always Free where possible:

- compute defaults to `VM.Standard.A1.Flex`
- the instance defaults to `1` OCPU and `6` GB RAM
- the public entry point uses the OCI Network Load Balancer because Oracle's
  Always Free docs explicitly list an Always Free network load balancer

If you want TLS termination at the load balancer later, we can add an OCI Load
Balancer variant, but this starter keeps the free-tier-friendly baseline simple.

## SSH Recommendation

Do not open port `22` to the internet.

Recommended admin path:

- use OCI Bastion
- create a managed SSH session or SSH port-forwarding session to the private
  instance
- keep the instance in the private subnet with no public IP

This is safer than exposing SSH publicly and matches OCI's recommended Bastion
workflow for private resources.

## Important Caveat

This starter does **not** create a NAT gateway.

That means the private instance will not have general outbound internet access.
This keeps the baseline closer to strict Always Free assumptions and avoids
depending on a service that is not clearly listed in Oracle's Always Free
resource docs.

If you later need package installs, image updates, or other outbound internet
traffic from the private subnet, we can add an optional NAT path deliberately.

## Files

- `versions.tf`
- `variables.tf`
- `main.tf`
- `networking.tf`
- `compute.tf`
- `load_balancer.tf`
- `access.tf`
- `outputs.tf`
- `terraform.tfvars.example`

The split is intentional:

- `main.tf` creates the shared compartment path and deployment locals
- `networking.tf` holds the more fixed VCN, subnet, route, and NSG baseline
- `compute.tf` holds the app instance shape/image/boot settings
- `load_balancer.tf` holds the public listener and backend-set wiring
- `access.tf` holds Bastion access configuration

## Usage

1. Configure OCI API access for Terraform.
2. Copy `terraform.tfvars.example` to your own local tfvars file, for example
   `terraform.tfvars.local`.
3. Fill in your OCI tenancy values and image OCID.
4. Run `terraform init`.
5. Run `terraform plan -var-file=terraform.tfvars.local`.
6. Run `terraform apply -var-file=terraform.tfvars.local`.

Local tfvars files under this directory are gitignored. Keep real credentials
and OCIDs there, not in `variables.tf`.

Repo wrappers are also available:

- `bash bin/oci_terraform_plan.sh`
- `bash bin/oci_terraform_apply.sh`

## OCI Access Setup

Terraform in this directory authenticates directly to OCI using API key auth
through the provider block in `versions.tf`.

You need:

- `tenancy_ocid`
- `user_ocid`
- `fingerprint`
- `private_key_path`
- `region`
- `availability_domain`
- optional compartment names if you want something other than `apps/music-tools`

Recommended setup process:

1. In the OCI Console, create or choose a user for Terraform.
2. Generate an API signing key pair locally.
3. Upload the public key to that OCI user.
4. Copy the key fingerprint shown by OCI.
5. Put the private key somewhere readable only by you, for example:
   `~/.oci/oci_api_key.pem`
6. Fill those values into your tfvars file.

Example local key generation:

```bash
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
chmod 600 ~/.oci/oci_api_key.pem
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
```

Then:

- upload `~/.oci/oci_api_key_public.pem` in the OCI Console under your user
- copy the fingerprint from OCI
- set `private_key_path = "~/.oci/oci_api_key.pem"`

How to find the OCIDs and AD name:

- tenancy OCID: Tenancy details page
- user OCID: User details page
- region: your chosen OCI region, for example `us-phoenix-1`
- availability domain: the AD name in your region, for example
  `Uocm:PHX-AD-1`

By default Terraform will create:

- `apps`
- `apps/music-tools`

If you want different compartment names, set:

- `apps_compartment_name`
- `project_compartment_name`

Important note:

- the Terraform user must have permission to create compartments under the
  tenancy, not just create resources inside an existing compartment

## Bastion Access

Recommended SSH access flow:

1. Apply the Terraform configuration.
2. Create an OCI Bastion session against the private instance.
3. Use managed SSH or SSH port forwarding through Bastion.

Keep port `22` closed to the internet. Bastion is the intended admin path.

## Sources

- Oracle Free Tier overview: https://www.oracle.com/cloud/free
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- OCI Bastion Terraform resource: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/bastion_bastion.html
- OCI Network Load Balancer Terraform resource: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/network_load_balancer_network_load_balancer.html
