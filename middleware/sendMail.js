const nodemailer = require('nodemailer');
const catchAsyncErrors = require("../exception/catchAsyncError");
const dotenv = require("dotenv");

dotenv.config();

const sendMail = catchAsyncErrors(async (email, mailSubject, content) => {
  try {
    const transport = nodemailer.createTransport({
      service:'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      logger:true,
      debug: true,
      secure: true, // Use SSL/TLS
      secureConnection: false,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD
      },
      tls:{
        user:{
          rejectUnAuthorized: true
        }
      }
    });

    const mailOptions = {
      from: 'aimanramzan205@gmail.com', 
      to: email, 
      subject: mailSubject,
      html: content
    };

    // Send the email with error handling and logging
    const info = await transport.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response); 

  } catch (error) {
    console.error("Error sending email:", error.message); 
  }
});

module.exports = sendMail;
