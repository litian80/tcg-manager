---
name: Database Schema Verification
description: Instructions on how to fetch and validate the production database schema directly from Supabase, ensuring codebase changes align with the actual live environment.
---

# Database Schema Verification

When assessing whether the database schema contains a specific column, constraint, or table, **DO NOT rely solely on local project files** (such as `.sql` migrations or `database.types.ts`). Local files may be outdated or out of sync with what is currently deployed in production. 

You must validate schema information directly against the current database.

## Tools Provided
This skill provides two scripts to fetch and read the live schema from the Supabase OpenAPI endpoint using the environment variables configured in `.env.local`.

Location of scripts: `.agent/skills/database-verification/scripts/`
- `fetch_schema.cjs`: Connects to Supabase, authenticates using `SUPABASE_SERVICE_ROLE_KEY`, and downloads the live OpenAPI schema as `schema.json`.
- `extract_schema.cjs`: Parses the verbose `schema.json` and creates a human-readable `prod_simplified_schema.txt` file listing all tables, columns, data types, and foreign keys.

## Execution Steps

Whenever you need to verify the database schema, perform the following steps:

1. **Run the Fetch Script**
   Execute the fetch script from the project root. This ensures it successfully finds `.env.local`:
   ```bash
   node .agent/skills/database-verification/scripts/fetch_schema.cjs
   ```
   This will generate/overwrite `schema.json` in the root directory.

2. **Run the Extract Script**
   Execute the extract script from the project root to parse the JSON:
   ```bash
   node .agent/skills/database-verification/scripts/extract_schema.cjs
   ```
   This will generate/overwrite `prod_simplified_schema.txt` in the root directory.

3. **Read the Output**
   Use your file reading tools to view `prod_simplified_schema.txt` to answer questions about the current database structure, such as whether a specific column exists or if foreign key mappings are correct.

## Important Note
The `fetch_schema.cjs` script relies on `SUPABASE_SERVICE_ROLE_KEY` being present in your `.env.local` to authenticate with the Supabase Management / PostgREST endpoints. Do NOT share this key with the user or output it in any logs.
