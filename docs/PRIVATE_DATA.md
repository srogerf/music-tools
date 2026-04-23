# Private Data

Use the repo-root `.private/` directory for local secrets and machine-specific
configuration. The entire directory is ignored by Git.

## Recommended Layout

- `.private/oci/bootstrap.tfvars`
  - contains OCI input values such as `state_bucket_name`
  - `state_bucket_name` is an OCI bucket name, not a local state-file path
- `.private/oci/bootstrap-nat.tfvars`
  - optional legacy/exception file for the temporary NAT stack
  - not needed for the current Bastion-proxy production path
- `.private/oci/app.tfvars`
- `.private/oci/app.backend.hcl`
  - contains the OCI backend bucket, namespace, region, and state key for the
    app stack
- `.private/terraform/oci-bootstrap.tfstate`
  - local Terraform state file for the bootstrap stack
- `.private/terraform/oci-bootstrap.tfplan`
- `.private/terraform/oci-bootstrap-nat.tfstate`
- `.private/terraform/oci-bootstrap-nat.tfplan`
- `.private/terraform/oci-bootstrap-nat-destroy.tfplan`
- `.private/terraform/oci-app.tfplan`
- `.private/bastion/music-tools.env`
- `.private/conf/postgres.env`
- `.private/env/dev/postgres.env`
- `.private/env/dev/runtime.env`
- `.private/env/test/postgres.env`
- `.private/env/test/runtime.env`
- `.private/container/compose.env`
- `.private/container/local-integration/postgres-data/`
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
cp deploy/infrastructure/oci/app/backend.hcl.example .private/oci/app.backend.hcl
cp conf/bastion.env.example .private/bastion/music-tools.env
mkdir -p .private/env/dev .private/env/test
cp env/dev/postgres.env.example .private/env/dev/postgres.env
cp env/dev/runtime.env.example .private/env/dev/runtime.env
cp env/test/postgres.env.example .private/env/test/postgres.env
cp env/test/runtime.env.example .private/env/test/runtime.env
```

The OCI helper scripts use those files by default.

Only create `.private/oci/bootstrap-nat.tfvars` if you intentionally choose the
optional NAT fallback path.

You can also create the local dev/test env files with:

```bash
bash bin/localhost_init_envs.sh
```
