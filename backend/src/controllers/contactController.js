import Contact from "../models/Contact.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { sendEmail } from "../services/emailService.js";

// Create Contact
export const createContact = catchAsync(async (req, res, next) => {
  const { username, email, phone, message } = req.body;

  if (!username || !email || !phone || !message) {
    return next(new AppError("All fields are required.", 400));
  }

  const contact = await Contact.create({
    username,
    email,
    phone,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Contact created successfully",
    data: contact,
  });
});

// Get contacts
export const getAllContacts = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const skip = (page - 1) * limit;

  const contacts = await Contact.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Contact.countDocuments();

  res.status(200).json({
    success: true,
    count: contacts.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: contacts,
  });
});

// Get contact by id
export const getContactById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const contact = await Contact.findById(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  res.status(200).json({ success: true, data: contact });
});

// status update
export const updateContactStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const contact = await Contact.findById(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  const statusOrder = ["pending", "in-progress", "resolved"];

  const currentIndex = statusOrder.indexOf(contact.status);
  const newIndex = statusOrder.indexOf(status);

  if (newIndex === -1) {
    return next(new AppError("Invalid status value", 400));
  }

  if (newIndex <= currentIndex) {
    return next(
      new AppError(
        `Status cannot be changed from ${contact.status} to ${status}`,
        400,
      ),
    );
  }

  contact.status = status;
  await contact.save();

  res.status(200).json({
    success: true,
    message: "Status updated successfully",
    data: contact,
  });
});

// Reply to contact
export const replyToContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { replyMessage } = req.body;

  if (!replyMessage) {
    return next(new AppError("Reply message is required", 400));
  }

  const contact = await Contact.findById(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  if (contact.reply?.message) {
    return next(new AppError("This contact already has a reply"), 400);
  }

  contact.reply = {
    message: replyMessage,
    repliedAt: new Date(),
  };

  contact.status = "resolved";

  await contact.save();

  const emailHTML = `
  <h2>Hello ${contact.username},</h2>
    <p>Thank you for contacting FrozenDelights.</p>

    <h3>Your Message:</h3>
    <p>${contact.message}</p>

    <h3>Our Reply:</h3>
    <p>${replyMessage}</p>

    <br/>
    <p>Best Regards,<br/>FrozenDelights Support Team</p>
  `;

  await sendEmail(
    contact.email,
    "Reply to your FrozenDelights contact request",
    emailHTML,
  );

  res.status(200).json({
    success: true,
    message: "Reply sent successfully",
    data: contact,
  });
});

// delete contact
export const deleteContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const contact = await Contact.findByIdAndDelete(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Contact deleted successfully",
  });
});
