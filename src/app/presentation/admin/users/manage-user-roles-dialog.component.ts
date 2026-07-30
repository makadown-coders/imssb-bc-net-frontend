import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo, lucideLockKeyhole } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { Role } from '../../../domain/personas/models/persona.model';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';

export interface ManageUserRolesDialogData {
  user: ManagedUser;
  availableRoles: Role[];
}

@Component({
  selector: 'app-manage-user-roles-dialog',
  imports: [NgIcon, HlmButton, HlmCheckbox],
  providers: [provideIcons({ lucideInfo, lucideLockKeyhole })],
  templateUrl: './manage-user-roles-dialog.component.html',
  styleUrl: './manage-user-roles-dialog.component.scss',
})
export class ManageUserRolesDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<string[]>>(BrnDialogRef);
  readonly data = injectBrnDialogContext<ManageUserRolesDialogData>();
  readonly protectedRoles = this.data.user.roles.filter((role) => role.code === 'ADMIN_TIC');
  readonly selectedRoles = signal(new Set(this.data.user.roles.filter((role) => role.code !== 'ADMIN_TIC').map((role) => role.code)));

  isAssigned(roleCode: string): boolean {
    return this.data.user.roles.some((role) => role.code === roleCode);
  }

  toggle(roleCode: string, selected: boolean): void { const next = new Set(this.selectedRoles()); selected ? next.add(roleCode) : next.delete(roleCode); this.selectedRoles.set(next); }
  cancel(): void { this.dialogRef.close(); }
  save(): void { this.dialogRef.close([...this.selectedRoles()]); }
}
