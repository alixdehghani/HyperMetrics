import { Injectable } from '@angular/core';
import { ClassifiedToken } from '../interfaces/classified-token.interface';
import { evaluate, parse } from 'mathjs';

@Injectable({
  providedIn: 'root'
})
export class FormulaParserService {

  private readonly numberRegex = /^\d+(\.\d+)?$/;
  private readonly identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  private readonly operatorRegex = /^[+\-*/()]$/;

  /**
   * Tokenize formula string
   */
  tokenize(formula: string): string[] {
    return formula.match(/\d+(\.\d+)?|[a-zA-Z_][a-zA-Z0-9_]*|[+\-*/()]/g) || [];
  }

  /**
   * Classify tokens for UI/highlighting
   */
  classifyTokens(tokens: string[]): ClassifiedToken[] {
    const result: ClassifiedToken[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (this.numberRegex.test(token)) {
        result.push({ token, type: 'number' });
      } else if (this.identifierRegex.test(token)) {
        result.push({ token, type: 'identifier' });
      } else if (this.operatorRegex.test(token)) {
        if (token === '-' || token === '+') {
          const prev = result[result.length - 1];
          if (!prev || (prev.type.startsWith('operator') && prev.token !== ')')) {
            result.push({ token, type: token === '-' ? 'unary-minus' : 'unary-plus' });
          } else {
            result.push({ token, type: token === '-' ? 'binary-minus' : 'binary-plus' });
          }
        } else {
          result.push({ token, type: 'operator' });
        }
      } else {
        result.push({ token, type: 'unknown' });
      }
    }

    return result;
  }

  /**
   * Validate formula using mathjs parser
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    try {
      parse(formula); // throws if invalid
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /** Validate token sequence (strict) */
  validateTokens(tokens: ClassifiedToken[]): { valid: boolean; error?: string } {
    let balance = 0;

    for (let i = 0; i < tokens.length; i++) {
      const { token, type } = tokens[i];
      const prev = i > 0 ? tokens[i - 1] : null;

      // Parentheses balance
      if (token === '(') balance++;
      if (token === ')') balance--;
      if (balance < 0) return { valid: false, error: 'Too many closing parentheses' };

      // No two numbers or identifiers together
      if (prev && (prev.type === 'number' || prev.type === 'identifier') &&
        (type === 'number' || type === 'identifier')) {
        return { valid: false, error: `Invalid sequence: '${prev.token}' followed by '${token}'` };
      }

      // // Operator sequences
      // if (prev) {
      //   // ')' can be followed by binary operator
      //   if (prev.token === ')' && type.startsWith('operator') && token !== ')') continue;

      //   // '(' can be followed by number, identifier, unary minus/plus, or '('
      //   if (prev.token === '(' &&
      //     (type === 'number' || type === 'identifier' || type === 'unary-minus' || type === 'unary-plus' || token === '(')) continue;

      //   // Unary minus/plus is valid after operator or '('
      //   if ((type === 'unary-minus' || type === 'unary-plus') &&
      //     (prev.type.startsWith('operator') || prev.token === '(')) continue;

      //   // Binary operators cannot follow another binary operator (except if the second is unary)
      //   const prevIsBinary = prev.type === 'binary-plus' || prev.type === 'binary-minus' || prev.type === 'operator';
      //   const currIsBinary = type === 'binary-plus' || type === 'binary-minus' || type === 'operator';
      //   const currIsUnary = type === 'unary-minus' || type === 'unary-plus';

      //   if (prevIsBinary && currIsBinary && !currIsUnary) {
      //     return { valid: false, error: `Invalid operator sequence: '${prev.token}' followed by '${token}'` };
      //   }
      // }
    }

    if (balance !== 0) return { valid: false, error: 'Unbalanced parentheses' };

    return { valid: true };
  }

  /**
   * Evaluate formula using mathjs with a scope of variables
   */
  evaluateFormula(formula: string, scope: Record<string, number> = {}): number | null {
    try {
      return evaluate(formula, scope);
    } catch (err) {
      return null;
    }
  }

  /**
   * Full helper: tokenize, classify, validate
   */
  parseFormula(formula: string, scope: Record<string, number> = {}) {
    const tokens = this.tokenize(formula);
    const classified = this.classifyTokens(tokens);
    const validationMathjs = this.validateFormula(formula);
    const validationCustom = this.validateTokens(classified)
    const evaluation = validationMathjs.valid ? this.evaluateFormula(formula, scope) : null;

    return {
      tokens: classified,
      validationMathjs,
      validationCustom,
      evaluation
    };
  }
}