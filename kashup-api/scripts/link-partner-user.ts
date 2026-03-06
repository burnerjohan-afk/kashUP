/**
 * Lie un utilisateur existant à un partenaire (role=partner, partnerId=id).
 * Usage: npx tsx scripts/link-partner-user.ts <email> <partnerId>
 * Ex: npx tsx scripts/link-partner-user.ts partenaire@example.com cmj8sdmge00014y78309dqsye
 */
/// <reference types="node" />
import prisma from '../src/config/prisma';

async function main() {
  const email = process.argv[2];
  const partnerId = process.argv[3];
  if (!email || !partnerId) {
    console.error('Usage: npx tsx scripts/link-partner-user.ts <email> <partnerId>');
    process.exit(1);
  }
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) {
    console.error('Partenaire introuvable:', partnerId);
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role: 'partner', partnerId } as { role: string; partnerId: string },
  });
  const partnerName = partner.name;
  console.log(`OK: ${user.email} est maintenant partenaire de "${partnerName}" (${partnerId}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
