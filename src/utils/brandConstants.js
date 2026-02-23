export const COLORS = {
  magenta: '#981D97',           // Primary accent, insurer data
  grey: '#54585A',              // Market benchmark
  green: '#48A23F',             // Positive indicator
  red: '#F4364C',               // Negative indicator
  blue: '#5BC2E7',              // Neutral accent
  confidenceFill: 'rgba(224, 224, 224, 0.3)', // Confidence band
  white: '#FFFFFF',
  lightGrey: '#F5F5F5',         // Background
};

export const FONT = {
  family: 'Verdana, Geneva, sans-serif',
  cardValue: '28px',
  cardLabel: '10px',
  body: '14px',
  heading: '18px',
};

export const THRESHOLDS = {
  publishable: 50,      // n >= 50: show value
  indicative: 30,       // n >= 30: show with "indicative" label
  minimum: 30,          // n < 30: suppress entirely
  // TODO: REMOVE BEFORE DELIVERY — dev override for testing with demo data
  devOverride: 5,       // FOR DEVELOPMENT ONLY. Reset to 50 before delivery.
};
