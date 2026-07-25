import CommentaryBubble from "./CommentaryBubble.jsx";

export default function CouncilPanel({ messages, recap }) {
  if (messages.length === 0 && !recap) return null;

  return (
    <div className="council-panel">
      <h3>The Council</h3>
      {messages.map((message, i) => (
        <CommentaryBubble key={i} side={message.side} text={message.text} />
      ))}
      {recap && <p className="council-recap">{recap}</p>}
    </div>
  );
}
