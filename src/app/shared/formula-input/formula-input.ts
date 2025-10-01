// formula-input.component.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, inject, Input, Output, Type, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormulaParserService } from '../../core/helper/formula-helper';
import { ClassifiedToken, TokenType } from '../../core/interfaces/classified-token.interface';
interface CounterItem {
    id: string;
    name: string;
    displayName?: string;
}

interface FormulaToken {
    type: TokenType;
    value: string;
    id?: string;
    startIndex: number;
    endIndex: number;
}
@Component({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    selector: 'math-formula-autocomplete',
    templateUrl: './formula-input.html',
})
export class FormulaInput {
    @Input() counters: CounterItem[] = [];
    @Input() placeholder: string = 'Enter math formula...';
    @Input() initialValue: string = '';
    @Output() formulaChange = new EventEmitter<string>();
    @Output() validationChange = new EventEmitter<boolean>();

    @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;
    @ViewChild('formulaDisplay') formulaDisplay!: ElementRef<HTMLDivElement>;

    currentInput: string = '';
    showSuggestions: boolean = false;
    filteredCounters: CounterItem[] = [];
    selectedSuggestionIndex: number = -1;
    formulaTokens: FormulaToken[] = [];
    validationError: string = '';

    private blurTimeout: any;
    private formulaParser = inject(FormulaParserService);
    ngOnInit() {
        if (this.initialValue) {
            this.parseInitialFormula(this.initialValue);
        }
    }

    ngOnDestroy() {
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout);
        }
    }

    onInputChange(event: any) {
        const value = event.target.value;
        this.currentInput = value;

        if (value.trim()) {
            this.filterCounters(value);
            this.showSuggestions = true;
            this.selectedSuggestionIndex = -1;
        } else {
            this.showSuggestions = false;
        }

        this.validateFormula();
    }

    onInputFocus() {
        if (this.currentInput.trim()) {
            this.filterCounters(this.currentInput);
            this.showSuggestions = true;
        }
    }

    onInputBlur() {
        // Delay hiding suggestions to allow for click events
        this.blurTimeout = setTimeout(() => {
            this.showSuggestions = false;
        }, 150);
    }

    onKeyDown(event: KeyboardEvent) {
        if (!this.showSuggestions) {
            if (event.key === 'Enter' || event.key === ' ') {
                this.processCurrentInput();
                return;
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedSuggestionIndex =
                    (this.selectedSuggestionIndex + 1) % this.filteredCounters.length;
                break;

            case 'ArrowUp':
                event.preventDefault();
                this.selectedSuggestionIndex =
                    this.selectedSuggestionIndex <= 0
                        ? this.filteredCounters.length - 1
                        : this.selectedSuggestionIndex - 1;
                break;

            case 'Enter':
                event.preventDefault();
                if (this.selectedSuggestionIndex >= 0) {
                    this.selectCounter(this.filteredCounters[this.selectedSuggestionIndex]);
                } else if (this.filteredCounters.length > 0) {
                    this.selectCounter(this.filteredCounters[0]);
                } else {
                    this.processCurrentInput();
                }
                break;

            case 'Escape':
                event.preventDefault();
                this.showSuggestions = false;
                break;

            case ' ':
                event.preventDefault();
                this.processCurrentInput();
                break;
        }
    }

    focusInput() {
        this.inputField.nativeElement.focus();
    }

    filterCounters(searchTerm: string) {
        const term = searchTerm.toLowerCase().trim();
        this.filteredCounters = this.counters.filter(counter =>
            counter.name.toLowerCase().includes(term) ||
            (counter.displayName && counter.displayName.toLowerCase().includes(term))
        );
    }

    selectCounter(counter: CounterItem) {
        this.addToken({
            type: 'identifier',
            value: counter.name,
            id: counter.id,
            startIndex: 0,
            endIndex: 0
        });

        this.currentInput = '';
        this.showSuggestions = false;
        this.selectedSuggestionIndex = -1;

        // Focus back to input
        setTimeout(() => this.focusInput(), 10);
    }

    processCurrentInput() {
        
        const input = this.currentInput.trim();
        if (!input) return;
        const scope = this.counters.reduce((acc, c) => {
            acc[c.name] = 1;
            return acc;
        }, {} as Record<string, number>);

        const result = this.formulaParser.parseFormula(input, scope);
        const tokens = result.tokens;
        this.formulaTokens = [...this.formulaTokens, ...tokens.map((t, index) => ({
            type: t.type,
            value: t.token,
            id: this.counters.find(c => c.name === t.token)?.id,
            startIndex: this.formulaTokens.length + 1 + index,
            endIndex: this.formulaTokens.length + 1 + index
        }))];        
        this.emitFormulaChange();
        this.validateFormula();
        this.currentInput = '';
        this.showSuggestions = false;
    }

    addToken(token: FormulaToken) {
        this.formulaTokens.push(token);
        this.emitFormulaChange();
        this.validateFormula();
    }

    removeToken(index: number) {
        this.formulaTokens.splice(index, 1);
        
        this.emitFormulaChange();
        this.validateFormula();
        this.focusInput();
    }

    private parseInitialFormula(formula: string) {
        const scope = this.counters.reduce((acc, c) => {
            acc[c.name] = 1;
            return acc;
        }, {} as Record<string, number>);

        const result = this.formulaParser.parseFormula(formula, scope);
        const tokens = result.tokens;
        this.formulaTokens = tokens.map((t, index) => ({
            type: t.type,
            value: t.token,
            id: this.counters.find(c => c.name === t.token)?.id,
            startIndex: index,
            endIndex: index
        }));
        
        this.emitFormulaChange();
        this.validateFormula();

    }

    private emitFormulaChange() {
        const formula = this.formulaTokens
            .map(token => token.value)
            .join(' ');
        this.formulaChange.emit(formula);
    }

    private validateFormula() {
        const scope = this.counters.reduce((acc, c) => {
            acc[c.name] = 1;
            return acc;
        }, {} as Record<string, number>);
        const currentInput = this.formulaTokens.map(f => f.value).join(' ')
        const result = this.formulaParser.parseFormula(currentInput, scope);        
        const validationMathjs = result.validationMathjs;
        const validationCustom = result.validationCustom;
        const isValid = validationMathjs.valid && validationCustom.valid;
        const errorMessage = [validationMathjs.error || '' , validationCustom.error || ''].join(' ') || '';
        this.validationError = errorMessage;
        this.validationChange.emit(isValid);
    }
}
