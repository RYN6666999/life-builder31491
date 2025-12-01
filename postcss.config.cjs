const path = require("path");

module.exports = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: { config: path.join(__dirname, "client", "tailwind.config.cjs") },
    autoprefixer: {},
  },
};
