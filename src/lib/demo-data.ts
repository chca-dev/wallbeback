export type AvatarTone = 'blue' | 'pink' | 'cyan' | 'lavender'

export type FamilyMember = {
  id: string
  name: string
  shortName: string
  role: string
  tone: AvatarTone
  photoCount: number
}

export type DemoEvent = {
  id: string
  date: string
  title: string
  type: 'birthday' | 'event'
  tone: AvatarTone
  person?: string
  time?: string
  location?: string
}

export const familyMembers: FamilyMember[] = [
  { id: 'lea', name: 'Léa Martin', shortName: 'Léa', role: 'Petite sœur', tone: 'cyan', photoCount: 12 },
  { id: 'thomas', name: 'Thomas Martin', shortName: 'Thomas', role: 'Grand frère', tone: 'blue', photoCount: 8 },
  { id: 'mamie', name: 'Mamie Jeanne', shortName: 'Mamie', role: 'Mamie', tone: 'pink', photoCount: 15 },
  { id: 'gilou', name: 'Papi Gilou', shortName: 'Gilou', role: 'Papi', tone: 'lavender', photoCount: 9 },
  { id: 'emma', name: 'Emma Martin', shortName: 'Emma', role: 'Cousine', tone: 'pink', photoCount: 6 },
  { id: 'clara', name: 'Clara Martin', shortName: 'Clara', role: 'Maman', tone: 'pink', photoCount: 11 },
]

export const demoPhotos = [
  { id: 'g1', url: 'https://images.pexels.com/photos/7854119/pexels-photo-7854119.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Famille dans un parc', caption: 'La bande au complet · Parc de la Tête d’Or', month: 'Juin 2025', people: ['lea', 'gilou'], tall: false },
  { id: 'g2', url: 'https://images.pexels.com/photos/5791663/pexels-photo-5791663.jpeg?auto=compress&cs=tinysrgb&w=900', alt: 'Repas de famille', caption: 'Tablée improvisée du jeudi', month: 'Juin 2025', people: ['thomas', 'clara'], tall: false },
  { id: 'g3', url: 'https://images.pexels.com/photos/8307792/pexels-photo-8307792.jpeg?auto=compress&cs=tinysrgb&w=900', alt: 'Atelier pâtisserie en famille', caption: 'Atelier gâteaux de Mamie', month: 'Mai 2025', people: ['mamie', 'lea', 'emma'], tall: true },
  { id: 'g4', url: 'https://images.pexels.com/photos/8623946/pexels-photo-8623946.jpeg?auto=compress&cs=tinysrgb&w=900', alt: 'Famille courant sur la plage', caption: 'Premier bain de l’année · Piriac', month: 'Avril 2025', people: ['lea', 'thomas'], tall: false },
  { id: 'g5', url: 'https://images.pexels.com/photos/19073533/pexels-photo-19073533.jpeg?auto=compress&cs=tinysrgb&w=900', alt: 'Papi et enfant en promenade', caption: 'La grande balade avec Papi', month: 'Avril 2025', people: ['gilou', 'emma'], tall: true },
  { id: 'g6', url: 'https://images.pexels.com/photos/590472/pexels-photo-590472.jpeg?auto=compress&cs=tinysrgb&w=900', alt: 'Frère et sœur dans un jardin', caption: 'Léa et Thomas au jardin', month: 'Mars 2025', people: ['lea', 'thomas'], tall: false },
]

export const demoEvents: DemoEvent[] = [
  { id: 'e1', date: '2026-08-03', title: 'Anniversaire de Léa', type: 'birthday', person: 'Léa', tone: 'cyan' as AvatarTone },
  { id: 'e2', date: '2026-08-07', title: 'Déjeuner chez Mamie', type: 'event', time: '12:30', location: 'Villeurbanne', tone: 'pink' as AvatarTone },
  { id: 'e3', date: '2026-08-15', title: 'Pique-nique au parc', type: 'event', time: '14:00', location: 'Parc de la Tête d’Or', tone: 'blue' as AvatarTone },
  { id: 'e4', date: '2026-08-20', title: 'Anniversaire d’Emma', type: 'birthday', person: 'Emma', tone: 'pink' as AvatarTone },
  { id: 'e5', date: '2026-08-28', title: 'Soirée jeux de société', type: 'event', time: '19:00', location: 'Chez Thomas', tone: 'lavender' as AvatarTone },
]
