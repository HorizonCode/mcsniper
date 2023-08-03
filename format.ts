export function format(string: string, args: Record<string, any>): string {
  return string.replace(/\{([^}]+)\}/g, function replaceArg(_, key) {
    const result = Object.prototype.hasOwnProperty.call(args, key)
      ? args[key]
      : null;
    if (result === null || result === undefined) {
      return "";
    }
    return result;
  });
}

const nargs = /\{([0-9a-zA-Z_]+)\}/g;
