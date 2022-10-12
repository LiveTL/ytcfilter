import { chatFilters } from './storage';

export async function shouldFilterMessage(action: Chat.MessageAction): Promise<boolean> {
  const msg = action.message;
  await chatFilters.ready();
  const filters = chatFilters.getCurrent();
  console.log(filters);
  for (const filter of filters) {
    console.log(filter);
    if (filter.enabled) {
      if (filter.condition.type !== 'boolean') {
        let compStr = '';
        switch (filter.condition.property) {
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
        }
        if (filter.condition.type !== 'regex') {
          const s1 = filter.condition.caseSensitive ? compStr : compStr.toLowerCase();
          const s2 = filter.condition.caseSensitive ? filter.condition.value : filter.condition.value.toLowerCase();
          const result = s1[filter.condition.type](s2);
          if (result !== filter.condition.invert) {
            return true;
          }
        } else {
          const regex = new RegExp(filter.condition.value, filter.condition.caseSensitive ? '' : 'i');
          const result = regex.test(compStr);
          console.log(result, filter.condition.invert);
          if (result !== filter.condition.invert) {
            return true;
          }
        }
      }
    }
  }
  return false;
}
