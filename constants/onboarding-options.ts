export type GenderOption = {
  id: string;
  title: string;
  description: string;
};

export const GENDER_OPTIONS: GenderOption[] = [
  {
    id: 'agender',
    title: 'Agender',
    description:
      'A person who does not have a gender identity, identifies as gender-neutral, or feels genderless.',
  },
  {
    id: 'androgynous',
    title: 'Androgynous',
    description:
      'A person, appearance, or style that blends, obscures, or possesses both masculine and feminine characteristics, often appearing neither clearly male nor female.',
  },
  {
    id: 'bigender',
    title: 'Bigender',
    description:
      'A person who experiences two genders, either simultaneously or varying between them, often under the non-binary and transgender umbrellas.',
  },
  {
    id: 'cis-man',
    title: 'Cis Man',
    description: 'A male whose gender identity matches the sex he was assigned at birth.',
  },
  {
    id: 'cis-woman',
    title: 'Cis Woman',
    description: 'A female whose gender identity matches the sex she was assigned at birth.',
  },
  {
    id: 'demigender',
    title: 'Demigender',
    description:
      'A partial connection to a gender — for example demiboy or demigirl — often alongside another identity or agender experience.',
  },
  {
    id: 'genderfluid',
    title: 'Genderfluid',
    description: 'A person whose gender identity shifts over time or across contexts.',
  },
  {
    id: 'genderqueer',
    title: 'Genderqueer',
    description: 'A broad identity for those who queer or expand traditional notions of gender.',
  },
  {
    id: 'intersex',
    title: 'Intersex',
    description:
      'A person born with variations in sex characteristics that do not fit typical definitions of male or female bodies.',
  },
  {
    id: 'nonbinary',
    title: 'Nonbinary',
    description: 'An umbrella term for genders outside the exclusively male/female binary.',
  },
  {
    id: 'trans-man',
    title: 'Trans Man',
    description: 'A man who was assigned female at birth; may or may not pursue medical transition.',
  },
  {
    id: 'trans-woman',
    title: 'Trans Woman',
    description: 'A woman who was assigned male at birth; may or may not pursue medical transition.',
  },
  {
    id: 'two-spirit',
    title: 'Two-Spirit',
    description: 'An Indigenous umbrella term for gender and spiritual roles outside colonial binaries.',
  },
  {
    id: 'questioning',
    title: 'Questioning',
    description: 'Exploring or unsure about gender identity; still valid and welcome here.',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Your label might be unique — pick this if nothing else fits, or combine elsewhere in your profile.',
  },
];

export const PRONOUN_PRESETS = ['He/Him', 'She/Her', 'They/Them'] as const;

export const IDENTITY_OPTIONS = [
  'AAPI',
  'Black/African Descent',
  'Differently Abled',
  'Latine',
  'Neurodivergent',
  'Parent',
  'Student',
  '65+',
  'Indigenous',
  'Mixed race',
  'Immigrant',
  'Rural',
  'Urban',
  'Veteran',
  'Faith community',
] as const;

export const ACCEPTING_ENVIRONMENT_OPTIONS = [
  'Very accepting',
  'Kind of accepting',
  'Not very accepting',
  'Not accepting at all',
  'I worry for my safety',
] as const;
