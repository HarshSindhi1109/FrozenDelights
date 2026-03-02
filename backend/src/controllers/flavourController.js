import Flavour from "../models/Flavour.js";
import Category from "../models/Category.js";
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

// Create Flavour (Admin)
export const createFlavour = catchAsync(async (req, res, next) => {
  const { name, categoryId, isSeasonal, availableFrom, availableTo } = req.body;

  if (!name || !categoryId) {
    return next(new AppError("Flavour Name and Category are required.", 400));
  }

  const imagePath = req.files?.flavourImage?.[0]?.savedPath;

  if (!imagePath) {
    return next(new AppError("Category image is required.", 400));
  }

  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    await deleteFileIfExists(imagePath);
    return next(new AppError("Category does not exist", 400));
  }

  const seasonalFlag = isSeasonal === "true" || isSeasonal === true;

  if (seasonalFlag && (!availableFrom || !availableTo)) {
    await deleteFileIfExists(imagePath);
    return next(
      new AppError(
        "Seasonal flavour must have availableFrom and availableTo",
        400,
      ),
    );
  }

  try {
    const flavour = await Flavour.create({
      name,
      categoryId,
      imageUrl: imagePath,
      isSeasonal,
      availableFrom,
      availableTo,
    });

    return res.status(201).json({
      success: true,
      message: "Flavour created successfully",
      data: flavour,
    });
  } catch (error) {
    await deleteFileIfExists(imagePath);
    return next(error);
  }
});

// Get Flavours (Public)
export const getFlavours = catchAsync(async (req, res, next) => {
  const {
    categoryId,
    isSeasonal,
    isActive,
    search,
    sort = "-createdAt",
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return next(new AppError("Invalid category ID", 400));
    }
    filter.categoryId = categoryId;
  }

  if (isSeasonal !== undefined) {
    filter.isSeasonal = isSeasonal === "true";
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  } else {
    filter.isActive = true;
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const pageNumber = Math.max(parseInt(page) || 1, 1);
  const pageSize = Math.min(parseInt(limit) || 20, 100);
  const skip = (pageNumber - 1) * pageSize;

  const flavours = await Flavour.find(filter)
    .populate("categoryId", "name")
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .lean();

  const total = await Flavour.countDocuments(filter);

  res.status(200).json({
    success: true,
    page: pageNumber,
    limit: pageSize,
    total,
    pages: Math.ceil(total / pageSize),
    results: flavours.length,
    data: flavours,
  });
});

// Get flavour by id (Public)
export const getFlavourById = catchAsync(async (req, res, next) => {
  const flavour = await Flavour.findById(req.params.id).populate(
    "categoryId",
    "name",
  );

  if (!flavour) {
    return next(new AppError("Flavour not found.", 404));
  }

  res.status(200).json({ success: true, data: flavour });
});

// Update Flavour (Admin)
export const updateFlavour = catchAsync(async (req, res, next) => {
  const flavour = await Flavour.findById(req.params.id);

  const newImagePath = req.files?.flavourImage?.[0]?.savedPath;

  if (!flavour) {
    if (newImagePath) await deleteFileIfExists(newImagePath);
    return next(new AppError("Flavour not found", 404));
  }

  // Name
  if (req.body.name !== undefined) {
    if (!req.body.name.trim()) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError("Name cannot be empty", 400));
    }
    flavour.name = req.body.name;
  }

  // Category
  if (req.body.categoryId !== undefined) {
    const categoryExists = await Category.findById(req.body.categoryId);
    if (!categoryExists) {
      if (newImagePath) await deleteFileIfExists(newImagePath);
      return next(new AppError("Category does not exist", 400));
    }
    flavour.categoryId = req.body.categoryId;
  }

  // Seasonal
  if (req.body.isSeasonal !== undefined) {
    flavour.isSeasonal = req.body.isSeasonal === "true";

    if (flavour.isSeasonal) {
      if (!req.body.availableFrom || !req.body.availableTo) {
        if (newImagePath) await deleteFileIfExists(newImagePath);
        return next(
          new AppError(
            "Seasonal flavour must have availableFrom and availableTo",
            400,
          ),
        );
      }

      flavour.availableFrom = req.body.availableFrom;
      flavour.availableTo = req.body.availableTo;
    } else {
      flavour.availableFrom = undefined;
      flavour.availableTo = undefined;
    }
  }

  // Active
  if (req.body.isActive !== undefined) {
    flavour.isActive = req.body.isActive === "true";
  }

  // Image Replacement
  if (newImagePath) {
    await deleteFileIfExists(flavour.imageUrl);
    flavour.imageUrl = newImagePath;
  }

  await flavour.save();

  res.status(200).json({
    success: true,
    message: "Flavour updated successfully.",
    data: flavour,
  });
});

// Delete Flavour (Admin)
export const deleteFlavour = catchAsync(async (req, res, next) => {
  const flavour = await Flavour.findById(req.params.id);

  if (!flavour) {
    return next(new AppError("Flavour not found.", 404));
  }

  if (flavour.imageUrl) {
    await deleteFileIfExists(flavour.imageUrl);
  }

  await flavour.deleteOne();

  res
    .status(200)
    .json({ success: true, message: "Flavour deleted successfully." });
});
