// Unified Native System & Mobile Notifications Manager
class NotificationManager {
  constructor() {
    this.isSupported = 'Notification' in window || (window.Capacitor && window.Capacitor.isPluginAvailable('LocalNotifications'));
    this.permissionGranted = false;
    this.init();
  }

  async init() {
    // Check Web Notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
      }
    }

    // Check Mobile Capacitor LocalNotifications permission
    if (window.Capacitor && window.Capacitor.Plugins?.LocalNotifications) {
      try {
        const status = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
        if (status.display === 'granted') {
          this.permissionGranted = true;
        }
      } catch (err) {
        console.warn('Capacitor notifications check:', err.message);
      }
    }
  }

  async requestPermission() {
    if (!this.isSupported) return false;

    // Mobile Capacitor permission
    if (window.Capacitor && window.Capacitor.Plugins?.LocalNotifications) {
      try {
        const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        this.permissionGranted = result.display === 'granted';
        return this.permissionGranted;
      } catch (err) {
        console.warn('Capacitor permission request:', err.message);
      }
    }

    // Web Notification permission
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        this.permissionGranted = perm === 'granted';
        return this.permissionGranted;
      } catch (err) {
        console.warn('Web notification permission error:', err.message);
      }
    }

    return false;
  }

  // Show native system or mobile notification
  async show(title, body, iconUrl = null) {
    if (!this.permissionGranted) {
      // Try to request permission if not decided
      if ('Notification' in window && Notification.permission === 'default') {
        const granted = await this.requestPermission();
        if (!granted) return;
      } else {
        return;
      }
    }

    // Mobile Native Notification (Capacitor)
    if (window.Capacitor && window.Capacitor.Plugins?.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000),
              title: title || 'New ChitChat Message',
              body: body || 'You received a new message',
              smallIcon: 'ic_stat_chitchat',
              iconColor: '#8b5cf6',
              sound: 'chime.wav'
            }
          ]
        });
        return;
      } catch (e) {
        console.warn('Capacitor schedule notification error:', e.message);
      }
    }

    // Desktop / Web Native System Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title || 'ChitChat', {
          body: body || 'You received a new message',
          icon: iconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
          silent: false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => notif.close(), 5000);
      } catch (e) {
        console.warn('Desktop notification show error:', e);
      }
    }
  }
}

window.notificationManager = new NotificationManager();
