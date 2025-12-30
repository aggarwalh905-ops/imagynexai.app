// tailwind.config.js
theme: {
  extend: {
    keyframes: {
      shimmer: {
        '0%': { backgroundPosition: '-200% -200%' },
        '100%': { backgroundPosition: '200% 200%' },
      },
    },
  },
},