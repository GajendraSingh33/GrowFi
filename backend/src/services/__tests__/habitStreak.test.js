const { calculateCurrentStreak } = require("../habitStreak");

function log(logDate, status = "completed") {
  return { logDate, status };
}

describe("calculateCurrentStreak", () => {
  test("counts consecutive daily completions regardless of insertion order", () => {
    expect(calculateCurrentStreak([
      log("2026-09-06"),
      log("2026-09-04"),
      log("2026-09-05"),
    ], "daily")).toBe(3);
  });

  test("breaks a daily streak on a missed day", () => {
    expect(calculateCurrentStreak([
      log("2026-09-06"),
      log("2026-09-05", "missed"),
      log("2026-09-04"),
    ], "daily")).toBe(1);
  });

  test("counts consecutive ISO weeks with at least one completion", () => {
    expect(calculateCurrentStreak([
      log("2026-09-14"),
      log("2026-09-07"),
      log("2026-08-31"),
    ], "weekly")).toBe(3);
  });

  test("keeps a weekly period completed when a newer log in that week is missed", () => {
    expect(calculateCurrentStreak([
      log("2026-09-10", "missed"),
      log("2026-09-08", "completed"),
      log("2026-09-01", "completed"),
    ], "weekly")).toBe(2);
  });

  test("counts consecutive calendar months", () => {
    expect(calculateCurrentStreak([
      log("2026-09-02"),
      log("2026-08-25"),
      log("2026-07-10"),
    ], "monthly")).toBe(3);
  });

  test("returns zero when the most recent log is missed", () => {
    expect(calculateCurrentStreak([
      log("2026-09-06", "missed"),
      log("2026-09-05"),
    ], "daily")).toBe(0);
  });
});
