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

Both subnets are regional subnets. Compute placement can move between
availability domains without forcing subnet or Bastion replacement.

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

1. Copy `terraform.tfvars.example` to `.private/oci/app.tfvars`.
2. Copy `backend.hcl.example` to `.private/oci/app.backend.hcl`.
3. Fill in your OCI tenancy values, SSH key, image OCID, and Bastion client
   allowlist.
   - `availability_domain` is optional. Leave it unset unless you need a
     specific AD; Terraform will select by `availability_domain_index`.
   - The working Phoenix Always Free default is `VM.Standard.E2.1.Micro` with
     `availability_domain_index = 2`, which maps to PHX-AD-3 in the current
     tenancy.
   - `ssh_public_key` must be the full content of a real public key, such as
     the contents of `~/.ssh/id_ed25519.pub`.
   - `instance_image_ocid` must be a real image OCID for your region and CPU
     architecture. For `VM.Standard.E2.1.Micro`, use an x86_64 image.
   - `client_cidr_allowlist` is required and should be your current public IP
     with `/32`. Terraform rejects `0.0.0.0/0` and `::/0`.
   - If you later switch to `VM.Standard.A1.Flex`, use an Arm-compatible image
     and adjust the AD index only if OCI reports capacity issues.
4. Fill in the backend config from the bootstrap stack outputs:
   - `bucket` from `state_bucket_name`
   - `namespace` from `object_storage_namespace`
   - `region`
   - `key`, usually `music-tools/oci/terraform.tfstate`
5. Run:

```bash
bash bin/oci_terraform_plan.sh
bash bin/oci_terraform_apply.sh
```

The plan command writes a saved plan to:

- `.private/terraform/oci-app.tfplan`

The apply command consumes that saved plan so the applied actions match the
reviewed plan.

Terraform state for this stack is stored in the OCI Object Storage backend. If
Terraform asks to migrate existing local app state during `init`, review the
prompt carefully before accepting.

## Bastion Access

Do not open port `22` to the internet.

Recommended SSH access flow:

1. Apply the Terraform configuration.
2. Create `.private/bastion/music-tools.env` from the Terraform outputs.
3. Run `bash bin/oci_bastion_ssh.sh --new-session`.

Keep the instance in the private subnet with no public IP. Bastion is the
intended admin path.

## Public Ports

The public load balancer intentionally listens on `80` and `443`.

Port `80` should remain open only as the HTTP entry point needed to redirect
to HTTPS once TLS termination or an app-level redirect is in place. Do not add
other public ports without documenting the reason.

## Important Caveat

This stack does not create a NAT gateway.

That means the private instance will not have general outbound internet access.
This keeps the baseline closer to strict Always Free assumptions and avoids
depending on a service that is not clearly listed in Oracle's Always Free
resource docs.

If you later need package installs, image updates, or other outbound internet
traffic from the private subnet, add an optional NAT path deliberately.
