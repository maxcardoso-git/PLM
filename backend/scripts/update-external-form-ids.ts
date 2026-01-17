/**
 * Update External Form IDs
 *
 * Updates StageFormAttachRule records to use correct MongoDB ObjectIds
 * instead of PLM internal UUIDs.
 *
 * Mapping:
 * - CustumerData (PLM UUID: bfd3e776-c9b3-4fb5-8a56-140b13ec9310)
 *   → MongoDB ObjectId: 695826bef0b3167d8ad96969
 *
 * - Credit Recovery Data (PLM UUID: a8ca4c4f-3b73-4d67-bd6e-bb1d6148188e)
 *   → MongoDB ObjectId: 6958274df0b3167d8ad9696a
 *
 * Run: npx ts-node scripts/update-external-form-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FORM_MAPPING = [
  {
    plmUuid: 'bfd3e776-c9b3-4fb5-8a56-140b13ec9310',
    mongoObjectId: '695826bef0b3167d8ad96969',
    name: 'CustomerData'
  },
  {
    plmUuid: 'a8ca4c4f-3b73-4d67-bd6e-bb1d6148188e',
    mongoObjectId: '6958274df0b3167d8ad9696a',
    name: 'DebtData'
  }
];

async function main() {
  console.log('🔄 Updating External Form IDs in PLM...\n');

  for (const mapping of FORM_MAPPING) {
    console.log(`Processing ${mapping.name}...`);
    console.log(`  PLM UUID: ${mapping.plmUuid}`);
    console.log(`  MongoDB ObjectId: ${mapping.mongoObjectId}`);

    // Find all StageFormAttachRules that use this form
    const rules = await prisma.stageFormAttachRule.findMany({
      where: {
        OR: [
          { externalFormId: mapping.plmUuid },
          { formDefinitionId: mapping.plmUuid }
        ]
      }
    });

    console.log(`  Found ${rules.length} rules to update`);

    // Update each rule to use MongoDB ObjectId
    for (const rule of rules) {
      await prisma.stageFormAttachRule.update({
        where: { id: rule.id },
        data: {
          externalFormId: mapping.mongoObjectId,
          externalFormName: mapping.name,
          // Clear formDefinitionId since we're using external form
          formDefinitionId: null
        }
      });
      console.log(`  ✅ Updated rule ${rule.id}`);
    }

    console.log('');
  }

  console.log('✅ All external form IDs updated!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
