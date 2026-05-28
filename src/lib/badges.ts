export interface Badge {
  id: string
  name: string
  nameMs: string
  description: string
  emoji: string
  color: string
  requirement: string
}

export const BADGES: Badge[] = [
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    nameMs: 'Pejuang Eko',
    description: 'Telah menjual 50+ item terpakai',
    emoji: '🌿',
    color: 'var(--green)',
    requirement: '50+ transactions as seller',
  },
  {
    id: 'circular_champion',
    name: 'Circular Champion',
    nameMs: 'Juara Pekeliling',
    description: 'Aktif dalam ekonomi pekeliling — jual dan beli',
    emoji: '♻️',
    color: 'var(--teal)',
    requirement: '10+ sells + 10+ buys',
  },
  {
    id: 'trusted_seller',
    name: 'Trusted Seller',
    nameMs: 'Penjual Dipercayai',
    description: 'Rehome Score ≥ 80 dengan IC disahkan',
    emoji: '🛡️',
    color: 'var(--blue)',
    requirement: 'rehomeScore >= 80 AND icVerified',
  },
  {
    id: 'corporate_green',
    name: 'Corporate Green',
    nameMs: 'Hijau Korporat',
    description: 'Telah menyumbang ESG dengan 100+ transaksi',
    emoji: '🏢',
    color: 'var(--purple)',
    requirement: '100+ total transactions',
  },
  {
    id: 'carbon_saver',
    name: 'Carbon Saver',
    nameMs: 'Penjimat Karbon',
    description: 'Menyelamatkan lebih 500kg CO₂',
    emoji: '🌍',
    color: 'var(--orange)',
    requirement: '500kg+ CO2 saved',
  },
]

export function getUserBadges(stats: {
  soldCount: number
  boughtCount: number
  rehomeScore: number
  icVerified: boolean
  totalCO2: number
}): Badge[] {
  return BADGES.filter(badge => {
    switch (badge.id) {
      case 'eco_warrior':
        return stats.soldCount >= 50
      case 'circular_champion':
        return stats.soldCount >= 10 && stats.boughtCount >= 10
      case 'trusted_seller':
        return stats.rehomeScore >= 80 && stats.icVerified
      case 'corporate_green':
        return (stats.soldCount + stats.boughtCount) >= 100
      case 'carbon_saver':
        return stats.totalCO2 >= 500
      default:
        return false
    }
  })
}
