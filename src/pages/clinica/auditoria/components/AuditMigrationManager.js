import { supabase } from '@/lib/customSupabaseClient';

/**
 * AuditMigrationManager - Handles migration of localStorage audit data to Supabase
 * Migrates reports, alerts, and user events from localStorage to persistent storage
 */
export class AuditMigrationManager {
  /**
   * Migrate all audit reports from localStorage to Supabase
   */
  static async migrateReports(clinicId, userId) {
    try {
      const localReports = JSON.parse(localStorage.getItem('audit_analytics') || '{}');
      console.log('📊 migrateReports - Found data:', Object.keys(localReports).length, 'keys');
      
      if (!Object.keys(localReports).length) {
        console.log('  ↳ No reports to migrate');
        return { success: true, migrated: 0 };
      }

      // Create report record in Supabase
      const reportData = {
        clinic_id: clinicId,
        user_id: userId,
        report_type: 'migration',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        period_end: new Date().toISOString(),
        data: localReports,
      };

      const { data, error } = await supabase
        .from('audit_reports')
        .insert([reportData])
        .select();

      if (error) {
        console.error('  ✗ Error migrating reports:', error);
        return { success: false, error };
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('audit_analytics');
      console.log('  ✓ Successfully migrated reports:', data.length);
      
      return { success: true, migrated: 1, data };
    } catch (err) {
      console.error('  ✗ Error in migrateReports:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Migrate all alerts from localStorage to Supabase
   */
  static async migrateAlerts(clinicId) {
    try {
      const localAlerts = JSON.parse(localStorage.getItem('audit_alerts') || '[]');
      console.log('🔔 migrateAlerts - Found data:', localAlerts.length, 'items');
      
      if (!localAlerts.length) {
        console.log('  ↳ No alerts to migrate');
        return { success: true, migrated: 0 };
      }

      // Transform alerts for Supabase format
      const alertsToInsert = localAlerts.map(alert => ({
        clinic_id: clinicId,
        alert_type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        details: alert.details || {},
        created_at: alert.timestamp || new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('audit_alerts_persistent')
        .insert(alertsToInsert)
        .select();

      if (error) {
        console.error('  ✗ Error migrating alerts:', error);
        return { success: false, error };
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('audit_alerts');
      console.log('  ✓ Successfully migrated alerts:', data.length);
      
      return { success: true, migrated: data.length, data };
    } catch (err) {
      console.error('  ✗ Error in migrateAlerts:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Migrate user audit events (login/logout logs) from localStorage to Supabase
   */
  static async migrateUserEvents(clinicId, userId) {
    try {
      const localEvents = JSON.parse(localStorage.getItem('user_audit_log') || '[]');
      console.log('👤 migrateUserEvents - Found data:', localEvents.length, 'items');
      
      if (!localEvents.length) {
        console.log('  ↳ No user events to migrate');
        return { success: true, migrated: 0 };
      }

      // Transform events for Supabase format
      const eventsToInsert = localEvents.map(event => ({
        clinic_id: clinicId,
        user_id: userId,
        email: event.email,
        event_type: event.type,
        session_duration_seconds: event.sessionDuration,
        details: event.details || {},
        created_at: event.timestamp || new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('user_audit_events')
        .insert(eventsToInsert)
        .select();

      if (error) {
        console.error('  ✗ Error migrating user events:', error);
        return { success: false, error };
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('user_audit_log');
      console.log('  ✓ Successfully migrated user events:', data.length);
      
      return { success: true, migrated: data.length, data };
    } catch (err) {
      console.error('  ✗ Error in migrateUserEvents:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Run all migrations (reports, alerts, user events)
   */
  static async runAllMigrations(clinicId, userId) {
    try {
      console.log('🔄 Starting audit data migration to Supabase...');
      
      const results = {
        reports: await this.migrateReports(clinicId, userId),
        alerts: await this.migrateAlerts(clinicId),
        userEvents: await this.migrateUserEvents(clinicId, userId),
      };

      console.log('📊 Migration results:', results);

      const totalMigrated = 
        (results.reports.migrated || 0) + 
        (results.alerts.migrated || 0) + 
        (results.userEvents.migrated || 0);

      const allSuccessful = results.reports.success && results.alerts.success && results.userEvents.success;

      if (allSuccessful) {
        console.log(`✅ Migration complete! Migrated ${totalMigrated} items`);
      } else {
        console.warn('⚠️ Migration partially completed with errors');
        console.warn('  - Reports:', results.reports.success ? `✓ ${results.reports.migrated}` : `✗ ${results.reports.error?.message}`);
        console.warn('  - Alerts:', results.alerts.success ? `✓ ${results.alerts.migrated}` : `✗ ${results.alerts.error?.message}`);
        console.warn('  - UserEvents:', results.userEvents.success ? `✓ ${results.userEvents.migrated}` : `✗ ${results.userEvents.error?.message}`);
      }

      return {
        success: allSuccessful,
        totalMigrated,
        results,
      };
    } catch (err) {
      console.error('❌ Error running migrations:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Get migration status - check if data exists in localStorage
   */
  static getMigrationStatus() {
    return {
      hasReports: JSON.parse(localStorage.getItem('audit_analytics') || '{}'),
      hasAlerts: JSON.parse(localStorage.getItem('audit_alerts') || '[]').length > 0,
      hasUserEvents: JSON.parse(localStorage.getItem('user_audit_log') || '[]').length > 0,
    };
  }

  /**
   * Fetch reports from Supabase
   */
  static async fetchReports(clinicId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching reports:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Fetch alerts from Supabase
   */
  static async fetchAlerts(clinicId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('audit_alerts_persistent')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching alerts:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Fetch user events from Supabase
   */
  static async fetchUserEvents(clinicId, userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('user_audit_events')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching user events:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Mark alert as read
   */
  static async markAlertAsRead(alertId) {
    try {
      const { error } = await supabase
        .from('audit_alerts_persistent')
        .update({ read_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error marking alert as read:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Delete old data (cleanup)
   */
  static async deleteOldData(clinicId, daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

      const results = {
        reports: await supabase
          .from('audit_reports')
          .delete()
          .eq('clinic_id', clinicId)
          .lt('created_at', cutoffDate),
        alerts: await supabase
          .from('audit_alerts_persistent')
          .delete()
          .eq('clinic_id', clinicId)
          .lt('created_at', cutoffDate),
        userEvents: await supabase
          .from('user_audit_events')
          .delete()
          .eq('clinic_id', clinicId)
          .lt('created_at', cutoffDate),
      };

      return { success: true, results };
    } catch (err) {
      console.error('Error deleting old data:', err);
      return { success: false, error: err };
    }
  }
}
