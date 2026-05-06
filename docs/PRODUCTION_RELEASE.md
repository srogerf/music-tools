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

Run any required forward-only production schema migration for this release:

```bash
bash bin/production_db_upgrade_scale_layout_positions.sh
```

Update production reference data:

```bash
bash bin/production_db_seed.sh
```

Verify production schema and seed-data versions match the repo:

```bash
bash bin/production_db_assert_current.sh
```

`production_deploy.sh` runs the same assertion before changing containers, but
running it here keeps failures earlier in the release.

## 4. Build And Push Image

Choose the image tag for the release:

```bash
export RELEASE_TAG="sha-$(git rev-parse --short=12 HEAD)"
```

Build the production image from the already verified artifacts:

```bash
bash bin/production_image_build.sh --tag "$RELEASE_TAG"
```

If you intentionally want a fresh artifact rebuild as part of image build:

```bash
bash bin/production_image_build.sh --tag "$RELEASE_TAG" --build-artifacts
```

The image tag defaults to the artifact manifest's `artifact_id`, so the
manifest created during `bin/build_artifacts.sh` is the release identity.

Push the image to GHCR:

```bash
bash bin/production_image_push.sh --tag "$RELEASE_TAG"
```

## 5. Deploy

Deploy the pushed image:

```bash
bash bin/production_deploy.sh --tag "$RELEASE_TAG"
```

After deploy, inspect container status or run any smoke checks needed for the
release.
