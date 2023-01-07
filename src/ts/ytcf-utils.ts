export const stringifyRuns = (msg: Ytc.ParsedRun[]): string => {
  return msg.map(m => {
    if (m.type === 'text') {
      return m.text;
    } else if (m.type === 'emoji') {
      return `:${m.alt}:`;
    } else {
      return m.text;
    }
  }).join('');
};
