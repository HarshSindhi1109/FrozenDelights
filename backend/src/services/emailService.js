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
