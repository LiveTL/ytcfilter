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
  type FilterCondition = StringCondition | BooleanCondition;
  interface ChatFilter {
    nickname?: string;
    type: 'basic' | 'advanced';
    conditions: FilterCondition[];
    id: string;
    enabled: boolean;
  }
}
