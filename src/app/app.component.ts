import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'time-tracking';
  private routerSubscription?: Subscription;
  private authSubscription?: Subscription;
  private wasOnLogin = false;
  showNavbar = false;

  private handlePopState = (event: PopStateEvent) => {
    const isLoggedIn = !!this.auth.getToken();
    const atLogin = this.router.url.startsWith('/login');

    // If on login page and not logged in, prevent forward navigation
    if (atLogin && !isLoggedIn) {
      // Prevent forward navigation - stay on login page
      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 0);
      return;
    }

    // If user is logged in and not already on login page, confirm before going back
    if (isLoggedIn && !atLogin) {
      const confirmLogout = window.confirm('Do you want to logout?');
      if (confirmLogout) {
        this.auth.logout();
        this.router.navigate(['/login']);
      } else {
        // Cancel back navigation by moving forward again
        history.forward();
      }
    }
  };

  constructor(public auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Update navbar visibility based on route and login state
    const updateNavbarVisibility = () => {
      const isLoggedIn = !!this.auth.getToken();
      const atLogin = this.router.url.startsWith('/login');
      // Show navbar if logged in and not on login page
      this.showNavbar = isLoggedIn && !atLogin;
      this.cdr.detectChanges();
    };

    // Update on route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        updateNavbarVisibility();
      });

    // Update on auth state changes
    this.authSubscription = this.auth.isLoggedIn$.subscribe(() => {
      updateNavbarVisibility();
    });

    // Initial check
    updateNavbarVisibility();

    window.addEventListener('popstate', this.handlePopState);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.handlePopState);
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}