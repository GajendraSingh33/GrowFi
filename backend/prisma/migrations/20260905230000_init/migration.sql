-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "IncomeFrequency" AS ENUM ('one-time', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "HabitLogStatus" AS ENUM ('completed', 'missed');

-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('savings', 'investment', 'property', 'other');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('open', 'in_progress', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "income_sources" (
    "income_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_name" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "IncomeFrequency" NOT NULL,
    "received_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_sources_pkey" PRIMARY KEY ("income_id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "category_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(50),
    "is_default" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(255),
    "expense_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "habits" (
    "habit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "frequency" "HabitFrequency" NOT NULL,
    "target_value" DECIMAL(12,2),
    "start_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("habit_id")
);

-- CreateTable
CREATE TABLE "habit_logs" (
    "log_id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "log_date" DATE NOT NULL,
    "status" "HabitLogStatus" NOT NULL,
    "streak_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "goal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_name" VARCHAR(120) NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_date" DATE,
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("goal_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "asset_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "asset_name" VARCHAR(120) NOT NULL,
    "current_value" DECIMAL(14,2) NOT NULL,
    "last_updated" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "snapshot_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_assets" DECIMAL(14,2) NOT NULL,
    "total_savings" DECIMAL(14,2) NOT NULL,
    "total_investments" DECIMAL(14,2) NOT NULL,
    "net_worth" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateTable
CREATE TABLE "admin_feedback" (
    "feedback_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "admin_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "expenses_user_id_expense_date_idx" ON "expenses"("user_id", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_logs_habit_id_log_date_key" ON "habit_logs"("habit_id", "log_date");

-- CreateIndex
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_user_id_snapshot_date_key" ON "net_worth_snapshots"("user_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_feedback" ADD CONSTRAINT "admin_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
