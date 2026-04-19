function uniqueQuestions(questions) {
  const seen = new Set();

  return questions.filter((question) => {
    const normalized = question.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function generateFollowUpQuestions(parsedQuery, publications = [], trials = []) {
  const disease = parsedQuery.disease || parsedQuery.originalQuery || 'this condition';
  const conditionLabel =
    disease.charAt(0).toUpperCase() + disease.slice(1);

  const topPublication = publications[0];
  const topTrial = trials[0];

  const questions = [
    `What are the most promising current treatments for ${disease}?`,
    `Are there any active clinical trials for ${disease} near me?`,
    `Can you summarize the strongest recent evidence for ${disease} in simpler terms?`,
  ];

  if (parsedQuery.intents.includes('treatment')) {
    questions.unshift(`What side effects and limitations should I know about the latest ${disease} treatments?`);
  }

  if (parsedQuery.intents.includes('research')) {
    questions.unshift(`Which recent breakthroughs are changing how ${disease} is treated or studied?`);
  }

  if (parsedQuery.intents.includes('trial')) {
    questions.unshift(`How do I decide whether a clinical trial for ${disease} is worth considering?`);
  }

  if (topPublication?.title) {
    questions.unshift(`Can you explain why "${topPublication.title}" matters for ${disease}?`);
  }

  if (topTrial?.title) {
    questions.unshift(`What does the trial "${topTrial.title}" mean for people with ${disease}?`);
  }

  if (parsedQuery.location) {
    questions.unshift(`Which ${disease} trials or specialists are most relevant in ${parsedQuery.location}?`);
  }

  if (parsedQuery.isFollowUp) {
    questions.unshift(`Based on this chat so far, what should I ask next about ${disease}?`);
  }

  return uniqueQuestions(questions)
    .map((question) => question.replace(/\bthis condition\b/i, conditionLabel))
    .slice(0, 3);
}

export default {
  generateFollowUpQuestions,
};
