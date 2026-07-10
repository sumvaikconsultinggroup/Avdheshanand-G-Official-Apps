import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DailyVichar from "@/models/DailyVichar";
import { generateDailyVichar } from "@/lib/dailyVicharGenerator";

export async function GET() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1) Already have today's vichar? Return it (generated once per day).
    let vichar = await DailyVichar.findOne({
      date: { $gte: today, $lt: tomorrow },
      isPublished: true,
      isDeleted: false,
    }).lean();

    // 2) Otherwise generate a fresh one for today via OpenAI and cache it.
    if (!vichar) {
      const generated = await generateDailyVichar(today);
      if (generated) {
        try {
          const created = await DailyVichar.create({
            ...generated,
            date: today,
            isPublished: true,
            isDeleted: false,
          });
          vichar = created.toObject();
        } catch (saveError) {
          // A race (another request created today's vichar) — re-read it.
          console.warn(
            "Daily vichar save failed, re-reading:",
            saveError instanceof Error ? saveError.message : saveError
          );
          vichar = await DailyVichar.findOne({
            date: { $gte: today, $lt: tomorrow },
            isPublished: true,
            isDeleted: false,
          }).lean();
        }
      }
    }

    // 3) Fall back to the most recent past vichar if generation was unavailable.
    if (!vichar) {
      vichar = await DailyVichar.findOne({
        isPublished: true,
        isDeleted: false,
        date: { $lt: today },
      })
        .sort({ date: -1 })
        .lean();
    }

    if (!vichar) {
      return NextResponse.json(
        { success: false, message: "No vichar available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: vichar });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

