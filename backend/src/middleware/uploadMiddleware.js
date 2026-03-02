import multer from "multer";
import path from "path";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";

const baseUploadDir = "uploads";
const profileDir = path.join(baseUploadDir, "profile");
const docsDir = path.join(baseUploadDir, "documents");
const categoryDir = path.join(baseUploadDir, "categories");
const flavourDir = path.join(baseUploadDir, "flavours");
const iceCreamDir = path.join(baseUploadDir, "ice-creams");

[(baseUploadDir, profileDir, docsDir, categoryDir, flavourDir, iceCreamDir)].forEach(
  (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  },
);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const processUploadedFiles = async (req, res, next) => {
  try {
    if (!req.files) return next();

    for (const fieldName in req.files) {
      for (const file of req.files[fieldName]) {
        const fileType = await fileTypeFromBuffer(file.buffer);

        if (
          !fileType ||
          !["image/png", "image/jpeg", "application/pdf"].includes(
            fileType.mime,
          )
        ) {
          throw new Error("Only real PNG, JPEG, or PDF files are allowed.");
        }

        const folderMap = {
          profilePicture: profileDir,
          categoryImage: categoryDir,
          flavourImage: flavourDir,
          iceCreamImage: iceCreamDir,
        };

        const targetDir = folderMap[fieldName] || docsDir;

        const uniqueName =
          fieldName +
          "-" +
          Date.now() +
          Math.round(Math.random() * 1e9) +
          "." +
          fileType.ext;

        const filePath = path.join(targetDir, uniqueName);

        await fs.promises.writeFile(filePath, file.buffer);
        file.savedPath = filePath;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default upload;
