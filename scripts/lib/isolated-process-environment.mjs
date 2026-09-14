function tokenizeNodeOptions(nodeOptions) {
  return nodeOptions.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+/gu) ?? [];
}

function unquote(token) {
  if (
    token.length >= 2 &&
    ((token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")))
  ) {
    return token.slice(1, -1);
  }
  return token;
}

function isPnpmNodePathHook(value) {
  const importPrefix = 'data:text/javascript,';
  if (!value.startsWith(importPrefix)) {
    return false;
  }

  let source;
  try {
    source = decodeURIComponent(value.slice(importPrefix.length));
  } catch {
    return false;
  }

  return (
    source.includes('process.env.NODE_PATH') &&
    (source.includes('registerHooks') || source.includes('register('))
  );
}

export function sanitizeNodeOptions(nodeOptions) {
  if (!nodeOptions) {
    return undefined;
  }

  const tokens = tokenizeNodeOptions(nodeOptions);
  const retained = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = unquote(tokens[index]);
    if (token === '--import') {
      const next = tokens[index + 1];
      if (next && isPnpmNodePathHook(unquote(next))) {
        index += 1;
        continue;
      }
    }
    if (
      token.startsWith('--import=') &&
      isPnpmNodePathHook(token.slice('--import='.length))
    ) {
      continue;
    }
    retained.push(tokens[index]);
  }

  return retained.length > 0 ? retained.join(' ') : undefined;
}

export function createIsolatedProcessEnvironment(environment = process.env) {
  const isolated = { ...environment };
  delete isolated.NODE_PATH;

  const nodeOptions = sanitizeNodeOptions(isolated.NODE_OPTIONS);
  if (nodeOptions) {
    isolated.NODE_OPTIONS = nodeOptions;
  } else {
    delete isolated.NODE_OPTIONS;
  }

  return isolated;
}
