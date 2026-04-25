# Goldsky Mirror Setup

This project can read live article unlocks from Goldsky Mirror instead of polling Arc RPC directly.

The app is already wired for two feed modes:

- `LIVE_FEED_SOURCE=goldsky` reads mirrored events from PostgreSQL
- `LIVE_FEED_SOURCE=rpc` reads directly from Arc logs
- `LIVE_FEED_SOURCE=auto` tries Goldsky first, then falls back to RPC

## 1. Add the mirrored events table

The Prisma schema now includes `ArticleReadEvent` mapped to `public.article_read_events`.

Apply it to your local database:

```bash
npx prisma db push
```

If you want to regenerate the client too:

```bash
npx prisma generate
```

## 2. Create a Goldsky Postgres secret

Goldsky Mirror needs write access to the same Postgres database your app uses.

Goldsky’s Postgres sink docs:
- https://docs.goldsky.com/mirror/sinks/postgres

Example secret command:

```bash
goldsky secret create --name HUMBLEHUMANSHUB_POSTGRES --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "YOUR_DB_HOST",
  "port": 5432,
  "databaseName": "YOUR_DB_NAME",
  "user": "YOUR_DB_USER",
  "password": "YOUR_DB_PASSWORD"
}'
```

## 3. Update the pipeline file

Open:

- [frontend/goldsky/article-read-events.pipeline.yaml](/Users/lynn/Desktop/humblehumanshub/frontend/goldsky/article-read-events.pipeline.yaml)

The pipeline should filter the deployed ReaderVault address:

- `0xd14c4fA78146cF86147c51d2be7006cF73A83CE4`

Current deployed contracts:

- ReaderVault: `0xd14c4fA78146cF86147c51d2be7006cF73A83CE4`
- WriterVault: `0x1F65b6d82a18227e1d830a6FA83e8AD29cc679F4`
- MockTeller: `0x059526f4f79C9C37D98588ebC33acFb176fbBF5c`

Before applying the pipeline, it is worth confirming the Arc raw logs dataset name/version in your Goldsky account:

```bash
goldsky dataset list | rg '^arc\\.(raw_logs|logs)'
```

If Goldsky exposes a different Arc logs dataset version in your project, update:

- `dataset_name`
- `version`

The current template assumes:

- `dataset_name: arc.raw_logs`
- `version: 1.0.0`

That follows Goldsky’s EVM raw logs convention, but you should confirm it in your account before deploying.

## 4. Apply the pipeline

Goldsky Mirror docs:
- https://docs.goldsky.com/mirror/about-pipeline
- https://docs.goldsky.com/mirror/guides/decoding-contract-events

Deploy:

```bash
goldsky pipeline apply frontend/goldsky/article-read-events.pipeline.yaml --status ACTIVE
```

Monitor:

```bash
goldsky pipeline monitor humblehumanshub-article-read-events
```

## 5. Switch the app to Goldsky mode

After the pipeline is writing rows into `article_read_events`, set:

```bash
LIVE_FEED_SOURCE=goldsky
```

Then restart the Next.js app.

Until then, leaving:

```bash
LIVE_FEED_SOURCE=auto
```

lets the app fall back to direct Arc RPC polling.

## Notes

- The live feed only shows `ArticleRead` events, not deposits.
- The app enriches mirrored events with article titles from your local `articles` table.
- If the feed still looks empty after Goldsky is live, confirm your `.env.local` ReaderVault address matches the deployed contract that is actually emitting `ArticleRead`.

## Reference links

- Arc data indexers: https://docs.arc.network/arc/tools/data-indexers
- Goldsky Mirror intro: https://docs.goldsky.com/mirror/introduction
- Goldsky pipeline config: https://docs.goldsky.com/mirror/reference/config-file/pipeline
- Goldsky event decoding: https://docs.goldsky.com/mirror/guides/decoding-contract-events
- Goldsky Postgres sink: https://docs.goldsky.com/mirror/sinks/postgres
