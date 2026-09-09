/** Explicit parent → children relationships. Parents and children are matched against novel genres case-/format-insensitively via normalizeGenre in utils.tsx. */
export interface TaxonomyNode {
 parent: string;
 children: string[];
}

export const GENRE_TAXONOMY: TaxonomyNode[] = [
  {
    parent: 'Cultivation & Martial Arts',
    children: [
      'Xianxia',
      'Wuxia',
      'Xuanhuan',
      'Cultivation',
      'Martial Arts',
      'Dao',
      'Alchemy',
      'Sect Building',
      'Immortality',
      'Historical',
    ],
  },
  {
    parent: 'Fantasy & Supernatural',
    children: [
      'Fantasy',
      'High Fantasy',
      'Dark Fantasy',
      'Supernatural',
      'Magic',
      'Academy',
      'Lovecraftian',
      'Steampunk',
      'Dungeon',
      'Demons',
      'Gods',
    ],
  },
  {
    parent: 'Progression & Mechanics',
    children: [
      'System',
      'LitRPG',
      'Transmigration',
      'Isekai',
      'Reincarnation',
      'Time Loop',
      'Kingdom Building',
      'Regression',
      'Evolution',
    ],
  },
  {
    parent: 'Sci-Fi & Urban',
    children: [
      'Sci-Fi',
      'Cyberpunk',
      'Post-Apocalyptic',
      'Urban Fantasy',
      'Modern',
      'Futuristic',
      'Virtual Reality',
      'Mecha',
      'Space',
    ],
  },
  {
    parent: 'Plot & Tone',
    children: [
      'Mystery',
      'Horror',
      'Comedy',
      'Dark Comedy',
      'Psychological',
      'Tragedy',
      'Slice of Life',
      'Philosophical',
      'Misunderstandings',
      'Action',
      'Adventure',
      'Drama',
      'Romance',
    ],
  },
  {
    parent: 'Protagonist Archetypes',
    children: [
      'Anti-Hero MC',
      'Monster MC',
      'Villain MC',
      'Low Profile MC',
      'Calm MC',
      'Invincible MC',
      'Overpowered MC',
      'Master-Disciple',
      'Family Clan',
    ],
  },
];

