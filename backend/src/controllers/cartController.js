import Cart from "../models/Cart.js";
import IceCream from "../models/IceCream.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

// Add to cart
export const addToCart = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { iceCreamId, size, quantity } = req.body;

  if (!iceCreamId || !size || !quantity) {
    return next(
      new AppError("iceCreamId, size and quantity are required", 400),
    );
  }

  const iceCream = await IceCream.findById(iceCreamId);

  if (!iceCream || !iceCream.isActive) {
    return next(new AppError("Ice cream not found", 404));
  }

  const variant = iceCream.variants.find(
    (v) => v.size.toLowerCase() === size.toLowerCase(),
  );

  if (!variant || !variant.isAvailable) {
    return next(new AppError("Selected variant not available", 400));
  }

  if (variant.stock < quantity) {
    return next(new AppError("Not enough stock available", 400));
  }

  const price = variant.basePrice;

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ iceCreamId, size, quantity, price }],
    });
  } else {
    const existingItem = cart.items.find(
      (item) =>
        item.iceCreamId.toString() === iceCreamId &&
        item.size.toLowerCase() === size.toLowerCase(),
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ iceCreamId, size, quantity, price });
    }

    await cart.save();
  }

  res.status(201).json({
    success: true,
    message: "Item added to cart",
    cart,
  });
});

// Get cart
export const getCart = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ userId })
    .populate("items.iceCreamId", "name imageUrl")
    .lean();

  if (!cart) {
    return res.status(200).json({
      success: true,
      cart: { items: [] },
    });
  }

  res.status(200).json({
    success: true,
    cart,
  });
});

// Update cart item quantity
export const updateCartItem = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { iceCreamId, size, quantity } = req.body;

  if (!iceCreamId || !size || !quantity) {
    return next(
      new AppError("iceCreamId, size and quantity are required", 400),
    );
  }
  
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const item = cart.items.find(
    (item) =>
      item.iceCreamId.toString() === iceCreamId &&
      item.size.toLowerCase() === size.toLowerCase(),
  );

  if (!item) {
    return next(new AppError("Item not found in cart", 404));
  }

  item.quantity = quantity;

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart item updated",
    cart,
  });
});

// Remove cart item
export const removeCartItem = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { iceCreamId, size } = req.body;

  if (!iceCreamId || !size) {
    return next(new AppError("iceCreamId and size are required", 400));
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const originalLength = cart.items.length;

  cart.items = cart.items.filter(
    (item) =>
      !(
        item.iceCreamId.toString() === iceCreamId &&
        item.size.toLowerCase() === size.toLowerCase()
      ),
  );

  if (originalLength === cart.items.length) {
    return next(new AppError("Item not found in cart", 404));
  }

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    cart,
  });
});

// Clear cart
export const clearCart = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  cart.items = [];

  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
  });
});
