# Local Environments

This directory defines committed examples for local runtime environments.

Real environment files should live under `.private/env/`.

Create missing private env files with:

```bash
bash bin/init_local_envs.sh
```

`start_dev.sh` and `start_test.sh` also run this initializer automatically when
their expected private env files are missing.

## Dev

`dev` is for fast iteration against source assets.

- default port: `8080`
- frontend assets: `frontend/app`
- fretboard assets: `frontend/fretboard`
- database name: `music_tools_dev`
- private config root: `.private/env/dev/`

Run with:

```bash
bash bin/seed_dev.sh
bash bin/start_dev.sh
```

## Test

`test` is for pre-container artifact checks.

- default port: `8081`
- frontend assets: `build/test/frontend/app`
- server binary: `build/test/server/rifferone`
- database name: `music_tools_test`
- private config root: `.private/env/test/`

Install frontend build dependencies once:

```bash
npm install
```

Run with:

```bash
bash bin/build_artifacts.sh
bash bin/seed_test.sh
bash bin/start_test.sh
```

Then smoke-check with:

```bash
bash bin/smoke_test_artifacts.sh
```

The frontend artifact build uses Vite and outputs a production-style bundle
under `build/test/frontend/app/`, including hashed JS/CSS assets.
