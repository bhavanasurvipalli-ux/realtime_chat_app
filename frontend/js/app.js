// ==========================================================================
// ChitChat — WhatsApp Mobile App Controller
// ==========================================================================

const MIC_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
const SEND_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;

document.addEventListener('DOMContentLoaded', () => {
  const WA = {
    currentUser: null,
    activeRoom: null,
    rooms: [],
    users: [],
    currentFilter: 'all',
    currentTab: 'chats',
    typingTimeout: null,
    isTyping: false,
    currentAttachment: null,
    selectedGroupIcon: '💬',

    // Voice Notes State
    isRecordingVoice: false,
    mediaRecorder: null,
    audioChunks: [],
    voiceStream: null,
    recordingTimerInterval: null,
    recordingSeconds: 0,
    shouldSendRecordedVoice: false,

    // Camera State
    currentCameraFacing: 'user',
    cameraStream: null,
    capturedPhotoData: null,

    // DOM Elements Cache
    el: {
      // Screens
      mainScreen: document.getElementById('main-screen'),
      chatScreen: document.getElementById('chat-screen'),

      // Top Bar & Menu
      cameraBtn: document.getElementById('camera-btn'),
      searchToggleBtn: document.getElementById('search-toggle-btn'),
      moreMenuBtn: document.getElementById('more-menu-btn'),
      waMenuDropdown: document.getElementById('wa-menu-dropdown'),
      menuNewGroup: document.getElementById('menu-new-group'),
      menuSoundToggle: document.getElementById('menu-sound-toggle'),
      soundStateLabel: document.getElementById('sound-state-label'),
      menuProfile: document.getElementById('menu-profile'),
      menuLogout: document.getElementById('menu-logout'),

      // Search & Filters
      waSearchInput: document.getElementById('wa-search-input'),
      filterChips: document.querySelectorAll('.wa-filter-chips .chip'),
      waChatList: document.getElementById('wa-chat-list'),
      navUnreadCount: document.getElementById('nav-unread-count'),

      // Tab Pages & Nav Tabs
      navTabs: document.querySelectorAll('.wa-bottom-nav .nav-tab'),
      tabChatsContent: document.getElementById('tab-chats-content'),
      tabUpdatesContent: document.getElementById('tab-updates-content'),
      tabCommunitiesContent: document.getElementById('tab-communities-content'),
      tabCallsContent: document.getElementById('tab-calls-content'),
      tabYouContent: document.getElementById('tab-you-content'),

      // FAB Buttons
      aiFabBtn: document.getElementById('ai-fab-btn'),
      newChatFabBtn: document.getElementById('new-chat-fab-btn'),
      openCreateGroupBtn: document.getElementById('open-create-group-btn'),

      // You / Profile Tab Elements
      navMyAvatar: document.getElementById('nav-my-avatar'),
      youAvatar: document.getElementById('you-avatar'),
      youUsername: document.getElementById('you-username'),
      youRoleBadge: document.getElementById('you-role-badge'),
      youStatus: document.getElementById('you-status'),
      youStatusPreview: document.getElementById('you-status-preview'),
      btnEditStatus: document.getElementById('btn-edit-status'),
      btnSoundSettings: document.getElementById('btn-sound-settings'),
      btnLogoutYou: document.getElementById('btn-logout-you'),
      myStatusAvatar: document.getElementById('my-status-avatar'),
      updatesList: document.getElementById('updates-list'),

      // In-Chat Screen
      chatBackBtn: document.getElementById('chat-back-btn'),
      chatHeaderAvatar: document.getElementById('chat-header-avatar'),
      chatHeaderName: document.getElementById('chat-header-name'),
      chatHeaderRole: document.getElementById('chat-header-role'),
      chatHeaderStatus: document.getElementById('chat-header-status'),
      messagesContainer: document.getElementById('messages-container'),
      messagesList: document.getElementById('messages-list'),
      chatTypingBubble: document.getElementById('chat-typing-bubble'),

      // In-Chat Input Dock & Voice Recording
      inputPillWrapper: document.getElementById('input-pill-wrapper'),
      messageInput: document.getElementById('message-input'),
      voiceRecordingDock: document.getElementById('voice-recording-dock'),
      recordingTimer: document.getElementById('recording-timer'),
      discardVoiceBtn: document.getElementById('discard-voice-btn'),
      sendBtn: document.getElementById('send-btn'),
      sendBtnIcon: document.getElementById('send-btn-icon'),
      emojiToggleBtn: document.getElementById('emoji-toggle-btn'),
      emojiPopup: document.getElementById('emoji-popup'),
      imageUploadInput: document.getElementById('image-upload-input'),
      cameraDockBtn: document.getElementById('camera-dock-btn'),
      attachmentPreview: document.getElementById('attachment-preview'),
      attachmentImg: document.getElementById('attachment-img'),
      attachmentFilename: document.getElementById('attachment-filename'),
      removeAttachmentBtn: document.getElementById('remove-attachment-btn'),

      // Camera Modal
      cameraModal: document.getElementById('camera-modal'),
      cameraVideoStream: document.getElementById('camera-video-stream'),
      cameraCaptureCanvas: document.getElementById('camera-capture-canvas'),
      closeCameraModalBtn: document.getElementById('close-camera-modal-btn'),
      flipCameraBtn: document.getElementById('flip-camera-btn'),
      cameraShutterBtn: document.getElementById('camera-shutter-btn'),
      cameraSnapPreview: document.getElementById('camera-snap-preview'),
      cameraPreviewImg: document.getElementById('camera-preview-img'),
      cameraRetakeBtn: document.getElementById('camera-retake-btn'),
      cameraSendBtn: document.getElementById('camera-send-btn'),

      // Permissions Center
      btnPermissionsCenter: document.getElementById('btn-permissions-center'),
      permissionsModal: document.getElementById('permissions-modal'),
      closePermissionsBtn: document.getElementById('close-permissions-btn'),
      donePermissionsBtn: document.getElementById('done-permissions-btn'),
      badgePermNotif: document.getElementById('badge-perm-notif'),
      badgePermMic: document.getElementById('badge-perm-mic'),
      badgePermCam: document.getElementById('badge-perm-cam'),
      btnRequestNotif: document.getElementById('btn-request-notif'),
      btnRequestMic: document.getElementById('btn-request-mic'),
      btnRequestCam: document.getElementById('btn-request-cam'),

      // Auth Modal
      authModal: document.getElementById('auth-modal'),
      authAlert: document.getElementById('auth-alert'),
      tabLogin: document.getElementById('tab-login'),
      tabRegister: document.getElementById('tab-register'),
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      loginIdentifier: document.getElementById('login-identifier'),
      loginPassword: document.getElementById('login-password'),
      registerUsername: document.getElementById('register-username'),
      registerEmail: document.getElementById('register-email'),
      registerPassword: document.getElementById('register-password'),
      registerRole: document.getElementById('register-role'),
      registerStatus: document.getElementById('register-status'),

      // New Group Modal
      createRoomModal: document.getElementById('create-room-modal'),
      closeCreateRoomBtn: document.getElementById('close-create-room-btn'),
      cancelRoomBtn: document.getElementById('cancel-room-btn'),
      createRoomForm: document.getElementById('create-room-form'),
      roomNameInput: document.getElementById('room-name-input'),
      roomDescInput: document.getElementById('room-desc-input'),
      roomIconSelector: document.getElementById('room-icon-selector'),

      // Lightbox
      imageLightbox: document.getElementById('image-lightbox'),
      lightboxImg: document.getElementById('lightbox-img'),
      closeLightboxBtn: document.getElementById('close-lightbox-btn')
    },

    init() {
      this.bindEvents();
      this.checkSoundState();
      this.updateSendButtonMode();
      this.initAuthSession();
    },

    bindEvents() {
      // Bottom Navigation Tabs
      this.el.navTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const tabName = tab.getAttribute('data-tab');
          this.switchTab(tabName);
        });
      });

      // Filter Chips (All, Unread, Groups, Direct)
      this.el.filterChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          this.el.filterChips.forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          this.currentFilter = chip.getAttribute('data-filter') || 'all';
          this.renderChatList();
        });
      });

      // Search Input
      this.el.waSearchInput.addEventListener('input', () => {
        this.renderChatList();
      });

      // Top Menu Dropdown
      this.el.moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.waMenuDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!this.el.waMenuDropdown.contains(e.target) && e.target !== this.el.moreMenuBtn) {
          this.el.waMenuDropdown.classList.add('hidden');
        }
      });

      this.el.menuNewGroup.addEventListener('click', () => {
        this.el.waMenuDropdown.classList.add('hidden');
        this.openNewGroupModal();
      });

      this.el.menuSoundToggle.addEventListener('click', () => {
        this.toggleSound();
      });

      this.el.menuProfile.addEventListener('click', () => {
        this.el.waMenuDropdown.classList.add('hidden');
        this.switchTab('you');
      });

      this.el.menuLogout.addEventListener('click', () => this.logout());
      this.el.btnLogoutYou.addEventListener('click', () => this.logout());

      // Back button in chat view -> returns to chat list
      this.el.chatBackBtn.addEventListener('click', () => {
        this.closeChatScreen();
      });

      // FAB Buttons
      this.el.newChatFabBtn.addEventListener('click', () => {
        this.openNewGroupModal();
      });
      if (this.el.openCreateGroupBtn) {
        this.el.openCreateGroupBtn.addEventListener('click', () => {
          this.openNewGroupModal();
        });
      }

      // Meta AI FAB (Quick Greeting Assistant)
      this.el.aiFabBtn.addEventListener('click', () => {
        this.handleMetaAiClick();
      });

      // In-Chat Message Input
      this.el.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      this.el.messageInput.addEventListener('input', () => {
        this.handleTypingInput();
        this.updateSendButtonMode();
      });

      // Dynamic Mic / Send Circular Button
      this.el.sendBtn.addEventListener('click', () => {
        if (this.isRecordingVoice) {
          this.stopVoiceRecording(true);
        } else if (this.el.messageInput.value.trim().length > 0 || this.currentAttachment) {
          this.handleSendMessage();
        } else {
          this.startVoiceRecording();
        }
      });

      // Discard Voice Note Button
      this.el.discardVoiceBtn.addEventListener('click', () => {
        this.stopVoiceRecording(false);
      });

      // Camera Viewfinder & Shutter Events
      this.el.cameraBtn.addEventListener('click', () => this.openCameraModal());
      this.el.cameraDockBtn.addEventListener('click', () => this.openCameraModal());
      this.el.closeCameraModalBtn.addEventListener('click', () => this.closeCameraModal());
      this.el.flipCameraBtn.addEventListener('click', () => this.flipCamera());
      this.el.cameraShutterBtn.addEventListener('click', () => this.captureCameraPhoto());
      this.el.cameraRetakeBtn.addEventListener('click', () => this.retakeCameraPhoto());
      this.el.cameraSendBtn.addEventListener('click', () => this.sendCapturedCameraPhoto());

      // Permissions Center Events
      this.el.btnPermissionsCenter.addEventListener('click', () => this.openPermissionsModal());
      this.el.closePermissionsBtn.addEventListener('click', () => this.closePermissionsModal());
      this.el.donePermissionsBtn.addEventListener('click', () => this.closePermissionsModal());
      this.el.btnRequestNotif.addEventListener('click', () => this.testOrRequestNotification());
      this.el.btnRequestMic.addEventListener('click', () => this.testOrRequestMicrophone());
      this.el.btnRequestCam.addEventListener('click', () => this.testOrRequestCamera());

      // Emoji Toggle
      this.el.emojiToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.emojiPopup.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!this.el.emojiPopup.contains(e.target) && e.target !== this.el.emojiToggleBtn) {
          this.el.emojiPopup.classList.add('hidden');
        }
      });

      this.el.emojiPopup.querySelectorAll('span').forEach((emoji) => {
        emoji.addEventListener('click', () => {
          this.el.messageInput.value += emoji.textContent;
          this.el.messageInput.focus();
        });
      });

      // Image attachment
      this.el.imageUploadInput.addEventListener('change', (e) => this.handleImageSelect(e));
      this.el.removeAttachmentBtn.addEventListener('click', () => this.clearAttachment());

      // Lightbox Close
      this.el.closeLightboxBtn.addEventListener('click', () => {
        this.el.imageLightbox.classList.add('hidden');
      });

      // Auth Tabs & Forms
      this.el.tabLogin.addEventListener('click', () => this.switchAuthTab('login'));
      this.el.tabRegister.addEventListener('click', () => this.switchAuthTab('register'));
      this.el.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      this.el.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

      // Demo login buttons
      document.querySelectorAll('.wa-demo-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          const userKey = btn.getAttribute('data-user');
          this.handleDemoLogin(userKey);
        });
      });

      // Group Modal
      this.el.closeCreateRoomBtn.addEventListener('click', () => {
        this.el.createRoomModal.classList.add('hidden');
      });
      this.el.cancelRoomBtn.addEventListener('click', () => {
        this.el.createRoomModal.classList.add('hidden');
      });
      this.el.createRoomForm.addEventListener('submit', (e) => this.handleCreateRoom(e));

      this.el.roomIconSelector.addEventListener('click', (e) => {
        const choice = e.target.closest('.icon-pick');
        if (!choice) return;
        document.querySelectorAll('.icon-pick').forEach((c) => c.classList.remove('active'));
        choice.classList.add('active');
        this.selectedGroupIcon = choice.getAttribute('data-icon') || '💬';
      });
    },

    // --- Tab Switching ---
    switchTab(tabName) {
      this.currentTab = tabName;

      // Update Nav Tab UI
      this.el.navTabs.forEach((t) => {
        if (t.getAttribute('data-tab') === tabName) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });

      // Hide all pages
      this.el.tabChatsContent.classList.add('hidden');
      this.el.tabUpdatesContent.classList.add('hidden');
      this.el.tabCommunitiesContent.classList.add('hidden');
      this.el.tabCallsContent.classList.add('hidden');
      this.el.tabYouContent.classList.add('hidden');

      // Show selected page
      if (tabName === 'chats') this.el.tabChatsContent.classList.remove('hidden');
      if (tabName === 'updates') {
        this.el.tabUpdatesContent.classList.remove('hidden');
        this.renderStatusUpdates();
      }
      if (tabName === 'communities') this.el.tabCommunitiesContent.classList.remove('hidden');
      if (tabName === 'calls') this.el.tabCallsContent.classList.remove('hidden');
      if (tabName === 'you') this.el.tabYouContent.classList.remove('hidden');
    },

    // --- Auth Management ---
    async initAuthSession() {
      if (window.api.token) {
        try {
          const res = await window.api.getMe();
          this.currentUser = res.user;
          this.onAuthenticated();
          return;
        } catch (err) {
          window.api.clearSession();
        }
      }
      this.showAuthModal();
    },

    showAuthModal() {
      this.el.authModal.classList.remove('hidden');
    },

    hideAuthModal() {
      this.el.authModal.classList.add('hidden');
      this.el.authAlert.classList.add('hidden');
    },

    switchAuthTab(tab) {
      if (tab === 'login') {
        this.el.tabLogin.classList.add('active');
        this.el.tabRegister.classList.remove('active');
        this.el.loginForm.classList.remove('hidden');
        this.el.registerForm.classList.add('hidden');
      } else {
        this.el.tabLogin.classList.remove('active');
        this.el.tabRegister.classList.add('active');
        this.el.loginForm.classList.add('hidden');
        this.el.registerForm.classList.remove('hidden');
      }
    },

    async handleLogin(e) {
      e.preventDefault();
      const login = this.el.loginIdentifier.value.trim();
      const password = this.el.loginPassword.value.trim();

      try {
        const res = await window.api.login(login, password);
        this.currentUser = res.user;
        this.hideAuthModal();
        this.onAuthenticated();
      } catch (err) {
        this.el.authAlert.textContent = err.message || 'Login failed';
        this.el.authAlert.classList.remove('hidden');
      }
    },

    async handleRegister(e) {
      e.preventDefault();
      const username = this.el.registerUsername.value.trim();
      const email = this.el.registerEmail.value.trim();
      const password = this.el.registerPassword.value.trim();
      const role = this.el.registerRole?.value || 'Member';
      const status = this.el.registerStatus.value.trim();

      try {
        const res = await window.api.register(username, email, password, status, role);
        this.currentUser = res.user;
        this.hideAuthModal();
        this.onAuthenticated();
      } catch (err) {
        this.el.authAlert.textContent = err.message || 'Registration failed';
        this.el.authAlert.classList.remove('hidden');
      }
    },

    async handleDemoLogin(userKey) {
      let username, email, password, role;
      if (userKey === 'ada') {
        username = 'Ada Lovelace';
        email = 'ada@chitchat.dev';
        password = 'password123';
        role = 'Admin';
      } else if (userKey === 'alan') {
        username = 'Alan Turing';
        email = 'alan@chitchat.dev';
        password = 'password123';
        role = 'Dev';
      } else {
        const randId = Math.floor(1000 + Math.random() * 9000);
        username = `Guest_${randId}`;
        email = `guest${randId}@chitchat.dev`;
        password = 'guestpassword';
        role = 'VIP';
      }

      try {
        const res = await window.api.login(email, password);
        this.currentUser = res.user;
        this.hideAuthModal();
        this.onAuthenticated();
      } catch (err) {
        try {
          const regRes = await window.api.register(username, email, password, 'Hey! I am using ChitChat.', role);
          this.currentUser = regRes.user;
          this.hideAuthModal();
          this.onAuthenticated();
        } catch (regErr) {
          this.el.authAlert.textContent = regErr.message;
          this.el.authAlert.classList.remove('hidden');
        }
      }
    },

    logout() {
      window.socketManager.disconnect();
      window.api.clearSession();
      window.location.reload();
    },

    // --- On Authenticated ---
    onAuthenticated() {
      // Set User Profile Card & Navigation Avatar
      const avatarUrl = this.currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${this.currentUser.username}`;
      this.el.navMyAvatar.src = avatarUrl;
      this.el.youAvatar.src = avatarUrl;
      this.el.youUsername.textContent = this.currentUser.username;
      this.el.youRoleBadge.textContent = this.currentUser.role || 'Member';
      this.el.youStatus.textContent = this.currentUser.statusMessage || 'Hey there! I am using ChitChat.';
      this.el.youStatusPreview.textContent = this.currentUser.statusMessage || 'Hey there! I am using ChitChat.';
      this.el.myStatusAvatar.src = avatarUrl;

      // Connect Socket.IO
      window.socketManager.connect(window.api.token);
      this.setupSocketListeners();

      // Request Notifications
      if (window.notificationManager) {
        window.notificationManager.requestPermission();
      }

      // Load Conversations
      this.loadRooms();
    },

    setupSocketListeners() {
      window.socketManager.on('online_users_updated', () => {
        this.renderChatList();
      });

      window.socketManager.on('new_message', (message) => {
        this.onNewMessage(message);
      });

      window.socketManager.on('typing_start', (data) => {
        if (this.activeRoom && this.activeRoom._id.toString() === data.roomId.toString()) {
          this.el.chatHeaderStatus.textContent = `${data.user.username} is typing...`;
          this.el.chatTypingBubble.classList.remove('hidden');
        }
      });

      window.socketManager.on('typing_stop', (data) => {
        if (this.activeRoom && this.activeRoom._id.toString() === data.roomId.toString()) {
          this.updateChatHeaderOnlineState();
          this.el.chatTypingBubble.classList.add('hidden');
        }
      });
    },

    // --- Load & Render WhatsApp Chat Feed ---
    async loadRooms() {
      try {
        const res = await window.api.getRooms();
        this.rooms = res.rooms || [];
        this.renderChatList();
      } catch (err) {
        console.error('Failed to load rooms:', err);
      }
    },

    renderChatList() {
      const search = this.el.waSearchInput.value.trim().toLowerCase();
      let filtered = this.rooms;

      // Apply Filter Chips
      if (this.currentFilter === 'groups') {
        filtered = filtered.filter((r) => r.type === 'group');
      } else if (this.currentFilter === 'direct') {
        filtered = filtered.filter((r) => r.type === 'direct');
      } else if (this.currentFilter === 'unread') {
        filtered = filtered.filter((r) => r.lastMessage && !r.lastMessage.isRead);
      }

      // Apply Search
      if (search) {
        filtered = filtered.filter((r) => {
          const name = (r.displayName || r.name || '').toLowerCase();
          const desc = (r.description || '').toLowerCase();
          const lastText = (r.lastMessage?.text || '').toLowerCase();
          return name.includes(search) || desc.includes(search) || lastText.includes(search);
        });
      }

      if (filtered.length === 0) {
        this.el.waChatList.innerHTML = '<li class="loading-state">No chats found</li>';
        return;
      }

      this.el.waChatList.innerHTML = filtered
        .map((room) => {
          const isDirect = room.type === 'direct';
          const name = room.displayName || room.name;
          const otherUser = room.otherUser;
          const isOnline = isDirect && otherUser && window.socketManager.isUserOnline(otherUser._id);
          
          let avatarHtml = '';
          if (room.displayAvatar && room.displayAvatar.startsWith('http')) {
            avatarHtml = `<img src="${room.displayAvatar}" alt="${this.escapeHtml(name)}" class="chat-avatar-img" />`;
          } else if (room.avatar) {
            avatarHtml = `<div class="chat-avatar-placeholder">${room.avatar}</div>`;
          } else {
            avatarHtml = `<img src="https://api.dicebear.com/7.x/bottts/svg?seed=${name}" alt="${name}" class="chat-avatar-img" />`;
          }

          // Message snippet & blue tick
          let snippet = room.lastMessage?.text || room.description || 'Tap to chat';
          let tickHtml = '<span class="blue-ticks">✔✔</span> ';
          if (room.lastMessage?.messageType === 'image') {
            snippet = '📷 Photo';
          }

          // Time formatting
          const time = room.lastMessage ? this.formatTime(room.lastMessage.createdAt) : 'Yesterday';

          return `
            <li class="wa-chat-item" data-room-id="${room._id}">
              <div class="chat-avatar-box">
                ${avatarHtml}
                ${isOnline ? '<span class="chat-presence-dot"></span>' : ''}
              </div>
              <div class="chat-content-box">
                <div class="chat-row-top">
                  <span class="chat-contact-name">${this.escapeHtml(name)}</span>
                  <span class="chat-timestamp">${time}</span>
                </div>
                <div class="chat-row-bottom">
                  <span class="chat-msg-snippet">${tickHtml}${this.escapeHtml(snippet)}</span>
                  <span class="unread-badge-green">2</span>
                </div>
              </div>
            </li>
          `;
        })
        .join('');

      // Click event on each chat
      this.el.waChatList.querySelectorAll('.wa-chat-item').forEach((item) => {
        item.addEventListener('click', () => {
          const roomId = item.getAttribute('data-room-id');
          const room = this.rooms.find((r) => r._id.toString() === roomId);
          if (room) this.openChatScreen(room);
        });
      });
    },

    // --- Open In-Chat Screen ---
    async openChatScreen(room) {
      this.activeRoom = room;
      window.socketManager.joinRoom(room._id.toString());

      // Update in-chat header
      const name = room.displayName || room.name;
      const isDirect = room.type === 'direct';
      const otherUser = room.otherUser;

      this.el.chatHeaderName.textContent = name;
      this.el.chatHeaderRole.textContent = isDirect && otherUser?.role ? otherUser.role : (isDirect ? 'Direct' : 'Group');
      this.updateChatHeaderOnlineState();

      if (room.displayAvatar && room.displayAvatar.startsWith('http')) {
        this.el.chatHeaderAvatar.src = room.displayAvatar;
      } else {
        this.el.chatHeaderAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
      }

      // Smooth switch from main screen to chat screen
      this.el.mainScreen.classList.add('hidden');
      this.el.chatScreen.classList.remove('hidden');

      // Fetch messages history
      await this.loadMessages(room._id);

      window.socketManager.markAsRead(room._id.toString());
      this.updateSendButtonMode();
      this.el.messageInput.focus();
    },

    closeChatScreen() {
      this.el.chatScreen.classList.add('hidden');
      this.el.mainScreen.classList.remove('hidden');
      this.activeRoom = null;
      this.renderChatList();
    },

    updateChatHeaderOnlineState() {
      if (!this.activeRoom) return;
      if (this.activeRoom.type === 'direct' && this.activeRoom.otherUser) {
        const isOnline = window.socketManager.isUserOnline(this.activeRoom.otherUser._id);
        this.el.chatHeaderStatus.textContent = isOnline ? 'online' : 'last seen recently';
      } else {
        this.el.chatHeaderStatus.textContent = `${this.activeRoom.members?.length || 2} participants`;
      }
    },

    // --- Load Messages ---
    async loadMessages(roomId) {
      this.el.messagesList.innerHTML = '<div class="loading-state">Loading messages...</div>';
      try {
        const res = await window.api.getMessages(roomId);
        const messages = res.messages || [];

        this.el.messagesList.innerHTML = '';
        messages.forEach((msg) => this.appendMessageToFeed(msg, false));
        this.scrollToBottom();
      } catch (err) {
        this.el.messagesList.innerHTML = '<div class="encryption-notice">Could not load history.</div>';
      }
    },

    appendMessageToFeed(msg, shouldScroll = true) {
      const isOutgoing = msg.sender && (msg.sender._id?.toString() === this.currentUser._id.toString());
      const senderName = isOutgoing ? 'You' : (msg.sender?.username || 'User');
      const timeStr = this.formatTime(msg.createdAt);

      const row = document.createElement('div');
      row.className = `wa-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`;

      const isAudio = msg.messageType === 'audio' || (msg.attachment?.url && (msg.attachment.url.startsWith('data:audio') || msg.attachment.name?.includes('voice_note')));

      let contentHtml = '';
      if (isAudio) {
        const audioDuration = msg.attachment?.duration || '0:05';
        const senderAvatar = isOutgoing
          ? (this.currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80')
          : (msg.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`);

        contentHtml = `
          <div class="wa-msg-audio">
            <button type="button" class="wa-audio-play-btn" data-audio-src="${msg.attachment?.url || ''}" title="Play voice note">▶</button>
            <div class="wa-audio-waveform-wrap">
              <div class="wa-audio-progress-bar">
                <div class="wa-audio-progress-fill"></div>
              </div>
              <div class="wa-audio-meta-row">
                <span class="audio-dur-label">${audioDuration}</span>
                <span>Voice note</span>
              </div>
            </div>
            <img src="${senderAvatar}" alt="Avatar" class="wa-audio-avatar" />
          </div>
        `;
      } else {
        let imgHtml = '';
        if (msg.attachment?.url) {
          imgHtml = `
            <div class="wa-msg-img" data-full-img="${msg.attachment.url}">
              <img src="${msg.attachment.url}" alt="Attachment" />
            </div>
          `;
        }
        contentHtml = `
          ${imgHtml}
          ${msg.text ? `<span>${this.escapeHtml(msg.text)}</span>` : ''}
        `;
      }

      const senderHeader = !isOutgoing && this.activeRoom?.type === 'group'
        ? `<div class="wa-msg-sender">${this.escapeHtml(senderName)}</div>`
        : '';

      const tickSvg = isOutgoing
        ? `<span class="blue-ticks">✔✔</span>`
        : '';

      row.innerHTML = `
        <div class="wa-msg-bubble">
          ${senderHeader}
          ${contentHtml}
          <div class="wa-msg-meta">
            <span>${timeStr}</span>
            ${tickSvg}
          </div>
        </div>
      `;

      // Lightbox click
      const imgEl = row.querySelector('.wa-msg-img');
      if (imgEl) {
        imgEl.addEventListener('click', () => {
          this.el.lightboxImg.src = imgEl.getAttribute('data-full-img');
          this.el.imageLightbox.classList.remove('hidden');
        });
      }

      // Audio playback handling
      const playBtn = row.querySelector('.wa-audio-play-btn');
      if (playBtn) {
        const audioSrc = playBtn.getAttribute('data-audio-src');
        const progressFill = row.querySelector('.wa-audio-progress-fill');
        const durLabel = row.querySelector('.audio-dur-label');
        let audioObj = null;

        playBtn.addEventListener('click', () => {
          if (!audioSrc) return;

          if (audioObj && !audioObj.paused) {
            audioObj.pause();
            playBtn.textContent = '▶';
            return;
          }

          if (!audioObj) {
            audioObj = new Audio(audioSrc);
            audioObj.ontimeupdate = () => {
              if (audioObj.duration) {
                const percent = (audioObj.currentTime / audioObj.duration) * 100;
                progressFill.style.width = `${percent}%`;
                durLabel.textContent = this.formatDuration(Math.floor(audioObj.currentTime));
              }
            };
            audioObj.onended = () => {
              playBtn.textContent = '▶';
              progressFill.style.width = '0%';
              durLabel.textContent = msg.attachment?.duration || '0:00';
            };
          }

          audioObj.play().then(() => {
            playBtn.textContent = '⏸';
          }).catch((err) => {
            console.warn('Audio play error:', err);
          });
        });
      }

      this.el.messagesList.appendChild(row);

      if (shouldScroll) {
        this.scrollToBottom();
      }
    },

    scrollToBottom() {
      this.el.messagesContainer.scrollTop = this.el.messagesContainer.scrollHeight;
    },

    // --- Send Message ---
    async handleSendMessage() {
      if (!this.activeRoom) return;
      const text = this.el.messageInput.value.trim();
      const attachment = this.currentAttachment;

      if (!text && !attachment) return;

      const roomId = this.activeRoom._id.toString();

      // Clear input & preview
      this.el.messageInput.value = '';
      this.clearAttachment();
      this.stopTypingNow();
      this.updateSendButtonMode();

      window.socketManager.sendMessage(
        roomId,
        text,
        attachment ? 'image' : 'text',
        attachment
      );

      window.soundManager.playMessageSent();
    },

    onNewMessage(message) {
      const isCurrentRoom = this.activeRoom && this.activeRoom._id.toString() === message.room.toString();
      const isFromMe = message.sender?._id?.toString() === this.currentUser._id.toString();

      if (isCurrentRoom) {
        this.appendMessageToFeed(message, true);
        if (!isFromMe) {
          window.soundManager.playMessageReceived();
          window.socketManager.markAsRead(this.activeRoom._id.toString());
        }
      } else {
        if (!isFromMe) {
          window.soundManager.playMessageReceived();
          if (window.notificationManager) {
            window.notificationManager.show(
              message.sender?.username || 'ChitChat',
              message.text || '📷 Sent a photo',
              message.sender?.avatar
            );
          }
        }
        // Update chat list snippet
        const targetRoom = this.rooms.find((r) => r._id.toString() === message.room.toString());
        if (targetRoom) {
          targetRoom.lastMessage = message;
          this.renderChatList();
        }
      }
    },

    // --- Typing Indicators ---
    handleTypingInput() {
      if (!this.activeRoom) return;

      if (!this.isTyping) {
        this.isTyping = true;
        window.socketManager.startTyping(this.activeRoom._id.toString());
      }

      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.stopTypingNow();
      }, 1500);
    },

    stopTypingNow() {
      if (this.isTyping && this.activeRoom) {
        this.isTyping = false;
        window.socketManager.stopTyping(this.activeRoom._id.toString());
      }
    },

    // --- Meta AI Sparkle Button ---
    handleMetaAiClick() {
      if (this.activeRoom) {
        this.el.messageInput.value = 'Hey Meta AI, summarize this conversation!';
        this.el.messageInput.focus();
      } else {
        // Open General room with Meta AI prompt
        const gen = this.rooms.find((r) => r.name?.toLowerCase() === 'general') || this.rooms[0];
        if (gen) {
          this.openChatScreen(gen);
          this.el.messageInput.value = 'Hello Meta AI! 🚀';
        }
      }
    },

    // --- Status Stories Tab ---
    renderStatusUpdates() {
      const updates = [
        {
          name: 'Ada Lovelace',
          time: '45 minutes ago',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        },
        {
          name: 'Alan Turing',
          time: 'Today, 2:15 pm',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
        },
        {
          name: 'Pooji🫶',
          time: 'Today, 11:30 am',
          avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80'
        }
      ];

      this.el.updatesList.innerHTML = updates
        .map((u) => `
          <div class="status-update-row">
            <div class="status-ring-avatar">
              <img src="${u.avatar}" alt="${u.name}" />
            </div>
            <div>
              <h4 style="font-size: 1.05rem;">${u.name}</h4>
              <p style="font-size: 0.8rem; color: #8696a0;">${u.time}</p>
            </div>
          </div>
        `)
        .join('');
    },

    // --- Image Handling ---
    handleImageSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        this.currentAttachment = {
          url: event.target.result,
          name: file.name,
          size: file.size
        };
        this.el.attachmentImg.src = event.target.result;
        this.el.attachmentFilename.textContent = file.name;
        this.el.attachmentPreview.classList.remove('hidden');
        this.updateSendButtonMode();
      };
      reader.readAsDataURL(file);
    },

    clearAttachment() {
      this.currentAttachment = null;
      this.el.attachmentImg.src = '';
      this.el.imageUploadInput.value = '';
      this.el.attachmentPreview.classList.add('hidden');
      this.updateSendButtonMode();
    },

    // --- Group Creation Modal ---
    openNewGroupModal() {
      this.el.createRoomModal.classList.remove('hidden');
      this.el.roomNameInput.focus();
    },

    async handleCreateRoom(e) {
      e.preventDefault();
      const name = this.el.roomNameInput.value.trim();
      const description = this.el.roomDescInput.value.trim();
      const icon = this.selectedGroupIcon;

      if (!name) return;

      try {
        const res = await window.api.createRoom(name, description, icon);
        const newRoom = res.room;
        this.rooms.unshift(newRoom);
        this.renderChatList();

        this.el.createRoomModal.classList.add('hidden');
        this.el.roomNameInput.value = '';
        this.el.roomDescInput.value = '';

        this.openChatScreen(newRoom);
      } catch (err) {
        alert(err.message || 'Failed to create group');
      }
    },

    // Sound toggle
    checkSoundState() {
      const isMuted = window.soundManager.isMuted;
      this.el.soundStateLabel.textContent = isMuted ? 'OFF' : 'ON';
    },

    toggleSound() {
      const isMuted = window.soundManager.toggleMute();
      this.el.soundStateLabel.textContent = isMuted ? 'OFF' : 'ON';
    },

    // --- Dynamic Mic / Send Button State ---
    updateSendButtonMode() {
      const hasContent = (this.el.messageInput && this.el.messageInput.value.trim().length > 0) || this.currentAttachment;
      if (this.isRecordingVoice) {
        this.el.sendBtn.classList.add('recording');
        this.el.sendBtn.classList.remove('mode-mic', 'mode-send');
        this.el.sendBtnIcon.innerHTML = SEND_SVG;
        this.el.sendBtn.title = 'Send voice note';
      } else if (hasContent) {
        this.el.sendBtn.classList.remove('recording', 'mode-mic');
        this.el.sendBtn.classList.add('mode-send');
        this.el.sendBtnIcon.innerHTML = SEND_SVG;
        this.el.sendBtn.title = 'Send message';
      } else {
        this.el.sendBtn.classList.remove('recording', 'mode-send');
        this.el.sendBtn.classList.add('mode-mic');
        this.el.sendBtnIcon.innerHTML = MIC_SVG;
        this.el.sendBtn.title = 'Record voice note';
      }
    },

    // --- Voice Recording Flow ---
    async startVoiceRecording() {
      if (!this.activeRoom) {
        alert('Please select or open a chat to record a voice note.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported by your browser or requires HTTPS / localhost.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.voiceStream = stream;
        this.audioChunks = [];

        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined') {
          if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
            else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
            else mimeType = '';
          }
        }

        const options = mimeType ? { mimeType } : {};
        this.mediaRecorder = new MediaRecorder(stream, options);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          if (this.shouldSendRecordedVoice && this.audioChunks.length > 0 && this.activeRoom) {
            const finalBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = reader.result;
              const formattedDuration = this.formatDuration(this.recordingSeconds || 1);
              window.socketManager.sendMessage(
                this.activeRoom._id.toString(),
                '',
                'audio',
                {
                  url: base64Data,
                  name: `voice_note_${Date.now()}.webm`,
                  duration: formattedDuration
                }
              );
              window.soundManager.playMessageSent();
            };
            reader.readAsDataURL(finalBlob);
          }

          if (this.voiceStream) {
            this.voiceStream.getTracks().forEach((track) => track.stop());
            this.voiceStream = null;
          }
          this.audioChunks = [];
        };

        this.mediaRecorder.start(250);
        this.isRecordingVoice = true;
        this.shouldSendRecordedVoice = false;
        this.recordingSeconds = 0;
        this.el.recordingTimer.textContent = '0:00';

        this.el.inputPillWrapper.classList.add('hidden');
        this.el.voiceRecordingDock.classList.remove('hidden');
        this.updateSendButtonMode();

        this.recordingTimerInterval = setInterval(() => {
          this.recordingSeconds++;
          this.el.recordingTimer.textContent = this.formatDuration(this.recordingSeconds);
        }, 1000);

      } catch (err) {
        console.warn('Microphone permission error:', err);
        this.openPermissionsModal();
        alert('Microphone permission is required to record voice notes.\n\nPlease check the Device Permissions Center to enable it.');
      }
    },

    stopVoiceRecording(shouldSend) {
      if (!this.isRecordingVoice) return;
      this.shouldSendRecordedVoice = shouldSend;
      this.isRecordingVoice = false;

      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      this.el.voiceRecordingDock.classList.add('hidden');
      this.el.inputPillWrapper.classList.remove('hidden');
      this.updateSendButtonMode();
    },

    // --- Camera Viewfinder Flow ---
    async openCameraModal() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported by your browser or requires HTTPS / localhost.');
        return;
      }

      this.el.cameraModal.classList.remove('hidden');
      this.el.cameraSnapPreview.classList.add('hidden');
      this.capturedPhotoData = null;

      await this.startCameraStream();
    },

    async startCameraStream() {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((t) => t.stop());
        this.cameraStream = null;
      }

      try {
        const constraints = {
          video: {
            facingMode: this.currentCameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.cameraStream = stream;
        this.el.cameraVideoStream.srcObject = stream;
      } catch (err) {
        console.warn('Camera stream error:', err);
        this.closeCameraModal();
        this.openPermissionsModal();
        alert('Camera permission is required to take photos.\n\nPlease allow camera access in your browser or device settings.');
      }
    },

    captureCameraPhoto() {
      if (!this.cameraStream) return;
      const video = this.el.cameraVideoStream;
      const canvas = this.el.cameraCaptureCanvas;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (this.currentCameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.capturedPhotoData = photoDataUrl;

      this.el.cameraPreviewImg.src = photoDataUrl;
      this.el.cameraSnapPreview.classList.remove('hidden');
    },

    retakeCameraPhoto() {
      this.capturedPhotoData = null;
      this.el.cameraSnapPreview.classList.add('hidden');
    },

    async sendCapturedCameraPhoto() {
      if (!this.capturedPhotoData) return;

      const photoUrl = this.capturedPhotoData;
      this.closeCameraModal();

      if (this.activeRoom) {
        window.socketManager.sendMessage(
          this.activeRoom._id.toString(),
          '',
          'image',
          {
            url: photoUrl,
            name: `camera_photo_${Date.now()}.jpg`,
            size: Math.round(photoUrl.length * 0.75)
          }
        );
        window.soundManager.playMessageSent();
      } else {
        const room = this.rooms[0];
        if (room) {
          await this.openChatScreen(room);
          window.socketManager.sendMessage(
            room._id.toString(),
            '📷 Instant camera photo',
            'image',
            {
              url: photoUrl,
              name: `camera_photo_${Date.now()}.jpg`,
              size: Math.round(photoUrl.length * 0.75)
            }
          );
          window.soundManager.playMessageSent();
        }
      }
    },

    closeCameraModal() {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((t) => t.stop());
        this.cameraStream = null;
      }
      this.el.cameraVideoStream.srcObject = null;
      this.el.cameraModal.classList.add('hidden');
      this.el.cameraSnapPreview.classList.add('hidden');
      this.capturedPhotoData = null;
    },

    flipCamera() {
      this.currentCameraFacing = this.currentCameraFacing === 'user' ? 'environment' : 'user';
      this.startCameraStream();
    },

    // --- Device Permissions Center Flow ---
    openPermissionsModal() {
      this.el.permissionsModal.classList.remove('hidden');
      this.refreshPermissionsStatus();
    },

    closePermissionsModal() {
      this.el.permissionsModal.classList.add('hidden');
    },

    async refreshPermissionsStatus() {
      // 1. Push Notifications
      if ('Notification' in window) {
        const perm = Notification.permission;
        if (perm === 'granted') {
          this.updatePermBadge(this.el.badgePermNotif, 'granted', '✔ Granted');
          this.el.btnRequestNotif.textContent = 'Test Alert';
        } else if (perm === 'denied') {
          this.updatePermBadge(this.el.badgePermNotif, 'denied', '✖ Blocked');
          this.el.btnRequestNotif.textContent = 'Blocked';
        } else {
          this.updatePermBadge(this.el.badgePermNotif, 'prompt', '⚠ Not Asked');
          this.el.btnRequestNotif.textContent = 'Enable';
        }
      }

      // 2. Microphone
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const micStatus = await navigator.permissions.query({ name: 'microphone' });
          this.applyPermStatus(this.el.badgePermMic, this.el.btnRequestMic, micStatus.state, 'Test Mic');
          micStatus.onchange = () => {
            this.applyPermStatus(this.el.badgePermMic, this.el.btnRequestMic, micStatus.state, 'Test Mic');
          };
        } catch (e) {
          this.updatePermBadge(this.el.badgePermMic, 'prompt', 'Available');
        }
      } else {
        this.updatePermBadge(this.el.badgePermMic, 'prompt', 'Available');
      }

      // 3. Camera
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const camStatus = await navigator.permissions.query({ name: 'camera' });
          this.applyPermStatus(this.el.badgePermCam, this.el.btnRequestCam, camStatus.state, 'Open Cam');
          camStatus.onchange = () => {
            this.applyPermStatus(this.el.badgePermCam, this.el.btnRequestCam, camStatus.state, 'Open Cam');
          };
        } catch (e) {
          this.updatePermBadge(this.el.badgePermCam, 'prompt', 'Available');
        }
      } else {
        this.updatePermBadge(this.el.badgePermCam, 'prompt', 'Available');
      }
    },

    applyPermStatus(badgeEl, btnEl, state, activeLabel) {
      if (state === 'granted') {
        this.updatePermBadge(badgeEl, 'granted', '✔ Granted');
        btnEl.textContent = activeLabel;
      } else if (state === 'denied') {
        this.updatePermBadge(badgeEl, 'denied', '✖ Blocked');
        btnEl.textContent = 'Blocked';
      } else {
        this.updatePermBadge(badgeEl, 'prompt', '⚠ Request');
        btnEl.textContent = 'Enable';
      }
    },

    updatePermBadge(badgeEl, type, label) {
      badgeEl.className = `perm-badge ${type}`;
      badgeEl.textContent = label;
    },

    async testOrRequestNotification() {
      const granted = await window.notificationManager.requestPermission();
      this.refreshPermissionsStatus();
      if (granted) {
        window.soundManager.playMessageReceived();
        window.notificationManager.show('ChitChat Test Alert', '🎉 Notification permission is working smoothly!');
      } else {
        alert('Notification permission was not granted. Please check your browser address bar (🔒 icon).');
      }
    },

    async testOrRequestMicrophone() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.updatePermBadge(this.el.badgePermMic, 'granted', '✔ Granted');
        this.el.btnRequestMic.textContent = 'Test Mic';
        window.soundManager.playMessageSent();
        alert('🎉 Microphone permission granted and working!');
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        this.updatePermBadge(this.el.badgePermMic, 'denied', '✖ Blocked');
        alert('Microphone permission blocked.\n\nPlease click the lock icon (🔒) in your address bar and allow Microphone.');
      }
    },

    async testOrRequestCamera() {
      this.closePermissionsModal();
      this.openCameraModal();
    },

    formatDuration(totalSec) {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  WA.init();
});
