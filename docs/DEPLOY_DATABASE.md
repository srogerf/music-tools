# Deploy Database

This document defines the database deployment modes, safety rules, and
recommended operating procedures for `music-tools`.

## Safety Rule

Assume production by default.

Any command, script, or automation that is not explicitly told `test` should be
treated as targeting production behavior.

That means:

- destructive schema actions must require an explicit environment flag
- non-production runs must set an environment flag such as `--env test`
- if the environment flag is omitted, the operator should be warned and the
  action should not proceed with destructive behavior
- first-time production bootstrap should require an explicit
  `--override-production-failsafe` acknowledgement

The goal is to prevent accidental erasure of a production database.

## Environments

There are two deployment environments:

- `production`
- `test`

### Production

Production is the default assumed environment.

Production rules:

- do not drop and recreate managed tables as part of normal operations
- do not use reset-and-seed flows
- prefer forward-only schema changes
- prefer controlled, explicit data updates
- require extra confirmation before destructive operations

### Test

`test` is the explicit non-production environment.

Test rules:

- test runs must opt in with an explicit environment flag
- destructive rebuilds are allowed when needed
- clear-and-reseed flows are allowed
- temporary bootstrap and verification flows are expected

## Deploy Types

There are three database deployment types we care about:

1. Initial schema creation
2. Initial schema seeding
3. Schema change / upgrade

Each type should behave differently in `production` and `test`.

## 1. Initial Schema Creation

Initial schema creation means creating the managed database tables for the first
time for a given environment.

### Test Process

Use this when creating or recreating a test database from scratch.

Process:

1. Ensure the database instance exists and connection settings are correct.
2. Put connection settings in `.private/conf/postgres.env` or set
   `POSTGRES_CONFIG` to another private env file.
3. Pass an explicit test environment flag.
4. Run the schema rebuild flow.
5. Verify that `schema_metadata` exists and the schema version is stamped.
6. If data is needed, follow with the initial schema seeding flow.

Current repo mechanism:

- `bash db/postgres/rebuild_schema.sh --env test`

Expected outcome:

- all managed tables are recreated
- `schema_metadata.schema_version` matches `db/postgres/versions.json`
- `seed_data_format_version` is `NULL` until seeding runs

### Production Process

Use this only for a brand-new production database with no existing managed
tables.

Process:

1. Confirm this is truly a first-time production bootstrap.
2. Put production connection settings in a private env file, never in the repo.
3. Require explicit operator confirmation.
4. Apply the schema creation SQL only.
5. Verify the schema version stamp.
6. Follow with initial seeding only if the production rollout requires
   reference data at creation time.

Guidance:

- this should be a rare operation
- do not use a drop-and-recreate helper against an existing production database
- if a first-time production bootstrap is ever required, it should require
  `--override-production-failsafe`
- if the initial production bootstrap also needs seed data, that seed step
  should require `--override-production-failsafe` too

## 2. Initial Schema Seeding

Initial schema seeding means populating a schema that already exists with the
baseline reference data required by the app.

### Test Process

Process:

1. Ensure the target database already has the expected schema version.
2. Pass an explicit test environment flag.
3. Run the clear-and-seed flow.
4. Let the seed script verify schema compatibility before inserting data.
5. Verify that `seed_data_format_version` is recorded.

Current repo mechanism:

- `bash db/postgres/reset_and_seed.sh --env test`

Expected outcome:

- managed tables are cleared
- schema remains intact
- seed data is inserted
- `schema_metadata.seed_data_format_version` is updated

### Production Process

Process:

1. Confirm the production schema version is supported by the seed data format.
2. Prefer controlled reference-data insertion rather than clear-and-seed.
3. Apply only the intended reference data changes.
4. Verify application queries against the updated data.

Guidance:

- do not use the local reset-and-seed helper in production
- production seeding should not erase existing managed data
- production seed changes should be deliberate and reviewable
- the only allowed exception is first-time production bootstrap with an
  explicit `--override-production-failsafe`

## 3. Schema Change / Upgrade

Schema change / upgrade means moving an existing database from one schema
version to a newer schema version.

### Test Process

For test, we support two paths.

Path A: throwaway rebuild

Use when preserving test data is not important.

Process:

1. Pass an explicit test environment flag.
2. Run the destructive schema rebuild flow.
3. Run the clear-and-seed flow.
4. Run application and API verification.

Path B: migration rehearsal

Use when validating a future production-safe migration path.

Process:

1. Clone or snapshot representative test data.
2. Apply the upgrade steps without dropping the schema.
3. Verify that the database reaches the expected schema version.
4. Verify that existing data remains usable.
5. Run smoke checks.

### Production Process

Production schema changes must be upgrade-style, not rebuild-style.

