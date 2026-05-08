# Production Release

This runbook is the canonical local-operator production release flow.

Production is private-subnet based, so deploy operations expect both Bastion
tunnels to be running before database or container steps.

## 1. Verify Local Artifacts

Build the server and frontend artifacts that will be packaged into the
production image:

```bash
bash bin/build_artifacts.sh
```

Optional local artifact check:

```bash
bash bin/test_seed.sh
bash bin/test_start.sh
bash bin/test_smoke.sh
```

Required release discipline for DB-affecting changes:

- if the release changes schema versions, seed-data versions, production DB
  upgrade wrappers, or DB-backed catalog/reference data shape, rehearse that
  path in local integration before touching production
- do not use production as the place to discover version-chain gaps or upgrade
  ordering problems

## 2. Start Bastion Tunnels

Start the SSH tunnel:

```bash
bash bin/oci_bastion_ssh.sh --new-session --no-ssh
```

Start the reverse proxy tunnel in another terminal:

```bash
bash bin/oci_bastion_proxy_tunnel.sh
```

If Bastion authentication fails or sessions get stale, use
[Bastion Troubleshooting](BASTION_TROUBLESHOOTING.md).

## 3. Upgrade Production Database

Run any required forward-only production schema migrations for this release:

```bash
bash bin/production_db_upgrade_scale_layout_positions.sh
bash bin/production_db_upgrade_scale_intervals.sh
bash bin/production_db_upgrade_scale_descriptions.sh
bash bin/production_db_upgrade_scale_catalog.sh
```

Seed the production reference data if the managed tables are empty:

```bash
bash bin/production_db_seed.sh
```

Verify production schema and seed-data versions match the repo:

```bash
bash bin/production_db_assert_current.sh
```

`production_deploy.sh` runs the same assertion before changing containers, but
running it here keeps failures earlier in the release.

If production reference data needs a controlled update, apply the dedicated
forward migration first and then rerun the check.

## 4. Build And Push Image

Build the production image from the already verified artifacts:

```bash
bash bin/production_image_build.sh
```

If you intentionally want a fresh artifact rebuild as part of image build:

```bash
bash bin/production_image_build.sh --build-artifacts
```

The image tag defaults to the artifact manifest's `artifact_id`, so the
manifest created during `bin/build_artifacts.sh` is the release identity.

Push the image to GHCR:

```bash
bash bin/production_image_push.sh
```

## 5. Deploy

Deploy the pushed image:

```bash
bash bin/production_deploy.sh
```

After deploy, inspect container status or run any smoke checks needed for the
release.
