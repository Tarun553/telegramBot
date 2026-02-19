import { prisma } from "./prisma";
import { IntentData } from "./intent-parser";
import { TransactionType } from "../generated/prisma/client";


// Type-safe transaction type mapping
const intentToType: Record<string, TransactionType> = {
  "create_sale": TransactionType.SALE,
  "create_credit": TransactionType.CREDIT,
  "create_payment": TransactionType.PAYMENT,
};

export async function saveTransaction(userId: string, data: IntentData) {
  // Validate required fields based on intent
  if (!data.intent || !intentToType[data.intent]) {
    throw new Error("Invalid transaction type");
  }

  const amount = data.total ?? data.amount;
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error("Invalid amount");
  }

  return prisma.transaction.create({
    data: {
      userId,
      type: intentToType[data.intent],
      item: data.item ?? null,
      qty: data.qty ?? null,
      amount: amount,
      personName: data.person ?? null,
      date: data.date === "today" ? new Date() : new Date(data.date ?? new Date()),
    },
  });
}

export async function getTodaySales(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "SALE",
      createdAt: { gte: today },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

export async function getPersonCredit(userId: string, person: string) {
  const result = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, personName: person, type: { in: [TransactionType.CREDIT, TransactionType.PAYMENT] } },
    _sum: { amount: true },
  });

  const credits = result.find(r => r.type === TransactionType.CREDIT)?._sum.amount ?? 0;
  const payments = result.find(r => r.type === TransactionType.PAYMENT)?._sum.amount ?? 0;

  return credits - payments;
}

export async function getWeekSummary(userId: string) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // Removed unused variable: const botUsername = "Karanaji_bot";

  const stats = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      createdAt: { gte: weekAgo },
    },
    _sum: { amount: true },
    _count: true,
  });

  const sales = stats.find(s => s.type === TransactionType.SALE);
  const credits = stats.find(s => s.type === TransactionType.CREDIT);

  return {
    totalSales: sales?._sum.amount ?? 0,
    transactionCount: sales?._count ?? 0,
    totalCredit: credits?._sum.amount ?? 0,
  };
}

export async function getSalesByDate(userId: string, date: string) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "SALE",
      date: {
        gte: targetDate,
        lt: nextDate,
      },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}