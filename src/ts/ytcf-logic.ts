export function shouldFilterMessage(action: Chat.MessageAction, filters: YtcF.ChatFilter[]): boolean {
  const msg = action.message;
  for (const filter of filters) {
    if (filter.enabled) {
      let numSatisfied = 0;
      for (const condition of filter.conditions) {
        if (condition.type === 'boolean') {
          if (condition.property === 'superchat' && msg.superChat) return true;
          if (msg.author.types.includes(condition.property)) return true;
        } else {
          let compStr = '';
          switch (condition.property) {
            case 'message':
              compStr = msg.message.map(m => {
                if (m.type === 'text') {
                  return m.text;
                } else if (m.type === 'emoji') {
                  return `:${m.alt}:`;
                } else {
                  return m.text;
                }
              }).join('');
              break;
            case 'authorName':
              compStr = msg.author.name;
              break;
            case 'authorChannelId':
              compStr = msg.author.id;
              break;
          }
          if (condition.value === '') continue;
          if (condition.type !== 'regex') {
            const s1 = condition.caseSensitive ? compStr : compStr.toLowerCase();
            const s2 = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
            const result = s1[condition.type](s2);
            if (result === condition.invert) {
              break;
            }
          } else {
            const regex = new RegExp(condition.value, condition.caseSensitive ? '' : 'i');
            const result = regex.test(compStr);
            if (result === condition.invert) {
              break;
            }
          }
        }
        numSatisfied++;
      }
      if (numSatisfied === filter.conditions.length) {
        return true;
      }
    }
  }
  return false;
}
