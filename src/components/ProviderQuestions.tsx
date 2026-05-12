const questions = [
  "What is the total amount due today?",
  "Are there any additional fees?",
  "Is financing available?",
  "What collateral is required?",
  "How long does release usually take at this jail?",
  "Who will be my main contact?",
  "What happens if the defendant misses court?",
];

export function ProviderQuestions() {
  return (
    <section className="card guidance-card">
      <p className="eyebrow">Questions</p>
      <h2>Ask the provider directly</h2>
      <ul className="question-list">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}
