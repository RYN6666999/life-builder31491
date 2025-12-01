const path = require("path");

module.exports = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: { config: path.resolve(__dirname, "tailwind.config.ts") },
    autoprefixer: {},
  },
};
