# Private Data

Use the repo-root `.private/` directory for local secrets and machine-specific
configuration. The entire directory is ignored by Git.

## Recommended Layout

- `.private/oci/bootstrap.tfvars`
  - contains OCI input values such as `state_bucket_name`
  - `state_bucket_name` is an OCI bucket name, not a local state-file path
- `.private/oci/app.tfvars`
- `.private/terraform/oci-bootstrap.tfstate`
  - local Terraform state file for the bootstrap stack
- `.private/terraform/oci-bootstrap.tfplan`
- `.private/terraform/oci-app.tfplan`
- `.private/bastion/music-tools.env`
- `.private/conf/postgres.env`
- `.private/container/compose.env`
- `.private/keys/`

Committed example files should stay near the code they document. Real values
should live under `.private/`.

## Rules

- Do not commit real OCIDs, API key fingerprints, private key paths, SSH public
  keys, database passwords, Terraform state, or provider-specific local config.
- Prefer copying committed examples into `.private/` before filling them in.
- Keep `.private/` outside Docker build contexts and deployment artifacts.
- If a private value is accidentally committed, rotate the credential before
  relying on history cleanup.

## OCI Files

Use these copy targets:

```bash
mkdir -p .private/oci .private/bastion
cp deploy/infrastructure/oci/bootstrap/terraform.tfvars.example .private/oci/bootstrap.tfvars
cp deploy/infrastructure/oci/app/terraform.tfvars.example .private/oci/app.tfvars
cp deploy/infrastructure/oci/app/bastion.env.example .private/bastion/music-tools.env
```

The OCI helper scripts use those files by default.
