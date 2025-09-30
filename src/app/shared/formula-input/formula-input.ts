// formula-input.component.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { parse } from 'mathjs';
import { Counter } from '../../features/measure/measure.service';
interface CounterItem {
    id: string;
    name: string;
    displayName?: string;
}

interface FormulaToken {
    type: 'counter' | 'operator' | 'text';
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

    private readonly allowedOperators = /^[+\-*/()]+$/;
    private blurTimeout: any;

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
            type: 'counter',
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

        // Check if it's an operator
        if (this.allowedOperators.test(input)) {
            this.addToken({
                type: 'operator',
                value: input,
                startIndex: 0,
                endIndex: 0
            });
        } else {
            // Treat as text/invalid
            this.addToken({
                type: 'text',
                value: input,
                startIndex: 0,
                endIndex: 0
            });
        }

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
        // Simple parsing - you might want to make this more sophisticated
        const tokens = formula.match(/(\w+|[+\-*/()]|\s+)/g) || [];

        this.formulaTokens = tokens
            .filter(token => token.trim())
            .map((token, index) => {
                const trimmedToken = token.trim();
                const counter = this.counters.find(c => c.name === trimmedToken);

                if (counter) {
                    return {
                        type: 'counter' as const,
                        value: counter.name,
                        id: counter.id,
                        startIndex: index,
                        endIndex: index
                    };
                } else if (this.allowedOperators.test(trimmedToken)) {
                    return {
                        type: 'operator' as const,
                        value: trimmedToken,
                        startIndex: index,
                        endIndex: index
                    };
                } else {
                    return {
                        type: 'text' as const,
                        value: trimmedToken,
                        startIndex: index,
                        endIndex: index
                    };
                }
            });

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
        // Basic validation
        let isValid = true;
        let errorMessage = '';

        // Check for invalid characters in text tokens
        const textTokens = this.formulaTokens.filter(t => t.type === 'text');
        if (textTokens.length > 0) {
            const invalidTokens = textTokens.filter(t => isNaN(Number(t.value)));
            if (invalidTokens.length > 0) {
            isValid = false;
            errorMessage = `Invalid tokens: ${invalidTokens.map(t => t.value).join(', ')}`;
            }
        }

        // Check for balanced parentheses
        const formulaStr = this.formulaTokens.map(t => t.value).join(' ');
        try {
            parse(formulaStr);
        } catch (err: any) {
            isValid = false;
            errorMessage = err?.message || 'Invalid formula syntax';
        }

        this.validationError = errorMessage;
        this.validationChange.emit(isValid);
    }
}
