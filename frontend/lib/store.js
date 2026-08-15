import { create } from 'zustand';
import { apiCall, getToken, setToken, removeToken } from './api';
import { toast } from './toastStore';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,

  signup: async (email, password, name, company) => {
    set({ isLoading: true });
    try {
      const { user, token } = await apiCall('/api/auth/signup', 'POST', {
        email,
        password,
        name,
        company
      });
      setToken(token);
      set({ user, token });
      toast.success('Welcome!', 'Account created successfully.');
      return { success: true };
    } catch (err) {
      toast.error('Signup Failed', err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await apiCall('/api/auth/login', 'POST', { email, password });
      setToken(token);
      set({ user, token });
      toast.success('Logged In', `Welcome back, ${user.name || user.email}!`);
      return { success: true };
    } catch (err) {
      toast.error('Login Failed', err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    removeToken();
    set({ user: null, token: null });
    clearUserScopedStores();
    toast.info('Logged Out', 'You have been signed out.');
  },

  updateUserPlan: (plan, status = 'active') => {
    set((state) => ({
      user: state.user ? { ...state.user, plan, subscription_status: status } : null
    }));
  },

  hydrate: async () => {
    const token = getToken();
    if (token) {
      try {
        const user = await apiCall('/api/auth/profile', 'GET', null, token);
        set({ user, token });
      } catch {
        removeToken();
      }
    }
  }
}));

