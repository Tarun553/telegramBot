import {prisma} from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function syncUser() {
    const user = await currentUser();
    if (!user) return;
    const existingUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
    });
    if (existingUser) return existingUser;
    return await prisma.user.upsert({
        where: { clerkId: user.id },
        update: {
            shopName: user.username,
        },
        create: {
            clerkId: user.id,
            shopName: user.username,
        },
    });
}