[![CI](https://github.com/srogerf/music-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/srogerf/music-tools/actions/workflows/ci.yml)
[![Terraform](https://github.com/srogerf/music-tools/actions/workflows/terraform.yml/badge.svg)](https://github.com/srogerf/music-tools/actions/workflows/terraform.yml)

# music-tools

`music-tools` is a collection of music theory and fretboard tools with a Go backend and a browser-based frontend.

## What Is Here

- Go packages for scales, chords, tuning, and related music logic
- A frontend for interactive fretboard-based exploration
- Static data and layout definitions used by the app
- Project documentation and planning notes under `docs/`
- Deployment assets and infrastructure notes under `deploy/`

## Development

Bootstrap an Ubuntu/Debian local development host with:

```bash
bash bin/bootstrap_local_dev_host.sh
npm install
```

Run the test suite locally with:

```bash
go test ./...
```

Run the source-asset development server with:

```bash
bash bin/seed_dev.sh
bash bin/start_dev.sh
```

Build and run the pre-container test artifacts with:

```bash
bash bin/build_artifacts.sh
bash bin/seed_test.sh
bash bin/start_test.sh
```

Prepare local deployment tooling and the OCI host bootstrap path with:

```bash
bash bin/bootstrap_local_dev_host.sh
bash bin/oci_prepare_host_repos.sh
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deploy Database](docs/DEPLOY_DATABASE.md)
- [Scale Layouts](docs/SCALE_LAYOUTS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Private Data](docs/PRIVATE_DATA.md)
- [Local Environments](env/README.md)
- [Container Deployment](deploy/CONTAINER_DEPLOYMENT.md)
- [Ansible Host Bootstrap](deploy/cicd/ansible/README.md)
- [Deploy Directory](deploy/README.md)
- [Constraints](docs/CONSTRAINTS.md)
