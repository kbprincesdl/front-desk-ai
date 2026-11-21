import { useEffect, useState } from 'react';
import { Check, Clock, MapPin, Pencil, Phone, Plus, X } from 'lucide-react';
import { CLINIC_DATA } from '../data/clinicData';
import type { ClinicDoctor } from '../types/clinic';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const AVATAR_TINTS = [
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
];

function getInitials(name: string): string {
  const cleaned = name.replace(/^dr\.?\s*/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getHyderabadTimeInfo(): {
  dayShort: string;
  minutesSinceMidnight: number;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const dayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourRaw = Number(parts.find((p) => p.type === 'hour')?.value ?? '10');
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return { dayShort, minutesSinceMidnight: hour * 60 + minute };
}

export function getLiveClinicStatus(): {
  label: string;
  tone: 'open' | 'lunch' | 'emergency' | 'closed';
  dayShort: string;
} {
  const { dayShort, minutesSinceMidnight } = getHyderabadTimeInfo();

  if (dayShort === 'Sun') {
    if (minutesSinceMidnight >= 10 * 60 && minutesSinceMidnight < 14 * 60) {
      return { label: 'Emergencies only · closes 2 pm', tone: 'emergency', dayShort };
    }
    return { label: 'Closed · emergency line open', tone: 'closed', dayShort };
  }

  if (minutesSinceMidnight >= 13 * 60 + 30 && minutesSinceMidnight < 14 * 60 + 30) {
    return { label: 'Lunch break · front desk reopens 2:30 pm', tone: 'lunch', dayShort };
  }
  if (minutesSinceMidnight >= 9 * 60 && minutesSinceMidnight < 20 * 60) {
    return { label: 'Open now · closes 8 pm', tone: 'open', dayShort };
  }
  return { label: 'Closed · opens 9 am', tone: 'closed', dayShort };
}

interface ClinicDirectoryProps {
  doctors: ClinicDoctor[];
  onDoctorsChange: (nextDoctors: ClinicDoctor[]) => void;
  canEdit?: boolean;
  authToken?: string;
}

export function ClinicDirectory({
  doctors,
  onDoctorsChange,
  canEdit = false,
  authToken,
}: ClinicDirectoryProps) {
  const [liveStatus, setLiveStatus] = useState(getLiveClinicStatus);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formActiveDays, setFormActiveDays] = useState<string[]>([...WEEKDAYS]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveStatus(getLiveClinicStatus());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setIsAdding(true);
    setFormName('');
    setFormRole('');
    setFormDays('Monday to Saturday');
    setFormActiveDays([...WEEKDAYS]);
    setFormError(null);
  };

  const startEdit = (doc: ClinicDoctor) => {
    setIsAdding(false);
    setEditingId(doc.id);
    setFormName(doc.name);
    setFormRole(doc.role);
    setFormDays(doc.days);
    const active = Array.isArray(doc.activeDays) ? doc.activeDays : [];
    setFormActiveDays(active.length > 0 ? [...active] : [...WEEKDAYS]);
    setFormError(null);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormError(null);
  };

  const toggleDay = (day: string) => {
    setFormActiveDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      const ordered = WEEKDAYS.filter((w) => next.includes(w));
      setFormDays(
        ordered.length === 6
          ? 'Monday to Saturday'
          : ordered.length === 1
            ? `${ordered[0]} only`
            : ordered.join(', '),
      );
      return ordered;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim() || formActiveDays.length === 0) {
      setFormError('Enter name, speciality, and at least one working day.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    try {
      if (isAdding) {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: formName.trim(),
            role: formRole.trim(),
            days: formDays.trim() || formActiveDays.join(', '),
            activeDays: formActiveDays,
          }),
        });
        if (!res.ok) {
          let msg = 'Could not add doctor.';
          try {
            const err = (await res.json()) as { error?: string };
            if (err?.error) msg = err.error;
          } catch {
            // Ignore non-JSON error
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as { doctor: ClinicDoctor };
        onDoctorsChange([...doctors, data.doctor]);
        setIsAdding(false);
      } else if (editingId) {
        const res = await fetch(`/api/doctors/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: formName.trim(),
            role: formRole.trim(),
            days: formDays.trim() || formActiveDays.join(', '),
            activeDays: formActiveDays,
          }),
        });
        if (!res.ok) {
          let msg = 'Could not save doctor changes.';
          try {
            const err = (await res.json()) as { error?: string };
            if (err?.error) msg = err.error;
          } catch {
            // Ignore non-JSON error
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as { doctor: ClinicDoctor };
        onDoctorsChange(doctors.map((d) => (d.id === editingId ? data.doctor : d)));
        setEditingId(null);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const statusToneClasses: Record<typeof liveStatus.tone, string> = {
    open: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    lunch:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    emergency:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
    closed:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <aside
      aria-label="Clinic directory"
      className="min-w-0 space-y-4 rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm sm:p-5 dark:border-[#1E3347] dark:bg-[#111E2B]"
    >
      {/* Live Clinic Status Badge */}
      <div className="flex flex-col gap-2 border-b border-[#DCEBF3] pb-3.5 dark:border-[#1E3347]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
            Clinic Directory
          </h2>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Hyderabad (IST)
          </span>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusToneClasses[liveStatus.tone]}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{liveStatus.label}</span>
        </div>
      </div>

      {/* Doctors Header with Add Button */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Our Dentists ({doctors.length})
          </h3>
          {canEdit && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[#BDD8E7] bg-[#F2F8FB] px-2.5 py-1 text-[11px] font-semibold text-[#0E7490] transition-colors hover:border-[#0E7490] hover:bg-[#E1F1F7] dark:border-[#243B52] dark:bg-[#152534] dark:text-cyan-300"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              <span>Add Dr</span>
            </button>
          )}
        </div>

        {/* Add Doctor Form */}
        {isAdding && (
          <form
            onSubmit={handleSave}
            className="mt-2.5 space-y-2 rounded-xl border border-cyan-300 bg-[#EEF8FB] p-3 dark:border-cyan-800 dark:bg-cyan-950/30"
          >
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Add New Doctor</p>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Doctor name (e.g., Dr. Kavita Reddy)"
              className="min-h-[36px] w-full rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <input
              type="text"
              required
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              placeholder="Speciality / role"
              className="min-h-[36px] w-full rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => {
                const active = formActiveDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#0E7490] text-white dark:bg-cyan-500 dark:text-slate-950'
                        : 'border border-[#BDD8E7] bg-white text-slate-500 dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {formError && <p className="text-[11px] text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-[#243B52] dark:bg-[#152534] dark:text-slate-300"
              >
                <X className="h-3 w-3" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#0E7490] px-3 text-xs font-semibold text-white hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600"
              >
                <Check className="h-3 w-3" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Doctor Cards */}
        <div className="mt-2.5 space-y-2.5">
          {doctors.map((doc, idx) => {
            const docDays = Array.isArray(doc.activeDays) ? doc.activeDays : [];
            const availableToday = docDays.includes(liveStatus.dayShort);
            const tint = AVATAR_TINTS[idx % AVATAR_TINTS.length];
            const isEditingThis = editingId === doc.id;

            if (isEditingThis) {
              return (
                <form
                  key={doc.id}
                  onSubmit={handleSave}
                  className="space-y-2 rounded-xl border border-cyan-400 bg-[#EEF8FB] p-3 dark:border-cyan-700 dark:bg-cyan-950/30"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Edit Doctor
                  </p>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Doctor name"
                    className="min-h-[36px] w-full rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="Speciality / role"
                    className="min-h-[36px] w-full rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                  />
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((day) => {
                      const active = formActiveDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                            active
                              ? 'bg-[#0E7490] text-white dark:bg-cyan-500 dark:text-slate-950'
                              : 'border border-[#BDD8E7] bg-white text-slate-500 dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-400'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {formError && <p className="text-[11px] text-red-600 dark:text-red-400">{formError}</p>}
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-[#243B52] dark:bg-[#152534] dark:text-slate-300"
                    >
                      <X className="h-3 w-3" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#0E7490] px-3 text-xs font-semibold text-white hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600"
                    >
                      <Check className="h-3 w-3" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={doc.id}
                className={`rounded-xl border p-3 transition-colors ${
                  availableToday
                    ? 'border-teal-300 bg-[#ECFAF6] dark:border-teal-800 dark:bg-[#0D2A29]'
                    : 'border-[#DCEBF3] bg-[#F7FBFE] dark:border-[#1E3347] dark:bg-[#0D1822]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tint}`}
                    aria-hidden="true"
                  >
                    {getInitials(doc.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate dark:text-slate-100">
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {availableToday && (
                          <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                            Today
                          </span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => startEdit(doc)}
                            aria-label={`Edit ${doc.name}`}
                            title={`Edit ${doc.name}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-[#DCEBF3] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#1A2D3E] dark:hover:text-slate-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                      {doc.role}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {WEEKDAYS.map((day) => {
                        const worksDay = docDays.includes(day);
                        const isToday = day === liveStatus.dayShort;
                        return (
                          <span
                            key={day}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              worksDay
                                ? isToday
                                  ? 'bg-[#0E7490] text-white dark:bg-cyan-500 dark:text-slate-950'
                                  : 'bg-[#E3F0F7] text-slate-800 dark:bg-[#192B3B] dark:text-slate-200'
                                : 'text-slate-400 line-through dark:text-slate-600'
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hours, Location & Contact */}
      <div className="divide-y divide-[#DCEBF3] border-t border-[#DCEBF3] pt-3 text-xs dark:divide-[#1E3347] dark:border-[#1E3347]">
        <div className="pb-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
            <span>Banjara Hills Clinic</span>
          </div>
          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
            {CLINIC_DATA.clinic.address}
          </p>
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
            {CLINIC_DATA.clinic.landmark}
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {CLINIC_DATA.clinic.parking}
          </p>
        </div>

        <div className="py-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
            <span>Hours</span>
          </div>
          <dl className="mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">Mon – Sat: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.monday_to_saturday}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">Lunch: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.lunch_break}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">Sunday: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.sunday}</span>
            </div>
          </dl>
        </div>

        <div className="pt-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <Phone className="h-3.5 w-3.5 shrink-0 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
            <span>Phone & Emergency</span>
          </div>
          <div className="mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
            <p>
              Front desk:{' '}
              <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                {CLINIC_DATA.clinic.phone}
              </span>
            </p>
            <p>
              WhatsApp / Emergency:{' '}
              <span className="font-mono font-medium tabular-nums text-red-700 dark:text-red-300">
                {CLINIC_DATA.clinic.emergency_phone}
              </span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
