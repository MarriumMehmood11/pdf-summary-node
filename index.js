const express = require("express");
const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");
const path = require("path");
const cors = require("cors");
const PDFParse = require('pdf-parse');
const dotenv = require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enabling CORS for all requests
app.use(cors());

// Define the path for the uploads directory
const uploadPath = path.join(__dirname, "uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Setting up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // Use the absolute path for the uploads directory
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    ); // Use path.extname to extract extension
  },
});

const upload = multer({ storage: storage });

// Enable body parser for large files and urlencoded data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// POST endpoint to handle file upload
app.post("/summarize", upload.single("file"), async (req, res) => {
  const pdfPath = req.file.path;

  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await PDFParse(dataBuffer);

    const summary = await summarizeText(data.text);
    res.send({ summary });
  } catch (error) {
    console.error("Error processing the PDF:", error);
    res.status(500).send({ message: "Error processing the PDF" });
  } finally {
    // Clean up the uploaded file
    fs.unlinkSync(pdfPath);
  }
});

async function summarizeText(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // Assuming we're using a text-based model
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Summarize the following text."
      },
      {
        role: "user",
        content: text
      }
    ],
  });

  console.log(response.choices[0].message.content)
  return response.choices[0].message.content;
}

// Start the server
app.listen(port, () => console.log(`Server started on port ${port}`));
