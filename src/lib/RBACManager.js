import { supabase } from './customSupabaseClient';

/**
 * RBACManager
 * Manages Role-Based Access Control for Gesclinic
 * Roles: 'admin', 'auditor', 'editor', 'viewer'
 */
export class RBACManager {
  /**
   * Get user's role in a specific clinic
   */
  static async getUserRole(userId, clinicId) {
    try {
      const { data, error } = await supabase
        .from('user_clinic_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('clinic_id', clinicId)
        .single();

      if (error) {
        console.warn('[RBAC] Role not found:', error);
        return 'viewer'; // Default to viewer
      }

      return data?.role || 'viewer';
    } catch (error) {
      console.error('[RBAC] Error fetching role:', error);
      return 'viewer';
    }
  }

  /**
   * Check if user has permission for action
   */
  static hasPermission(role, action) {
    const permissions = {
      admin: ['select', 'insert', 'update', 'delete'],
      auditor: ['select', 'insert'],
      editor: ['select', 'insert', 'update'],
      viewer: ['select'],
    };

    const userPerms = permissions[role] || permissions.viewer;
    return userPerms.includes(action);
  }

  /**
   * Check if user can perform action on resource
   */
  static async canPerform(userId, clinicId, action) {
    const role = await this.getUserRole(userId, clinicId);
    return this.hasPermission(role, action);
  }

  /**
   * Assign role to user in clinic
   */
  static async assignRole(userId, clinicId, role) {
    // Validate role
    const validRoles = ['admin', 'auditor', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    try {
      const { data, error } = await supabase
        .from('user_clinic_roles')
        .upsert(
          {
            user_id: userId,
            clinic_id: clinicId,
            role,
            updated_at: new Date(),
          },
          {
            onConflict: 'user_id,clinic_id',
          }
        );

      if (error) throw error;

      console.log(`✅ [RBAC] Role assigned: ${userId} -> ${role}`);
      return data;
    } catch (error) {
      console.error('[RBAC] Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Remove user from clinic
   */
  static async removeUserFromClinic(userId, clinicId) {
    try {
      const { error } = await supabase
        .from('user_clinic_roles')
        .delete()
        .eq('user_id', userId)
        .eq('clinic_id', clinicId);

      if (error) throw error;

      console.log(`✅ [RBAC] User removed from clinic`);
    } catch (error) {
      console.error('[RBAC] Error removing user:', error);
      throw error;
    }
  }

  /**
   * Get all users in clinic with their roles
   */
  static async getClinicUsers(clinicId) {
    try {
      const { data, error } = await supabase
        .from('user_clinic_roles')
        .select(
          `
          user_id,
          role,
          updated_at,
          auth_user:user_id (
            email
          )
        `
        )
        .eq('clinic_id', clinicId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[RBAC] Error fetching clinic users:', error);
      return [];
    }
  }

  /**
   * Get role statistics for clinic
   */
  static async getClinicRoleStats(clinicId) {
    try {
      const users = await this.getClinicUsers(clinicId);

      const stats = {
        admin: users.filter(u => u.role === 'admin').length,
        auditor: users.filter(u => u.role === 'auditor').length,
        editor: users.filter(u => u.role === 'editor').length,
        viewer: users.filter(u => u.role === 'viewer').length,
        total: users.length,
      };

      return stats;
    } catch (error) {
      console.error('[RBAC] Error fetching role stats:', error);
      return null;
    }
  }

  /**
   * Get role description
   */
  static getRoleDescription(role) {
    const descriptions = {
      admin: 'Full administrative access - can create, read, update, and delete all data',
      auditor: 'Can create audit reports and view deletion logs, but cannot delete data',
      editor: 'Can create and edit data, but cannot permanently delete records',
      viewer: 'Read-only access to audit data and reports',
    };

    return descriptions[role] || 'Unknown role';
  }

  /**
   * Get role permissions
   */
  static getRolePermissions(role) {
    const permissions = {
      admin: {
        select: true,
        insert: true,
        update: true,
        delete: true,
        manage_roles: true,
        view_audit_log: true,
      },
      auditor: {
        select: true,
        insert: true,
        update: false,
        delete: false,
        manage_roles: false,
        view_audit_log: true,
      },
      editor: {
        select: true,
        insert: true,
        update: true,
        delete: false,
        manage_roles: false,
        view_audit_log: false,
      },
      viewer: {
        select: true,
        insert: false,
        update: false,
        delete: false,
        manage_roles: false,
        view_audit_log: false,
      },
    };

    return permissions[role] || permissions.viewer;
  }

  /**
   * Check if action is allowed based on user's current role
   */
  static async isActionAllowed(userId, clinicId, action, resource = null) {
    try {
      const role = await this.getUserRole(userId, clinicId);
      const permissions = this.getRolePermissions(role);

      // Check basic action permission
      if (!permissions[action]) {
        return false;
      }

      // Special cases for resource-specific checks
      if (resource === 'audit_log' && action === 'select') {
        return permissions.view_audit_log;
      }

      if (resource === 'user_roles' && action === 'update') {
        return permissions.manage_roles;
      }

      return true;
    } catch (error) {
      console.error('[RBAC] Error checking action permission:', error);
      return false;
    }
  }

  /**
   * Generate RBAC audit report
   */
  static async generateRBACReport(clinicId) {
    try {
      const users = await this.getClinicUsers(clinicId);
      const stats = await this.getClinicRoleStats(clinicId);

      const report = {
        clinic_id: clinicId,
        generated_at: new Date(),
        statistics: stats,
        users: users.map(u => ({
          user_id: u.user_id,
          email: u.auth_user?.email || 'Unknown',
          role: u.role,
          permissions: this.getRolePermissions(u.role),
          assigned_at: u.updated_at,
        })),
      };

      return report;
    } catch (error) {
      console.error('[RBAC] Error generating report:', error);
      return null;
    }
  }

  /**
   * Export RBAC report to JSON
   */
  static async exportRBACReport(clinicId) {
    try {
      const report = await this.generateRBACReport(clinicId);

      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rbac_report_${clinicId}_${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      console.log('📥 [RBAC] Report exported');
    } catch (error) {
      console.error('[RBAC] Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Generate RBAC summary string for debugging
   */
  static async generateSummary(userId, clinicId) {
    try {
      const role = await this.getUserRole(userId, clinicId);
      const permissions = this.getRolePermissions(role);

      return `
╔════════════════════════════════════════╗
║     USER RBAC CONFIGURATION            ║
╠════════════════════════════════════════╣
║ User ID:    ${userId}
║ Clinic ID:  ${clinicId}
║ Role:       ${role}
║ Status:     ${role !== 'viewer' ? 'Active' : 'Limited'}
╠════════════════════════════════════════╣
║ PERMISSIONS:                           ║
║ - Select:   ${permissions.select ? '✓' : '✗'}                         ║
║ - Insert:   ${permissions.insert ? '✓' : '✗'}                         ║
║ - Update:   ${permissions.update ? '✓' : '✗'}                         ║
║ - Delete:   ${permissions.delete ? '✓' : '✗'}                         ║
║ - Audit:    ${permissions.view_audit_log ? '✓' : '✗'}                         ║
║ - Roles:    ${permissions.manage_roles ? '✓' : '✗'}                         ║
╠════════════════════════════════════════╣
║ ${this.getRoleDescription(role)}
╚════════════════════════════════════════╝
      `.trim();
    } catch (error) {
      console.error('[RBAC] Error generating summary:', error);
      return 'Error generating RBAC summary';
    }
  }
}

export default RBACManager;
