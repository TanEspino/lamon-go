/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: '#E11D48', // Professional Red (Rose-600)
                turquoise: '#40E0D0', // New Brand Color
                secondary: '#BE123C', // Darker Red (Rose-700)
                background: '#F9FAFB', // Gray-50
                card: '#FFFFFF',
                text: '#1F2937', // Gray-800
                'text-secondary': '#6B7280', // Gray-500
            }
        },
    },
    plugins: [],
}
