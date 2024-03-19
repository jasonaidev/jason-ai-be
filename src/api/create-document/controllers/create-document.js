'use strict';

const { createDocument } = require("../../../../utils/document/createDocument");

module.exports = {

  async createDocumentController(ctx) {

    try {

      const process = await createDocument(ctx.request.body);

      // ctx.send({ ...newDocument });
      ctx.send({...process})

    } catch (err) {
      ctx.throw(400, `Document creation failed: ${err.message}`); // Handle errors with specific messages
    }

  }

};
