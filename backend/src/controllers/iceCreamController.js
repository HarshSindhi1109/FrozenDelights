import IceCream from "../models/IceCream.js";
import Flavour from "../models/Flavour.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import fs from "fs";
import mongoose from "mongoose";

const deleteFileIfExists = async (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error("File deletion error:", err.message);
  }
};

/* CREATE ICE-CREAM (Admin) */
export const createIceCream = catchAsync(async (req, res, next) => {
  const { name, flavourId, variants, isActive } = req.body;

  if (!name?.trim() || !flavourId) {
    return next(new AppError("Ice-cream name and flavour are required.", 400));
  }

  const flavour = await Flavour.findById(flavourId);
  if (!flavour) {
    return next(new AppError("Flavour not found.", 404));
  }

  const imagePath = req.files?.iceCreamImage?.[0]?.savedPath;
  if (!imagePath) {
    return next(new AppError("Ice-cream image is required.", 400));
  }

  let parsedVariants;
  try {
    parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;
  } catch {
    await deleteFileIfExists(imagePath);
    return next(new AppError("Invalid variants format.", 400));
  }

  if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
    await deleteFileIfExists(imagePath);
    return next(new AppError("At least one variant is required.", 400));
  }

  const iceCream = await IceCream.create({
    name: name.trim(),
    flavourId,
    imageUrl: imagePath,
    variants: parsedVariants,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: "Ice-cream created successfully.",
    data: iceCream,
  });
});

/* GET ICE-CREAMS (Public) */
export const getIceCreams = catchAsync(async (req, res, next) => {
  const {
    flavourId,
    isActive,
    search,
    minRating,
    minPrice,
    maxPrice,
    sort = "-createdAt",
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (flavourId) {
    if (!mongoose.Types.ObjectId.isValid(flavourId)) {
      return next(new AppError("Invalid flavour ID.", 400));
    }
    filter.flavourId = flavourId;
  }

  filter.isActive = isActive !== undefined ? isActive === "true" : true;

  if (search) {
    const safeSearch = search.trim().slice(0, 50);
    filter.name = { $regex: safeSearch, $options: "i" };
  }

  if (minRating) {
    const rating = Number(minRating);
    if (!isNaN(rating)) {
      filter.averageRating = { $gte: rating };
    }
  }

  if (minPrice || maxPrice) {
    filter["variants.basePrice"] = {};
    if (minPrice && !isNaN(Number(minPrice))) {
      filter["variants.basePrice"].$gte = Number(minPrice);
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      filter["variants.basePrice"].$lte = Number(maxPrice);
    }
  }

  const pageNumber = Math.max(parseInt(page) || 1, 1);
  const pageSize = Math.min(parseInt(limit) || 20, 100);
  const skip = (pageNumber - 1) * pageSize;

  const iceCreams = await IceCream.find(filter)
    .populate("flavourId", "name")
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .lean();

  const total = await IceCream.countDocuments(filter);

  res.status(200).json({
    success: true,
    page: pageNumber,
    limit: pageSize,
    total,
    pages: Math.ceil(total / pageSize),
    results: iceCreams.length,
    data: iceCreams,
  });
});

/* GET ICE-CREAM BY ID (Public) */
export const getIceCreamById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const iceCream = await IceCream.findById(id).populate("flavourId", "name");

  if (!iceCream) {
    return next(new AppError("Ice-cream not found.", 404));
  }

  res.status(200).json({
    success: true,
    data: iceCream,
  });
});

/* UPDATE ICE-CREAM (Admin) */
export const updateIceCream = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, flavourId, variants, isActive } = req.body;
  const newImagePath = req.files?.iceCreamImage?.[0]?.savedPath;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    if (newImagePath) await deleteFileIfExists(newImagePath);
    return next(new AppError("Invalid ice-cream ID.", 400));
  }

  const iceCream = await IceCream.findById(id);

  if (!iceCream) {
    if (newImagePath) await deleteFileIfExists(newImagePath);
    return next(new AppError("Ice-cream not found.", 404));
  }

  if (name !== undefined) {
    if (!name.trim()) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError("Name cannot be empty.", 400));
    }
    iceCream.name = name.trim();
  }

  if (flavourId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(flavourId)) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError("Invalid flavour ID.", 400));
    }

    const flavourExists = await Flavour.findById(flavourId);
    if (!flavourExists) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError("Flavour does not exist.", 400));
    }

    iceCream.flavourId = flavourId;
  }

  if (isActive !== undefined) {
    iceCream.isActive = isActive === "true" || isActive === true;
  }

  if (variants !== undefined) {
    try {
      const parsed =
        typeof variants === "string" ? JSON.parse(variants) : variants;

      if (!Array.isArray(parsed)) {
        throw new Error();
      }

      parsed.forEach((incomingVariant) => {
        if (!incomingVariant._id) {
          throw new Error("Variant _id is required for partial update.");
        }

        const existingVariant = iceCream.variants.id(incomingVariant._id);

        if (!existingVariant) {
          throw new Error("Variant not found.");
        }

        // Update only provided fields
        if (incomingVariant.size !== undefined)
          existingVariant.size = incomingVariant.size;

        if (incomingVariant.basePrice !== undefined)
          existingVariant.basePrice = incomingVariant.basePrice;

        if (incomingVariant.costPrice !== undefined)
          existingVariant.costPrice = incomingVariant.costPrice;

        if (incomingVariant.stock !== undefined)
          existingVariant.stock = incomingVariant.stock;

        if (incomingVariant.isAvailable !== undefined)
          existingVariant.isAvailable = incomingVariant.isAvailable;
      });
    } catch (err) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError(err.message || "Invalid variants format.", 400));
    }
  }

  if (newImagePath) {
    if (iceCream.imageUrl) {
      await deleteFileIfExists(iceCream.imageUrl);
    }
    iceCream.imageUrl = newImagePath;
  }

  await iceCream.save();

  res.status(200).json({
    success: true,
    message: "Ice-cream updated successfully.",
    data: iceCream,
  });
});

/* DELETE ICE-CREAM (Admin) */
export const deleteIceCream = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const iceCream = await IceCream.findById(id);

  if (!iceCream) {
    return next(new AppError("Ice-cream not found.", 404));
  }

  if (iceCream.imageUrl) {
    await deleteFileIfExists(iceCream.imageUrl);
  }

  await iceCream.deleteOne();

  res.status(200).json({
    success: true,
    message: "Ice-cream deleted successfully.",
  });
});
