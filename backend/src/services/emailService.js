import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic email sender
export const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `FrozenDelights <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// OTP email
export const sendOtpEmail = async (toEmail, otp) => {
  const html = `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 90 seconds.</p>
    `;

  await sendEmail(toEmail, "Email Verification OTP", html);
};

// Delivery person approval email
export const sendDeliveryApprovalEmail = async (toEmail, fullname) => {
  const html = `
    <h2>Congratulations, ${fullname}! 🎉</h2>
    <p>Your application to become a delivery partner with <strong>FrozenDelights</strong> has been <strong>approved</strong>.</p>
    <p>You can now log in to your delivery dashboard using the link below:</p>
    <p>
      <a href="http://localhost:5173/delivery/login" 
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Go to Delivery Login
      </a>
    </p>
    <p style="color:#888;font-size:0.85rem;">Use the same email and password you registered with.</p>
  `;

  await sendEmail(toEmail, "You're approved as a Delivery Partner! 🚀", html);
};
