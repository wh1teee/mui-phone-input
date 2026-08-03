type DigitMask = number;

type DigitPatternNode =
  | { kind: 'alternation'; options: readonly DigitPatternNode[] }
  | { kind: 'digits'; mask: DigitMask }
  | { kind: 'repeat'; child: DigitPatternNode; maximum: number; minimum: number }
  | { kind: 'sequence'; children: readonly DigitPatternNode[] };

interface DigitTransition {
  mask: DigitMask;
  target: number;
}

interface DigitPatternState {
  epsilon: number[];
  transitions: DigitTransition[];
}

interface DigitPatternAutomaton {
  states: readonly DigitPatternState[];
  start: number;
}

const ALL_DIGITS_MASK = (1 << 10) - 1;
const automataByPattern = new Map<string, DigitPatternAutomaton>();

class DigitPatternParser {
  readonly #pattern: string;
  #position = 0;

  constructor(pattern: string) {
    this.#pattern = pattern;
  }

  parse(): DigitPatternNode {
    const node = this.#parseAlternation();
    if (this.#position !== this.#pattern.length) {
      this.#fail('Unexpected trailing token');
    }
    return node;
  }

  #parseAlternation(): DigitPatternNode {
    const options = [this.#parseSequence()];

    while (this.#peek() === '|') {
      this.#position += 1;
      options.push(this.#parseSequence());
    }

    return options.length === 1 ? options[0]! : { kind: 'alternation', options };
  }

  #parseSequence(): DigitPatternNode {
    const children: DigitPatternNode[] = [];

    while (this.#position < this.#pattern.length) {
      const token = this.#peek();
      if (token === ')' || token === '|') {
        break;
      }
      children.push(this.#parseTerm());
    }

    return children.length === 1 ? children[0]! : { kind: 'sequence', children };
  }

  #parseTerm(): DigitPatternNode {
    const child = this.#parseAtom();
    const token = this.#peek();

    if (token === '?') {
      this.#position += 1;
      return { child, kind: 'repeat', maximum: 1, minimum: 0 };
    }

    if (token !== '{') {
      return child;
    }

    this.#position += 1;
    const minimum = this.#parseInteger();
    let maximum = minimum;

    if (this.#peek() === ',') {
      this.#position += 1;
      maximum = this.#parseInteger();
    }

    if (this.#peek() !== '}') {
      this.#fail('Unterminated repetition');
    }
    this.#position += 1;

    if (maximum < minimum) {
      this.#fail('Invalid repetition range');
    }

    return { child, kind: 'repeat', maximum, minimum };
  }

  #parseAtom(): DigitPatternNode {
    const token = this.#peek();

    if (token === '(') {
      if (this.#pattern.slice(this.#position, this.#position + 3) !== '(?:') {
        this.#fail('Only non-capturing groups are supported');
      }
      this.#position += 3;
      const child = this.#parseAlternation();
      if (this.#peek() !== ')') {
        this.#fail('Unterminated group');
      }
      this.#position += 1;
      return child;
    }

    if (token === '[') {
      return { kind: 'digits', mask: this.#parseCharacterClass() };
    }

    if (token === '\\') {
      if (this.#pattern[this.#position + 1] !== 'd') {
        this.#fail('Only decimal digit escapes are supported');
      }
      this.#position += 2;
      return { kind: 'digits', mask: ALL_DIGITS_MASK };
    }

    if (token && token >= '0' && token <= '9') {
      this.#position += 1;
      return { kind: 'digits', mask: 1 << Number(token) };
    }

    this.#fail('Expected a decimal digit atom');
  }

  #parseCharacterClass(): DigitMask {
    this.#position += 1;
    let mask = 0;

    while (this.#position < this.#pattern.length && this.#peek() !== ']') {
      const start = this.#parseClassDigit();
      let end = start;

      if (this.#peek() === '-') {
        this.#position += 1;
        end = this.#parseClassDigit();
        if (end < start) {
          this.#fail('Invalid character class range');
        }
      }

      for (let digit = start; digit <= end; digit += 1) {
        mask |= 1 << digit;
      }
    }

