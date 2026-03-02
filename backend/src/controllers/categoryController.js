import Category from "../models/Category.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import fs from "fs";

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

// Create Category (Admin)
export const createCategory = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return next(new AppError("Name and description are required.", 400));
  }

  const imagePath = req.files?.categoryImage?.[0]?.savedPath;

  if (!imagePath) {
    return next(new AppError("Category image is required.", 400));
  }

  const existing = await Category.findOne({
    nameNormalized: name.trim().toLowerCase(),
  });

  if (existing) {
    await deleteFileIfExists(imagePath);
    return next(new AppError("Category already exists.", 400));
  }

  const category = await Category.create({
    name,
    description,
    imageUrl: imagePath,
  });

  return res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

// Get all categories (Public)
export const getAllCategories = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.showInactive !== "true") {
    filter.isActive = true;
  }

  const categories = await Category.find(filter)
    .select("-nameNormalized")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Category.countDocuments(filter);

  res.status(200).json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    results: categories.length,
    data: categories,
  });
});

// Get Category By Id (Public)
export const getCategoryById = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id).select(
    "-nameNormalized",
  );

  if (!category) {
    return next(new AppError("Category not found.", 404));
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

// Update Category (Admin)
export const updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  const newImagePath = req.files?.categoryImage?.[0]?.savedPath;

  if (!category) {
    if (newImagePath) {
      await deleteFileIfExists(newImagePath);
    }
    return next(new AppError("Category not found.", 404));
  }

  if (req.body.name !== undefined) {
    if (!req.body.name.trim()) {
      return next(new AppError("Name cannot be empty", 400));
    }
    category.name = req.body.name;
  }

  if (req.body.description !== undefined) {
    category.description = req.body.description;
  }

  if (req.body.isActive !== undefined) {
    category.isActive = req.body.isActive;
  }

  if (newImagePath) {
    await deleteFileIfExists(category.imageUrl);
    category.imageUrl = newImagePath;
  }

  await category.save();

  res.status(200).json({
    success: true,
    message: "Category updated successfully.",
    data: category,
  });
});

// Delete Category (Admin)
export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError("Category not found.", 404));
  }

  await deleteFileIfExists(category.imageUrl);
  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: "Category deleted successfully.",
  });
});
