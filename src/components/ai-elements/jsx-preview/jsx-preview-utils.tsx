const TAG_REGEX = /<\/?([a-z][a-z0-9]+)([^>]*)>/i;

interface MatchResult {
  attributes: string;
  endIndex: number;
  startIndex: number;
  tag: string;
  tagName: string;
  type: "self-closing" | "closing" | "opening";
}

export function matchJsxTag(code: string): MatchResult | null {
  if (code.trim() === "") {
    return null;
  }

  const match = code.match(TAG_REGEX);

  if (!match || match.index === undefined) {
    return null;
  }

  const [fullMatch, tagName, attributes] = match;

  // Note: Original code never properly detected self-closing tags
  // since there was no capturing group for the closing slash
  let type: "self-closing" | "closing" | "opening";
  if (fullMatch.startsWith("</")) {
    type = "closing";
  } else {
    type = "opening";
  }

  return {
    attributes: attributes.trim(),
    endIndex: match.index + fullMatch.length,
    startIndex: match.index,
    tag: fullMatch,
    tagName,
    type,
  };
}

export function stripIncompleteTag(text: string): string {
  // Find the last '<' that isn't part of a complete tag
  const lastOpen = text.lastIndexOf("<");
  if (lastOpen === -1) {
    return text;
  }

  const afterOpen = text.slice(lastOpen);
  // If there's no closing '>' after the last '<', it's an incomplete tag
  if (!afterOpen.includes(">")) {
    return text.slice(0, lastOpen);
  }

  return text;
}

export function completeJsxTag(code: string): string {
  const stack: string[] = [];
  let result = "";
  let currentPosition = 0;

  while (currentPosition < code.length) {
    const match = matchJsxTag(code.slice(currentPosition));
    if (!match) {
      // No more tags found, strip any trailing incomplete tag
      result += stripIncompleteTag(code.slice(currentPosition));
      break;
    }
    const { tagName, type, endIndex } = match;

    // Include any text content before this tag
    result += code.slice(currentPosition, currentPosition + endIndex);

    if (type === "opening") {
      stack.push(tagName);
    } else if (type === "closing") {
      stack.pop();
    }

    currentPosition += endIndex;
  }

  return (
    result
    + stack
      .toReversed()
      .map((tag) => `</${tag}>`)
      .join("")
  );
}
