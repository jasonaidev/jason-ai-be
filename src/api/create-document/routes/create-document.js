module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/create-document',
     handler: 'create-document.createDocumentController',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
