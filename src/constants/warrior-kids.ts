export type Activity = {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  points: number;
  instructions: string;
};

export type Recipe = {
  id: string;
  title: string;
  emoji: string;
  groups: string;
  ingredients: string[];
  preparation: string;
  note: string;
};

export const ACTIVITIES: Activity[] = [
  {
    id: 'dance',
    title: 'Baila tu canción favorita',
    emoji: '💃',
    minutes: 10,
    points: 15,
    instructions: 'Elige una canción y mueve el cuerpo como más te guste. Invita a alguien de tu familia.',
  },
  {
    id: 'animals',
    title: 'Imita animales',
    emoji: '🐸',
    minutes: 8,
    points: 15,
    instructions: 'Camina como pingüino, salta como rana o estírate como gato. Hazlo en un espacio seguro.',
  },
  {
    id: 'walk',
    title: 'Paseo para descubrir',
    emoji: '🚶',
    minutes: 15,
    points: 15,
    instructions: 'Da un paseo acompañado por una persona adulta y encuentren tres cosas interesantes.',
  },
  {
    id: 'stretch',
    title: 'Estira como gigante',
    emoji: '🧘',
    minutes: 5,
    points: 15,
    instructions: 'Estira los brazos hacia el cielo y luego relaja el cuerpo. Hazlo suavemente y sin dolor.',
  },
];

export const RECIPES: Recipe[] = [
  {
    id: 'quesadillas',
    title: 'Quesadillas de hongos y quelites',
    emoji: '🌮',
    groups: 'Verduras y frutas + cereales + alimentos de origen animal',
    ingredients: ['Tortillas de maíz', 'Hongos o champiñones', 'Quelites o espinaca', 'Queso al gusto'],
    preparation: 'Lava los vegetales. Con ayuda de una persona adulta, cocina los hongos y los quelites. Rellena las tortillas con queso y vegetales y caliéntalas en un comal.',
    note: 'El maíz aporta cereales y los vegetales suman color al plato.',
  },
  {
    id: 'frijoles',
    title: 'Tostadas de frijol y verduras',
    emoji: '🥑',
    groups: 'Verduras y frutas + cereales + leguminosas',
    ingredients: ['Tostadas horneadas', 'Frijoles', 'Lechuga', 'Jitomate', 'Aguacate'],
    preparation: 'Unta frijoles sobre las tostadas y agrega lechuga, jitomate y aguacate lavados y picados. Una persona adulta puede ayudar con el cuchillo.',
    note: 'Los frijoles son leguminosas y también forman parte del Plato del Bien Comer.',
  },
  {
    id: 'calabacitas',
    title: 'Calabacitas con elote',
    emoji: '🌽',
    groups: 'Verduras y frutas + cereales',
    ingredients: ['Calabacitas', 'Elote', 'Jitomate', 'Cebolla', 'Tortillas de maíz'],
    preparation: 'Una persona adulta cocina la cebolla y el jitomate; después agrega las calabacitas y el elote hasta que estén suaves. Sirvan con tortillas.',
    note: 'Preparar comida en familia es una oportunidad para probar ingredientes de la región.',
  },
  {
    id: 'avena',
    title: 'Avena con fruta',
    emoji: '🍎',
    groups: 'Cereales + verduras y frutas',
    ingredients: ['Avena', 'Leche o bebida de tu preferencia', 'Manzana o plátano', 'Canela'],
    preparation: 'Cocina la avena con la leche siguiendo las instrucciones del empaque. Agrega fruta lavada y picada; una persona adulta puede ayudar.',
    note: 'La avena es un cereal y la fruta aporta color y variedad.',
  },
];

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const CHILD_AVATARS = ['🦊', '🐼', '🐸', '🦋', '🐯', '🐢'];
export const MOODS = [
  { id: 'feliz', emoji: '😊', label: 'A gusto' },
  { id: 'tranquilo', emoji: '😌', label: 'Tranquilo' },
  { id: 'neutral', emoji: '😐', label: 'Más o menos' },
  { id: 'cansado', emoji: '😴', label: 'Cansado' },
  { id: 'triste', emoji: '😢', label: 'Triste' },
];
