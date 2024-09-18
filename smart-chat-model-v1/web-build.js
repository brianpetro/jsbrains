const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['smart-chat-model/smart_chat_model.js'],
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  outfile: 'dist/smart_chat_model_web.js',
  define: {
    'process.env.NODE_ENV': '"production"',
    global: 'window'
  },
  // Expose SmartChatModel globally
  globalName: 'smart_chat_model',
  format: 'iife', // Wrap in an immediately-invoked function expression
}).catch(() => process.exit(1));

