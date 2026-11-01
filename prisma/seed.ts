import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for seeding");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@example.test" },
    update: { name: "Development Instructor", role: "INSTRUCTOR" },
    create: {
      name: "Development Instructor",
      email: "instructor@example.test",
      emailVerified: true,
      role: "INSTRUCTOR",
    },
  });

  await prisma.user.upsert({
    where: { email: "learner@example.test" },
    update: { name: "Development Learner", role: "LEARNER" },
    create: {
      name: "Development Learner",
      email: "learner@example.test",
      emailVerified: true,
      role: "LEARNER",
    },
  });

  const existing = await prisma.exercise.findFirst({
    where: { authorId: instructor.id, title: "Unbound local variable" },
  });

  if (!existing) {
    await prisma.exercise.create({
      data: {
        title: "Unbound local variable",
        description: "A draft fixture for developing the instructor workflow.",
        authorId: instructor.id,
        versions: {
          create: {
            version: 1,
            buggyCode:
              "def total(values):\n    if values:\n        result = sum(values)\n    return result",
            expectedBehavior:
              "Return the sum for a non-empty list and zero for an empty list.",
            hints: {
              create: [
                {
                  stage: 1,
                  title: "Trace the empty case",
                  content: "Follow the function with an empty list.",
                },
                {
                  stage: 2,
                  title: "Find the assignment",
                  content: "Check every path before result is returned.",
                },
                {
                  stage: 3,
                  title: "Choose a safe default",
                  content: "Initialize the accumulator before branching.",
                },
              ],
            },
          },
        },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
