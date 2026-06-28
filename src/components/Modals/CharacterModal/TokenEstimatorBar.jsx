// Real-time token estimator based on ~4 chars per token ratio
const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export default function TokenEstimatorBar({
  name = '',
  greeting = '',
  personality = '',
  scenario = '',
  exampleDialogue = '',
  systemPrompt = '',
  postHistoryInstructions = '',
  alternateGreetings = [],
  tags = [],
  personalityTraits = '',
  serializeMetadataIntoPersonality
}) {
  const nameTokens = estimateTokens(name);
  const greetingTokens = estimateTokens(greeting);
  
  const finalPersonalityForEstimate = serializeMetadataIntoPersonality(personality, tags, personalityTraits);
  const personaTokens = estimateTokens(finalPersonalityForEstimate);
  const scenarioTokens = estimateTokens(scenario);
  const dialogueTokens = estimateTokens(exampleDialogue);
  const systemPromptTokens = estimateTokens(systemPrompt);
  const postHistoryTokens = estimateTokens(postHistoryInstructions);
  const alternateGreetingsTokens = (alternateGreetings || [])
    .reduce((sum, g) => sum + estimateTokens(g), 0);

  const totalTokens = nameTokens + greetingTokens + personaTokens + scenarioTokens + dialogueTokens + systemPromptTokens + postHistoryTokens + alternateGreetingsTokens;
  const permanentTokens = nameTokens + personaTokens + scenarioTokens;

  return (
    <div style={{ margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-code)', fontSize: '0.82rem', borderTop: '1px dashed var(--border)', width: '100%', paddingTop: '8px' }}>
      <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>
        {totalTokens} Tokens (Estimated)
      </span>
      <span style={{ color: 'var(--text-sec)', fontSize: '0.74rem' }}>
        ({permanentTokens} Permanent)
      </span>
    </div>
  );
}
