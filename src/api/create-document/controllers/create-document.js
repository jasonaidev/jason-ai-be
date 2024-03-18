'use strict';

const { createDocument } = require("../../../../utils/document/createDocument");

module.exports = {

  async createDocumentController(ctx) {

    try {

      const process = await createDocument(ctx.request.body);

      // ctx.send({ ...newDocument });
      ctx.send({...process})

    } catch (err) {
      ctx.body = err;
    }

  }

};
