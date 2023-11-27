// In api/forgot-password/services/forgot-password.js

module.exports = {
    async create({ user, code }) {
      return strapi.query('forgot-password').create({
        user,
        code,
      });
    },
  
    async findOneByCode(code) {
      return strapi.query('forgot-password').findOne({
        code,
      });
    },
  
    async deleteById(id) {
      return strapi.query('forgot-password').delete({
        id,
      });
    },
  };
  