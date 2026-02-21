export const GENRES = [
    { id: 'cafe',    label: 'カフェ' },
    { id: 'sweets',  label: 'スイーツ' },
    { id: 'gohan',   label: 'ランチ' },
    { id: 'ramen',   label: 'ラーメン・中華' },
    { id: 'italian', label: 'イタリアン' },
] as const

export type GenreId = typeof GENRES[number]['id']

const CATEGORY_MAP: Record<string, GenreId> = {
    // カフェ系
    'Cafe': 'cafe',
    'Coffee Shop': 'cafe',
    'Coffee Roastery': 'cafe',
    'Tea House': 'cafe',
    'Cafeteria': 'cafe',
    'Serves Coffee': 'cafe',
    'カフェ': 'cafe',
    'コーヒー': 'cafe',
    'コーヒーショップ': 'cafe',
    'ボードゲームカフェ': 'cafe',

    // スイーツ・パン系
    'Bakery': 'sweets',
    'Dessert Restaurant': 'sweets',
    'Dessert Shop': 'sweets',
    'Ice Cream Shop': 'sweets',
    'Chocolate Shop': 'sweets',
    'Confectionery store': 'sweets',
    'Donut Shop': 'sweets',
    'Serves Dessert': 'sweets',
    'スイーツショップ': 'sweets',
    'デザート': 'sweets',
    'デザートレストラン': 'sweets',
    'デザート店': 'sweets',
    '菓子店': 'sweets',
    'かき氷店': 'sweets',

    // ごはん系
    'Restaurant': 'gohan',
    'Japanese Restaurant': 'gohan',
    'Breakfast Restaurant': 'gohan',
    'Lunch Restaurant': 'gohan',
    'Organic Kitchen': 'gohan',
    'Seafood Restaurant': 'gohan',
    'Vegetarian Restaurant': 'gohan',
    'Takeout Restaurant': 'gohan',
    'Hamburger Restaurant': 'gohan',
    'Indian Restaurant': 'gohan',
    'Korean Restaurant': 'gohan',
    'Serves Brunch': 'gohan',
    'Serves Lunch': 'gohan',
    'Serves Dinner': 'gohan',
    'Food': 'gohan',
    'レストラン': 'gohan',
    '定食屋': 'gohan',
    'ランチ': 'gohan',
    'ディナー': 'gohan',
    'ブランチ': 'gohan',

    // イタリアン系
    'Italian Restaurant': 'italian',
    'Pizza Restaurant': 'italian',
    'イタリアンレストラン': 'italian',
    'イタリア料理': 'italian',
    'イタリア料理店': 'italian',
    'ピザレストラン': 'italian',

    // ラーメン・中華系
    'Ramen Restaurant': 'ramen',
    'Chinese Restaurant': 'ramen',
    'ラーメン店': 'ramen',
    '中華料理店': 'ramen',

}

export function matchesGenre(categories: string[] | null | undefined, genreId: GenreId): boolean {
    if (!categories || categories.length === 0) return false
    return categories.some(c => CATEGORY_MAP[c] === genreId)
}
