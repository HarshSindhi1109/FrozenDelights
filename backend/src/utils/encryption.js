import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = process.env.ENCRYPTION_KEY;
const ivLength = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, "hex"), iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key, "hex"),
    iv,
  );

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
