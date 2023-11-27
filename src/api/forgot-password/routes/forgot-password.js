module.exports = {
    routes: [
      {
        method: "POST",
        path: "/send-code",
        handler: "forgot-password.sendCode",
        config: {
            policies: [],
            middlewares: [],
          },
      },
      {
        method: 'POST',
        path: '/reset-password',
        handler: 'forgot-password.resetPassword',
      },
    ]
  }
