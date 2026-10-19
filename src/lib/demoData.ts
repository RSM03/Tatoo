// Estudios y tatuadores de ejemplo para el modo demo del panel (entrar sin sesión), SOLO en desarrollo.
// Permiten recorrer la reserva sin tener datos en la base de datos.
// En la web publicada nunca se usan.

export const DEMO_USER_ID = 'mock-user-id';

export function isDemoMode(userId: string | undefined): boolean {
  return process.env.NODE_ENV !== 'production' && userId === DEMO_USER_ID;
}

export const DEMO_STUDIOS = [
  {
    id: 'demo-studio-1',
    name: 'Aguja Negra',
    address: 'Calle del Pez 12',
    city: 'Madrid',
    phone: '+34 910 000 001',
    bio: 'Estudio de fine line, blackwork y japonés en pleno Malasaña.',
    logo_url: null,
    opening_hours: null,
    latitude: 40.4237,
    longitude: -3.7062,
  },
  {
    id: 'demo-studio-2',
    name: 'Tinta Sur',
    address: 'Calle Feria 3',
    city: 'Sevilla',
    phone: '+34 954 000 002',
    bio: 'Tradicional y realismo en la Alameda.',
    logo_url: null,
    opening_hours: null,
    latitude: 37.3982,
    longitude: -5.9935,
  },
];

export const DEMO_ARTISTS = [
  { id: 'demo-artist-1', studio_id: 'demo-studio-1', display_name: 'Lucía Ortega', specialties: ['Fine line', 'Botánico'], hourly_rate: 80, minimum_fee: 60, bio: 'Líneas finas y flores delicadas.' },
  { id: 'demo-artist-2', studio_id: 'demo-studio-1', display_name: 'Dani Vera', specialties: ['Blackwork', 'Geométrico'], hourly_rate: 90, minimum_fee: 70, bio: 'Piezas grandes en negro sólido.' },
  { id: 'demo-artist-3', studio_id: 'demo-studio-1', display_name: 'Sara Kim', specialties: ['Japonés', 'Color'], hourly_rate: 100, minimum_fee: 80, bio: 'Japonés tradicional y color.' },
  { id: 'demo-artist-4', studio_id: 'demo-studio-2', display_name: 'Marco Ruiz', specialties: ['Tradicional', 'Old school'], hourly_rate: 75, minimum_fee: 50, bio: 'Tradicional americano.' },
  { id: 'demo-artist-5', studio_id: 'demo-studio-2', display_name: 'Elena Paz', specialties: ['Realismo', 'Retrato'], hourly_rate: 110, minimum_fee: 90, bio: 'Realismo en negro y gris.' },
];
