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
    property: 'isSuperchat' | 'isVerified' | 'isModerator' | 'isOwner' | 'isMember';
    value: boolean;
  }
  interface ChatFilter {
    nickname?: string;
    type: 'basic' | 'advanced';
    condition: StringCondition | BooleanCondition;
    id: string;
    enabled: boolean;
  }
}
