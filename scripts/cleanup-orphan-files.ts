import { readdir, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDelete = args.includes("--delete");

  console.log("Starting orphan files cleanup...");
  if (!isDelete) {
    console.log("DRY RUN MODE. Pass --delete to actually delete files.");
  }

  const buktiDir = path.resolve(process.cwd(), "storage", "private", "bukti");
  
  let filesOnDisk: string[] = [];
  try {
    filesOnDisk = await readdir(buktiDir);
  } catch (err) {
    console.error("Failed to read storage directory:", err);
    process.exit(1);
  }

  // Get all transaction attachments from DB
  const transactions = await prisma.transactions.findMany({
    where: {
      attachment: { not: null }
    },
    select: { attachment: true }
  });

  const attachmentsInDb = new Set(
    transactions
      .map(tx => tx.attachment?.split("/").pop())
      .filter(Boolean)
  );

  let orphanCount = 0;

  for (const file of filesOnDisk) {
    if (!attachmentsInDb.has(file)) {
      orphanCount++;
      const filepath = path.resolve(buktiDir, file);
      
      if (isDelete) {
        try {
          await unlink(filepath);
          console.log(`Deleted orphan: ${file}`);
        } catch (err) {
          console.error(`Failed to delete ${file}:`, err);
        }
      } else {
        console.log(`Found orphan: ${file}`);
      }
    }
  }

  console.log(`\nCleanup finished.`);
  console.log(`Total files on disk: ${filesOnDisk.length}`);
  console.log(`Total attachments in DB: ${attachmentsInDb.size}`);
  console.log(`Total orphan files found: ${orphanCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
