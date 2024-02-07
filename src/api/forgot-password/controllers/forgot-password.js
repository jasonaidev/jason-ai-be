// api/verification-code/controllers/VerificationCode.js
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  async sendCode(ctx) {
    const { email } = ctx.request.body;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: email } });

    if (!user) {
      return ctx.throw(400, 'User not found');
    }

    const resetCode = uuidv4();


    // If a code is provided in the request, mark that code as used
    const verificationCodes = await strapi.query('api::forgot-password.forgot-password').findMany({
      user: { email },
      status: false,
    });

    for (const codeEntry of verificationCodes) {
      await strapi.query('api::forgot-password.forgot-password').update({
        where: {
          id: codeEntry.id
        },
        data: {
          status: true
        }
      })
    }

    const verificationCode = await strapi.db.query('api::forgot-password.forgot-password').create({
      data: {
        code: resetCode,
        user: user.id,
      },
    });

    // Set the entry as published
    const publishedVerificationCode = await strapi.query('api::forgot-password.forgot-password').update({
      where: { id: verificationCode.id },
      data: {
        publishedAt: new Date(),
      },
    });

    const sender_link = `${process.env.WEBSITE_URL}/auth/reset-password/?token=${resetCode}`

    // Implement your email sending logic here to send the reset code
    // Example: await sendResetCodeEmail(user.email, resetCode);

    const isEmailSend = await strapi.plugin('email').service('email').send({
      to: email, // Replace with the user's email
      from: process.env.SMTP_USERNAME,
      subject: 'Password Reset for Jason',
      text: `Hello,
      
      You have requested to reset your password for your JASON account.
      
      Please use the following link to proceed with the password reset:
       ${sender_link}
      
      If you did not initiate this request, you can safely ignore this email.
      
      Best regards,
      The Jason Team`,
      html: `
          <h4>Password Reset for Jason</h4>
          <p>You have requested to reset your password for your Jason account.</p>
          <p>Please use the following link to proceed with the password reset:</p>
          <p><strong>${sender_link}</strong></p>
          <p>If you did not initiate this request, you can safely ignore this email.</p>
          <p>Best regards,<br />The Jason Team</p>
        `,
    });

    ctx.send({ status: true, message: 'Reset code sent successfully' });
  },


  async resetPassword(ctx) {
    const { token, newPassword } = ctx.request.body;

    const verificationCode = await strapi.query('api::forgot-password.forgot-password').findOne({
      where: {
        code: token,
        status: false
      },
      populate: true,
    });


    if (!verificationCode) {
      return ctx.throw(400, 'Invalid verification code');
    }


    const user = verificationCode?.user

    if (!user) {
      return ctx.throw(400, 'User not found');
    }

    
    if (!user.password) {
      return ctx.throw(400, 'Password does not found');
    }



    // Check if the new password matches the user's current password
    const isCurrentPassword = await strapi.admin.services.auth.validatePassword(newPassword, user.password);

    if (isCurrentPassword) {
      return ctx.throw(400, 'New password matches the current password');
    }

    // Update the user's password
    // const hashedPassword = await strapi.admin.services.auth.hashPassword(newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, 10); // Use the desired number of salt rounds, e.g., 10


    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark the verification code as used (optional)
    await strapi.query('api::forgot-password.forgot-password').update({
      where: { id: verificationCode.id },
      data: { status: true },
    });

    ctx.send({ status: true, message: 'Password reset successfully' });
  }

};
