import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DailyVichar from "@/models/DailyVichar";
import { generateDailyVichar } from "@/lib/dailyVicharGenerator";
import { FALLBACK_VICHARS } from "@/lib/fallbackVichars";

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

    // 3) Generation unavailable (e.g. OpenAI quota exhausted) — serve a curated
    //    vichar rotated by the day so the message still CHANGES DAILY, and cache
    //    it as today's so we don't re-hit the failing API on every request.
    if (!vichar) {
      const dayIndex = Math.floor(today.getTime() / 86400000);
      const chosen = FALLBACK_VICHARS[dayIndex % FALLBACK_VICHARS.length];
      try {
        const created = await DailyVichar.create({
          ...chosen,
          date: today,
          isPublished: true,
          isDeleted: false,
        });
        vichar = created.toObject();
      } catch {
        // Race (another request saved today's) or save failure — re-read, or
        // return the chosen one directly (still date-stable for the whole day).
        vichar =
          (await DailyVichar.findOne({
            date: { $gte: today, $lt: tomorrow },
            isPublished: true,
            isDeleted: false,
          }).lean()) || { ...chosen, date: today };
      }
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

