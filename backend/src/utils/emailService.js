const sendEmail = async ({ to, subject, text, html }) => {
  console.log('Email placeholder:', { to, subject, text, html });
};

module.exports = {
  sendEmail,
};
