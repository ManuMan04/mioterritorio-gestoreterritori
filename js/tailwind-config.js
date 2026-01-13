tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                jw: {
                    50: '#f4f6fa',
                    100: '#eef1f6',
                    200: '#dce2ed',
                    300: '#bfcbe0',
                    400: '#9eadce',
                    500: '#7d93bd',
                    600: '#526ca2', // Base Color
                    700: '#435885',
                    800: '#39496d',
                    900: '#313e59',
                    950: '#1d2333',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        }
    }
}
