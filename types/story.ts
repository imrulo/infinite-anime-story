export interface StoryBeat {
  title: string;
  text: string;
  mood: string;
  location: string;
  hook: string;
  turn: string;
  cliffhanger: string;
  choices: Array<{
    id: "A" | "B" | "C";
    text: string;
    tone: string;
  }>;
}

export interface KeyItem {
  name: string;
  note: string;
}

export interface Person {
  name: string;
  status: string;
  note: string;
}

export interface Ability {
  name: string;
  cost: string;
  drawback: string;
}

export interface StoryPanel {
  keyItems: KeyItem[];
  currentThread: {
    focus: string;
    leads: string[];
  };
  people: Person[];
  abilities: Ability[];
  continuityFlags: string[];
}

export interface StoryResponse {
  beat: StoryBeat;
  storyPanel: StoryPanel;
  imagePrompt: string;
  recapLine: string;
  nextSignal: string;
}

export interface StoryRequest {
  dream: string;
  choiceId: "A" | "B" | "C" | null;
  history: Array<{
    beat: StoryBeat;
    choiceId: "A" | "B" | "C" | null;
  }>;
  storyPanel: StoryPanel;
}

export interface StoryState {
  dream: string;
  history: Array<{
    beat: StoryBeat;
    choiceId: "A" | "B" | "C" | null;
  }>;
  currentBeat: StoryBeat | null;
  storyPanel: StoryPanel;
  imagePrompt: string | null;
}
