const { condenseChatEngine } = require("../../../../utils/chatResponse/chatResponse");

module.exports = {

  async chatbotResponse(ctx) {

    try {
      const { chat } = ctx.request.body;

      const process = await condenseChatEngine(ctx.request.body);

      const newMessage = await strapi.db.query('api::message.message').create({
        data: {
          chat: chat,
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
