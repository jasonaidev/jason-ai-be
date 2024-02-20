const { condenseChatEngine } = require("../../../../utils/chatResponse.js");

module.exports = {

  async chatbotResponse(ctx) {

    try {
      const { chatId } = ctx.request.body;

      const process = await condenseChatEngine(ctx.request.body);

      const newMessage = await strapi.db.query('api::message.message').create({
        data: {
          where: { chat: chatId },
          ...process,
        },
      });

      // Publish the newly created message
      await strapi.db.query('api::message.message').update({
        where: { id: newMessage.id },
        data: { publishedAt: new Date() },
      });

      ctx.send({ ...newMessage });

    } catch (err) {
      ctx.body = err;
    }

  }

};
