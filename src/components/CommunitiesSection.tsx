import { useEffect, useState, type FormEvent } from 'react';
import type { Group, GroupScoreRow } from '../types';
import { db, DATA_MODE } from '../services/db';

const inputClasses =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-2 text-sm text-zinc-800 shadow-sm ' +
  'placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300';

const smallButtonClasses =
  'shrink-0 rounded-full bg-sepia-700 px-5 py-2 text-sm font-medium text-ivory-50 shadow-sm ' +
  'transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-50';

function GroupCard({ group, onLeave }: { group: Group; onLeave: (id: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GroupScoreRow[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || rows !== null) return;
    db.getGroupScoreboard(group.id)
      .then(setRows)
      .catch(() => setRows([]));
  }, [open, rows, group.id]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.kutsukoodi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the code is visible as text anyway.
    }
  };

  const handleLeave = async () => {
    if (!window.confirm(`Poistutaanko lukupiiristä ”${group.nimi}”?`)) return;
    await onLeave(group.id);
  };

  return (
    <li className="rounded-xl border border-ivory-300 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          aria-hidden="true"
          className={`text-sepia-500 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-lg text-ink-900">{group.nimi}</span>
          <span className="block text-xs text-zinc-500">
            {group.jasenia} {group.jasenia === 1 ? 'jäsen' : 'jäsentä'}
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-ivory-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>
              Kutsukoodi: <code className="rounded bg-ivory-100 px-1.5 py-0.5 font-mono text-sepia-900">{group.kutsukoodi}</code>
            </span>
            <button
              onClick={() => void copyCode()}
              className="font-medium text-sepia-700 transition hover:text-sepia-900 hover:underline"
            >
              {copied ? 'Kopioitu ✓' : 'Kopioi'}
            </button>
            <span className="flex-1" />
            <button
              onClick={() => void handleLeave()}
              className="font-medium text-red-600 transition hover:text-red-700 hover:underline"
            >
              Poistu piiristä
            </button>
          </div>

          {rows === null ? (
            <p className="py-4 text-center text-sm text-zinc-400">Haetaan…</p>
          ) : rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">Ei vielä jäseniä.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
                  <th className="pb-1 font-medium">Lukija</th>
                  <th className="pb-1 text-right font-medium">Tässä kuussa</th>
                  <th className="pb-1 text-right font-medium">Yhteensä</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {rows.map((row, index) => (
                  <tr key={row.kayttajanimi}>
                    <td className="py-1.5 text-zinc-700">
                      {['🥇', '🥈', '🥉'][index] ?? ''} {row.kayttajanimi}
                    </td>
                    <td className="py-1.5 text-right text-zinc-600">{row.kirjat_kuussa}</td>
                    <td className="py-1.5 text-right font-medium text-sepia-700">{row.kirjat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  );
}

export default function CommunitiesSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DATA_MODE !== 'supabase') return;
    db.listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toiminto epäonnistui.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    void run(async () => {
      const group = await db.createGroup(newName.trim());
      setGroups((prev) => [...prev, group]);
      setNewName('');
    });
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    void run(async () => {
      const group = await db.joinGroup(joinCode.trim());
      setGroups((prev) =>
        prev.some((g) => g.id === group.id)
          ? prev.map((g) => (g.id === group.id ? group : g))
          : [...prev, group]
      );
      setJoinCode('');
    });
  };

  const handleLeave = async (id: string) => {
    await db.leaveGroup(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <section
      aria-label="Lukupiirit"
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-ink-900">Lukupiirit</h2>
        <p className="text-sm text-zinc-500">
          Lue yhdessä — piirin jäsenet näkevät toistensa käyttäjänimet ja kirjamäärät
        </p>
      </div>

      {DATA_MODE !== 'supabase' ? (
        <p className="mt-4 text-sm text-zinc-400">
          Lukupiirit ovat käytettävissä vain kirjautuneena.
        </p>
      ) : (
        <>
          {groups.length > 0 && (
            <ul className="mt-4 space-y-2">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} onLeave={handleLeave} />
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                className={inputClasses}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Uuden piirin nimi"
                aria-label="Uuden lukupiirin nimi"
                minLength={3}
                maxLength={40}
              />
              <button type="submit" disabled={busy || !newName.trim()} className={smallButtonClasses}>
                Perusta
              </button>
            </form>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                className={`${inputClasses} font-mono uppercase`}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Kutsukoodi"
                aria-label="Liity kutsukoodilla"
                maxLength={8}
              />
              <button type="submit" disabled={busy || !joinCode.trim()} className={smallButtonClasses}>
                Liity
              </button>
            </form>
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          {groups.length === 0 && !error && (
            <p className="mt-3 text-sm text-zinc-400">
              Et ole vielä missään lukupiirissä. Perusta oma tai liity kaverin koodilla.
            </p>
          )}
        </>
      )}
    </section>
  );
}
