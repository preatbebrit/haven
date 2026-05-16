export type SupportResource = {
  name: string;
  url: string;
  description?: string;
};

export const SUPPORT_RESOURCES: SupportResource[] = [
  {
    name: 'CenterLink LGBT Community Center Member Directory',
    url: 'https://web.lgbtqcenters.org/atlas/directory/category/all-centerlink-members',
  },
  {
    name: 'The American Psychological Association (APA)',
    url: 'https://www.apa.org/pi/lgbt/resources/lgbt-health',
    description: 'Provides educational and support resources on a range of LGBTQ+ topics.',
  },
  {
    name: 'The Association of Gay and Lesbian Psychiatrists',
    url: 'http://www.aglp.org/',
    description:
      'Offers many resources for LGBTQ+ individuals experiencing mental health conditions and psychiatric professionals with LGBTQ+ clients.',
  },
  {
    name: 'LGBTQ+ Healthcare Directory',
    url: 'https://lgbtqhealthcaredirectory.org/',
    description: 'A search tool that can locate a LGBTQ+-inclusive health care provider.',
  },
  {
    name: 'The LGBTQ+ National Help Center',
    url: 'https://lgbthotline.org/',
    description:
      'Offers confidential peer support connections for LGBTQ+ youth, adults and seniors, including phone, text and online chat.',
  },
  {
    name: 'The National Center for Transgender Equality',
    url: 'https://transequality.org/',
    description:
      'Offers resources for transgender individuals, including information on the right to access health care.',
  },
  {
    name: 'The Trevor Project',
    url: 'https://www.thetrevorproject.org/',
    description:
      'A support network for LGBTQ+ youth providing crisis intervention and suicide prevention, including a 24-hour text line (text “START” to 678678).',
  },
  {
    name: 'SAGE Advocacy & Services for LGBTQ+ Elders',
    url: 'https://www.sageusa.org/',
  },
  {
    name: 'Society for Sexual, Affectional, Intersex, and Gender Expansive Identities (SAIGE)',
    url: 'https://saigecounseling.org/',
    description:
      'Delivers educational and support resources for LGBTQ+ individuals, as well as promotes competency on LGBTQ+ issues for counseling professionals.',
  },
  {
    name: 'Trans Lifeline',
    url: 'https://translifeline.org/',
  },
  {
    name: 'Depression Looks Like Me',
    url: 'https://www.depressionlookslikeme.com/',
    description:
      'Depression Looks Like Me is a program – sponsored by the Johnson & Johnson Company and supported by an alliance of other partners – that aims to educate and empower LGBTQ+ people with depression.',
  },
];

export const ACCEPTING_ENVIRONMENT_CONCERNING = new Set<string>([
  'Not very accepting',
  'Not accepting at all',
  'I worry for my safety',
]);
