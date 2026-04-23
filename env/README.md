# Local Environments

This directory defines committed examples for local runtime environments.

Real environment files should live under `.private/env/`.

Create missing private env files with:

```bash
bash bin/localhost_init_envs.sh
```

`dev_start.sh` and `test_start.sh` also run this initializer automatically when
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
bash bin/dev_seed.sh
bash bin/dev_start.sh
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

Frontend build modes:

```bash
bash bin/build_frontend.sh
bash bin/build_frontend.sh --debug
```

The default build is compressed for the normal test artifact at
`build/test/frontend/app/`. The debug build keeps whitespace, readable names,
and sourcemaps under `build/test/frontend-debug/app/`.

Run with:

```bash
bash bin/build_artifacts.sh
bash bin/test_seed.sh
bash bin/test_start.sh
```

Then smoke-check with:

```bash
bash bin/test_smoke.sh
```

The frontend artifact build uses Vite and outputs a production-style bundle
under `build/test/frontend/app/`, including hashed JS/CSS assets.
