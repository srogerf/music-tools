# OCI Infrastructure

This directory contains the OCI Terraform stacks for `music-tools`.

## Stacks

- `bootstrap/`
  - Creates the OCI Object Storage bucket used for Terraform remote state.
  - Uses local Terraform state intentionally.
  - Run this before configuring remote state for the app stack.
- `app/`
  - Creates the application infrastructure in OCI.
  - Creates and uses the nested compartment path `apps/music-tools`.
  - Provisions the VCN, public NLB, private compute instance, and Bastion.

## Recommended Order

1. Configure OCI API access.
2. Copy `bootstrap/terraform.tfvars.example` to
   `.private/oci/bootstrap.tfvars`.
3. Fill in the bootstrap values, including `state_bucket_name`.
4. Run:

```bash
bash bin/oci_state_bootstrap_plan.sh
bash bin/oci_state_bootstrap_apply.sh
```

5. Use the bootstrap outputs to configure remote state for the app stack.
6. Copy `app/terraform.tfvars.example` to `.private/oci/app.tfvars`.
7. Fill in the app stack values.
8. Run:

```bash
bash bin/oci_terraform_plan.sh
bash bin/oci_terraform_apply.sh
```

Private tfvars and state files are ignored by Git. See
`docs/PRIVATE_DATA.md` for the repo-wide private-data convention.

## OCI Access Setup

Terraform in both stacks authenticates directly to OCI using API key auth.

You need:

- `tenancy_ocid`
- `user_ocid`
- `fingerprint`
- `private_key_path`
- `region`

The app stack also needs:

- `ssh_public_key`
- `instance_image_ocid`
- `client_cidr_allowlist`

Recommended setup process:

1. In the OCI Console, create or choose a user for Terraform.
2. Generate an API signing key pair locally.
3. Upload the public key to that OCI user.
4. Copy the key fingerprint shown by OCI.
5. Put the private key somewhere readable only by you, for example:
   `~/.oci/oci_api_key.pem`.
6. Fill those values into each stack's `.private/oci/*.tfvars` file.

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

## Free Tier Notes

The app stack is aimed at OCI Always Free where possible:

- compute defaults to `VM.Standard.E2.1.Micro`
- the instance defaults to `1` OCPU and `1` GB RAM
- the public entry point uses the OCI Network Load Balancer because Oracle's
  Always Free docs explicitly list an Always Free network load balancer
- the remote state bucket should stay well within the Always Free Object
  Storage limits for normal Terraform state usage

`VM.Standard.A1.Flex` remains a possible future upgrade path, but Phoenix A1
capacity can be unavailable. If you switch shapes, also update the image OCID to
match the CPU architecture.

This setup does not create a NAT gateway, because NAT Gateway is not clearly
listed as Always Free.

## Sources

- Oracle Free Tier overview: https://www.oracle.com/cloud/free
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- OCI Object Storage Terraform state: https://docs.oracle.com/en-us/iaas/Content/dev/terraform/object-storage-state.htm
- Terraform OCI backend: https://developer.hashicorp.com/terraform/language/backend/oci
