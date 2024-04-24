'use strict';

const { createDocument } = require("../../../../utils/document/createDocument");
const { updateDocument } = require("../../../../utils/document/updateDocument");

/**
 * Controller to manage document creation or updating.
 * It handles incoming requests to either create a new document or update an existing one
 * based on the 'action' parameter in the request body.
 *
 * @param {object} ctx - The context object which includes request and response fields
 * provided by the Koa framework.
 */
module.exports = {

  /**
   * @param {{ request: { body: { data: any; }; }; send: (arg0: { id: import("@strapi/types/dist/types/core/entity").ID; content?: string; type?: string; user?: import("@strapi/types/dist/types/core/attributes").GetValues<"plugin::users-permissions.user", import("@strapi/types/dist/types/core/attributes").GetKeys<"plugin::users-permissions.user">>; file?: any; email?: string; title?: string; description?: string; companyName?: string; createdAt?: import("@strapi/types/dist/types/core/attributes").DateTimeValue; updatedAt?: import("@strapi/types/dist/types/core/attributes").DateTimeValue; publishedAt?: import("@strapi/types/dist/types/core/attributes").DateTimeValue; createdBy?: import("@strapi/types/dist/types/core/attributes").GetValues<"admin::user", import("@strapi/types/dist/types/core/attributes").GetKeys<"admin::user">>; updatedBy?: import("@strapi/types/dist/types/core/attributes").GetValues<"admin::user", import("@strapi/types/dist/types/core/attributes").GetKeys<"admin::user">>; template?: import("@strapi/types/dist/types/core/attributes").GetValues<"api::policy-template.policy-template", import("@strapi/types/dist/types/core/attributes").GetKeys<"api::policy-template.policy-template">>; conversation?: object; }) => void; throw: (arg0: number, arg1: string) => void; }} ctx
   */
  async createDocumentController(ctx) {
    try {
      const { data } = ctx.request.body;

      let process;

      if (data?.action === 'update') {
        console.log("Updating document...");
        process = await updateDocument(ctx.request.body);
      } else if (data?.action === 'create') {
        console.log("Creating new document...");
        process = await createDocument(ctx.request.body);
      }

      ctx.send({ ...process });

    } catch (err) {
      console.error("Error in document processing:", err);
      // Contextual and secure error handling
      ctx.throw(400, `Failed to process the document due to an error: ${err.message}`);
    }
  }

};
