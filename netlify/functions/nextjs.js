// Use CommonJS syntax for Netlify functions
const { createNextHandler } = require('@netlify/next');

// Export handler function
exports.handler = createNextHandler();
