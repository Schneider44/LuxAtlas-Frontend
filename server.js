require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json');

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // serves index.html and assets

// ── Email transporter (optional) ──────────────────────────────────────────
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function readBookings() {
  try {
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveBooking(booking) {
  const bookings = readBookings();
  bookings.push(booking);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

async function sendEmailNotification(booking) {
  if (!transporter || !process.env.ADMIN_EMAIL) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;padding:32px;border:1px solid rgba(212,175,55,0.3)">
      <h2 style="color:#d4af37;margin-top:0">New Booking Enquiry — LuxAtlas</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);width:140px">Name</td><td style="padding:8px 0">${booking.firstName} ${booking.lastName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5)">Email</td><td style="padding:8px 0"><a href="mailto:${booking.email}" style="color:#d4af37">${booking.email}</a></td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5)">Service</td><td style="padding:8px 0">${booking.service || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);vertical-align:top">Message</td><td style="padding:8px 0">${booking.message || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5)">Submitted</td><td style="padding:8px 0">${new Date(booking.createdAt).toLocaleString()}</td></tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: `"LuxAtlas" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Enquiry — ${booking.service || 'LuxAtlas'}`,
    html,
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Submit a booking enquiry
app.post('/api/booking', async (req, res) => {
  const { firstName, lastName, email, service, message } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, error: 'First name, last name and email are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  const booking = {
    id: Date.now().toString(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    service: service || '',
    message: message ? message.trim() : '',
    createdAt: new Date().toISOString(),
  };

  try {
    saveBooking(booking);
    await sendEmailNotification(booking);

    console.log(`[${booking.createdAt}] New booking: ${booking.firstName} ${booking.lastName} — ${booking.service}`);

    res.json({ success: true, message: 'Enquiry received. Our team will be in touch within 2 hours.' });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

// Get all bookings (admin use)
app.get('/api/bookings', (req, res) => {
  res.json(readBookings());
});

// Serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  LuxAtlas server running → https://lux-atlas-frontend.vercel.app/\n`);
});
