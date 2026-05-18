// WitnessYouthEducation.tsx
import React, { useState, useEffect } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface YouthProfile {
  id: string;
  name: string;
  age: number;
  parentalConsent: boolean;
  consentDate?: number;
  contentFilterLevel: "safe" | "moderate" | "full";
  points: number;
  badges: string[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  choices: { text: string; outcome: string; points: number }[];
  rightsReference: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  content: string;
  quiz: { question: string; answer: string }[];
  completed: boolean;
  completedAt?: number;
}

// Mock data
const mockScenarios: Scenario[] = [
  {
    id: "s1",
    title: "Traffic Stop",
    description: "You are pulled over by police. What do you do?",
    choices: [
      {
        text: "Remain silent and ask if you're free to leave",
        outcome: "Correct. You exercised your rights.",
        points: 10,
      },
      { text: "Start arguing immediately", outcome: "Escalation risk.", points: -5 },
    ],
    rightsReference: "Right to remain silent, Right to refuse search",
  },
  {
    id: "s2",
    title: "Protest Encounter",
    description: "You are filming a protest. An officer tells you to stop.",
    choices: [
      {
        text: "Respectfully state you are within your rights",
        outcome: "Asserted your rights calmly.",
        points: 10,
      },
      { text: "Run away", outcome: "Missed documentation opportunity.", points: 0 },
    ],
    rightsReference: "First Amendment right to record in public",
  },
];

const mockCurriculum: CurriculumModule[] = [
  {
    id: "c1",
    title: "Your Rights When Stopped",
    content: "You have the right to remain silent. You may ask 'Am I free to leave?'",
    quiz: [
      {
        question: "What is the first thing you should ask if not under arrest?",
        answer: "Am I free to leave?",
      },
    ],
    completed: false,
  },
  {
    id: "c2",
    title: "Recording Police",
    content: "In public spaces, you have the right to record officers performing their duties.",
    quiz: [
      {
        question: "Is recording police in public legal?",
        answer: "Generally yes, unless interfering.",
      },
    ],
    completed: false,
  },
];

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ------------------------------
// SECTION: YouthGuard (Parental Consent & Profile Management)
// ------------------------------
export function useYouthGuard() {
  const [youth, setYouth] = useState<YouthProfile | null>(() => {
    const stored = localStorage.getItem("youth_profile");
    return stored ? JSON.parse(stored) : null;
  });

  const requestConsent = (name: string, age: number, parentEmail: string) => {
    alert(`Consent request sent to ${parentEmail}. Parent must approve in their dashboard.`);
    localStorage.setItem(
      "pending_consent",
      JSON.stringify({ name, age, parentEmail, timestamp: Date.now() }),
    );
    // For demo purposes, we automatically "approve" it 1 second later
    setTimeout(() => approveConsent(true), 1000);
  };

  const approveConsent = (approve: boolean) => {
    if (!approve) return;
    const pending = localStorage.getItem("pending_consent");
    if (pending) {
      const data = JSON.parse(pending);
      const newYouth: YouthProfile = {
        id: genId(),
        name: data.name,
        age: data.age,
        parentalConsent: true,
        consentDate: Date.now(),
        contentFilterLevel: "moderate",
        points: 0,
        badges: [],
      };
      setYouth(newYouth);
      localStorage.setItem("youth_profile", JSON.stringify(newYouth));
      localStorage.removeItem("pending_consent");
    }
  };

  const updateYouthPoints = (pointsToAdd: number) => {
    if (youth) {
      const updated = { ...youth, points: youth.points + pointsToAdd };
      setYouth(updated);
      localStorage.setItem("youth_profile", JSON.stringify(updated));
    }
  };

  const updateContentFilter = (level: "safe" | "moderate" | "full") => {
    if (youth) {
      const updated = { ...youth, contentFilterLevel: level };
      setYouth(updated);
      localStorage.setItem("youth_profile", JSON.stringify(updated));
    }
  };

  return { youth, requestConsent, approveConsent, updateContentFilter, updateYouthPoints };
}

export function YouthGuardUI() {
  const { youth, requestConsent, updateContentFilter } = useYouthGuard();
  const [name, setName] = useState("");
  const [age, setAge] = useState(13);
  const [parentEmail, setParentEmail] = useState("");

  if (!youth) {
    return (
      <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
        <h3 className="font-bold text-red-500">Parental Consent Required</h3>
        <input
          type="text"
          placeholder="Youth name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(parseInt(e.target.value))}
          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Parent email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => requestConsent(name, age, parentEmail)}
          className="bg-red-600 px-4 py-1 rounded-full text-sm w-full"
        >
          Request Consent
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Youth Account: {youth.name}</h3>
      <div className="flex justify-between items-center text-sm">
        <span>Content Filter:</span>
        <div className="flex gap-2">
          {(["safe", "moderate", "full"] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateContentFilter(level)}
              className={`px-2 py-0.5 rounded-full text-xs capitalize ${youth.contentFilterLevel === level ? "bg-red-600" : "bg-gray-800"}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <div className="text-sm">
        Total Points: <span className="text-yellow-500 font-bold">{youth.points}</span>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: EduLearning
// ------------------------------
export function ScenarioSimulation() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { youth, updateYouthPoints } = useYouthGuard();

  const scenario = mockScenarios[currentIdx];

  const handleChoice = (choice: { outcome: string; points: number }) => {
    setFeedback(`${choice.outcome} (+${choice.points} pts)`);
    updateYouthPoints(choice.points);
  };

  const nextScenario = () => {
    setFeedback("");
    setCurrentIdx((prev) => (prev + 1) % mockScenarios.length);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Scenario Simulation</h3>
      <div className="bg-black p-3 rounded-lg">
        <div className="font-bold text-red-400">{scenario.title}</div>
        <p className="text-sm mt-1">{scenario.description}</p>
        <div className="space-y-2 mt-3">
          {scenario.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => handleChoice(choice)}
              className="w-full bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-left text-sm transition-colors"
            >
              {choice.text}
            </button>
          ))}
        </div>
        {feedback && (
          <div className="text-sm mt-2 text-yellow-500 font-bold italic">{feedback}</div>
        )}
      </div>
      {feedback && (
        <button onClick={nextScenario} className="bg-red-600 px-3 py-1 rounded-full text-sm w-full">
          Next Scenario
        </button>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Curriculum
// ------------------------------
export function CurriculumViewer() {
  const { youth } = useYouthGuard();
  const [modules, setModules] = useState<CurriculumModule[]>(() => {
    const stored = localStorage.getItem("curriculum_modules");
    return stored ? JSON.parse(stored) : mockCurriculum;
  });
  const [selectedModule, setSelectedModule] = useState<CurriculumModule | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");

  const verifyQuiz = (module: CurriculumModule) => {
    if (quizAnswer.toLowerCase().trim() === module.quiz[0].answer.toLowerCase().trim()) {
      const updated = modules.map((m) => (m.id === module.id ? { ...m, completed: true } : m));
      setModules(updated);
      localStorage.setItem("curriculum_modules", JSON.stringify(updated));
      alert("Correct! Module completed.");
      setQuizAnswer("");
    } else {
      alert("Try again!");
    }
  };

  const generateCertificate = () => {
    const completedAll = modules.every((m) => m.completed);
    if (!completedAll) return alert("Finish all modules first!");

    const userName = youth?.name || "Student";
    const certText = `CERTIFICATE OF COMPLETION\n\nThis certifies that ${userName}\nhas completed the Know Your Rights Curriculum.\nDate: ${new Date().toLocaleDateString()}`;

    const blob = new Blob([certText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Certificate.txt";
    link.click();
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Learning Curriculum</h3>
        <button onClick={generateCertificate} className="bg-red-600 px-3 py-1 rounded-full text-xs">
          Download Cert
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModule(m)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${m.completed ? "bg-green-800" : "bg-gray-800"}`}
          >
            {m.title} {m.completed ? "✓" : ""}
          </button>
        ))}
      </div>
      {selectedModule && (
        <div className="bg-black p-3 rounded-lg text-sm">
          <p className="mb-2">{selectedModule.content}</p>
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-bold text-red-400">
              Quiz: {selectedModule.quiz[0].question}
            </p>
            <input
              value={quizAnswer}
              onChange={(e) => setQuizAnswer(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-1 mt-1"
            />
            <button
              onClick={() => verifyQuiz(selectedModule)}
              className="bg-red-600 px-3 py-1 mt-2 rounded text-xs"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Main Application
// ------------------------------
export default function MainApp() {
  const [tab, setTab] = useState<"learn" | "sim" | "dash">("learn");

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-20">
      <h1 className="text-2xl font-bold text-red-600 text-center mb-6">WITNESS YOUTH</h1>

      <div className="space-y-6">
        {tab === "learn" && <CurriculumViewer />}
        {tab === "sim" && <ScenarioSimulation />}
        {tab === "dash" && (
          <>
            <YouthGuardUI />
            <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600">
              <h3 className="font-bold text-red-500 mb-2">Leaderboard</h3>
              <div className="text-sm">1. Alex W. - 450 pts</div>
              <div className="text-sm text-gray-400 italic">
                Join the simulation to climb the ranks!
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-red-600 flex justify-around py-3">
        <button
          onClick={() => setTab("learn")}
          className={tab === "learn" ? "text-red-500" : "text-gray-500"}
        >
          Books
        </button>
        <button
          onClick={() => setTab("sim")}
          className={tab === "sim" ? "text-red-500" : "text-gray-500"}
        >
          Play
        </button>
        <button
          onClick={() => setTab("dash")}
          className={tab === "dash" ? "text-red-500" : "text-gray-500"}
        >
          Profile
        </button>
      </nav>
    </div>
  );
}
