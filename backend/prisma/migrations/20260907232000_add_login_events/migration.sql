CREATE TABLE "login_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "logged_in_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_events_user_id_logged_in_at_idx" ON "login_events"("user_id", "logged_in_at");

ALTER TABLE "login_events"
ADD CONSTRAINT "login_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
