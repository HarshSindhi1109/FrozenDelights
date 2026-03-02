import fs from "fs";

const deleteUploadedFiles = async (files) => {
  if (!files) return;

  for (const fieldName in files) {
    for (const file of files[fieldName]) {
      if (file.savedPath && fs.existsSync(file.savedPath)) {
        await fs.promises.unlink(file.savedPath);
      }
    }
  }
};

export default deleteUploadedFiles;
