# OCI State Bootstrap

This Terraform stack creates the OCI Object Storage bucket used for remote
Terraform state by the app stack.

It intentionally uses local state. Do not configure this stack to use the
bucket it creates as its own backend.

## What It Creates

- one OCI Object Storage bucket
- bucket public access forced to `NoPublicAccess`
- bucket versioning enabled for state recovery

## Usage

1. Copy `terraform.tfvars.example` to `.private/oci/bootstrap.tfvars`.
2. Fill in your OCI values and desired state bucket name.
   - `state_bucket_name` is the OCI bucket name, for example
     `music_tools_terraform_state`.
   - It is not the local bootstrap state path.
3. Run:

```bash
bash bin/oci_state_bootstrap_plan.sh
bash bin/oci_state_bootstrap_apply.sh
```

The plan command writes a saved plan to:

- `.private/terraform/oci-bootstrap.tfplan`

The apply command consumes that saved plan so the applied actions match the
reviewed plan.

The helper scripts store bootstrap local state at:

- `.private/terraform/oci-bootstrap.tfstate`

The state file, plan file, and `.private/oci/bootstrap.tfvars` are ignored by
Git.

## After Apply

Use the outputs from this stack to configure the main OCI infrastructure stack's
remote backend:

- `state_bucket_name`
- `object_storage_namespace`
- `region`

The main stack should use a unique state key such as:

- `music-tools/oci/terraform.tfstate`
