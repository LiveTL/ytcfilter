declare namespace YtcF {
  interface BaseCondition {
    type: string;
    property: string;
  }
  interface StringCondition extends BaseCondition {
    type: 'contains' | 'startsWith' | 'endsWith' | 'regex';
    property: 'message' | 'authorName';
    value: string;
    invert: boolean;
  }
  interface BooleanCondition extends BaseCondition {
    type: 'boolean';
    property: 'isSuperchat' | 'isVerified' | 'isModerator' | 'isOwner' | 'isMember';
    value: boolean;
  }
  interface ChatFilter {
    nickname?: string;
    condition: StringCondition | BooleanCondition;
    id: string;
  }
}
