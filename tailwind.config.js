/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1e40af",
                accent: "#3b82f6",
                neon: "#00f5ff",
                pitch: "#064e3b",
                surface: "#1a1d23",
                "surface-light": "#252932",
                background: "#0f1115",
            },
            fontFamily: {
                outfit: ['Outfit', 'sans-serif'],
            },
            backgroundImage: {
                'pitch-gradient': "radial-gradient(circle at center, #065f46 0%, #064e3b 100%)",
            },
            animation: {
                'fade': 'fadeOut 0.5s ease-in-out',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeOut: {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            }
        },
    },
    plugins: [],
}
