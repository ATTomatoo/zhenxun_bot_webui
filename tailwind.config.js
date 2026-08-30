module.exports = {
  purge: {
    content: ["./public/index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
    options: {
      safelist: ["ring-2", "ring-purple-200"],
    },
  },
  theme: {
    extend: {
      colors: {
        "anime-pink": "#ff9ff3",
        "anime-purple": "#f368e0",
        "anime-blue": "#48dbfb",
        "anime-text": "#5f27cd",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
