declare namespace YtcF {
  interface BaseCondition {
    type: string;
    property: string;
  }
  interface StringCondition extends BaseCondition {
    type: 'includes' | 'startsWith' | 'endsWith' | 'regex';
    property: 'message' | 'authorName';
    value: string;
    invert: boolean;
    caseSensitive: boolean;
  }
  interface BooleanCondition extends BaseCondition {
    type: 'boolean';
    property: 'superchat' | 'verified' | 'moderator' | 'owner' | 'member';
  }
  interface ChatFilter {
    nickname?: string;
    type: 'basic' | 'advanced';
    condition: StringCondition | BooleanCondition;
    id: string;
    enabled: boolean;
  }
  interface _TextFilter extends ChatFilter {
    condition: StringCondition;
  }
}
