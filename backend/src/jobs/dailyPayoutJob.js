import cron from "node-cron";
import DailyPayout from "../models/DailyPayout.js";
import { processDailyPayout } from "../services/dailyPayoutService.js";
import { processRazorpayPayout } from "../services/autoPayoutService.js";

export const startDailyPayoutJob = () => {
  cron.schedule("01 18 * * *", async () => {
    console.log("Running daily payout job...");

    try {
      await processDailyPayout();

      // FIX: only auto-process TODAY's pending payouts, not all historical ones
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      const pendingPayouts = await DailyPayout.find({
        payoutStatus: "pending",
        date: { $gte: startOfToday, $lt: endOfToday },
      });

      for (const payout of pendingPayouts) {
        await processRazorpayPayout(payout);
      }

      console.log(
        `Auto payouts completed. Processed ${pendingPayouts.length} payouts.`,
      );
    } catch (err) {
      console.error("Daily payout job failed:", err);
    }
  });
};
