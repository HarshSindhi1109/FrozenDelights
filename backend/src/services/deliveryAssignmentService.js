import DeliveryPerson from "../models/DeliveryPerson.js";

export const findNearestDeliveryPersons = async (pickupLocation) => {
  const deliveryPersons = await DeliveryPerson.find({
    status: "active",
    availability: "online",
    lastLocationUpdate: { $gte: Date.now() - 30000 },

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
