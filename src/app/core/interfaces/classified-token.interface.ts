export type TokenType = 
  | 'number'
  | 'identifier'
  | 'operator'
  | 'unary-minus'
  | 'unary-plus'
  | 'binary-minus'
  | 'binary-plus'
  | 'unknown';

export interface ClassifiedToken {
  token: string;
  type: TokenType;
}