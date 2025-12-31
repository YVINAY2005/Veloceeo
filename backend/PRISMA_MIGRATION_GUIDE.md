// Example of how to update your model files for better Vercel performance
// Replace direct PrismaClient imports with this pattern:

// OLD:
// import { PrismaClient } from "../../db/generated/prisma";
// const prisma = new PrismaClient();

// NEW:
import prisma from "../../lib/prisma";

// Then use prisma normally in your routes
// Example: const users = await prisma.user.findMany();
