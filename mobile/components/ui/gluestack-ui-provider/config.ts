'use client';
import { vars } from 'nativewind';

export const config = {
  light: vars({
    // 🎨 Professional Primary Colors (Modern Indigo - Netflix/Discord Inspired)
    '--color-primary-0': '245 245 255',    // Lightest
    '--color-primary-50': '238 242 255',   // Very light
    '--color-primary-100': '224 231 255',  // Light
    '--color-primary-200': '199 210 254',  // Medium light
    '--color-primary-300': '165 180 252',  // Medium
    '--color-primary-400': '129 140 248',  // Medium dark
    '--color-primary-500': '99 102 241',   // Main primary color 🎯
    '--color-primary-600': '79 70 229',    // Darker
    '--color-primary-700': '67 56 202',    // Very dark
    '--color-primary-800': '55 48 163',    // Almost darkest
    '--color-primary-900': '49 46 129',    // Darkest
    '--color-primary-950': '30 27 75',     // Ultra dark

    /* Secondary - Professional Emerald */
    '--color-secondary-0': '236 253 245',  // Lightest
    '--color-secondary-50': '209 250 229', // Very light
    '--color-secondary-100': '167 243 208', // Light
    '--color-secondary-200': '110 231 183', // Medium light
    '--color-secondary-300': '52 211 153',  // Medium
    '--color-secondary-400': '16 185 129',  // Medium dark
    '--color-secondary-500': '5 150 105',   // Main secondary 🌿
    '--color-secondary-600': '4 120 87',    // Darker
    '--color-secondary-700': '6 95 70',     // Very dark
    '--color-secondary-800': '6 78 59',     // Almost darkest
    '--color-secondary-900': '6 64 50',     // Darkest
    '--color-secondary-950': '2 44 34',     // Ultra dark

    /* Tertiary - Professional Amber */
    '--color-tertiary-0': '255 251 235',   // Lightest
    '--color-tertiary-50': '254 243 199',  // Very light
    '--color-tertiary-100': '253 230 138', // Light
    '--color-tertiary-200': '252 211 77',  // Medium light
    '--color-tertiary-300': '251 191 36',  // Medium
    '--color-tertiary-400': '245 158 11',  // Medium dark
    '--color-tertiary-500': '217 119 6',   // Main tertiary ⚡
    '--color-tertiary-600': '180 83 9',    // Darker
    '--color-tertiary-700': '146 64 14',   // Very dark
    '--color-tertiary-800': '120 53 15',   // Almost darkest
    '--color-tertiary-900': '102 44 15',   // Darkest
    '--color-tertiary-950': '69 26 3',     // Ultra dark

    /* Error - Enhanced Modern Red */
    '--color-error-0': '254 242 242',      // Lightest
    '--color-error-50': '254 226 226',     // Very light
    '--color-error-100': '254 202 202',    // Light
    '--color-error-200': '252 165 165',    // Medium light
    '--color-error-300': '248 113 113',    // Medium
    '--color-error-400': '239 68 68',      // Medium dark
    '--color-error-500': '220 38 38',      // Main error 🔥
    '--color-error-600': '185 28 28',      // Darker
    '--color-error-700': '153 27 27',      // Very dark
    '--color-error-800': '127 29 29',      // Almost darkest
    '--color-error-900': '87 24 24',       // Darkest
    '--color-error-950': '69 10 10',       // Ultra dark

    /* Success - Enhanced Modern Green */
    '--color-success-0': '240 253 244',    // Lightest
    '--color-success-50': '220 252 231',   // Very light
    '--color-success-100': '187 247 208',  // Light
    '--color-success-200': '134 239 172',  // Medium light
    '--color-success-300': '74 222 128',   // Medium
    '--color-success-400': '34 197 94',    // Medium dark
    '--color-success-500': '22 163 74',    // Main success ✅
    '--color-success-600': '21 128 61',    // Darker
    '--color-success-700': '22 101 52',    // Very dark
    '--color-success-800': '22 78 44',     // Almost darkest
    '--color-success-900': '20 83 45',     // Darkest
    '--color-success-950': '5 46 22',      // Ultra dark

    /* Warning - Enhanced Modern Amber */
    '--color-warning-0': '255 251 235',    // Lightest
    '--color-warning-50': '254 243 199',   // Very light
    '--color-warning-100': '253 230 138',  // Light
    '--color-warning-200': '252 211 77',   // Medium light
    '--color-warning-300': '251 191 36',   // Medium
    '--color-warning-400': '245 158 11',   // Medium dark
    '--color-warning-500': '217 119 6',    // Main warning ⚠️
    '--color-warning-600': '180 83 9',     // Darker
    '--color-warning-700': '146 64 14',    // Very dark
    '--color-warning-800': '120 53 15',    // Almost darkest
    '--color-warning-900': '102 44 15',    // Darkest
    '--color-warning-950': '69 26 3',      // Ultra dark

    /* Info - Enhanced Modern Blue */
    '--color-info-0': '240 249 255',       // Lightest
    '--color-info-50': '224 242 254',      // Very light
    '--color-info-100': '186 230 253',     // Light
    '--color-info-200': '125 211 252',     // Medium light
    '--color-info-300': '56 189 248',      // Medium
    '--color-info-400': '14 165 233',      // Medium dark
    '--color-info-500': '2 132 199',       // Main info ℹ️
    '--color-info-600': '3 105 161',       // Darker
    '--color-info-700': '7 89 133',        // Very dark
    '--color-info-800': '12 74 110',       // Almost darkest
    '--color-info-900': '14 63 90',        // Darkest
    '--color-info-950': '12 42 60',        // Ultra dark

    /* Typography */
    '--color-typography-0': '254 254 255',
    '--color-typography-50': '245 245 245',
    '--color-typography-100': '229 229 229',
    '--color-typography-200': '219 219 220',
    '--color-typography-300': '212 212 212',
    '--color-typography-400': '163 163 163',
    '--color-typography-500': '140 140 140',
    '--color-typography-600': '115 115 115',
    '--color-typography-700': '82 82 82',
    '--color-typography-800': '64 64 64',
    '--color-typography-900': '38 38 39',
    '--color-typography-950': '23 23 23',

    /* Outline */
    '--color-outline-0': '253 254 254',
    '--color-outline-50': '243 243 243',
    '--color-outline-100': '230 230 230',
    '--color-outline-200': '221 220 219',
    '--color-outline-300': '211 211 211',
    '--color-outline-400': '165 163 163',
    '--color-outline-500': '140 141 141',
    '--color-outline-600': '115 116 116',
    '--color-outline-700': '83 82 82',
    '--color-outline-800': '65 65 65',
    '--color-outline-900': '39 38 36',
    '--color-outline-950': '26 23 23',

    /* Background */
    '--color-background-0': '255 255 255',
    '--color-background-50': '246 246 246',
    '--color-background-100': '242 241 241',
    '--color-background-200': '220 219 219',
    '--color-background-300': '213 212 212',
    '--color-background-400': '162 163 163',
    '--color-background-500': '142 142 142',
    '--color-background-600': '116 116 116',
    '--color-background-700': '83 82 82',
    '--color-background-800': '65 64 64',
    '--color-background-900': '39 38 37',
    '--color-background-950': '18 18 18',

    /* Background Special */
    '--color-background-error': '254 241 241',
    '--color-background-warning': '255 243 234',
    '--color-background-success': '237 252 242',
    '--color-background-muted': '247 248 247',
    '--color-background-info': '235 248 254',

    /* Focus Ring Indicator  */
    '--color-indicator-primary': '55 55 55',
    '--color-indicator-info': '83 153 236',
    '--color-indicator-error': '185 28 28',
  }),
  dark: vars({
    // 🎨 Professional Primary Colors - Dark Mode (Inverted & Enhanced)
    '--color-primary-0': '30 27 75',       // Ultra dark (was lightest)
    '--color-primary-50': '49 46 129',     // Darkest (was very light)
    '--color-primary-100': '55 48 163',    // Almost darkest (was light)
    '--color-primary-200': '67 56 202',    // Very dark (was medium light)
    '--color-primary-300': '79 70 229',    // Darker (was medium)
    '--color-primary-400': '99 102 241',   // Main primary (brighter for dark mode) 🎯
    '--color-primary-500': '129 140 248',  // Lighter primary (was main)
    '--color-primary-600': '165 180 252',  // Medium (was darker)
    '--color-primary-700': '199 210 254',  // Medium light (was very dark)
    '--color-primary-800': '224 231 255',  // Light (was almost darkest)
    '--color-primary-900': '238 242 255',  // Very light (was darkest)
    '--color-primary-950': '245 245 255',  // Lightest (was ultra dark)

    /* Secondary - Professional Emerald Dark Mode */
    '--color-secondary-0': '2 44 34',      // Ultra dark
    '--color-secondary-50': '6 64 50',     // Darkest
    '--color-secondary-100': '6 78 59',    // Almost darkest
    '--color-secondary-200': '6 95 70',    // Very dark
    '--color-secondary-300': '4 120 87',   // Darker
    '--color-secondary-400': '5 150 105',  // Main secondary (enhanced for dark) 🌿
    '--color-secondary-500': '16 185 129', // Brighter secondary
    '--color-secondary-600': '52 211 153', // Medium
    '--color-secondary-700': '110 231 183', // Medium light
    '--color-secondary-800': '167 243 208', // Light
    '--color-secondary-900': '209 250 229', // Very light
    '--color-secondary-950': '236 253 245', // Lightest

    /* Tertiary - Professional Amber Dark Mode */
    '--color-tertiary-0': '69 26 3',       // Ultra dark
    '--color-tertiary-50': '102 44 15',    // Darkest
    '--color-tertiary-100': '120 53 15',   // Almost darkest
    '--color-tertiary-200': '146 64 14',   // Very dark
    '--color-tertiary-300': '180 83 9',    // Darker
    '--color-tertiary-400': '217 119 6',   // Main tertiary (enhanced for dark) ⚡
    '--color-tertiary-500': '245 158 11',  // Brighter tertiary
    '--color-tertiary-600': '251 191 36',  // Medium
    '--color-tertiary-700': '252 211 77',  // Medium light
    '--color-tertiary-800': '253 230 138', // Light
    '--color-tertiary-900': '254 243 199', // Very light
    '--color-tertiary-950': '255 251 235', // Lightest

    /* Error - Enhanced Modern Red Dark Mode */
    '--color-error-0': '69 10 10',         // Ultra dark
    '--color-error-50': '87 24 24',        // Darkest
    '--color-error-100': '127 29 29',      // Almost darkest
    '--color-error-200': '153 27 27',      // Very dark
    '--color-error-300': '185 28 28',      // Darker
    '--color-error-400': '220 38 38',      // Main error (enhanced for dark) 🔥
    '--color-error-500': '239 68 68',      // Brighter error
    '--color-error-600': '248 113 113',    // Medium
    '--color-error-700': '252 165 165',    // Medium light
    '--color-error-800': '254 202 202',    // Light
    '--color-error-900': '254 226 226',    // Very light
    '--color-error-950': '254 242 242',    // Lightest

    /* Success - Enhanced Modern Green Dark Mode */
    '--color-success-0': '5 46 22',        // Ultra dark
    '--color-success-50': '20 83 45',      // Darkest
    '--color-success-100': '22 78 44',     // Almost darkest
    '--color-success-200': '22 101 52',    // Very dark
    '--color-success-300': '21 128 61',    // Darker
    '--color-success-400': '22 163 74',    // Main success (enhanced for dark) ✅
    '--color-success-500': '34 197 94',    // Brighter success
    '--color-success-600': '74 222 128',   // Medium
    '--color-success-700': '134 239 172',  // Medium light
    '--color-success-800': '187 247 208',  // Light
    '--color-success-900': '220 252 231',  // Very light
    '--color-success-950': '240 253 244',  // Lightest

    /* Warning - Enhanced Modern Amber Dark Mode */
    '--color-warning-0': '69 26 3',        // Ultra dark
    '--color-warning-50': '102 44 15',     // Darkest
    '--color-warning-100': '120 53 15',    // Almost darkest
    '--color-warning-200': '146 64 14',    // Very dark
    '--color-warning-300': '180 83 9',     // Darker
    '--color-warning-400': '217 119 6',    // Main warning (enhanced for dark) ⚠️
    '--color-warning-500': '245 158 11',   // Brighter warning
    '--color-warning-600': '251 191 36',   // Medium
    '--color-warning-700': '252 211 77',   // Medium light
    '--color-warning-800': '253 230 138',  // Light
    '--color-warning-900': '254 243 199',  // Very light
    '--color-warning-950': '255 251 235',  // Lightest

    /* Info - Enhanced Modern Blue Dark Mode */
    '--color-info-0': '12 42 60',          // Ultra dark
    '--color-info-50': '14 63 90',         // Darkest
    '--color-info-100': '12 74 110',       // Almost darkest
    '--color-info-200': '7 89 133',        // Very dark
    '--color-info-300': '3 105 161',       // Darker
    '--color-info-400': '2 132 199',       // Main info (enhanced for dark) ℹ️
    '--color-info-500': '14 165 233',      // Brighter info
    '--color-info-600': '56 189 248',      // Medium
    '--color-info-700': '125 211 252',     // Medium light
    '--color-info-800': '186 230 253',     // Light
    '--color-info-900': '224 242 254',     // Very light
    '--color-info-950': '240 249 255',     // Lightest

    /* Typography */
    '--color-typography-0': '23 23 23',
    '--color-typography-50': '38 38 39',
    '--color-typography-100': '64 64 64',
    '--color-typography-200': '82 82 82',
    '--color-typography-300': '115 115 115',
    '--color-typography-400': '140 140 140',
    '--color-typography-500': '163 163 163',
    '--color-typography-600': '212 212 212',
    '--color-typography-700': '219 219 220',
    '--color-typography-800': '229 229 229',
    '--color-typography-900': '245 245 245',
    '--color-typography-950': '254 254 255',

    /* Outline */
    '--color-outline-0': '26 23 23',
    '--color-outline-50': '39 38 36',
    '--color-outline-100': '65 65 65',
    '--color-outline-200': '83 82 82',
    '--color-outline-300': '115 116 116',
    '--color-outline-400': '140 141 141',
    '--color-outline-500': '165 163 163',
    '--color-outline-600': '211 211 211',
    '--color-outline-700': '221 220 219',
    '--color-outline-800': '230 230 230',
    '--color-outline-900': '243 243 243',
    '--color-outline-950': '253 254 254',

    /* Background - Professional Dark Mode */
    '--color-background-0': '15 15 35',    // Deep blue-black (main dark background)
    '--color-background-50': '17 24 39',   // Very dark surface
    '--color-background-100': '31 41 55',  // Dark surface
    '--color-background-200': '55 65 81',  // Medium dark surface
    '--color-background-300': '75 85 99',  // Medium surface
    '--color-background-400': '107 114 128', // Neutral surface
    '--color-background-500': '156 163 175', // Light surface
    '--color-background-600': '209 213 219', // Very light surface
    '--color-background-700': '229 231 235', // Almost white surface
    '--color-background-800': '243 244 246', // Nearly white surface
    '--color-background-900': '249 250 251', // Off white surface
    '--color-background-950': '255 255 255', // Pure white surface

    /* Background Special - Enhanced Dark Mode */
    '--color-background-error': '87 24 24',    // Dark red background
    '--color-background-warning': '102 44 15', // Dark amber background
    '--color-background-success': '20 83 45',  // Dark green background
    '--color-background-muted': '31 41 55',    // Muted dark background
    '--color-background-info': '14 63 90',     // Dark blue background

    /* Focus Ring Indicator - Enhanced Dark Mode */
    '--color-indicator-primary': '129 140 248',  // Bright primary for focus
    '--color-indicator-info': '56 189 248',      // Bright blue for info focus
    '--color-indicator-error': '248 113 113',    // Bright red for error focus
  }),
};
