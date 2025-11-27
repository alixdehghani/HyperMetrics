// navigation-panel.component.ts
import { Component, input } from '@angular/core';

import { RouterModule } from '@angular/router';

interface NavItem {
  name: string;
  url: string;
  image: string;
}

@Component({
  selector: 'user-navigation-panel',
  imports: [
    RouterModule
],
  template: `
    <nav class="p-1">
      <div class="flex gap-8 justify-center">
        @for (item of navItems(); track item) {
          <button
            routerLink="{{item.url}}" routerLinkActive="active-navigation-panel-tab"
            #rla="routerLinkActive"
            class="flex flex-col items-center gap-1 min-w-[60px] transition-colors rounded-lg text-xs color-[#838385] p-1 cursor-pointer">
            <img src="{{item.image}}" class="w-7 h-7" alt="">
            <span [class]="rla.isActive ? 'text-white' : 'text-[#838385]'">
              {{ item.name }}
            </span>
          </button>
        }
      </div>
    </nav>
    `,
  styleUrl: 'navigation-panel.scss'
})
export class UserNavigationPanel {

  navItems = input<NavItem[]>([]);

}