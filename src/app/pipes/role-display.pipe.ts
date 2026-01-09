import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roleDisplay',
  standalone: false
})
export class RoleDisplayPipe implements PipeTransform {
  transform(role: string | null | undefined): string {
    if (!role) return '';
    const roleLower = role.toLowerCase().trim();
    
    if (roleLower === 'manager') return 'Team Lead';
    if (roleLower === 'head manager') return 'Project Manager';
    
    // For other roles, capitalize first letter
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }
}