    if (this.#peek() !== ']' || mask === 0) {
      this.#fail('Invalid character class');
    }
    this.#position += 1;
    return mask;
  }

  #parseClassDigit(): number {
    const token = this.#peek();
    if (!token || token < '0' || token > '9') {
      this.#fail('Expected a decimal digit in character class');
    }
    this.#position += 1;
    return Number(token);
  }

  #parseInteger(): number {
    const start = this.#position;
    while (this.#peek() && /\d/u.test(this.#peek()!)) {
      this.#position += 1;
    }
    if (start === this.#position) {
      this.#fail('Expected repetition count');
    }
    return Number(this.#pattern.slice(start, this.#position));
  }

  #peek(): string | undefined {
    return this.#pattern[this.#position];
  }

  #fail(message: string): never {
    throw new TypeError(
      `Unsupported libphonenumber-js digit pattern at ${this.#position}: ${message}: ${this.#pattern}`,
    );
  }
}

function compileDigitPattern(pattern: string): DigitPatternAutomaton {
  const cached = automataByPattern.get(pattern);
  if (cached) {
    return cached;
  }

  const states: DigitPatternState[] = [];
  const createState = (): number => {
    states.push({ epsilon: [], transitions: [] });
    return states.length - 1;
  };
  const addEpsilon = (source: number, target: number): void => {
    states[source]!.epsilon.push(target);
  };

  const compileNode = (node: DigitPatternNode): { end: number; start: number } => {
    if (node.kind === 'digits') {
      const start = createState();
      const end = createState();
      states[start]!.transitions.push({ mask: node.mask, target: end });
      return { end, start };
    }

    if (node.kind === 'sequence') {
      const start = createState();
      let cursor = start;
      for (const child of node.children) {
        const compiled = compileNode(child);
        addEpsilon(cursor, compiled.start);
        cursor = compiled.end;
      }
      return { end: cursor, start };
    }

    if (node.kind === 'alternation') {
      const start = createState();
      const end = createState();
      for (const option of node.options) {
        const compiled = compileNode(option);
        addEpsilon(start, compiled.start);
        addEpsilon(compiled.end, end);
      }
      return { end, start };
    }

    const start = createState();
    const end = createState();
    let cursor = start;

    for (let index = 0; index < node.minimum; index += 1) {
      const compiled = compileNode(node.child);
      addEpsilon(cursor, compiled.start);
      cursor = compiled.end;
    }

    for (let index = node.minimum; index < node.maximum; index += 1) {
      const compiled = compileNode(node.child);
      addEpsilon(cursor, end);
      addEpsilon(cursor, compiled.start);
      cursor = compiled.end;
    }

    addEpsilon(cursor, end);
    return { end, start };
  };

  const parsed = new DigitPatternParser(pattern).parse();
  const compiled = compileNode(parsed);
  const automaton = { start: compiled.start, states };
  automataByPattern.set(pattern, automaton);
  return automaton;
}

function epsilonClosure(
  states: readonly DigitPatternState[],
  initial: ReadonlySet<number>,
): Set<number> {
  const closure = new Set(initial);
  const pending = [...initial];

  while (pending.length > 0) {
    const state = pending.pop()!;
    for (const target of states[state]!.epsilon) {
      if (!closure.has(target)) {
        closure.add(target);
        pending.push(target);
      }
    }
  }

  return closure;
}

export function canDigitPatternMatchPrefix(pattern: string, prefix: string): boolean {
  const automaton = compileDigitPattern(pattern);
  let current = epsilonClosure(automaton.states, new Set([automaton.start]));

  for (const character of prefix) {
    const digit = Number(character);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
      throw new TypeError(
        'Digit pattern prefixes must contain only ASCII decimal digits.',
      );
    }

    const next = new Set<number>();
    for (const state of current) {
      for (const transition of automaton.states[state]!.transitions) {
        if ((transition.mask & (1 << digit)) !== 0) {
          next.add(transition.target);
        }
      }
    }

    if (next.size === 0) {
      return false;
    }
    current = epsilonClosure(automaton.states, next);
  }

  return current.size > 0;
}
