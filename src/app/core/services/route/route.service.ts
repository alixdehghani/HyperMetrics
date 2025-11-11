import { inject, Injectable, signal } from '@angular/core';
import { Event, EventType, RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RouteService {
    private router = inject(Router);
    isLoadingRoute = signal(false);
    private loadCount = 0;
    constructor() {
        // this.router.events.subscribe((event: Event) => {
        //     this.isLoadingRoute.set(true);
        //     console.log(event.type);
        //     console.log(event.type !== EventType.NavigationEnd);
            
        //     if (event.type !== EventType.NavigationEnd) {
        //         // this.loadCount++;
        //         // console.log(this.loadCount);
        //         // console.log(true);
                
        //         this.isLoadingRoute.set(true);
        //     }
        //     if (event.type === EventType.NavigationEnd) {
        //         // this.loadCount--;
        //         // console.log(this.loadCount);
        //         // console.log(false);
                
        //         this.isLoadingRoute.set(false);
        //     }
        // });
    }

}