const fs   = require('fs');
const path = require('path');

const BOOKINGS_FILE = path.join('/tmp', 'bookings.json');

function readBookings() {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); }
  catch { return []; }
}

function saveBooking(booking) {
  const bookings = readBookings();
  bookings.push(booking);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstName, lastName, email, service, message } = req.body || {};

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
    console.log(`[${booking.createdAt}] New booking: ${booking.firstName} ${booking.lastName} — ${booking.service}`);
    return res.status(200).json({ success: true, message: 'Enquiry received. Our team will be in touch within 2 hours.' });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
};
