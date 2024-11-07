// @ts-nocheck
const fs = require("fs-extra");
const path = require("path");
const mammoth = require("mammoth");
// const { Document, Paragraph, TextRun } = require("docx");
const { PDFDocument } = require("pdf-lib");
const XLSX = require("xlsx");

async function applyTemplateFormatting(
  templatePath,
  generatedPath,
  outputPath
) {
  const fileExtension = path.extname(templatePath).toLowerCase();

  switch (fileExtension) {
    case ".docx":
      await applyDocxFormatting(templatePath, generatedPath, outputPath);
      break;
    case ".pdf":
      await applyPdfFormatting(templatePath, generatedPath, outputPath);
      break;
    case ".xlsx":
    case ".xls":
      await applyExcelFormatting(templatePath, generatedPath, outputPath);
      break;
    default:
      throw new Error("Unsupported file type");
  }

  console.log(
    `Formatting applied successfully. Output saved to: ${outputPath}`
  );
}

async function applyDocxFormatting(templatePath, generatedPath, outputPath) {
  // Extract content from the generated file
  const generatedContent = await mammoth.extractRawText({
    path: generatedPath,
  });
  const content = generatedContent.value;

  // Extract styles from the template
  const templateContent = await mammoth.extractRawText({
    path: templatePath,
    styleMap: ["p[style-name] => p.#[style-name]"],
  });
  const templateStyles = templateContent.value
    .split("\n")
    .map((line) => {
      const match = line.match(/^p\.(.+?)\s/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  // Create a new document with the extracted styles
  const doc = new Document({
    styles: {
      paragraphStyles: templateStyles.map((style) => ({
        id: style,
        name: style,
        basedOn: "Normal",
        next: "Normal",
      })),
    },
  });

  // Add content to the new document, applying styles
  const paragraphs = content.split("\n").map((text, index) => {
    return new Paragraph({
      text: text,
      style: templateStyles[index % templateStyles.length] || "Normal",
    });
  });

  doc.addSection({ children: paragraphs });

  // Save the new document
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}

async function applyPdfFormatting(templatePath, generatedPath, outputPath) {
  const templatePdfBytes = await fs.readFile(templatePath);
  const generatedPdfBytes = await fs.readFile(generatedPath);

  const templatePdfDoc = await PDFDocument.load(templatePdfBytes);
  const generatedPdfDoc = await PDFDocument.load(generatedPdfBytes);

  const newPdfDoc = await PDFDocument.create();

  for (let i = 0; i < templatePdfDoc.getPageCount(); i++) {
    const [templatePage] = await newPdfDoc.copyPages(templatePdfDoc, [i]);
    const [contentPage] = await newPdfDoc.copyPages(generatedPdfDoc, [i]);

    newPdfDoc.addPage(templatePage);
    const { width, height } = templatePage.getSize();

    const contentText = await extractTextFromPdfPage(contentPage);
    templatePage.drawText(contentText, {
      x: 50,
      y: height - 50,
      size: 12,
      maxWidth: width - 100,
    });
  }

  const pdfBytes = await newPdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
}

async function extractTextFromPdfPage(page) {
  // This is a simplified example. In a real-world scenario,
  // you'd need a more sophisticated text extraction method.
  const { PDFExtract } = require("pdf.js-extract");
  const extract = new PDFExtract();
  const data = await extract.extractBuffer(page.doc.save());
  return data.pages[0].content.map((item) => item.str).join(" ");
}

async function applyExcelFormatting(templatePath, generatedPath, outputPath) {
  const templateWorkbook = XLSX.readFile(templatePath);
  const generatedWorkbook = XLSX.readFile(generatedPath);

  const templateSheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]];
  const generatedSheet =
    generatedWorkbook.Sheets[generatedWorkbook.SheetNames[0]];

  // Copy cell values from generated sheet to template sheet
  for (let cell in generatedSheet) {
    if (cell[0] === "!") continue; // Skip special keys
    if (templateSheet[cell]) {
      templateSheet[cell].v = generatedSheet[cell].v;
    } else {
      templateSheet[cell] = { ...generatedSheet[cell] };
    }
  }

  XLSX.writeFile(templateWorkbook, outputPath);
}

module.exports = { applyTemplateFormatting };
