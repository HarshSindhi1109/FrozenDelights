import Address from "../models/Address.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

// Create new Address
export const createAddress = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const {
    fullname,
    phone,
    addressLine,
    city,
    state,
    pincode,
    addressType,
    isDefault,
    location,
  } = req.body;

  if (!fullname || !phone || !addressLine || !city || !state || !pincode) {
    return next(new AppError("All fields are required", 400));
  }

  if (
    !location ||
    location.type !== "Point" ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    return next(new AppError("Invalid location format", 400));
  }

  if (isDefault) {
    await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
  }

  const address = await Address.create({
    userId,
    fullname,
    phone,
    addressLine,
    city,
    state,
    pincode,
    addressType,
    isDefault,
    location,
  });

  res.status(201).json({
    success: true,
    message: "Address created successfully",
    data: address,
  });
});

// Get all addresses of single user
export const getUserAddresses = catchAsync(async (req, res, next) => {
  const addresses = await Address.find({ userId: req.user.id })
    .sort({
      isDefault: -1,
      createdAt: -1,
    })
    .lean();

  res.status(200).json({
    success: true,
    results: addresses.length,
    data: addresses,
  });
});

// Get address by id
export const getAddressById = catchAsync(async (req, res, next) => {
  const address = await Address.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  res.status(200).json({
    success: true,
    data: address,
  });
});

export const updateAddress = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // whitelist fields
  const allowedFields = [
    "fullname",
    "phone",
    "addressLine",
    "city",
    "state",
    "pincode",
    "addressType",
    "isDefault",
    "location",
  ];

  const updateData = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // handle default address logic
  if (updateData.isDefault === true) {
    await Address.updateMany({ userId: req.user.id }, { isDefault: false });
  }

  const address = await Address.findOneAndUpdate(
    {
      _id: id,
      userId: req.user.id,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  res.status(200).json({
    success: true,
    data: address,
  });
});

// Delete address
export const deleteAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Address deleted successfully",
  });
});

// Set default address
export const setDefaultAddress = catchAsync(async (req, res, next) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  await Address.updateMany({ userId, isDefault: true }, { isDefault: false });

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    message: "Default address updated successfully",
    data: address,
  });
});
