import { toTheme } from '@theme-ui/typography';
import { merge } from 'theme-ui';

import prismTheme from '@theme-ui/prism/presets/night-owl.json';

const theme = {
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  colors: {
    text: '#000',
    background: '#fff',
    primary: '#33e',
    secondary: '#119',
    accent: '#639',
    gray: '#666',
  },
  fonts: {
    heading: "'Overpass'",
    body: "'Asap'",
    monospace: "'Overpass Mono'",
  },
  styles: {
    code: { fontFamily: 'monospace' },
    pre: {
      fontFamily: 'monospace',
      ...prismTheme,
    },
  },
};

const typography = toTheme({
  // baseFontSize: '16px',
  scaleRatio: 2,

  // blockMarginBottom: 2.8,
});

export default merge(typography, theme);
