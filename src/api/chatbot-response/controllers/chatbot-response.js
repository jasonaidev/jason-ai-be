const { condenseChatEngine } = require("../../../../utils/chatResponse.js");

module.exports = {

  async chatbotResponse(ctx) {

    try {
      const { chatId } = ctx.request.body;

      const process = await condenseChatEngine(ctx.request.body);

      const newMessage = await strapi.db.query('api::message.message').create({
        data: {
          chat: chatId,
          publishedAt: new Date(),
          ...process,
        },
      });


      ctx.send({ ...newMessage });

    } catch (err) {
      ctx.body = err;
    }

  }

};
