import { ColorSwatch } from './sculpture';

export const SCULPTURE_IMAGE_PATH = '/assets/ecos-de-luz.jpg';

// As luzes do hero alternam entre a cor terciária do site (lima) e o roxo, a cada clique
export const LUMINOUS_PALETTE: ColorSwatch[] = [
  {
    id: 'tertiary',
    name: 'Lima',
    hex: '#C6F432',
    rgb: [198, 244, 50],
    glowHex: 'rgba(198, 244, 50, 0.38)',
  },
  {
    id: 'purple',
    name: 'Roxo',
    hex: '#1B004B',
    rgb: [27, 0, 75],
    glowHex: 'rgba(27, 0, 75, 0.38)',
  },
];
