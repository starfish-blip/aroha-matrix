import express from 'express';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 8097;
const CHARTS_DIR = path.resolve(process.cwd(), 'hourly_charts');
const REPORTS_DIR = path.resolve(process.cwd(), 'weekly_reports');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(process.cwd()));
app.use('/hourly_charts', express.static(CHARTS_DIR));

app.get('/api/neemwest/spatial/charts', (req, res) => {
  if (!fs.existsSync(CHARTS_DIR)) return res.json({ success: true, data: [] });
  const files = fs.readdirSync(CHARTS_DIR).filter(f => f.endsWith('.png'));
  const charts = files.map(filename => {
    const filePath = path.join(CHARTS_DIR, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      url: `/hourly_charts/${filename}`,
      timestamp: stats.mtime.toISOString(),
      sizeMb: Number((stats.size / (1024 * 1024)).toFixed(2)),
      z1Avg: 432.0, z2Avg: 528.0, z3Avg: 639.0, overallAvg: 533.0
    };
  });
  charts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: charts });
});

app.get('/api/neemwest/spatial/charts/report-pdf', (req, res) => {
  const { chartA, chartB, password } = req.query;
  if (!chartA || !chartB) return res.status(400).send('chartA and chartB query params required.');
  const pathA = path.join(CHARTS_DIR, path.basename(chartA));
  const pathB = path.join(CHARTS_DIR, path.basename(chartB));
  if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) return res.status(404).send('Chart files not found.');

  const pdfOptions = { size: 'A4', layout: 'landscape', margin: 30 };
  if (password) { pdfOptions.userPassword = password; pdfOptions.ownerPassword = password; }

  const doc = new PDFDocument(pdfOptions);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="spatial_comparison_report.pdf"');
  doc.pipe(res);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#04040a');
  doc.fillColor('#00d4ff').fontSize(20).text('AROHA NEEMWEST SPATIAL MATRIX COMPARISON REPORT', 45, 45);
  doc.fillColor('#cbd5e1').fontSize(10).text(`Comparing: ${chartA} vs ${chartB}`, 45, 75);
  doc.end();
});

app.listen(PORT, () => {
  console.log(`?? AROHA Matrix Server running on http://localhost:${PORT}`);
});
