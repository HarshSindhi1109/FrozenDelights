import mongoose from "mongoose";
import DeliveryEarning from "../models/DeliveryEarning.js";
import DailyPayout from "../models/DailyPayout.js";

export const processDailyPayout = async (
  date = new Date(),
  deliveryPersonId = null,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const query = {
      isSettled: false,
      earningDate: { $gte: startOfDay, $lt: endOfDay },
    };

    if (deliveryPersonId) {
      query.deliveryPersonId = deliveryPersonId;
    }

    const earnings = await DeliveryEarning.find(query).session(session);

    if (!earnings.length || earnings.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: true,
        message: "No earnings to settle",
        payoutsCreated: 0,
      };
    }

    const grouped = {};

    earnings.forEach((e) => {
      const id = e.deliveryPersonId.toString();
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push(e);
    });

    let payoutsCreated = 0;

    for (const personId in grouped) {
      const personEarnings = grouped[personId];

      let totalBasePay = 0;
      let totalDistancePay = 0;
      let totalSurgeBonus = 0;
      let totalTips = 0;

      personEarnings.forEach((e) => {
        totalBasePay += e.basePay || 0;
        totalDistancePay += e.distancePay || 0;
        totalSurgeBonus += e.surgeBonus || 0;
        totalTips += e.tipAmount || 0;
      });

      const totalEarnings =
        totalBasePay + totalDistancePay + totalSurgeBonus + totalTips;

      const payout = await DailyPayout.create(
        [
          {
            deliveryPersonId: personId,
            date: startOfDay,
            totalOrders: personEarnings.length,
            totalBasePay,
            totalDistancePay,
            totalSurgeBonus,
            totalTips,
            totalEarnings,
          },
        ],
        { session },
      );

      await DeliveryEarning.updateMany(
        {
          _id: { $in: personEarnings.map((e) => e._id) },
        },
        {
          $set: { isSettled: true, payoutId: payout[0]._id },
        },
        { session },
      );

      payoutsCreated++;
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Daily payout processed successfully.",
      payoutsCreated,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
