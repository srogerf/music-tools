# OCI App Stack

This Terraform stack creates the `music-tools` application infrastructure on
Oracle Cloud Infrastructure.

It creates and uses the nested OCI compartment path `apps/music-tools` under the
tenancy, so you do not need to supply a project compartment OCID.

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

1. Copy `terraform.tfvars.example` to `terraform.tfvars.local`.
2. Fill in your OCI tenancy values and image OCID.
3. Run:

```bash
bash bin/oci_terraform_plan.sh
bash bin/oci_terraform_apply.sh
```

## Bastion Access

Do not open port `22` to the internet.

Recommended SSH access flow:

1. Apply the Terraform configuration.
2. Create an OCI Bastion session against the private instance.
3. Use managed SSH or SSH port forwarding through Bastion.

Keep the instance in the private subnet with no public IP. Bastion is the
intended admin path.

## Important Caveat

This stack does not create a NAT gateway.

That means the private instance will not have general outbound internet access.
This keeps the baseline closer to strict Always Free assumptions and avoids
depending on a service that is not clearly listed in Oracle's Always Free
resource docs.

If you later need package installs, image updates, or other outbound internet
traffic from the private subnet, add an optional NAT path deliberately.
