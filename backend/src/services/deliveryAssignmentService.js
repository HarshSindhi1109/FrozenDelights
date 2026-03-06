import DeliveryPerson from "../models/DeliveryPerson.js";

export const findNearestDeliveryPersons = async (
  pickupLocation,
  excludedDrivers = [],
) => {
  const deliveryPersons = await DeliveryPerson.find({
    _id: { $nin: excludedDrivers },
    status: "active",
    availability: "online",
    lastLocationUpdate: { $gte: Date.now() - 300000 }, // last 5 minutes

    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: pickupLocation,
        },
        $maxDistance: 5000, // 5 km
      },
    },
  }).limit(5);

  return deliveryPersons;
};
