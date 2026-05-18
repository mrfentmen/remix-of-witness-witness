export interface QuizQuestion {
  question: string;
  answer: string;
  options?: string[];
}

export interface CurriculumModule {
  id: string;
  title: string;
  content: string;
  pointsReward: number;
  quiz: QuizQuestion[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  rightsReference: string;
  choices: { text: string; outcome: string; points: number }[];
}

export const CURRICULUM: CurriculumModule[] = [
  {
    id: "rights-stopped",
    title: "Your Rights When Stopped",
    content:
      "You have the right to remain silent. You may ask 'Am I free to leave?' " +
      "If yes, walk away calmly. If you are detained, do not resist — record what happens.",
    pointsReward: 25,
    quiz: [
      {
        question: "What is the first thing you should ask if not under arrest?",
        answer: "Am I free to leave?",
        options: ["Am I free to leave?", "What did I do?", "Can I call a lawyer?"],
      },
    ],
  },
  {
    id: "recording-police",
    title: "Recording Police in Public",
    content:
      "In public spaces in the United States, you have a First Amendment right to " +
      "record officers performing their duties, as long as you do not interfere.",
    pointsReward: 25,
    quiz: [
      {
        question: "Is recording police in public legal?",
        answer: "Yes, unless you interfere",
        options: ["Yes, unless you interfere", "No, never", "Only with a permit"],
      },
    ],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "traffic-stop",
    title: "Traffic Stop",
    description: "You are pulled over by police. What do you do?",
    rightsReference: "Right to remain silent · Right to refuse search",
    choices: [
      {
        text: "Remain silent and ask if you're free to leave",
        outcome: "Correct. You exercised your rights without escalating.",
        points: 15,
      },
      {
        text: "Start arguing immediately",
        outcome: "This escalates the encounter and risks your safety.",
        points: 0,
      },
    ],
  },
  {
    id: "protest-encounter",
    title: "Protest Encounter",
    description: "You are filming a protest. An officer tells you to stop.",
    rightsReference: "First Amendment right to record in public",
    choices: [
      {
        text: "Respectfully state you are within your rights to record",
        outcome: "Asserted your rights calmly. Continue at a safe distance.",
        points: 15,
      },
      {
        text: "Hide your phone",
        outcome: "You missed an important documentation opportunity.",
        points: 5,
      },
    ],
  },
];
