import cron from "node-cron";
import DailyPayout from "../models/DailyPayout.js";
import { processDailyPayout } from "../services/dailyPayoutService.js";
import { processRazorpayPayout } from "../services/autoPayoutService.js";

export const startDailyPayoutJob = () => {
  cron.schedule("59 23 * * *", async () => {
    console.log("Running daily payout job...");

    try {
      await processDailyPayout();

      const pendingPayouts = await DailyPayout.find({
        payoutStatus: "pending",
      });

      for (const payout of pendingPayouts) {
        await processRazorpayPayout(payout);
      }

      console.log("Auto payouts completed.");
    } catch (err) {
      console.error("Daily payout failed:", err);
    }
  });
};
