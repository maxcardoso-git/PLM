/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stage classification colors
        stage: {
          'not-started': '#6B7280',
          'on-going': '#3B82F6',
          'waiting': '#F59E0B',
          'finished': '#10B981',
          'canceled': '#EF4444',
        },
        // Priority colors
        priority: {
          low: '#9CA3AF',
          medium: '#3B82F6',
          high: '#F59E0B',
          urgent: '#EF4444',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
