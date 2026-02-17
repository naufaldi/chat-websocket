interface TypingIndicatorProps {
  names: string[];
}

function buildTypingText(names: string[]): string {
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }
  return `${names[0]} and ${names.length - 1} others are typing...`;
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2 text-xs text-gray-500 bg-white">
      {buildTypingText(names)}
    </div>
  );
}
