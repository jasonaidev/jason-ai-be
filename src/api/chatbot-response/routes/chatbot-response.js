module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/chatbot-response',
     handler: 'chatbot-response.chatbotResponse',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
