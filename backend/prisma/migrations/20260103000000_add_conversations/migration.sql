-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WHATSAPP', 'WEBCHAT', 'PHONE', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('CLIENT', 'AGENT', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ABANDONED', 'TRANSFERRED');

-- CreateTable
CREATE TABLE "card_conversations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL,
    "card_id" UUID NOT NULL,
    "stage_id" UUID,
    "external_id" VARCHAR(255) NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "participants" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "card_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_type" "ParticipantType" NOT NULL,
    "sender_name" VARCHAR(255) NOT NULL,
    "sender_id" VARCHAR(255),
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "media_url" TEXT,
    "sent_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_conversations_card_id_idx" ON "card_conversations"("card_id");

-- CreateIndex
CREATE INDEX "card_conversations_stage_id_idx" ON "card_conversations"("stage_id");

-- CreateIndex
CREATE INDEX "card_conversations_status_idx" ON "card_conversations"("status");

-- CreateIndex
CREATE INDEX "card_conversations_channel_idx" ON "card_conversations"("channel");

-- CreateIndex
CREATE INDEX "card_conversations_started_at_idx" ON "card_conversations"("started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_conversation_external" ON "card_conversations"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "conversation_messages_conversation_id_idx" ON "conversation_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_messages_sent_at_idx" ON "conversation_messages"("sent_at" ASC);

-- AddForeignKey
ALTER TABLE "card_conversations" ADD CONSTRAINT "card_conversations_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_conversations" ADD CONSTRAINT "card_conversations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "card_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
