ALTER TABLE "expense_categories"
ADD COLUMN "user_id" UUID;

CREATE INDEX "expense_categories_user_id_idx"
ON "expense_categories"("user_id");

ALTER TABLE "expense_categories"
ADD CONSTRAINT "expense_categories_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;
