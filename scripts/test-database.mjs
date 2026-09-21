export function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error(
      "TEST_DATABASE_URL is required; production DATABASE_URL is never used for tests.",
    );
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/cookly_test" ||
    !["postgres:", "postgresql:"].includes(url.protocol)
  ) {
    throw new Error(
      "Tests require a loopback PostgreSQL database named cookly_test.",
    );
  }
  return value;
}
