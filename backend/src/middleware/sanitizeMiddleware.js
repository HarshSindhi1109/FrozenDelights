import sanitizeHtml from "sanitize-html";

const sanitizeBody = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = sanitizeHtml(obj[key], {
          allowedTags: [],
          allowedAttributes: {},
        });
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);

  next();
};

export default sanitizeBody;