export const useContentStore = create((set) => ({
  posts: [],
  isLoading: false,

  reset: () => set({ posts: [], isLoading: false }),

  generateContent: async (niche, audience, goal, token) => {
    set({ isLoading: true });
    try {
      const result = await apiCall('/api/content/generate', 'POST', {
        niche,
        audience,
        goal
      }, token);
      set({ posts: result.posts });
      toast.success(
        'Content Engine Complete',
        `Generated ${result.posts?.length || 0} tailored drafts across target channels.`
      );
      return { success: true, content: result.posts, campaign: result.campaign };
    } catch (err) {
      toast.error('Generation Error', err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  getPosts: async (token) => {
    set({ isLoading: true });
    try {
      const posts = await apiCall('/api/content/posts', 'GET', null, token);
      set({ posts });
      return posts;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  schedulePost: async (postId, scheduledAt, platform, token) => {
    try {
      const result = await apiCall('/api/content/schedule', 'POST', {
        postId,
        scheduledAt,
        platform
      }, token);
      toast.info('Post Scheduled', 'Draft queued for social distribution (+1 hour).');
      return { success: true, post: result.post };
    } catch (err) {
      toast.error('Scheduling Failed', err.message);
      return { error: err.message };
    }
  }
}));

export const useLeadsStore = create((set) => ({
  leads: [],
  isLoading: false,

  reset: () => set({ leads: [], isLoading: false }),

  getLeads: async (token) => {
    set({ isLoading: true });
    try {
      const leads = await apiCall('/api/leads/list', 'GET', null, token);
      set({ leads });
      return leads;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  createLead: async (name, email, source, message, token) => {
    try {
      const { lead } = await apiCall('/api/leads/create', 'POST', {
        name,
        email,
        source,
        message
      }, token);
      set(state => ({ leads: [lead, ...state.leads] }));
      toast.lead(lead);
      return { success: true, lead };
    } catch (err) {
      toast.error('Lead Capture Error', err.message);
      return { error: err.message };
    }
  },

  bulkUploadLeads: async (file, token) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiCall('/api/leads/bulk-upload', 'POST', formData, token);
      set(state => ({ leads: [...result.leads, ...state.leads] }));
      toast.success('Bulk Import Complete', `Successfully ingested and scored ${result.count} leads.`);
      return { success: true, count: result.count };
    } catch (err) {
      toast.error('Bulk Import Failed', err.message);
      return { error: err.message };
    }
  },

  batchUpdateLeads: async (leadIds, status, token) => {
    try {
      const result = await apiCall('/api/leads/batch-update-status', 'POST', { leadIds, status }, token);
      set(state => ({
        leads: state.leads.map(l => leadIds.includes(l.id) ? { ...l, status } : l)
      }));
      toast.success('Batch Category Updated', `Moved ${result.updatedCount} lead(s) to ${status.toUpperCase()}.`);
      return { success: true, updatedCount: result.updatedCount };
    } catch (err) {
      toast.error('Batch Update Failed', err.message);
      return { error: err.message };
    }
  },

  batchDeleteLeads: async (leadIds, token) => {
    try {
      const result = await apiCall('/api/leads/batch-delete', 'POST', { leadIds }, token);
      set(state => ({
        leads: state.leads.filter(l => !leadIds.includes(l.id))
      }));
      toast.success('Batch Delete Complete', `Removed ${result.deletedCount} lead(s) from pipeline.`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (err) {
      toast.error('Batch Delete Failed', err.message);
      return { error: err.message };
    }
  }
}));

export const useSecurityStore = create((set) => ({
  scans: [],
  currentScan: null,
  isLoading: false,
  scanWarnings: {},

  reset: () => set({ scans: [], currentScan: null, isLoading: false, scanWarnings: {} }),

  scanContent: async (content, type = 'content', postId = null, campaignId = null, token) => {
    set({ isLoading: true });
    try {
      const result = await apiCall('/api/security/scan', 'POST', {
        content,
        type,
        postId,
        campaignId
      }, token);
      set({ currentScan: result });
      toast.scan(result);
      return { success: true, scan: result };
    } catch (err) {
      toast.error('Security Audit Error', err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  getScans: async (limit = 50, offset = 0, token) => {
    set({ isLoading: true });
    try {
      const scans = await apiCall(`/api/security/scans?limit=${limit}&offset=${offset}`, 'GET', null, token);
      set({ scans });
      return scans;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getScanById: async (scanId, token) => {
    try {
      const scan = await apiCall(`/api/security/scans/${scanId}`, 'GET', null, token);
      set({ currentScan: scan });
      return scan;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  addSecurityWarning: (postId, warning) => {
    set(state => ({
      scanWarnings: {
        ...state.scanWarnings,
        [postId]: warning
      }
    }));
    toast.warning('Security Notice', `Asset ${postId} has pending security flags.`);
  },

  dismissSecurityWarning: (postId) => {
    set(state => {
      const { [postId]: _, ...rest } = state.scanWarnings;
      return { scanWarnings: rest };
    });
    toast.info('Warning Dismissed', `Security flag cleared for asset ${postId}.`);
  }
}));

export const useTemplateStore = create((set) => ({
  templates: [],
  isLoading: false,

  reset: () => set({ templates: [], isLoading: false }),

  getTemplates: async (token) => {
    set({ isLoading: true });
    try {
      const res = await apiCall('/api/leads/templates', 'GET', null, token);
      set({ templates: res.templates || [] });
      return res.templates || [];
    } catch (err) {
      console.error('Failed to load outreach templates:', err);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  createTemplate: async (data, token) => {
    try {
      const res = await apiCall('/api/leads/templates', 'POST', data, token);
      set((state) => ({ templates: [res.template, ...state.templates] }));
      toast.success('Template Created', `Saved outreach template "${res.template.name}".`);
      return { success: true, template: res.template };
    } catch (err) {
      toast.error('Template Error', err.message);
      return { error: err.message };
    }
  },

  updateTemplate: async (id, data, token) => {
    try {
      const res = await apiCall(`/api/leads/templates/${id}`, 'PUT', data, token);
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? res.template : t))
      }));
      toast.success('Template Updated', `Updated "${res.template.name}".`);
      return { success: true, template: res.template };
    } catch (err) {
      toast.error('Update Failed', err.message);
      return { error: err.message };
    }
  },

  deleteTemplate: async (id, token) => {
    try {
      await apiCall(`/api/leads/templates/${id}`, 'DELETE', null, token);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      }));
      toast.success('Template Deleted', 'Removed outreach template.');
      return { success: true };
    } catch (err) {
      toast.error('Delete Failed', err.message);
      return { error: err.message };
    }
  },

  applyTemplate: async (templateId, leadId, extraVars = {}, token) => {
    try {
      const res = await apiCall('/api/leads/templates/apply', 'POST', { templateId, leadId, extraVars }, token);
      return { success: true, outreach: res.outreach };
    } catch (err) {
      toast.error('Apply Template Failed', err.message);
      return { error: err.message };
    }
  }
}));

export const useAutomationStore = create((set, get) => ({
  campaigns: [],
  jobs: [],
  isLoading: false,

  reset: () => set({ campaigns: [], jobs: [], isLoading: false }),

  fetchCampaigns: async (token) => {
    set({ isLoading: true });
    try {
      const result = await apiCall('/api/campaigns', 'GET', null, token);
      set({ campaigns: result.campaigns || [] });
      return { success: true };
    } catch (err) {
      toast.error("Couldn't load campaigns", err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchJobs: async (token, filters = {}) => {
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      ).toString();
      const result = await apiCall(`/api/campaigns/jobs${params ? `?${params}` : ''}`, 'GET', null, token);
      set({ jobs: result.jobs || [] });
      return { success: true };
    } catch (err) {
      toast.error("Couldn't load automation jobs", err.message);
      return { error: err.message };
    }
  },

  // One call for both directions. `active: false` needs no mission fields, so
  // pausing works without re-sending the whole form.
  setAutomation: async (campaignId, active, mission, token) => {
    set({ isLoading: true });
    try {
      const body = active ? { active: true, ...mission } : { active: false };
      const result = await apiCall(`/api/campaigns/${campaignId}/automation`, 'PUT', body, token);
      toast.success(
        active ? 'Automation on' : 'Automation paused',
        active
          ? `${result.jobs?.length || 0} job(s) queued for this campaign.`
          : `${result.cancelledCount || 0} pending job(s) cancelled.`
      );
      // Re-read rather than patching local state, so the counts shown come from
      // the database that just enforced the live-job constraint.
      await get().fetchCampaigns(token);
      await get().fetchJobs(token);
      return { success: true, ...result };
    } catch (err) {
      toast.error(active ? "Couldn't start automation" : "Couldn't pause automation", err.message);
      return { error: err.message };
    } finally {
      set({ isLoading: false });
    }
  }
}));

/**
 * Drop every store holding data belonging to the signed-in user.
 *
 * Without this, signing out and signing in as someone else — with no page
 * reload in between — left the previous user's campaigns, posts, leads, scans
 * and templates on screen until each page happened to refetch. Declared after
 * the stores it clears; it is only ever called at runtime, long after this
 * module finishes evaluating.
 */
function clearUserScopedStores() {
  useContentStore.getState().reset();
  useLeadsStore.getState().reset();
  useSecurityStore.getState().reset();
  useTemplateStore.getState().reset();
  useAutomationStore.getState().reset();
}
