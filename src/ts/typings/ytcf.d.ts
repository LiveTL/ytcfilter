declare namespace YtcF {
  interface ChatFilter {
    nickname?: string;
    subcondition?: {
      items: ChatFilter[];
      logic: 'and' | 'or';
    };
    condition: {
      type: 'contains' | 'startsWith' | 'endsWith' | 'regex';
      value: string;
      invert: boolean;
    };
  }
}
