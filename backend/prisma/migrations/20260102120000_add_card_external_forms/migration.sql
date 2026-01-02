-- CreateTable
CREATE TABLE IF NOT EXISTS "card_external_forms" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "external_form_id" VARCHAR(255) NOT NULL,
    "external_row_id" VARCHAR(255),
    "stage_id" UUID NOT NULL,
    "status" "CardFormStatus" NOT NULL DEFAULT 'TO_FILL',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "card_external_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_card_external_form" ON "card_external_forms"("card_id", "external_form_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "card_external_forms_card_id_idx" ON "card_external_forms"("card_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "card_external_forms_external_form_id_idx" ON "card_external_forms"("external_form_id");

-- AddForeignKey
ALTER TABLE "card_external_forms" DROP CONSTRAINT IF EXISTS "card_external_forms_card_id_fkey";
ALTER TABLE "card_external_forms" ADD CONSTRAINT "card_external_forms_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_external_forms" DROP CONSTRAINT IF EXISTS "card_external_forms_stage_id_fkey";
ALTER TABLE "card_external_forms" ADD CONSTRAINT "card_external_forms_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
