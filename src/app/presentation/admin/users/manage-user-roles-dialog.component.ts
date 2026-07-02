import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { Role } from '../../../domain/personas/models/persona.model';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';

export interface ManageUserRolesDialogData {
  user: ManagedUser;
  availableRoles: Role[];
}

@Component({
  selector: 'app-manage-user-roles-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatListModule],
  templateUrl: './manage-user-roles-dialog.component.html',
  styleUrl: './manage-user-roles-dialog.component.scss',
})
export class ManageUserRolesDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<ManageUserRolesDialogComponent, string[]>>(MatDialogRef);
  readonly data = inject<ManageUserRolesDialogData>(MAT_DIALOG_DATA);
  readonly protectedRoles = this.data.user.roles.filter((role) => role.code === 'ADMIN_TIC');

  isAssigned(roleCode: string): boolean {
    return this.data.user.roles.some((role) => role.code === roleCode);
  }

  save(list: MatSelectionList): void {
    this.dialogRef.close(list.selectedOptions.selected.map((option) => String(option.value)));
  }
}
