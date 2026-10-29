
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const testUrl = process.env.WHEEL_TEST_URL;
const testKey = process.env.WHEEL_TEST_SECRET_KEY;

if (!testUrl || !testKey) {
  throw new Error(
    "WHEEL_TEST_URL and WHEEL_TEST_SECRET_KEY are required."
  );
}

// Refuse to test against the project's main Supabase URL.
let productionUrl = "";

try {
  const envText = readFileSync(".env.local", "utf8");

  const match = envText.match(
    /^\s*SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m
  );

  productionUrl = match?.[1]?.trim() ?? "";
} catch {
  throw new Error(
    "Cannot read .env.local to verify the main project URL."
  );
}

if (!productionUrl) {
  throw new Error(
    "Main SUPABASE_URL not found. Test stopped."
  );
}

if (
  testUrl.replace(/\/+$/, "") ===
  productionUrl.replace(/\/+$/, "")
) {
  throw new Error(
    "SAFETY STOP: test database matches the main project."
  );
}

const client = createClient(testUrl, testKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const testUser = `wheel-concurrency-${randomUUID()}`;

async function main() {
  console.log("Testing two simultaneous spins...");
  console.log("Test user:", testUser);

  const { data: settings, error: settingsError } =
    await client
      .from("wheel_settings")
      .select("is_active,daily_limit")
      .eq("id", "main")
      .single();

  if (settingsError) throw settingsError;

  if (
    settings.is_active !== true ||
    settings.daily_limit !== 1
  ) {
    throw new Error(
      "Test database must have an active wheel and daily_limit=1."
    );
  }

  const { count: prizesCount, error: prizeError } =
    await client
      .from("wheel_prizes")
      .select("id", { head: true, count: "exact" })
      .eq("is_active", true)
      .gt("weight", 0);

  if (prizeError) throw prizeError;

  if (!prizesCount) {
    throw new Error(
      "At least one active positive-weight prize is required."
    );
  }

  try {
    // Two separate HTTP requests start concurrently.
    const results = await Promise.all([
      client.rpc("spin_wheel_for_user", {
        p_user_id: testUser,
      }),
      client.rpc("spin_wheel_for_user", {
        p_user_id: testUser,
      }),
    ]);

    for (const [index, result] of results.entries()) {
      console.log(
        `Request ${index + 1}:`,
        result.error?.message ??
          `SUCCESS: ${result.data?.spin_id ?? "no spin id"}`
      );
    }

    const successCount = results.filter(
      (result) => !result.error && result.data?.spin_id
    ).length;

    const limitedCount = results.filter(
      (result) =>
        result.error?.message?.includes(
          "DAILY_LIMIT_REACHED"
        )
    ).length;

    const { count, error: countError } =
      await client
        .from("wheel_spins")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", testUser);

    if (countError) throw countError;

    console.log("Successful requests:", successCount);
    console.log("Daily-limit errors:", limitedCount);
    console.log("Saved spins:", count);

    if (
      successCount === 1 &&
      limitedCount === 1 &&
      count === 1
    ) {
      console.log("TEST PASSED");
    } else {
      throw new Error(
        "TEST FAILED: concurrency behavior is incorrect."
      );
    }
  } finally {
    // Remove only the records for this unique test user.
    const { error: cleanupError } = await client
      .from("wheel_spins")
      .delete()
      .eq("user_id", testUser);

    if (cleanupError) {
      console.error(
        "CLEANUP FAILED:",
        cleanupError.message
      );
      console.error(
        "Remove test rows manually for user:",
        testUser
      );
      process.exitCode = 1;
    } else {
      console.log("Test records cleaned up.");
    }
  }
}

main().catch((error) => {
  console.error("TEST ERROR:", error.message);
  process.exitCode = 1;
});