Process:

1. Treat production as the default environment unless explicitly marked
   otherwise.
2. Never run destructive drop-and-recreate flows against an existing production
   database.
3. Apply a forward-only schema change.
4. Verify the schema version.
5. Apply any matching controlled data updates.
6. Run post-deploy smoke checks.

Guidance:

- schema upgrade should preserve existing production data
- destructive rebuild is not an acceptable production upgrade path
- each schema version change should have a documented upgrade procedure

## Version Contract

The repo now has a version handshake between schema and seed data.

Files:

- `db/sql/schema.sql`
- `db/sql/drop_schema.sql`
- `db/sql/clear_data.sql`
- `db/postgres/versions.json`
- `db/postgres/seed_data.py`

Rules:

- the schema stamps `schema_metadata.schema_version`
- the seed script declares which schema versions it supports
- the seed script fails if the live schema version is unsupported
- the seed script writes `seed_data_format_version` after a successful seed

This gives us a minimum contract between:

- table shape
- seed data shape
- operational scripts

## Production Schema Baselines

Any schema version that is deployed to production must be treated as a
production baseline.

That means:

- we must record that the schema version has been deployed to production
- future production schema changes must include an upgrade path from that
  production baseline
- once a version is live in production, we must not assume we can replace it
  with drop-and-recreate behavior

Why this matters:

- the next production schema change needs migration scripts based on the last
  production schema, not just the newest repo schema
- a schema version that only existed in test can still be replaced freely
- a schema version that reached production becomes part of the supported upgrade
  history

Recommended tracking rule:

- maintain a record of which schema versions have been deployed to production
- treat the most recent production schema version as the required migration
  source for the next production schema change
- do not merge a production schema change unless the upgrade path from the last
  production schema is defined

Current repo record:

- `db/sql/production_schema_versions.json`

This can be tracked in several ways:

- `db/sql/production_schema_versions.json`
- a dedicated migration directory whose filenames encode from/to versions
- a database-side migration history table

For now, this repo uses the JSON record above so the next schema change can
answer:

- what schema version is currently in production?
- what is the previous production version we must migrate from?
- what script or procedure upgrades between them?

## Production Role Isolation

Local dev/test databases may be permissive so the tools stay easy to use, but
production should use tighter database isolation.

Production guidance:

- use a dedicated production database role for the app
- grant only the privileges the app needs
- avoid broad grants across unrelated databases or schemas
- do not rely on table-name visibility as an access-control boundary
- keep migration/admin privileges separate from the runtime app role
- review default `public` schema privileges before production launch
- verify production role access with explicit privilege checks

Example checks:

```sql
SELECT current_database();
SELECT current_user;
SELECT has_table_privilege(current_user, 'scales', 'SELECT');
```

Why this matters:

- PostgreSQL users may see database/schema/table metadata even when they should
  not have data access
- dev/test convenience grants should not become the production security model
- production migrations need more privilege than normal app runtime queries

## Current Repo Commands

Current local/test-oriented commands:

- `bin/local_init_postgres.sh`
  - ensures the local Postgres role and database exist
  - requires `APP_DATABASE_OWNER_PASSWORD` so a weak password is not baked into
    the script
- `bin/seed_dev.sh`
  - rebuilds and seeds the dev database from `.private/env/dev/postgres.env`
- `bin/seed_test.sh`
  - rebuilds and seeds the test database from `.private/env/test/postgres.env`
- `bash db/postgres/rebuild_schema.sh --env test`
  - destructive schema rebuild
- `bash db/postgres/reset_and_seed.sh --env test`
  - data-only clear and reseed

Important note:

- the SQL files live under `db/sql/`
- the runnable Postgres helper scripts live under `db/postgres/`

## Recommended CLI Safety Shape

When we add explicit environment-aware wrappers, they should follow this model:

- default environment: `production`
- require `--env test` for non-production destructive operations
- require `--override-production-failsafe` for first-time production bootstrap
- reject destructive actions unless `--env test` is present
- print the target environment before executing

Conceptually:

```text
deploy-db --type rebuild-schema --env test
deploy-db --type seed --env test
deploy-db --type rebuild-schema --override-production-failsafe
deploy-db --type seed --override-production-failsafe
deploy-db --type upgrade --env production
```

And these should fail safely:

```text
deploy-db --type rebuild-schema
deploy-db --type seed
```

because they would otherwise be ambiguous and too dangerous.

## Review Summary

The intended operating model is:

- production is the default assumption
- test must be explicitly requested
- first-time production bootstrap must require an explicit override flag
- schema rebuild and schema seeding are separate operations
- rebuild is destructive, seed is not schema-destructive
- production upgrades should be forward-only
- schema version and seed format must stay compatible
