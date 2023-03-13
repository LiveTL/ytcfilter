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

export const download = (data: string, filename: string): void => {
  const a = document.createElement('a');
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(data)}`;
  a.download = filename.replace(/[/\\?%*:|"<>]/g, '-');
  a.click();
};
