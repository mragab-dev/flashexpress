// server.js - Your new backend file

// 1. Import necessary libraries
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors'); // To allow requests from your frontend

// 2. Initialize Express app
const app = express();
app.use(cors()); // Use CORS middleware
app.use(express.json()); // To parse JSON request bodies

// 3. Create a Nodemailer "transporter" with your GoDaddy credentials
// IMPORTANT: Store these in environment variables, NOT in the code!
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your GoDaddy email: you@yourdomain.com
    pass: process.env.EMAIL_PASS, // Your GoDaddy email password
  },
});
//set EMAIL_USER=you@yourdomain.com
//set EMAIL_PASS=your_password
//node server.js
// 4. Create an API endpoint to receive requests and send email
app.post('/api/send-email', async (req, res) => {
  const { recipient, subject, message } = req.body;

  if (!recipient || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields: recipient, subject, message' });
  }

  const mailOptions = {
    from: `"Flash Express" <${process.env.EMAIL_USER}>`, // Sender address
    to: recipient, // List of receivers
    subject: subject, // Subject line
    text: message, // Plain text body
    html: `<p>${message.replace(/\n/g, '<br>')}</p>`, // HTML body
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', recipient);
    res.status(200).json({ success: 'Email sent successfully!' });
  } catch (error) {
    console.error('Failed to send email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// 5. Start the server
const PORT = process.env.PORT || 3001; // Use a port like 3001
app.listen(PORT, () => {
  console.log(`Email server listening on port ${PORT}`);
});