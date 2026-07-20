const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required and must point to a disposable migrated PostgreSQL database.",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
