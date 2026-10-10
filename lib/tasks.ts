export type Task = { id: number; title: string; kind: "photo" | "text"; helper: string };

export const TASKS: Task[] = [
  { id: 1, title: "Take a picture with someone you met for the first time today.", kind: "photo", helper: "Upload the picture." },
  { id: 2, title: "Take a picture with an organizer.", kind: "photo", helper: "Upload the picture." },
  { id: 3, title: "Take a group selfie with 5 or more people.", kind: "photo", helper: "Make sure the group is visible." },
  { id: 4, title: "Take a picture while painting your tote bag.", kind: "photo", helper: "Show yourself in the creative process." },
  { id: 5, title: "Take a picture with someone wearing the same colour as you.", kind: "photo", helper: "Upload the picture." },
  { id: 6, title: "Write down the Instagram ID of someone you met today.", kind: "text", helper: "Enter their Instagram handle." },
  { id: 7, title: "Find someone who shares your favourite hobby and write their name.", kind: "text", helper: "Include their name and the shared hobby." },
  { id: 8, title: "Take a picture of your favourite colour.", kind: "photo", helper: "A photo of an object or detail in that colour works." },
  { id: 9, title: "Find someone whose hometown is different from yours.", kind: "text", helper: "Enter their name and hometown." },
  { id: 10, title: "Find someone who shares your favourite snack and write their name.", kind: "text", helper: "A tiny snack-based friendship. Enter their name and the snack." },
  { id: 11, title: "Learn one interesting fact about another participant.", kind: "text", helper: "Tell us the interesting fact." },
  { id: 12, title: "Find someone with a hidden talent.", kind: "text", helper: "Enter their name and talent." },
  { id: 13, title: "Find someone who has attended a similar event before.", kind: "text", helper: "Enter their name and the event." },
  { id: 14, title: "Have a conversation with someone you came to the event without knowing.", kind: "text", helper: "Enter their name and one thing you talked about." },
  { id: 15, title: "Ask someone to suggest a colour for your tote bag.", kind: "text", helper: "Which colour did they suggest?" },
  { id: 16, title: "Help someone with their tote bag painting.", kind: "photo", helper: "Upload a picture showing the moment." },
  { id: 17, title: "Take inspiration from another participant's artwork.", kind: "photo", helper: "Upload a picture of your artwork and add a short note." },
  { id: 18, title: "Add a hidden detail to your tote bag.", kind: "photo", helper: "Upload a close-up of the detail." },
  { id: 19, title: "Give your tote bag a name.", kind: "text", helper: "What is your tote bag called?" },
  { id: 20, title: "Create a design using at least 3 colours.", kind: "photo", helper: "Upload a picture of your design." },
  { id: 21, title: "Take a picture of your finished tote bag with 2 or more people.", kind: "photo", helper: "Make sure the finished bag and people are visible." },
  { id: 22, title: "Find someone who can teach you something in 30 seconds.", kind: "text", helper: "What did they teach you, and who taught you?" },
  { id: 23, title: "Recreate a fun pose with 3 other participants.", kind: "photo", helper: "Four people total, including you." },
  { id: 24, title: "Follow our Instagram page and show an organizer.", kind: "photo", helper: "Upload a screenshot showing the follow." },
  { id: 25, title: "Share the event on your story.", kind: "photo", helper: "Upload a screenshot of your story." }
];
