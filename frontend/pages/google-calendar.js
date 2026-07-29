import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { initGoogleCalendarAuth, googleCalendarSignIn, getGoogleAccessToken, googleCalendarLogout } from '../lib/googleCalendarAuth';
import { Calendar, Clock, Plus, Trash2, Video, AlertCircle, CheckCircle2, User, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GoogleCalendarPage() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New event form state
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchEvents(accessToken);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await googleCalendarSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        fetchEvents(res.accessToken);
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google Calendar');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchEvents = async (accessToken) => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&orderBy=startTime&singleEvents=true&maxResults=25`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to fetch calendar events');
      }
      const data = await res.json();
      setEvents(data.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('Token')) {
        setNeedsAuth(true);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!token || !summary || !startDateTime || !endDateTime) return;
    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const eventBody = {
        summary,
        description,
        start: { dateTime: new Date(startDateTime).toISOString() },
        end: { dateTime: new Date(endDateTime).toISOString() },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : []
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create calendar event');
      }

      setSuccessMessage('Meeting successfully scheduled on Google Calendar!');
      setSummary('');
      setDescription('');
      setStartDateTime('');
      setEndDateTime('');
      setAttendeeEmail('');
      fetchEvents(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    // MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE OPERATIONS
    const confirmed = window.confirm(
      `Are you sure you want to delete the calendar event "${eventTitle || 'Untitled Event'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getGoogleAccessToken();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete event');
      }

      setSuccessMessage('Calendar event deleted successfully.');
      fetchEvents(accessToken);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell title="Google Calendar" subtitle="Sync appointments, schedule lead meetings, and manage client calendar events.">
        {needsAuth ? (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#141416] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Calendar size={28} />
            </div>
            <h2 className="text-xl font-bold text-neutral-50">Connect Google Calendar</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Connect your Google account to sync meetings, schedule client consultations, and manage your calendar directly from Fourdoor AI.
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button relative flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-sm font-medium text-neutral-900 shadow hover:bg-neutral-100 disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User info & Logout */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#141416] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-neutral-50">{user?.displayName || user?.email}</p>
                  <p className="text-xs text-neutral-400">Google Calendar Connected</p>
                </div>
              </div>
              <button
                onClick={googleCalendarLogout}
                className="rounded border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/5"
              >
                Disconnect Calendar
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Schedule Form */}
              <div className="rounded-xl border border-white/10 bg-[#141416] p-5 lg:col-span-1">
                <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-50">
                  <Plus size={18} className="text-orange-500" />
                  Schedule Client Meeting
                </h2>
                <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Meeting Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lead Discovery Call"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Description / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Meeting agenda..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Attendee Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded bg-orange-500 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
                  >
                    {isCreating ? 'Scheduling...' : 'Add to Google Calendar'}
                  </button>
                </form>
              </div>

              {/* Events List */}
              <div className="rounded-xl border border-white/10 bg-[#141416] p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-50">
                    <Calendar size={18} className="text-orange-500" />
                    Upcoming Calendar Events ({events.length})
                  </h2>
                  <button
                    onClick={() => fetchEvents(token)}
                    className="rounded border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {isLoadingEvents ? (
                    <div className="py-12 text-center text-sm text-neutral-400">Loading events from Google Calendar...</div>
                  ) : events.length === 0 ? (
                    <div className="rounded border border-dashed border-white/10 py-12 text-center text-sm text-neutral-400">
                      No upcoming events found on your Google Calendar.
                    </div>
                  ) : (
                    events.map((event) => {
                      const startTime = event.start?.dateTime || event.start?.date;
                      const formattedDate = startTime ? new Date(startTime).toLocaleString() : 'All Day';
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start justify-between rounded-lg border border-white/10 bg-[#111113] p-4 transition hover:border-white/20"
                        >
                          <div className="space-y-1">
                            <h3 className="font-semibold text-neutral-100">{event.summary || 'Untitled Event'}</h3>
                            {event.description && (
                              <p className="text-xs text-neutral-400 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                              <span className="flex items-center gap-1.5">
                                <Clock size={13} className="text-orange-500" />
                                {formattedDate}
                              </span>
                              {event.attendees?.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                  <Mail size={13} className="text-orange-500" />
                                  {event.attendees.length} attendee(s)
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.summary)}
                            title="Delete Event"
                            className="rounded p-2 text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
