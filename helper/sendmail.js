const nodemailer = require("nodemailer");

module.exports.sendMail = async (email, subject, html) => {
  try {
    console.log("Sending email...", email);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "s3cr3tdota2@gmail.com",
        pass: "xfic hihr ouaq kgzc",
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
